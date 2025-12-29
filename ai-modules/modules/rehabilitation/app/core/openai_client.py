"""
OpenAI Integration for Enhanced AI Analysis
Provides LLM-powered insights, reasoning, and plan generation
"""

import os
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Import settings to use configured OpenAI parameters
try:
    from app.core.config import settings
    USE_SETTINGS = True
except ImportError:
    USE_SETTINGS = False
    logger.warning("Could not import settings, using environment variables directly")


class OpenAIClient:
    """OpenAI client for rehabilitation AI enhancements"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize OpenAI client
        
        Args:
            api_key: OpenAI API key (defaults to settings or OPENAI_API_KEY env var)
        """
        if USE_SETTINGS:
            self.api_key = api_key or settings.OPENAI_API_KEY
            self.model = settings.OPENAI_MODEL
            self.max_tokens = settings.OPENAI_MAX_TOKENS
            self.temperature = settings.OPENAI_TEMPERATURE
        else:
            self.api_key = api_key or os.getenv('OPENAI_API_KEY')
            self.model = os.getenv('OPENAI_MODEL', 'gpt-4-turbo-preview')
            self.max_tokens = int(os.getenv('OPENAI_MAX_TOKENS', '300'))
            self.temperature = float(os.getenv('OPENAI_TEMPERATURE', '0.7'))
        
        if not self.api_key:
            logger.warning("OpenAI API key not found. LLM features will be disabled.")
            self.enabled = False
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=self.api_key)
            self.enabled = True
            logger.info("OpenAI client initialized successfully")
    
    async def get_chat_completion(self, messages: List[Dict[str, str]]) -> str:
        """
        Get a chat completion from OpenAI
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            Response content string
        """
        if not self.enabled:
            return ""
            
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI chat completion error: {e}")
            raise e

    async def generate_eligibility_reasoning(
        self,
        inmate_data: Dict[str, Any],
        prediction: bool,
        probability: float,
        risk_factors: List[str],
        strengths: List[str]
    ) -> str:
        """
        Generate detailed reasoning for eligibility decision using GPT
        
        Args:
            inmate_data: Inmate profile dictionary
            prediction: Eligibility prediction (True/False)
            probability: Prediction probability
            risk_factors: List of identified risk factors
            strengths: List of identified strengths
            
        Returns:
            Detailed reasoning text
        """
        if not self.enabled:
            return self._fallback_reasoning(inmate_data, prediction, probability)
        
        try:
            prompt = f"""As a rehabilitation assessment expert, provide a comprehensive analysis of this inmate's eligibility for rehabilitation programs.

INMATE PROFILE:
- ID: {inmate_data.get('inmate_id', 'N/A')}
- Age: {inmate_data.get('age', 'N/A')}
- Crime: {inmate_data.get('crime_type', 'N/A')}
- Sentence: {inmate_data.get('sentence_length_months', 0)} months (served {inmate_data.get('time_served_months', 0)} months)
- Behavior Score: {inmate_data.get('behavior_score', 0):.1f}/100
- Discipline Score: {inmate_data.get('discipline_score', 0):.1f}/100
- Risk Score: {inmate_data.get('risk_score', 0):.2f} (0=low, 1=high)
- Programs Completed: {inmate_data.get('programs_completed', 0)}
- Violations: {inmate_data.get('institutional_violations', 0)}

RISK FACTORS:
{chr(10).join(f'- {factor}' for factor in risk_factors) if risk_factors else '- None identified'}

STRENGTHS:
{chr(10).join(f'- {strength}' for strength in strengths) if strengths else '- None identified'}

AI PREDICTION: {'ELIGIBLE' if prediction else 'NOT ELIGIBLE'} (Confidence: {probability*100:.1f}%)

Provide a 3-4 sentence professional assessment that:
1. Summarizes the key factors influencing this decision
2. Explains why the inmate is or isn't ready for rehabilitation
3. Provides specific recommendations for improvement if not eligible
4. Considers Sri Lankan prison context and cultural factors

Be objective, compassionate, and evidence-based."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert prison rehabilitation assessment specialist with deep knowledge of evidence-based rehabilitation programs and Sri Lankan correctional system."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            reasoning = response.choices[0].message.content.strip()
            logger.info(f"Generated OpenAI reasoning for inmate {inmate_data.get('inmate_id')}")
            return reasoning
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self._fallback_reasoning(inmate_data, prediction, probability)
    
    def _fallback_reasoning(self, inmate_data: Dict, prediction: bool, probability: float) -> str:
        """Fallback reasoning when OpenAI is unavailable"""
        behavior = inmate_data.get('behavior_score', 0)
        discipline = inmate_data.get('discipline_score', 0)
        risk = inmate_data.get('risk_score', 1)
        programs = inmate_data.get('programs_completed', 0)
        
        if prediction:
            return (f"Inmate demonstrates readiness for rehabilitation based on behavior score "
                   f"({behavior:.1f}/100), discipline score ({discipline:.1f}/100), and "
                   f"risk assessment ({risk:.2f}). With {programs} completed programs and "
                   f"{probability*100:.1f}% confidence, recommend enrollment in targeted "
                   f"rehabilitation initiatives.")
        else:
            return (f"Inmate requires behavioral improvement before rehabilitation eligibility. "
                   f"Current scores - behavior: {behavior:.1f}/100, discipline: {discipline:.1f}/100, "
                   f"risk: {risk:.2f}. Recommend focusing on disciplinary compliance, program "
                   f"participation, and behavioral management before reassessment.")
    
    async def generate_rehabilitation_plan(
        self,
        inmate_data: Dict[str, Any],
        programs: List[str],
        duration_weeks: int = 12
    ) -> Dict[str, Any]:
        """
        Generate personalized rehabilitation plan using GPT
        
        Args:
            inmate_data: Inmate profile
            programs: Recommended programs
            duration_weeks: Plan duration
            
        Returns:
            Structured rehabilitation plan
        """
        if not self.enabled:
            return self._fallback_plan(inmate_data, programs, duration_weeks)
        
        try:
            prompt = f"""Create a detailed {duration_weeks}-week rehabilitation plan for this inmate.

INMATE PROFILE:
- Age: {inmate_data.get('age')}
- Crime: {inmate_data.get('crime_type')}
- Education: {inmate_data.get('education_level')}
- Needs: Substance abuse: {inmate_data.get('has_substance_abuse', False)}, Mental health: {inmate_data.get('has_mental_health_issues', False)}

RECOMMENDED PROGRAMS: {', '.join(programs)}

Create a structured plan with:
1. Weekly schedule (3-5 activities per week)
2. Milestones at weeks 4, 8, and 12
3. Measurable objectives
4. Success criteria

Format as JSON with structure:
{{
  "objectives": ["obj1", "obj2", "obj3"],
  "weekly_activities": [
    {{"week": 1, "activities": ["activity1", "activity2"]}},
    ...
  ],
  "milestones": [
    {{"week": 4, "description": "...", "success_criteria": "..."}},
    ...
  ]
}}"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a rehabilitation program designer specializing in evidence-based correctional interventions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            plan = eval(response.choices[0].message.content)
            logger.info(f"Generated rehabilitation plan for {duration_weeks} weeks")
            return plan
            
        except Exception as e:
            logger.error(f"OpenAI plan generation error: {e}")
            return self._fallback_plan(inmate_data, programs, duration_weeks)
    
    def _fallback_plan(self, inmate_data: Dict, programs: List[str], duration_weeks: int) -> Dict:
        """Fallback plan generation"""
        return {
            "objectives": [
                "Improve behavioral compliance and institutional adjustment",
                "Complete assigned rehabilitation programs",
                "Develop coping skills and emotional regulation"
            ],
            "weekly_activities": [
                {
                    "week": i,
                    "activities": [
                        f"{programs[0] if programs else 'Group therapy'} - 2 sessions",
                        "Individual counseling - 1 session",
                        "Life skills workshop - 1 session"
                    ]
                }
                for i in range(1, duration_weeks + 1)
            ],
            "milestones": [
                {
                    "week": duration_weeks // 3,
                    "description": "Initial assessment and program adaptation",
                    "success_criteria": "80% attendance, no violations"
                },
                {
                    "week": (duration_weeks * 2) // 3,
                    "description": "Midpoint progress review",
                    "success_criteria": "Demonstrate skill application, positive behavior trend"
                },
                {
                    "week": duration_weeks,
                    "description": "Program completion and certification",
                    "success_criteria": "Complete all modules, pass assessments, maintain conduct"
                }
            ]
        }
    
    async def analyze_progress_insights(
        self,
        inmate_id: str,
        progress_data: Dict[str, Any]
    ) -> str:
        """
        Analyze rehabilitation progress and provide insights
        
        Args:
            inmate_id: Inmate identifier
            progress_data: Progress tracking data
            
        Returns:
            Analysis and recommendations
        """
        if not self.enabled:
            return "Progress tracking data recorded. Continue monitoring behavioral trends."
        
        try:
            prompt = f"""Analyze this inmate's rehabilitation progress and provide insights.

PROGRESS DATA:
- Attendance Rate: {progress_data.get('attendance_rate', 0)*100:.1f}%
- Activities Completed: {progress_data.get('activities_completed', 0)}
- Behavioral Score Trend: {progress_data.get('behavior_trend', 'stable')}
- Recent Violations: {progress_data.get('recent_violations', 0)}
- Program Performance: {progress_data.get('performance_score', 0):.1f}/100

Provide:
1. Progress assessment (2-3 sentences)
2. Specific areas of improvement
3. Concerns or red flags
4. Actionable recommendations

Be concise and actionable."""

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use faster model for progress insights
                messages=[
                    {"role": "system", "content": "You are a rehabilitation progress analyst."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=250
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI progress analysis error: {e}")
            return "Progress data recorded. Continue monitoring."


# Global instance
openai_client = OpenAIClient()
