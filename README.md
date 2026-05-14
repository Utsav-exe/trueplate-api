### TruePlate API
TruePlate is the backend infrastructure for a spatial-computing application designed to calculate the absolute real-world dimensions (height, width, length) of restaurant dishes using 2D image data and native mobile LiDAR/ToF depth sensors.

By bypassing the "missing absolute scale" problem of standard 2D photos, TruePlate provides exact dimensional data without requiring the user to place reference objects (like coins or cards) next to their food.

### Team & Architecture
This system is designed around a micro-service approach, handling heavy dual-payloads (RGB + Depth Maps) and relational data logging.

Machine Learning & API (Utsav): FastAPI service handling heavy payload processing, semantic segmentation (using the Segment Anything Model - SAM) for food isolation, and API endpoint architecture.

Mobile / Sensor Integration (Animesh): iOS/Android application handling the capture, synchronization, and payload compression of high-resolution RGB images alongside raw LiDAR/ToF Depth Matrices (ARDepthData).

Computer Vision & Infrastructure (Sarthak): Point-cloud mathematics for absolute dimension conversions, SQLite database architecture (SQLAlchemy) for scan logging, depth-map noise filtering, and cloud deployment/DevOps.

### Setup Instructions
1. Clone the repository
```bash
git clone https://github.com/Utsav-exe/trueplate-api.git
cd trueplate-api
```
3. Environment Setup
Create a virtual environment to prevent dependency conflicts, then install the required machine learning and server dependencies using the requirements file:

```bash
# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate
# OR Activate it (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```
3. Database Initialization
This project uses SQLite for local development. You do not need to install an external database server.
Simply running the application will automatically generate a local trueplate.db file and build the required tables (users, meals, dimensions) via SQLAlchemy. A dummy test user (user_id=1) is automatically seeded on startup.

4. Model Weights (Production Mode)
To run the actual AI segmentation, download the SAM checkpoint (sam_vit_h_4b8939.pth) and place it in a /models directory at the project root before running the segmentation logic.

Local Testing / MVP Bypass Mode
To allow local testing without requiring the massive 2.5GB SAM AI model or raw iPhone LiDAR arrays, main.py is currently configured with a Mock Data Bypass.

When testing via Swagger UI ([http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)):

You can upload standard JPEG/PNG images for both the image and depth_map fields.

The code actively ignores the uploaded depth map and generates a synthetic 500mm deep flat-plane matrix to prevent NumPy buffer crashes.

The AI segmentation is bypassed, and a synthetic square mask is generated in the center of the image to test the spatial math engine and database insertion.

(To switch to production mode, delete the "Mock Data Block" inside main.py and uncomment the real depth_bytes and generate_food_mask() functions).

Run the Development Server
```bash
python main.py
```
The API and Swagger Documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

Core Endpoints
POST /calculate-dimensions
Receives synchronized image and depth data to calculate real-world scale and logs the calculation to the database.

Expected Payload (Multipart/Form-Data):

image: The RGB image file (JPEG/PNG).

depth_map: The synchronized raw depth matrix from the AR session (or a dummy file if testing locally).

focal_length: The intrinsic focal length of the camera (Float).

Expected Response (JSON):

```JSON
{
  "status": "success",
  "meal_id": 2,
  "dimensions": {
    "height_cm": 0.0,
    "width_cm": 150.0,
    "length_cm": 84.0
  }
}
