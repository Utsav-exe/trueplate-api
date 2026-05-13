import numpy as np
import cv2

def calculate_real_dimensions(binary_mask, depth_matrix, focal_length):
    # 1. Isolate the depth pixels belonging to the food
    food_depths = depth_matrix[binary_mask == 1]
    
    # Safety check: if SAM failed to find food, return zeros
    if len(food_depths) == 0:
        return {"height_cm": 0.0, "width_cm": 0.0, "length_cm": 0.0}

    # 2. Remove LiDAR noise (highly reflective surfaces)
    # We clip the top and bottom 2% of depth values to remove extreme outliers
    lower_bound = np.percentile(food_depths, 2)
    upper_bound = np.percentile(food_depths, 98)
    valid_food_depths = food_depths[(food_depths >= lower_bound) & (food_depths <= upper_bound)]

    # 3. Calculate Table Depth (Background)
    background_depths = depth_matrix[binary_mask == 0]
    table_depth = np.median(background_depths) 

    # 4. Calculate Absolute Height
    # Height is the distance from the table to the closest (peak) valid food pixel
    peak_food_depth = np.min(valid_food_depths)
    absolute_height_mm = table_depth - peak_food_depth

    # 5. Calculate Width and Length
    # Convert binary mask to uint8 so OpenCV can read it
    mask_uint8 = (binary_mask * 255).astype(np.uint8)
    
    # Get the 2D bounding box of the food footprint (x, y, width_pixels, length_pixels)
    x, y, w_pixels, l_pixels = cv2.boundingRect(mask_uint8)

    # Use the median depth of the food to calculate the cross-sectional footprint
    avg_food_depth = np.median(valid_food_depths)

    # Pinhole conversion: Real = (Pixels * Depth) / Focal_Length
    estimated_width_mm = (w_pixels * avg_food_depth) / focal_length
    estimated_length_mm = (l_pixels * avg_food_depth) / focal_length

    # Convert everything to centimeters and round to 2 decimal places
    return {
        "height_cm": round(absolute_height_mm / 10, 2),
        "width_cm": round(estimated_width_mm / 10, 2),
        "length_cm": round(estimated_length_mm / 10, 2)
    }