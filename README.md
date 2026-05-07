# TruePlate API 

**TruePlate** is the backend infrastructure for a spatial-computing application designed to calculate the absolute real-world dimensions (height, width, length) of restaurant dishes using 2D image data and native mobile LiDAR/ToF depth sensors.

By bypassing the "missing absolute scale" problem of standard 2D photos, TruePlate provides exact dimensional data without requiring the user to place reference objects (like coins or cards) next to their food.

---

## Team & Architecture
This system is designed around a micro-service approach, handling heavy dual-payloads (RGB + Depth Maps).

* **Machine Learning & API (Utsav):** FastAPI service handling heavy payload processing, semantic segmentation (using the Segment Anything Model - SAM) for food isolation, and API endpoint architecture.
* **Mobile / Sensor Integration (Animesh):** iOS/Android application handling the capture, synchronization, and payload compression of high-resolution RGB images alongside raw LiDAR/ToF Depth Matrices (`ARDepthData`).
* **Computer Vision & Infrastructure (Sarthak):** Point-cloud mathematics for absolute dimension conversions, depth-map noise filtering, and cloud deployment/DevOps.

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone [https://github.com/Utsav-exe/trueplate-api.git](https://github.com/Utsav-exe/trueplate-api.git)
cd trueplate-api
```

### 2. Environment Setup
Create a virtual environment and install the required machine learning and server dependencies:
```bash
pip install fastapi uvicorn python-multipart numpy opencv-python torch torchvision
pip install git+[https://github.com/facebookresearch/segment-anything.git](https://github.com/facebookresearch/segment-anything.git)
```

### 3. Model Weights
Download the SAM checkpoint (sam_vit_h_4b8939.pth) and place it in a models/ directory at the project root before running the segmentation logic.

### 4. Run the Development Server
```bash
python main.py
```
The API will be available at http://0.0.0.0:8000

---

## Core Endpoints

### POST /calculate-dimensions
Receives synchronized image and depth data to calculate real-world scale.

### Expected Payload (Form-Data):

> image: The RGB image file (JPEG/PNG).
> depth_map: The synchronized raw depth matrix from the AR session.
> focal_length: The intrinsic focal length of the camera (Float).

### Expected Response:

```JSON
{
  "status": "success",
  "dimensions": {
    "height_cm": 4.2,
    "width_cm": 15.6,
    "length_cm": 12.1
  }
}
```
