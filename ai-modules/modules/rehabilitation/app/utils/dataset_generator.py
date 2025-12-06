"""
Dataset generator for rehabilitation program training and testing
Creates synthetic but realistic inmate rehabilitation data
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Tuple, List, Dict
from pathlib import Path
import sys
import logging

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import with fallback
try:
    from core.logging import logger
except ImportError:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("rehabilitation")


class DatasetGenerator:
    """Generates realistic inmate and rehabilitation data for training"""
    
    # Rehabilitation programs
    PROGRAMS = [
        "substance_abuse_intensive",
        "substance_abuse_standard",
        "mental_health_therapy",
        "vocational_training",
        "education_program",
        "anger_management",
        "cognitive_behavioral",
        "family_counseling"
    ]
    
    # Suitability groups
    SUITABILITY_GROUPS = [
        "substance_abuse",
        "mental_health",
        "behavioral",
        "educational_deficit",
        "general"
    ]
    
    # Counseling note keywords for training NLP
    POSITIVE_NOTES = [
        "Inmate showing good progress in rehabilitation.",
        "Cooperative attitude, compliant with program requirements.",
        "Positive behavioral changes observed.",
        "Strong motivation for self-improvement.",
        "Good compliance with medication and therapy.",
        "Progress noted in anger management techniques.",
        "Inmate actively participates in group therapy.",
        "Significant improvement in interpersonal skills.",
        "Successfully completed program modules.",
        "Positive feedback from counseling team."
    ]
    
    NEGATIVE_NOTES = [
        "Aggressive behavior during session.",
        "Resistance to rehabilitation efforts.",
        "Poor compliance with program requirements.",
        "Anxiety and stress levels remain elevated.",
        "Behavioral concerns noted during period.",
        "Withdrawal and isolation from group activities.",
        "Negative attitude toward counseling.",
        "Substance cravings reported.",
        "Conflict with other inmates observed.",
        "Declined participation in therapy sessions."
    ]
    
    NEUTRAL_NOTES = [
        "Attended scheduled counseling session.",
        "Regular progress check-in completed.",
        "Standard therapeutic intervention provided.",
        "Routine assessment conducted.",
        "Session completed as scheduled.",
        "Standard rehabilitation activities."
    ]
    
    def __init__(self, seed: int = 42):
        """Initialize dataset generator"""
        np.random.seed(seed)
        self.seed = seed
        logger.info(f"Initialized DatasetGenerator with seed: {seed}")
    
    def generate_inmate_profiles(self, n_samples: int = 500) -> pd.DataFrame:
        """
        Generate synthetic inmate profiles
        
        Args:
            n_samples: Number of inmate profiles to generate
            
        Returns:
            DataFrame with inmate profile features
        """
        logger.info(f"Generating {n_samples} inmate profiles")
        
        data = {
            'inmate_id': [f'INM{str(i).zfill(5)}' for i in range(n_samples)],
            'age': np.random.randint(18, 75, n_samples),
            'gender': np.random.choice(['M', 'F'], n_samples, p=[0.9, 0.1]),
            'education_level': np.random.choice(['none', 'primary', 'secondary', 'higher'], n_samples),
            'sentence_length_months': np.random.randint(6, 360, n_samples),
            'time_served_months': np.random.randint(1, 120, n_samples),
            'previous_convictions': np.random.randint(0, 5, n_samples),
            'substance_abuse_history': np.random.choice([0, 1], n_samples, p=[0.6, 0.4]),
            'mental_health_diagnosis': np.random.choice([0, 1], n_samples, p=[0.7, 0.3]),
            'disciplinary_incidents': np.random.randint(0, 10, n_samples),
            'suitability_group': np.random.choice(self.SUITABILITY_GROUPS, n_samples),
            'risk_score': np.random.uniform(0.0, 1.0, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Add derived features
        df['risk_score'] = (
            (df['age'] < 25) * 0.15 +
            (df['substance_abuse_history'] == 1) * 0.25 +
            (df['mental_health_diagnosis'] == 1) * 0.20 +
            (df['disciplinary_incidents'] > 5) * 0.15 +
            (df['previous_convictions'] > 2) * 0.15 +
            np.random.uniform(0, 0.1, n_samples)
        )
        df['risk_score'] = df['risk_score'].clip(0, 1)
        
        return df
    
    def generate_program_outcomes(self, inmate_df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate program enrollment and outcome data
        
        Args:
            inmate_df: Inmate profiles DataFrame
            
        Returns:
            DataFrame with program outcomes
        """
        logger.info("Generating program outcomes")
        
        n_samples = len(inmate_df) * 2  # Multiple programs per inmate
        
        data = {
            'inmate_id': np.random.choice(inmate_df['inmate_id'], n_samples),
            'program_type': np.random.choice(self.PROGRAMS, n_samples),
            'enrollment_date': [
                datetime.now() - timedelta(days=np.random.randint(1, 365))
                for _ in range(n_samples)
            ],
            'completion_status': np.random.choice(['completed', 'in_progress', 'dropped'], n_samples),
            'completion_percentage': np.random.uniform(0, 100, n_samples),
            'attendance_rate': np.random.uniform(0, 100, n_samples),
            'behavioral_score': np.random.uniform(0, 100, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Merge with inmate data
        df = df.merge(inmate_df[['inmate_id', 'risk_score', 'suitability_group']], on='inmate_id')
        
        # Add outcome label
        df['recommended'] = (
            (df['completion_percentage'] > 70) &
            (df['attendance_rate'] > 80) &
            (df['behavioral_score'] > 60)
        ).astype(int)
        
        return df
    
    def generate_counseling_notes(self, n_samples: int = 300) -> pd.DataFrame:
        """
        Generate synthetic counseling notes
        
        Args:
            n_samples: Number of counseling notes
            
        Returns:
            DataFrame with counseling notes and sentiments
        """
        logger.info(f"Generating {n_samples} counseling notes")
        
        notes = []
        sentiments = []
        
        for _ in range(n_samples):
            sentiment = np.random.choice(['positive', 'negative', 'neutral'], p=[0.5, 0.3, 0.2])
            
            if sentiment == 'positive':
                note = np.random.choice(self.POSITIVE_NOTES)
            elif sentiment == 'negative':
                note = np.random.choice(self.NEGATIVE_NOTES)
            else:
                note = np.random.choice(self.NEUTRAL_NOTES)
            
            notes.append(note)
            sentiments.append(sentiment)
        
        data = {
            'note_id': [f'NOTE{str(i).zfill(5)}' for i in range(n_samples)],
            'inmate_id': [f'INM{str(np.random.randint(0, 500)).zfill(5)}' for _ in range(n_samples)],
            'counselor_id': [f'COUN{str(np.random.randint(1, 50)).zfill(3)}' for _ in range(n_samples)],
            'date': [
                datetime.now() - timedelta(days=np.random.randint(0, 365))
                for _ in range(n_samples)
            ],
            'note_text': notes,
            'sentiment': sentiments,
        }
        
        return pd.DataFrame(data)
    
    def generate_early_release_data(self, inmate_df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate early release eligibility data
        
        Args:
            inmate_df: Inmate profiles DataFrame
            
        Returns:
            DataFrame with early release predictions
        """
        logger.info("Generating early release eligibility data")
        
        df = inmate_df.copy()
        
        # Early release eligibility factors
        df['behavior_score'] = np.random.uniform(0, 100, len(df))
        df['program_completion_count'] = np.random.randint(0, 5, len(df))
        df['disciplinary_score'] = 100 - (df['disciplinary_incidents'] * 10)
        df['disciplinary_score'] = df['disciplinary_score'].clip(0, 100)
        
        # Calculate early release score
        df['early_release_score'] = (
            (100 - df['risk_score'] * 100) * 0.3 +
            df['behavior_score'] * 0.3 +
            df['program_completion_count'] * 10 * 0.2 +
            df['disciplinary_score'] * 0.2
        ) / 100
        
        df['early_release_score'] = df['early_release_score'].clip(0, 1)
        df['eligible_for_early_release'] = (df['early_release_score'] > 0.7).astype(int)
        
        return df[['inmate_id', 'behavior_score', 'program_completion_count', 
                   'disciplinary_score', 'early_release_score', 'eligible_for_early_release']]
    
    def generate_all_datasets(self, n_inmates: int = 500) -> Dict[str, pd.DataFrame]:
        """
        Generate all datasets
        
        Args:
            n_inmates: Number of inmate profiles
            
        Returns:
            Dictionary with all generated datasets
        """
        logger.info(f"Generating complete datasets with {n_inmates} inmates")
        
        inmate_profiles = self.generate_inmate_profiles(n_inmates)
        program_outcomes = self.generate_program_outcomes(inmate_profiles)
        counseling_notes = self.generate_counseling_notes(n_inmates)
        early_release = self.generate_early_release_data(inmate_profiles)
        
        return {
            'inmate_profiles': inmate_profiles,
            'program_outcomes': program_outcomes,
            'counseling_notes': counseling_notes,
            'early_release': early_release
        }
    
    def save_datasets(self, datasets: Dict[str, pd.DataFrame], output_dir: str = "data"):
        """Save datasets to CSV files"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        for name, df in datasets.items():
            file_path = output_path / f"{name}.csv"
            df.to_csv(file_path, index=False)
            logger.info(f"Saved {name} to {file_path}")


# Quick generation utility
def generate_sample_data(n_inmates: int = 500) -> Dict[str, pd.DataFrame]:
    """Generate sample datasets"""
    generator = DatasetGenerator()
    return generator.generate_all_datasets(n_inmates)


if __name__ == "__main__":
    # Generate and save sample datasets
    generator = DatasetGenerator()
    datasets = generator.generate_all_datasets(500)
    generator.save_datasets(datasets)
    
    logger.info("Sample datasets generated successfully")
