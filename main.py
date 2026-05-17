from fastapi import FastAPI, File, UploadFile, Form, Depends
import numpy as np
import uvicorn
import cv2
import io
from sqlalchemy.orm import Session
from PIL import Image
from transformers import pipeline

from segmentation import generate_food_mask
from calculator import calculate_real_dimensions
from database import SessionLocal, User, Meal, Dimension, engine, Base

# Initialize the Depth AI Model globally
depth_estimator = pipeline(task="depth-estimation", model="Intel/dpt-hybrid-midas")
# 1. Initialize Database and Tables
Base.metadata.create_all(bind=engine)

# 2. Auto-create a Test User if the DB is empty
db_init = SessionLocal()
if not db_init.query(User).filter(User.id == 1).first():
    db_init.add(User(id=1, username="Admin"))
    db_init.commit()
db_init.close()

app = FastAPI(title="TruePlate API")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This tells Python: "Accept requests from any browser tab!"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/calculate-dimensions")
async def calculate_dimensions(
    image: UploadFile = File(...),
    depth_map: UploadFile = File(None), # Kept for backward compatibility
    camera_distance: str = Form("50.0"), # Changed to a safe string Form default to prevent browser 422 validation drops
    db: Session = Depends(get_db)
):
    # Safe numerical conversions to handle browser formatting
    try:
        distance_val = float(camera_distance)
    except:
        distance_val = 50.0

    # 1. Decode the uploaded image bytes into a computer vision array
    image_bytes = image.file.read()
    img_array = np.frombuffer(image_bytes, np.uint8)
    rgb_image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    # 2. AI Brain 1: MobileSAM separates the food items from the background
    food_mask = generate_food_mask(rgb_image)
    
    # 3. AI Brain 2: Monocular Depth Estimation extracts the 3D surface map
    pil_image = Image.fromarray(cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB))
    depth_output = depth_estimator(pil_image)
    depth_matrix = np.array(depth_output["depth"])
    
    # 4. 📐 Shape-Agnostic Boundary & Height Scaling Math
    mask_uint8 = (food_mask * 255).astype(np.uint8)
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    h, w = rgb_image.shape[:2]
    
    if contours:
        # Trace the outer boundary box of the isolated white mask pixels
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, pixel_width, pixel_length = cv2.boundingRect(largest_contour)
        
        # Camera Calibration Scale Factor
        # DYNAMIC FOV SCALING
        REAL_FRAME_WIDTH_CM = distance_val * 1.2
        cm_per_pixel = REAL_FRAME_WIDTH_CM / w
        
        # Calculate width and length symmetrically based on the shape footprint
        width_cm = pixel_width * cm_per_pixel
        length_cm = pixel_length * cm_per_pixel
        
        # --- DYNAMIC 3D HEIGHT EXTRACTION (TUNED) ---
        resized_depth = cv2.resize(depth_matrix, (w, h), interpolation=cv2.INTER_LINEAR)
        depth_crop = resized_depth[y:y+pixel_length, x:x+pixel_width]
        
        depth_delta = float(np.max(depth_crop)) - float(np.min(depth_crop))
        
        # 🔧 TUNED CALIBRATION FACTOR
        HEIGHT_CALIBRATION_FACTOR = 0.018 
        height_cm = depth_delta * HEIGHT_CALIBRATION_FACTOR
        
        # SAFETY BOUNDARIES
        if height_cm < 1.5:
            height_cm = 1.5
        elif height_cm > 8.0:
            height_cm = 8.0
            
    else:
        width_cm, length_cm, height_cm = 0.0, 0.0, 0.0

    dimensions = {
        "height_cm": round(float(height_cm), 2),
        "width_cm": round(float(width_cm), 2),
        "length_cm": round(float(length_cm), 2)
    }
    
    # 5. Record to Database History Tracking
    try:
        new_meal = Meal(user_id=1)
        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)
        
        new_dims = Dimension(
            meal_id=new_meal.id,
            height_cm=dimensions["height_cm"],
            width_cm=dimensions["width_cm"],
            length_cm=dimensions["length_cm"]
        )
        db.add(new_dims)
        db.commit()
        meal_id = new_meal.id
    except Exception as db_err:
        print(f"Database tracking skipped: {db_err}")
        meal_id = 999  # Safe backup identifier if local database locks up

    return {"status": "success", "meal_id": meal_id, "dimensions": dimensions}

@app.get("/meals/")
async def get_scan_history(db: Session = Depends(get_db)):
    """
    Retrieves the scan history for the current user. 
    Animesh can call this to populate the 'Past Meals' screen in the app.
    """
    try:
        meals = db.query(Meal).filter(Meal.user_id == 1).all()
        history = []
        for meal in meals:
            history.append({
                "meal_id": meal.id,
                "scan_date": meal.scan_date,
                "dimensions": {
                    "height_cm": meal.dimensions.height_cm if meal.dimensions else 0.0,
                    "width_cm": meal.dimensions.width_cm if meal.dimensions else 0.0,
                    "length_cm": meal.dimensions.length_cm if meal.dimensions else 0.0
                }
            })
        return {"status": "success", "history": history}
    except Exception as e:
        return {"status": "error", "history": [], "details": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)