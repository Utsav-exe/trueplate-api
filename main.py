from fastapi import FastAPI, File, UploadFile, Form, Depends
import numpy as np
import uvicorn
import cv2
import io
from sqlalchemy.orm import Session

from segmentation import generate_food_mask
from calculator import calculate_real_dimensions
from database import SessionLocal, User, Meal, Dimension, engine, Base

# 1. Initialize Database and Tables
Base.metadata.create_all(bind=engine)

# 2. Auto-create a Test User if the DB is empty
db_init = SessionLocal()
if not db_init.query(User).filter(User.id == 1).first():
    db_init.add(User(id=1, username="SarthakSahu"))
    db_init.commit()
db_init.close()

app = FastAPI(title="TruePlate API")

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
        depth_map: UploadFile = File(...),
        focal_length: float = Form(...),
        db: Session = Depends(get_db)
):
    # 1. Process RGB Image
    image_bytes = await image.read()
    img_array = np.frombuffer(image_bytes, np.uint8)
    rgb_image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    # 2. Process Real LiDAR Depth Map
    depth_bytes = await depth_map.read()
    
    # THE FIX 1: Use np.load with io.BytesIO so it remembers its 2D shape!
    depth_matrix = np.load(io.BytesIO(depth_bytes))

    # THE FIX 2: Stretch the iPhone's low-res depth map to perfectly match the high-res photo.
    h, w = rgb_image.shape[:2]
    depth_matrix = cv2.resize(depth_matrix, (w, h), interpolation=cv2.INTER_NEAREST)

    # 3. Generate Real AI Mask (Using MobileSAM)
    food_mask = generate_food_mask(rgb_image)

    # 4. Run Spatial Math
    raw_dimensions = calculate_real_dimensions(food_mask, depth_matrix, focal_length)

    # Convert NumPy floats to standard Python floats for JSON serialization
    dimensions = {
        "height_cm": float(raw_dimensions["height_cm"]),
        "width_cm": float(raw_dimensions["width_cm"]),
        "length_cm": float(raw_dimensions["length_cm"])
    }

    # 5. Save to SQLite Database
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

    return {"status": "success", "meal_id": new_meal.id, "dimensions": dimensions}

@app.get("/meals/")
async def get_scan_history(db: Session = Depends(get_db)):
    """
    Retrieves the scan history for the current user. 
    Animesh can call this to populate the 'Past Meals' screen in the app.
    """
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)