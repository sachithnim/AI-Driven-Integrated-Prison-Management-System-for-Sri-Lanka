from openai import OpenAI
import os
from typing import List
import json

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            print("Warning: OPENAI_API_KEY not found. Using Mock LLM.")
            self.client = None

    def generate_incident_report(self, incident_data: dict) -> str:
        """
        Generates a detailed report for an incident using LLM.
        """
        prompt = f"""
        You are a Prison Security Analyst AI. Generate a detailed formal incident report for the following event:
        
        Type: {incident_data.get('type')}
        Severity: {incident_data.get('severity')}
        Camera ID: {incident_data.get('camera_id')}
        Timestamp: {incident_data.get('timestamp')}
        Description: {incident_data.get('description')}
        detected_objects: {incident_data.get('detected_objects', 'N/A')}
        
        The report should include:
        1. Executive Summary
        2. Event Timeline (reconstructed)
        3. Recommended Actions
        4. Threat Assessment
        """

        if not self.client:
           return self._mock_response(incident_data)

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {e}")
            return "Error generating report."

    def predict_future_risks(self, history: List[dict]) -> str:
        """
        analyzes recent history to predict future risks.
        """
        prompt = f"""
        Analyze the following recent prison incidents data and predict potential future violence risks.
        
        History:
        {json.dumps(history, indent=2, default=str)}
        
        Provide:
        1. Risk Trend Analysis (Increasing/Decreasing)
        2. Predicted Hotspots (which cameras/locations)
        3. Recommendations for preventive measures.
        """
        
        if not self.client:
            return "LLM Analysis Unavailable (No API Key). Trend appears stable based on mock data."

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
             return f"Error in prediction: {e}"

    def _mock_response(self, data):
        return f"""
        [MOCK GENERATED REPORT]
        
        INCIDENT REPORT
        ---------------
        Date: {data.get('timestamp')}
        Location: Camera {data.get('camera_id')}
        
        Summary:
        A {data.get('severity')} severity incident of type {data.get('type')} was detected.
        
        Analysis:
        System detected potential aggression. Immediate staff intervention is recommended.
        
        (Configure OPENAI_API_KEY to get real LLM analysis)
        """
