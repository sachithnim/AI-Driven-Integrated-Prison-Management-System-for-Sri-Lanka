from ultralytics import YOLO

try:
    model = YOLO("ml_models/weapon_detection.pt")
    print("Model loaded successfully.")
    print("Classes:", model.names)
except Exception as e:
    print(f"Error loading model: {e}")
