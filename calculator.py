import numpy as np
import cv2

def calculate_real_dimensions(binary_mask, depth_matrix, focal_length):
    # 1. Isolate the depth pixels belonging to the food
    food_depths = depth_matrix[binary_mask == 1]
    
    if len(food_depths) == 0:
        return {"height_cm": 0.0, "width_cm": 0.0, "length_cm": 0.0}

    # 2. Filtering: Remove LiDAR noise (top/bottom 2% outliers)
    lower_bound = np.percentile(food_depths, 2)
    upper_bound = np.percentile(food_depths, 98)
    valid_food_depths = food_depths[(food_depths >= lower_bound) & (food_depths <= upper_bound)]

    # 3. Calculate Base (Table) and Peak (Food)
    background_depths = depth_matrix[binary_mask == 0]
    table_depth = np.median(background_depths) 
    peak_food_depth = np.min(valid_food_depths)
    
    absolute_height_mm = table_depth - peak_food_depth

    # 4. 3D Math: Pinhole Projection for Width/Length
    mask_uint8 = (binary_mask * 255).astype(np.uint8)
    x, y, w_pixels, l_pixels = cv2.boundingRect(mask_uint8)
    avg_food_depth = np.median(valid_food_depths)

    # Real = (Pixels * Depth) / Focal_Length
    estimated_width_mm = (w_pixels * avg_food_depth) / focal_length
    estimated_length_mm = (l_pixels * avg_food_depth) / focal_length

    return {
        "height_cm": round(absolute_height_mm / 10, 2),
        "width_cm": round(estimated_width_mm / 10, 2),
        "length_cm": round(estimated_length_mm / 10, 2)
    }