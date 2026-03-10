import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import csv

class AudioDetector:
    def __init__(self):
        print("Loading YAMNet model from TensorFlow Hub...")
        self.model = hub.load('https://tfhub.dev/google/yamnet/1')
        self.class_map_path = self.model.class_map_path().numpy().decode('utf-8')
        self.class_names = self._load_class_names(self.class_map_path)
        
        # Target classes to watch for
        self.target_classes = ['Screaming', 'Shouting', 'Yell', 'Explosion', 'Gunshot, gunfire']

    def _load_class_names(self, csv_path):
        class_names = []
        with open(csv_path) as csv_file:
            reader = csv.reader(csv_file)
            next(reader)  # Skip header
            for row in reader:
                class_names.append(row[2])
        return np.array(class_names)

    def predict(self, waveform):
        """
        Predict audio events from a waveform.
        waveform: 1D numpy array of float32, normalized to [-1, 1], sample rate 16kHz.
        Returns: tuple of (results_list, mean_embedding)
        """
        # Volume-based silence filter
        rms = np.sqrt(np.mean(waveform**2))
        dbfs = 20 * np.log10(rms + 1e-9)
        if dbfs < -55:
            # Silence, return no detection
            return [], np.zeros(1024, dtype=np.float32)

        # YAMNet expects a 1D float32 tensor
        scores, embeddings, spectrogram = self.model(waveform)
        
        # Average scores across all frames in the clip (usually 0.48s windows)
        mean_scores = np.mean(scores, axis=0)
        mean_embedding = np.mean(embeddings, axis=0)
        
        top_n_indices = np.argsort(mean_scores)[::-1][:5]
        
        results = []
        for i in top_n_indices:
            label = self.class_names[i]
            score = float(mean_scores[i])
            
            # Check if relevant
            is_violent = any(target in label for target in self.target_classes)
            
            results.append({
                "class": label,
                "score": score,
                "is_violent": is_violent
            })
            
        return results, mean_embedding.numpy() if hasattr(mean_embedding, 'numpy') else mean_embedding

if __name__ == "__main__":
    detector = AudioDetector()
    # Dummy waveform: 1 second of silence at 16kHz
    dummy_wave = np.zeros(16000, dtype=np.float32)
    print(detector.predict(dummy_wave))
