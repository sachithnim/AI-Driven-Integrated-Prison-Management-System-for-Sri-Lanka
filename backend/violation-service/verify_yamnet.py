import tensorflow_hub as hub
import os

print("Attempting to load YAMNet model...")
try:
    # Set cache dir explicitly if needed, but default is usually fine
    model = hub.load('https://tfhub.dev/google/yamnet/1')
    print("SUCCESS: YAMNet model loaded successfully.")
    
    # Check if we can access class map (was also part of the init logic)
    class_map_path = model.class_map_path().numpy().decode('utf-8')
    print(f"Class map path: {class_map_path}")
    
except Exception as e:
    print(f"FAILURE: Failed to load model. Error: {e}")
