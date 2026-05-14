import torch
import numpy as np
from mobile_sam import sam_model_registry, SamAutomaticMaskGenerator

# Automatically use GPU if available, otherwise run effortlessly on CPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading MobileSAM on {device}...")

# 1. Initialize MobileSAM
model_type = "vit_t"
sam_checkpoint = "./models/mobile_sam.pt"

mobile_sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
mobile_sam.to(device=device)
mobile_sam.eval()

# 2. Create the Mask Generator
mask_generator = SamAutomaticMaskGenerator(mobile_sam)

def generate_food_mask(rgb_image: np.ndarray) -> np.ndarray:
    """
    Takes an RGB image array, runs MobileSAM, and returns a binary mask
    of the largest segmented object (assumed to be the food/plate).
    """
    print("Generating mask with MobileSAM...")
    
    # Generate all possible masks
    masks = mask_generator.generate(rgb_image)
    
    h, w = rgb_image.shape[:2]
    
    # Fallback if the AI finds absolutely nothing
    if len(masks) == 0:
        print("Warning: MobileSAM found no masks. Returning empty array.")
        return np.zeros((h, w), dtype=np.uint8)

    # Sort the masks by area (largest first)
    sorted_masks = sorted(masks, key=(lambda x: x['area']), reverse=True)
    
    # Grab the largest mask (usually the plate/food in a top-down food photo)
    # The 'segmentation' key contains a boolean array, we convert it to 0s and 1s
    best_mask = sorted_masks[0]['segmentation'].astype(np.uint8)
    
    return best_mask