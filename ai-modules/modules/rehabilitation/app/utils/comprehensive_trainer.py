"""
Comprehensive AI model trainer for rehabilitation system
Trains multiple models for eligibility, early release, industrial training, home leave, etc.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from xgboost import XGBClassifier
import joblib
from pathlib import Path
from typing import Tuple, Dict, List
import logging

logger = logging.getLogger(__name__)


class ComprehensiveRehabTrainer:
    """Trains all rehabilitation AI models"""
    
    def __init__(self, models_dir: str = "app/models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.models = {}
        self.scalers = {}
        self.encoders = {}
    
    def prepare_eligibility_data(self, inmates_df: pd.DataFrame, 
                                 programs_df: pd.DataFrame,
                                 behavioral_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for rehab eligibility prediction"""
        
        # Aggregate behavioral incidents per inmate
        incident_counts = behavioral_df.groupby('inmate_id').agg({
            'record_id': 'count',
            'points_deducted': 'sum'
        }).rename(columns={'record_id': 'total_incidents'})
        
        # Merge data
        data = inmates_df.copy()
        data = data.merge(incident_counts, left_on='inmate_id', right_index=True, how='left')
        data['total_incidents'] = data['total_incidents'].fillna(0)
        data['points_deducted'] = data['points_deducted'].fillna(0)
        
        # Features for eligibility
        feature_cols = [
            'behavior_score', 'discipline_score', 'risk_score',
            'programs_completed', 'total_attendance_rate',
            'time_served_months', 'remaining_sentence_months',
            'prior_convictions', 'institutional_violations',
            'total_incidents', 'points_deducted'
        ]
        
        X = data[feature_cols].values
        
        # Target: eligible if behavior > 60, discipline > 60, risk < 0.6
        y = ((data['behavior_score'] > 60) & 
             (data['discipline_score'] > 60) & 
             (data['risk_score'] < 0.6)).astype(int).values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        self.scalers['eligibility'] = scaler
        
        logger.info(f"Eligibility data prepared: {X_scaled.shape[0]} samples, {X_scaled.shape[1]} features")
        logger.info(f"Eligible: {y.sum()} ({y.mean()*100:.1f}%), Not eligible: {(1-y).sum()}")
        
        return X_scaled, y
    
    def prepare_early_release_data(self, inmates_df: pd.DataFrame,
                                    early_release_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for early release prediction"""
        
        # Use early release data with actual recommendations
        data = early_release_df.merge(inmates_df[['inmate_id', 'age', 'prior_convictions']], 
                                       on='inmate_id', how='left')
        
        feature_cols = [
            'behavior_score', 'discipline_score', 'program_completion_count',
            'time_served_percentage', 'risk_assessment',
            'age', 'prior_convictions'
        ]
        
        X = data[feature_cols].values
        
        # Target: 1 if eligible or approved
        y = (data['recommendation'] == 'eligible').astype(int).values
        
        # Scale
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        self.scalers['early_release'] = scaler
        
        logger.info(f"Early release data prepared: {X_scaled.shape[0]} samples")
        logger.info(f"Eligible: {y.sum()} ({y.mean()*100:.1f}%)")
        
        return X_scaled, y
    
    def prepare_industrial_training_data(self, inmates_df: pd.DataFrame,
                                          training_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for industrial training eligibility"""
        
        # Merge inmates with training records
        data = inmates_df.copy()
        
        # Check if inmate has completed training
        completed_training = training_df[training_df['certification_earned'] == True]['inmate_id'].unique()
        data['has_training'] = data['inmate_id'].isin(completed_training).astype(int)
        
        feature_cols = [
            'behavior_score', 'discipline_score', 'risk_score',
            'age', 'education_level', 'time_served_months',
            'programs_completed', 'total_attendance_rate'
        ]
        
        # Encode education level
        le = LabelEncoder()
        education_encoded = le.fit_transform(data['education_level'])
        
        X = data[[col for col in feature_cols if col != 'education_level']].values
        X = np.column_stack([X, education_encoded])
        
        # Target: eligible if behavior > 55 and discipline > 55
        y = ((data['behavior_score'] > 55) & (data['discipline_score'] > 55)).astype(int).values
        
        # Scale
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        self.scalers['industrial_training'] = scaler
        self.encoders['education'] = le
        
        logger.info(f"Industrial training data prepared: {X_scaled.shape[0]} samples")
        logger.info(f"Eligible: {y.sum()} ({y.mean()*100:.1f}%)")
        
        return X_scaled, y
    
    def prepare_home_leave_data(self, inmates_df: pd.DataFrame,
                                 leave_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for home leave eligibility"""
        
        data = inmates_df.copy()
        
        feature_cols = [
            'behavior_score', 'discipline_score', 'risk_score',
            'time_served_months', 'institutional_violations',
            'programs_completed', 'total_attendance_rate'
        ]
        
        X = data[feature_cols].values
        
        # Target: eligible if behavior > 75 and discipline > 75 and violations < 2
        y = ((data['behavior_score'] > 75) & 
             (data['discipline_score'] > 75) & 
             (data['institutional_violations'] < 2)).astype(int).values
        
        # Scale
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        self.scalers['home_leave'] = scaler
        
        logger.info(f"Home leave data prepared: {X_scaled.shape[0]} samples")
        logger.info(f"Eligible: {y.sum()} ({y.mean()*100:.1f}%)")
        
        return X_scaled, y
    
    def train_eligibility_model(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Train rehabilitation eligibility prediction model"""
        
        logger.info("Training eligibility model (XGBoost)...")
        
        model = XGBClassifier(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='logloss'
        )
        
        model.fit(X, y)
        
        # Calculate accuracy
        accuracy = model.score(X, y)
        
        # Save model
        model_path = self.models_dir / "eligibility_model.joblib"
        joblib.dump(model, model_path)
        
        # Save scaler
        scaler_path = self.models_dir / "eligibility_scaler.joblib"
        joblib.dump(self.scalers['eligibility'], scaler_path)
        
        self.models['eligibility'] = model
        
        logger.info(f"✓ Eligibility model trained: {accuracy*100:.2f}% accuracy")
        
        return {
            "model_type": "XGBClassifier",
            "accuracy": accuracy,
            "n_samples": len(X),
            "n_features": X.shape[1]
        }
    
    def train_early_release_model(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Train early release prediction model"""
        
        logger.info("Training early release model (Gradient Boosting)...")
        
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42
        )
        
        model.fit(X, y)
        accuracy = model.score(X, y)
        
        # Save
        joblib.dump(model, self.models_dir / "early_release_model.joblib")
        joblib.dump(self.scalers['early_release'], self.models_dir / "early_release_scaler.joblib")
        
        self.models['early_release'] = model
        
        logger.info(f"✓ Early release model trained: {accuracy*100:.2f}% accuracy")
        
        return {
            "model_type": "GradientBoostingClassifier",
            "accuracy": accuracy,
            "n_samples": len(X)
        }
    
    def train_industrial_training_model(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Train industrial training eligibility model"""
        
        logger.info("Training industrial training model (Random Forest)...")
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            random_state=42
        )
        
        model.fit(X, y)
        accuracy = model.score(X, y)
        
        # Save
        joblib.dump(model, self.models_dir / "industrial_training_model.joblib")
        joblib.dump(self.scalers['industrial_training'], self.models_dir / "industrial_training_scaler.joblib")
        joblib.dump(self.encoders['education'], self.models_dir / "education_encoder.joblib")
        
        self.models['industrial_training'] = model
        
        logger.info(f"✓ Industrial training model trained: {accuracy*100:.2f}% accuracy")
        
        return {
            "model_type": "RandomForestClassifier",
            "accuracy": accuracy,
            "n_samples": len(X)
        }
    
    def train_home_leave_model(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Train home leave eligibility model"""
        
        logger.info("Training home leave model (Logistic Regression)...")
        
        model = LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight='balanced'
        )
        
        model.fit(X, y)
        accuracy = model.score(X, y)
        
        # Save
        joblib.dump(model, self.models_dir / "home_leave_model.joblib")
        joblib.dump(self.scalers['home_leave'], self.models_dir / "home_leave_scaler.joblib")
        
        self.models['home_leave'] = model
        
        logger.info(f"✓ Home leave model trained: {accuracy*100:.2f}% accuracy")
        
        return {
            "model_type": "LogisticRegression",
            "accuracy": accuracy,
            "n_samples": len(X)
        }
    
    def train_all_models(self, datasets: Dict[str, pd.DataFrame]) -> Dict:
        """Train all rehabilitation models"""
        
        logger.info("\n" + "="*60)
        logger.info("TRAINING ALL REHABILITATION AI MODELS")
        logger.info("="*60 + "\n")
        
        results = {}
        
        # 1. Eligibility Model
        X_elig, y_elig = self.prepare_eligibility_data(
            datasets['inmate_profiles'],
            datasets['program_outcomes'],
            datasets['behavioral_records']
        )
        results['eligibility'] = self.train_eligibility_model(X_elig, y_elig)
        
        # 2. Early Release Model
        X_early, y_early = self.prepare_early_release_data(
            datasets['inmate_profiles'],
            datasets['early_release_data']
        )
        results['early_release'] = self.train_early_release_model(X_early, y_early)
        
        # 3. Industrial Training Model
        X_training, y_training = self.prepare_industrial_training_data(
            datasets['inmate_profiles'],
            datasets['industrial_training']
        )
        results['industrial_training'] = self.train_industrial_training_model(X_training, y_training)
        
        # 4. Home Leave Model
        X_leave, y_leave = self.prepare_home_leave_data(
            datasets['inmate_profiles'],
            datasets['home_leave_records']
        )
        results['home_leave'] = self.train_home_leave_model(X_leave, y_leave)
        
        logger.info("\n" + "="*60)
        logger.info("ALL MODELS TRAINED SUCCESSFULLY")
        logger.info("="*60 + "\n")
        
        return results


def train_comprehensive_models(datasets_dir: str = "datasets", models_dir: str = "app/models") -> Dict:
    """
    Train all comprehensive rehabilitation models
    
    Args:
        datasets_dir: Directory containing CSV datasets
        models_dir: Directory to save trained models
    
    Returns:
        Dictionary with training results
    """
    # Load datasets
    datasets = {}
    datasets_path = Path(datasets_dir)
    
    for csv_file in datasets_path.glob("*.csv"):
        dataset_name = csv_file.stem
        datasets[dataset_name] = pd.read_csv(csv_file)
        logger.info(f"Loaded {dataset_name}: {len(datasets[dataset_name])} records")
    
    # Train models
    trainer = ComprehensiveRehabTrainer(models_dir=models_dir)
    results = trainer.train_all_models(datasets)
    
    return results
