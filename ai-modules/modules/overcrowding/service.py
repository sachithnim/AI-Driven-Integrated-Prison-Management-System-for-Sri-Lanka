import logging
import io
import base64
from typing import List, Dict, Any
from PIL import Image, ImageDraw
import numpy as np
import torch
from transformers import pipeline
from scipy.ndimage import gaussian_filter

# Scikit-learn for allocation logic
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)

class HeadCountService:
    def __init__(self):
        self.detector = None
        try:
            logger.info("Loading object detection model (facebook/detr-resnet-50)...")
            # Initialize the object detection pipeline
            # This will download the model on first run (~160MB)
            self.detector = pipeline("object-detection", model="facebook/detr-resnet-50")
            logger.info("Object detection model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load object detection model: {str(e)}")
            self.detector = None

    def detect_count(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Detects the number of people in the image using DETR and generates a heatmap.
        """
        if not self.detector:
            return {
                "count": 0,
                "status": "error",
                "message": "Model not initialized. Check server logs."
            }

        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Run detection
            results = self.detector(image)
            
            # Filter for 'person' class with confidence > 0.7
            people = [r for r in results if r['label'] == 'person' and r['score'] > 0.7]
            count = len(people)
            
            # --- Visualization Logic ---
            vis_image = image.copy().convert("RGBA")
            draw = ImageDraw.Draw(vis_image)
            
            centers = []
            for p in people:
                box = p['box'] # {'xmin': 1, 'ymin': 1, 'xmax': 100, 'ymax': 100}
                # Draw bounding box
                draw.rectangle([box['xmin'], box['ymin'], box['xmax'], box['ymax']], outline="lime", width=3)
                
                # Calculate center for heatmap
                center_x = int((box['xmin'] + box['xmax']) / 2)
                center_y = int((box['ymin'] + box['ymax']) / 2)
                centers.append((center_x, center_y))

            # Generate Heatmap
            if centers:
                # Create a blank grid
                heatmap = np.zeros((image.height, image.width), dtype=np.float32)
                
                # Mark centers
                for x, y in centers:
                    if 0 <= x < image.width and 0 <= y < image.height:
                        heatmap[y, x] = 1
                
                # Apply Gaussian filter to create "heat" blobs
                # Sigma controls the spread of the blob
                heatmap = gaussian_filter(heatmap, sigma=50)
                
                # Normalize to 0-1
                if heatmap.max() > 0:
                    heatmap = heatmap / heatmap.max()
                
                # Create heatmap overlay (Red color with varying alpha)
                heatmap_overlay = Image.new("RGBA", image.size)
                heatmap_pixels = heatmap_overlay.load()
                
                # This loop can be slow for large images in Python, but acceptable for demo
                # Optimization: Use numpy vectorization if performance is critical
                # Vectorized approach:
                heatmap_uint8 = (heatmap * 255).astype(np.uint8)
                
                # Create an RGBA array
                rgba_array = np.zeros((image.height, image.width, 4), dtype=np.uint8)
                rgba_array[..., 0] = 255  # Red channel
                rgba_array[..., 1] = 0    # Green
                rgba_array[..., 2] = 0    # Blue
                rgba_array[..., 3] = (heatmap * 150).astype(np.uint8) # Alpha (max 150 opacity)
                
                heatmap_overlay = Image.fromarray(rgba_array, "RGBA")
                
                # Composite
                vis_image = Image.alpha_composite(vis_image, heatmap_overlay)

            # Convert processed image to base64
            buffered = io.BytesIO()
            vis_image.convert("RGB").save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "count": count,
                "status": "success",
                "method": "facebook/detr-resnet-50",
                "image_base64": img_str,
                "details": [{"score": round(p['score'], 2), "box": p['box']} for p in people]
            }
        except Exception as e:
            logger.error(f"Error in head count detection: {str(e)}")
            return {"count": 0, "status": "error", "message": str(e)}

class CellAllocationService:
    def __init__(self):
        self.scaler = MinMaxScaler()
        # Mapping security levels to numeric values for analysis
        self.security_map = {
            "Minimum": 1,
            "Medium": 2,
            "Maximum": 3,
            "Supermax": 4
        }

    def _get_security_score(self, level: str) -> int:
        return self.security_map.get(level, 2) # Default to Medium

    def suggest_allocation(self, inmate_data: Dict[str, Any], cells_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Suggests cells using a weighted scoring algorithm based on capacity and security compatibility.
        """
        if not cells_data:
            return []

        # 1. Filter out full cells
        available_cells = [c for c in cells_data if c.get('current_count', 0) < c.get('capacity', 1)]
        
        if not available_cells:
            return []

        # 2. Prepare features for scoring
        # Inmate features
        inmate_security = self._get_security_score(inmate_data.get('security_level', 'Medium'))
        
        scored_cells = []
        
        for cell in available_cells:
            # Cell features
            capacity = cell.get('capacity', 1)
            current = cell.get('current_count', 0)
            occupancy_rate = current / capacity
            
            # Assume cell block implies security level (simplified logic for demo)
            # In a real system, cell object would have a 'security_level' property
            # Here we simulate it or check if it exists
            cell_security_level = cell.get('security_level', 'Medium') 
            cell_security_score = self._get_security_score(cell_security_level)
            
            # --- Scoring Logic ---
            
            # Factor 1: Space Availability (Lower occupancy is better)
            # Weight: 0.4
            space_score = 1.0 - occupancy_rate
            
            # Factor 2: Security Compatibility
            # We want the cell security to match the inmate security
            # Calculate difference, normalize to 0-1 range (assuming max diff is 3)
            # Smaller difference is better
            security_diff = abs(inmate_security - cell_security_score)
            security_match_score = 1.0 - (security_diff / 3.0)
            # Weight: 0.6 (Security is more important)
            
            # Total Score
            final_score = (space_score * 0.4) + (security_match_score * 0.6)
            
            scored_cells.append({
                **cell,
                'occupancy_rate': round(occupancy_rate, 2),
                'security_match': round(security_match_score, 2),
                'score': round(final_score, 3)
            })
        
        # 3. Sort by score (descending)
        scored_cells.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_cells[:5] # Return top 5 suggestions
