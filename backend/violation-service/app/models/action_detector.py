import torch
import numpy as np
import os

# Note: In a real deployment, you might need to install 'pytorchvideo' specifically
# pip install pytorchvideo

class ActionDetector:
    def __init__(self, model_path='ml_models/x3d_rwf_best.pt'):
        print("Loading X3D model...")
        
        # 1. Load Architecture (X3D-S)
        self.model = torch.hub.load('facebookresearch/pytorchvideo', 'x3d_s', pretrained=True)
        
        # 2. Modify Head for 2 classes (Fight, NonFight)
        import torch.nn as nn
        in_features = self.model.blocks[5].proj.in_features
        self.model.blocks[5].proj = nn.Linear(in_features, 2)
        
        # 3. Load Custom Weights
        if os.path.exists(model_path):
            print(f"Loading custom trained weights from {model_path}...")
            # Map location needed if training was on GPU but inference on CPU
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            self.model.load_state_dict(torch.load(model_path, map_location=device))
            self.classes = ['Fight', 'NonFight']
        else:
            print(f"Custom model not found at {model_path}. Using random initialization for head (WARNING: Untrained!).")
            # In a real fallback, we might keep the original 400 classes, but here we want to enforce RWF schema
            self.classes = ['Fight', 'NonFight']

        self.model.eval()
        self.violence_labels = ['fight'] # 'Fight' class is index 0 or 1, mapped by name below

    def preprocess_video(self, frames):
        """
        Preprocess a list of frames for X3D model using pytorchvideo transforms.
        frames: List of numpy arrays (H, W, 3) in BGR format.
        Returns: Tensor (1, 3, T, H, W) normalized and resized.
        """
        import cv2
        from torchvision.transforms import Compose, Normalize
        from pytorchvideo.transforms import ShortSideScale, UniformTemporalSubsample
        
        # Need to import CenterCrop but CenterCrop in torchvision applies to (C, H, W), not (C, T, H, W).
        # We can apply CenterCrop spatial over the temporal dimension if we view it as C' = C*T, or we do it simply using functional
        # PytorchVideo has spatial crops, let's use standard slicing to be safe and dependency-free for CenterCrop across T.
        # Wait, torchvision's CenterCrop works on arbitrary leading dimensions in newer versions! Let's import it:
        from torchvision.transforms import CenterCrop

        # 1. Convert list of BGR numpy arrays to RGB stacked tensor (C, T, H, W)
        rgb_frames = [cv2.cvtColor(f, cv2.COLOR_BGR2RGB) for f in frames]
        tensor = torch.tensor(np.array(rgb_frames), dtype=torch.float32)
        
        tensor = tensor.permute(3, 0, 1, 2)
        tensor = tensor / 255.0

        # 2. Apply transforms
        # Since torchvision Normalize expects (C, H, W) in older versions, we loop over T or reshape
        # But for video (C, T, H, W), we can normalize channels across all dims.
        transform = Compose([
            UniformTemporalSubsample(13),
            ShortSideScale(size=160),
            CenterCrop(160)
        ])

        tensor = transform(tensor)
        
        # Apply normalization manually to support (C, T, H, W)
        mean = torch.tensor([0.45, 0.45, 0.45]).view(3, 1, 1, 1)
        std = torch.tensor([0.225, 0.225, 0.225]).view(3, 1, 1, 1)
        tensor = (tensor - mean) / std
        return tensor.unsqueeze(0)

    def predict(self, video_frames):
        """
        video_frames: List of numpy arrays (T, H, W, C).
        """
        if not video_frames or len(video_frames) < 4:
            return [] # Need minimum frames

        try:
            input_tensor = self.preprocess_video(video_frames)
            
            with torch.no_grad():
                preds = self.model(input_tensor)
                
            # Get top predictions
            post_act = torch.nn.Softmax(dim=1)
            preds = post_act(preds)
            pred_classes = preds.topk(k=2) # Only 2 classes now
            
            results = []
            for i in range(2):
                idx = int(pred_classes.indices[0][i])
                score = float(pred_classes.values[0][i])
                
                label = self.classes[idx]
                is_violent = (label.lower() == 'fight') # Simple check
    
                results.append({
                    "class": label,
                    "score": score,
                    "is_violent": is_violent
                })
                
            return results
        except Exception as e:
            print(f"Action Prediction Error: {e}")
            return []

if __name__ == "__main__":
    detector = ActionDetector()
    # Dummy input: list of 16 numpy arrays (H, W, 3) representing BGR frames
    import numpy as np
    dummy_input = [np.random.randint(0, 256, (160, 160, 3), dtype=np.uint8) for _ in range(16)]
    print(detector.predict(dummy_input))
