import torch
import torch.nn as nn
import torch.nn.functional as F

class FusionMLP(nn.Module):
    def __init__(self, audio_emb_size=1024, hidden_size=64, num_classes=3):
        super(FusionMLP, self).__init__()
        # Input size: Weapon (1) + Fight (1) + Audio Embedding (1024)
        input_size = 2 + audio_emb_size
        
        # Gating network
        self.gate = nn.Sequential(
            nn.Linear(input_size, 16),
            nn.ReLU(),
            nn.Linear(16, 3),
            nn.Sigmoid()
        )
        
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_classes)
        
        self.classes = ['Low', 'Medium', 'High']

    def forward(self, weapon, fight, audio_emb):
        x = torch.cat([weapon, fight, audio_emb], dim=1)
        
        # Compute gates
        g = self.gate(x) # (batch, 3)
        g_w = g[:, 0:1]
        g_f = g[:, 1:2]
        g_a = g[:, 2:3]
        
        # Apply gates
        weapon_g = weapon * g_w
        fight_g = fight * g_f
        audio_emb_g = audio_emb * g_a
        
        x_gated = torch.cat([weapon_g, fight_g, audio_emb_g], dim=1)
        
        out = self.fc1(x_gated)
        out = self.relu(out)
        out = self.fc2(out)
        return out

    def predict(self, weapon_score, fight_score, audio_emb, scream_score=0.0):
        """
        Predict using the gated fusion model.
        """
        # If no confidence from any model, override and return Low immediately
        # (prevents untrained random MLP from predicting 'High' on pure silence/empty frames)
        if weapon_score < 0.1 and fight_score < 0.1 and scream_score < 0.1:
            return "Low", 1.0
            
        self.eval()
        with torch.no_grad():
            weapon_t = torch.FloatTensor([[weapon_score]])
            fight_t = torch.FloatTensor([[fight_score]])
            audio_t = torch.FloatTensor([audio_emb]) if audio_emb is not None else torch.zeros(1, 1024)
            if audio_t.dim() == 1:
                audio_t = audio_t.unsqueeze(0)
                
            outputs = self(weapon_t, fight_t, audio_t)
            probs = F.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probs, 1)
            
            alert_level = self.classes[predicted.item()]
            
            # Additional heuristic guardrail for random un-finetuned MLP initialized states
            # If MLP output conflicts with heuristic common sense, use heuristic
            heuristic_level, heuristic_conf = self.heuristic_predict(weapon_score, fight_score, scream_score)
            
            severity = {"Low": 0, "Medium": 1, "High": 2}
            # If MLP strongly deviates from heuristic, cap it or boost it
            if abs(severity[heuristic_level] - severity[alert_level]) >= 2:
                # MLP says High but heuristic says Low, or vice versa
                return heuristic_level, heuristic_conf
                
            return alert_level, confidence.item()

    def heuristic_predict(self, weapon, fight, scream):
        """
        Fallback rule-based prediction if model is not trained.
        """
        
        if weapon > 0.5 or fight > 0.6:
            return "High", max(weapon, fight)
        elif scream > 0.5:
            return "Medium", scream
        elif weapon > 0.3 or fight > 0.3 or scream > 0.3:
            return "Medium", max(weapon, fight, scream)
        else:
            return "Low", (1.0 - max(weapon, fight, scream))
