from ultralytics import YOLO
import cv2
import numpy as np
import os

class YoloDetector:
    def __init__(self, model_path=None):
        """
        Initialize YOLOv11 detector.
        If model_path is None, it tries to load 'runs/detect/sohas_weapon_model/weights/best.pt'.
        Falls back to 'yolo11n.pt' if custom model is not found.
        """
        if model_path is None:
            # Check for trained custom model
            custom_path = 'ml_models/weapon_detection_1.pt'
            if os.path.exists(custom_path):
                model_path = custom_path
                print(f"Found custom trained model at {model_path}")
            else:
                model_path = 'yolo11m.pt'
                print(f"Custom model not found at {custom_path}, using default {model_path}")
                print("Tip: Run 'python backend/train_weapon_detector.py' to train on your dataset.")

        print(f"Loading YOLO model from {model_path}...")
        self.model = YOLO(model_path)
        self.classes = self.model.names

    def detect(self, frame):
        """
        Perform detection on a single frame.
        Returns: list of detections [{'class': 'knife', 'conf': 0.95, 'bbox': [x1, y1, x2, y2]}]
        """
        # Lower base confidence and set imgsz=640 to trigger P3-P5 multi-scale features for small objects
        results = self.model(frame, verbose=False, imgsz=640, conf=0.1)
        detections = []
        
        # Debug: Print all detections to see what's happening
        # print(f"Raw Detections: {len(results[0].boxes)}")
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = self.classes[cls_id]
                xyxy = box.xyxy[0].tolist()
                
                print(f"DEBUG DETECT: {label} ({conf:.2f})") 

                # Class-specific NMS thresholding
                threshold = 0.5 # Default strict threshold
                if label in ['Knife']:
                    threshold = 0.35
                elif label in ['Gun']:
                    threshold = 0.5
                elif label in ['Weapon']:
                    threshold = 0.4
                    
                if conf >= threshold: 
                    detections.append({
                        "class": label,
                        "conf": conf,
                        "bbox": xyxy
                    })
        return detections

if __name__ == "__main__":
    # Test
    detector = YoloDetector()
    dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
    print(detector.detect(dummy_frame))
