"""
NLP Analysis Service
Handles text analysis using HuggingFace transformers
Includes sentiment analysis, summarization, and named entity recognition
"""

from typing import List, Optional, Dict, Any
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.analysis import (
    AnalyzeNotesRequest,
    AnalyzeNotesResponse
)
from core.logging import logger

# Import transformer models (lazy loaded)
_sentiment_pipeline = None
_summarizer_pipeline = None
_ner_pipeline = None


def get_sentiment_pipeline():
    """Lazy load sentiment analysis pipeline"""
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        logger.info("Loading sentiment analysis model...")
        try:
            from transformers import pipeline
            _sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english"
            )
        except Exception as e:
            logger.error(f"Error loading sentiment model: {e}")
            return None
    return _sentiment_pipeline


def get_summarizer_pipeline():
    """Lazy load summarization pipeline"""
    global _summarizer_pipeline
    if _summarizer_pipeline is None:
        logger.info("Loading summarization model...")
        try:
            from transformers import pipeline
            _summarizer_pipeline = pipeline(
                "summarization",
                model="facebook/bart-large-cnn"
            )
        except Exception as e:
            logger.error(f"Error loading summarizer model: {e}")
            return None
    return _summarizer_pipeline


def get_ner_pipeline():
    """Lazy load NER pipeline"""
    global _ner_pipeline
    if _ner_pipeline is None:
        logger.info("Loading NER model...")
        try:
            from transformers import pipeline
            _ner_pipeline = pipeline(
                "ner",
                model="dslim/bert-base-uncased-ner"
            )
        except Exception as e:
            logger.error(f"Error loading NER model: {e}")
            return None
    return _ner_pipeline


class NLPService:
    """Service for analyzing counseling notes and text data using ML models"""
    
    def __init__(self):
        """Initialize NLP service"""
        logger.info("Initializing NLP Service with Transformer Models")
    
    def analyze_notes(self, request: AnalyzeNotesRequest) -> AnalyzeNotesResponse:
        """
        Analyze counseling notes using NLP transformers
        
        Args:
            request: Analysis request with notes text
            
        Returns:
            AnalyzeNotesResponse with summary, sentiment, and key points
        """
        logger.info(f"Analyzing notes for inmate: {request.inmateId}")
        
        text = request.text.strip()
        
        if not text:
            logger.warning("Empty text provided for analysis")
            return AnalyzeNotesResponse(
                summary="No text provided for analysis",
                sentiment="neutral",
                keyPoints=[]
            )
        
        # Analyze sentiment using transformer
        sentiment = self._analyze_sentiment_transformer(text)
        
        # Generate summary using transformer
        summary = self._generate_summary_transformer(text)
        
        # Extract key points using NER and keyword extraction
        key_points = self._extract_key_points(text)
        
        return AnalyzeNotesResponse(
            summary=summary,
            sentiment=sentiment,
            keyPoints=key_points if key_points else ["Counseling session conducted"]
        )
    
    def _analyze_sentiment_transformer(self, text: str) -> str:
        """
        Analyze sentiment using DistilBERT transformer
        
        Args:
            text: Text to analyze
            
        Returns:
            Sentiment label: "positive", "negative", or "neutral"
        """
        try:
            pipeline = get_sentiment_pipeline()
            if pipeline is None:
                logger.warning("Sentiment pipeline not available, using fallback")
                return self._analyze_sentiment_fallback(text)
            
            # Limit text length for transformer
            text_limited = text[:512]
            
            result = pipeline(text_limited)[0]
            label = result['label'].lower()
            score = result['score']
            
            logger.debug(f"Sentiment: {label} (score: {score:.4f})")
            
            # Map to simple categories
            if label == "positive" or label == "label_1":
                return "positive"
            elif label == "negative" or label == "label_0":
                return "negative"
            else:
                return "neutral"
        
        except Exception as e:
            logger.error(f"Error in transformer sentiment analysis: {e}")
            return self._analyze_sentiment_fallback(text)
    
    def _analyze_sentiment_fallback(self, text: str) -> str:
        """Fallback keyword-based sentiment analysis"""
        
        positive_words = [
            "progress", "good", "cooperative", "improving", "positive",
            "excellent", "great", "wonderful", "success", "motivated",
            "compliant", "engaged", "responsive", "recovery", "stable"
        ]
        
        negative_words = [
            "aggressive", "resistance", "declined", "poor", "negative",
            "violent", "hostile", "uncooperative", "regressed", "relapse",
            "anxiety", "crisis", "distress", "suicide", "harm"
        ]
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
    
    def _generate_summary_transformer(self, text: str) -> str:
        """
        Generate summary using BART transformer
        
        Args:
            text: Text to summarize
            
        Returns:
            Summarized text
        """
        try:
            # For short texts, just return as is
            if len(text) < 100:
                return text
            
            pipeline = get_summarizer_pipeline()
            if pipeline is None:
                logger.warning("Summarizer pipeline not available, using fallback")
                return self._generate_summary_fallback(text)
            
            # Limit input length
            text_limited = text[:1024]
            
            result = pipeline(text_limited, max_length=150, min_length=50, do_sample=False)
            summary = result[0]['summary_text'] if result else text_limited[:150]
            
            logger.debug(f"Generated summary: {summary[:100]}...")
            return summary
        
        except Exception as e:
            logger.error(f"Error in transformer summarization: {e}")
            return self._generate_summary_fallback(text)
    
    def _generate_summary_fallback(self, text: str) -> str:
        """Fallback extractive summarization"""
        
        # Simple sentence-based extraction
        sentences = text.split('.')
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) <= 2:
            return text
        
        # Take first and last sentences plus most "important" middle one
        important_words = {"progress", "positive", "negative", "aggressive", "cooperative", "treatment"}
        
        middle_sentences = sentences[1:-1]
        if middle_sentences:
            scored = [(i, sum(1 for word in important_words if word in s.lower())) for i, s in enumerate(middle_sentences)]
            if scored:
                best_idx = max(scored, key=lambda x: x[1])[0]
                summary_sentences = [sentences[0], middle_sentences[best_idx], sentences[-1]]
            else:
                summary_sentences = [sentences[0], middle_sentences[0], sentences[-1]]
        else:
            summary_sentences = sentences[:2]
        
        return ". ".join(summary_sentences) + "."
    
    def _extract_key_points(self, text: str) -> List[str]:
        """
        Extract key points from text using NER and keyword extraction
        
        Args:
            text: Text to analyze
            
        Returns:
            List of key points
        """
        key_points = []
        
        # Extract entities
        key_points.extend(self._extract_entities(text))
        
        # Extract keywords related to rehabilitation
        key_points.extend(self._extract_rehabilitation_keywords(text))
        
        # Remove duplicates and limit
        key_points = list(dict.fromkeys(key_points))[:5]
        
        return key_points
    
    def _extract_entities(self, text: str) -> List[str]:
        """Extract named entities from text"""
        
        entities = []
        
        try:
            pipeline = get_ner_pipeline()
            if pipeline is None:
                return entities
            
            text_limited = text[:512]
            ner_results = pipeline(text_limited)
            
            # Group entities
            current_entity = ""
            current_type = ""
            
            for result in ner_results:
                word = result['word']
                entity_type = result['entity']
                
                if entity_type == current_type:
                    current_entity += " " + word
                else:
                    if current_entity:
                        entities.append(f"{current_entity.strip()} ({current_type})")
                    current_entity = word
                    current_type = entity_type
            
            if current_entity:
                entities.append(f"{current_entity.strip()} ({current_type})")
        
        except Exception as e:
            logger.debug(f"NER extraction error: {e}")
        
        return entities
    
    def _extract_rehabilitation_keywords(self, text: str) -> List[str]:
        """Extract rehabilitation-related keywords"""
        
        keywords = []
        
        rehabilitation_terms = {
            "therapy": ["therapy", "therapeutic", "therapist"],
            "medication": ["medication", "medicine", "drug", "pharmaceutical"],
            "behavioral": ["behavior", "behavioural", "conduct", "attitude"],
            "progress": ["progress", "progressing", "improvement", "improved", "advance"],
            "compliance": ["compliant", "compliance", "adherent", "cooperative"],
            "risk": ["risk", "dangerous", "threat", "dangerous", "hazard"],
            "trauma": ["trauma", "traumatic", "ptsd", "stress"],
            "substance": ["substance", "alcohol", "drug", "addiction"],
            "mental_health": ["mental", "depression", "anxiety", "psychological"],
            "vocational": ["vocational", "job", "employment", "career", "skill"]
        }
        
        text_lower = text.lower()
        
        for category, terms in rehabilitation_terms.items():
            for term in terms:
                if term in text_lower:
                    keywords.append(f"Topic: {category.replace('_', ' ')}")
                    break
        
        return keywords


# Singleton instance
nlp_service = NLPService()

