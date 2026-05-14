#### TruePlate API
TruePlate is the backend infrastructure for a spatial-computing application designed to calculate the absolute real-world dimensions (height, width, length) of restaurant dishes using 2D image data and native mobile LiDAR/ToF depth sensors.

By bypassing the "missing absolute scale" problem of standard 2D photos, TruePlate provides exact dimensional data without requiring the user to place reference objects (like coins or cards) next to their food.

#### Team & Architecture
This system is designed around a micro-service approach, handling heavy dual-payloads (RGB + Depth Maps) and relational data logging.

Machine Learning & API (Utsav): FastAPI service handling heavy payload processing, semantic segmentation (using MobileSAM for lightweight, edge-ready food isolation), and API endpoint architecture.

Mobile / Sensor Integration (Animesh): iOS/Android application handling the capture, synchronization, and payload compression of high-resolution RGB images alongside raw LiDAR/ToF Depth Matrices (ARDepthData).

Computer Vision & Infrastructure (Sarthak): Point-cloud mathematics for absolute dimension conversions, SQLite database architecture (SQLAlchemy) for scan logging, depth-map noise filtering, and cloud deployment/DevOps.

#### Setup Instructions
1. Clone the repository
```bash
git clone https://github.com/Utsav-exe/trueplate-api.git
cd trueplate-api
```
3. Environment Setup
Create a virtual environment to prevent dependency conflicts, then install the required machine learning and server dependencies:

```bash
# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate
# OR Activate it (Mac/Linux)
source .venv/bin/activate

# Install dependencies (Make sure timm and MobileSAM are included)
pip install -r requirements.txt
pip install git+https://github.com/ChaoningZhang/MobileSAM.git
```
3. Database Initialization
This project uses SQLite for local development. You do not need to install an external database server.
Simply running the application will automatically generate a local trueplate.db file and build the required tables (users, meals, dimensions) via SQLAlchemy. A dummy test user (user_id=1) is automatically seeded on startup.

4. Model Weights (MobileSAM)
This API uses a lightweight Vision Transformer (MobileSAM) to run semantic segmentation efficiently on standard CPUs.
Before running the server, you must download the 39MB model weights and place them in a models/ directory at the project root.

```bash
mkdir models
# Download the weights file:
curl -o models/mobile_sam.pt https://raw.githubusercontent.com/ChaoningZhang/MobileSAM/master/weights/mobile_sam.pt
```
#### Run the Development Server
```bash
python main.py
```
The API and Swagger Documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

#### Local MVP Testing
The API is configured to run end-to-end on local hardware. It strictly requires a 2D depth matrix file to process dimensions.

If you do not have an iPhone LiDAR .npy file available for testing via the Swagger UI, you can generate a synthetic one locally using Python:

#### Python
```bash
import numpy as np
# Creates a synthetic 800x800 depth map set to 500mm deep
fake_depth = np.full((800, 800), 500.0, dtype=np.float32)
np.save("test_lidar.npy", fake_depth)
```
Upload this test_lidar.npy file into the depth_map field along with any RGB image to test the spatial math engine.

#### Core Endpoints
POST /calculate-dimensions
Receives synchronized image and depth data to calculate real-world scale and logs the calculation to the database. The API automatically resizes the lower-resolution LiDAR matrices to match the high-resolution RGB image.

Expected Payload (Multipart/Form-Data):

image: The RGB image file (JPEG/PNG).

depth_map: The synchronized raw depth matrix file (.npy).

focal_length: The intrinsic focal length of the camera (Float).

Expected Response (JSON):

```json
{
  "status": "success",
  "meal_id": 3,
  "dimensions": {
    "height_cm": 0.0,
    "width_cm": 105.0,
    "length_cm": 78.0
  }
}
```
GET /meals/
Retrieves the scan history for the current user. Useful for populating dashboard and historical views on the client side.

Expected Response (JSON):

```json
{
  "status": "success",
  "history": [
    {
      "meal_id": 1,
      "scan_date": "2026-05-14T15:03:13.123456",
      "dimensions": {
        "height_cm": 0.0,
        "width_cm": 105.0,
        "length_cm": 78.0
      }
    }
  ]
}
```
