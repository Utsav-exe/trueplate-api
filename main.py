from fastapi import FastAPI, File, UploadFile, Form, Depends
import numpy as np
import uvicorn
import cv2
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

    h, w = rgb_image.shape[:2]

    # --- THE FOOLPROOF MOCK DATA BLOCK ---
    # 1. Fake the LiDAR Depth (Flat plane 500mm away)
    depth_matrix = np.full((h, w), 500.0, dtype=np.float32)

    # 2. Fake the AI Mask (A solid square in the middle of the image)
    food_mask = np.zeros((h, w), dtype=np.uint8)
    # Create a bounding box covering the middle 50% of the image
    start_y, end_y = int(h * 0.25), int(h * 0.75)
    start_x, end_x = int(w * 0.25), int(w * 0.75)
    food_mask[start_y:end_y, start_x:end_x] = 1
    # -------------------------------------

    # Run YOUR Spatial Math
    raw_dimensions = calculate_real_dimensions(food_mask, depth_matrix, focal_length)

    # THE FIX: Cast NumPy floats to standard Python floats so JSON doesn't crash
    dimensions = {
        "height_cm": float(raw_dimensions["height_cm"]),
        "width_cm": float(raw_dimensions["width_cm"]),
        "length_cm": float(raw_dimensions["length_cm"])
    }

    # Save to SQLite
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)