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