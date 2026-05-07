import numpy as np

def calculate_real_dimensions(binary_mask, depth_matrix, focal_length):
    food_depths = depth_matrix[binary_mask == 1]

    background_depths = depth_matrix[binary_mask == 0]
    table_depth = np.median(background_depths)

    peak_food_depth = np.min(food_depths)
    absolute_height_mm = table_depth - peak_food_depth

    estimated_width_mm = 0.0
    estimated_length_mm = 0.0

    return {
        "height_cm": absolute_height_mm / 10,
        "width_cm": estimated_width_mm / 10,
        "length_cm": estimated_length_mm / 10
    }