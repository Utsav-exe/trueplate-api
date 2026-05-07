import torch
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator

def generate_food_mask(rgb_image):
    # Initialize SAM
    sam_checkpoint = "models/sam_vit_h_4b8939.pth"
    model_type = "vit_h"
    device = "cuda" if torch.cuda.is_available() else "cpu"

    sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
    sam.to(device=device)

    mask_generator = SamAutomaticMaskGenerator(sam)

    masks = mask_generator.generate(rgb_image)

    return target_mask