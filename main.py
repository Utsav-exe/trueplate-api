from fastapi import FastAPI, File, UploadFile, Form
import numpy as np
import uvicorn
import cv2
from segmentation import generate_food_mask
from calculator import calculate_real_dimensions

app = FastAPI(title="Food Dimension Estimator")

@app.post("/calculate-dimensions")
async def calculate_dimensions(
        image: UploadFile = File(...),
        depth_map: UploadFile = File(...),
        focal_length: float = Form(...)
):
    image_bytes = await image.read()
    img_array = np.frombuffer(image_bytes, np.uint8)
    rgb_image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    depth_bytes = await depth_map.read()
    depth_matrix = np.frombuffer(depth_bytes, dtype=np.float32)

    food_mask = generate_food_mask(rgb_image)

    dimensions = calculate_real_dimensions(food_mask, depth_matrix, focal_length)

    return {
        "status": "success",
        "dimensions": dimensions
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)