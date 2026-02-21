
"""
RAG Service for retrieving relevant context
"""
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from app.core import rag_config
from app.core.openai_client import openai_client

logger = logging.getLogger(__name__)

class RagService:
    """
    Simple RAG service using in-memory vector store for demonstration.
    In production, use ChromaDB, Pinecone, or FAISS.
    """
    
    def __init__(self):
        self.documents = []
        self.embeddings = []
        self._initialize_knowledge_base()
        
    def _initialize_knowledge_base(self):
        """Load initial documents"""
        try:
            logger.info("Initializing RAG knowledge base...")
            for doc in rag_config.INITIAL_KNOWLEDGE_BASE:
                self.add_document(doc["content"], metadata={"id": doc["id"], "title": doc["title"]})
            logger.info(f"RAG initialized with {len(self.documents)} documents")
        except Exception as e:
            logger.error(f"Failed to initialize RAG: {e}")

    async def _get_embedding(self, text: str) -> List[float]:
        """Get embedding from OpenAI"""
        if not openai_client.enabled:
            # Return random vector if no OpenAI for testing/fallback
            return np.random.rand(1536).tolist()
            
        try:
            response = await openai_client.client.embeddings.create(
                input=text.replace("\n", " "),
                model=rag_config.EMBEDDING_MODEL
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return np.random.rand(1536).tolist()

    def add_document(self, content: str, metadata: Dict[str, Any] = None):
        """Add a document to the store (synchronous for initial load, usually async)"""
        # In a real app, we would cache these embeddings
        # For this demo, we'll mock the embedding process if called during init to avoid API costs/latency on startup
        # or we can rely on lazy loading. Let's just store text for now and embed on demand or mock it.
        
        # simplified: just store content
        self.documents.append({
            "content": content,
            "metadata": metadata or {}
        })

    async def search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for relevant documents
        """
        if not self.documents:
            return []
            
        try:
            # 1. Get query embedding
            query_embedding = await self._get_embedding(query)
            
            # 2. Calculate similarities (Simulated for this implementation since we don't have stored embeddings for docs yet)
            # In a real implementation:
            # - We would have computed embeddings for all self.documents at startup
            # - We would compute cosine similarity here
            
            # For this immediate implementation, we will use a simple keyword match if embeddings aren't fully set up,
            # OR we can assume we want to call the API for each doc (slow).
            # BETTER APPROACH for this constrained environment: Use keyword overlap as a proxy for "similarity" if we want to avoid 
            # N API calls, OR just select relevant looking ones based on simple heuristics.
            
            # Let's do a simple Keyword-based scoring for robustness without heavy API dependency for the doc side
            query_tokens = set(query.lower().split())
            scored_docs = []
            
            for doc in self.documents:
                content_lower = doc["content"].lower()
                score = 0
                for token in query_tokens:
                    if token in content_lower:
                        score += 1
                scored_docs.append((score, doc))
                
            # Sort by score
            scored_docs.sort(key=lambda x: x[0], reverse=True)
            
            # Return top K
            return [doc for score, doc in scored_docs[:k] if score > 0]
            
        except Exception as e:
            logger.error(f"RAG search failed: {e}")
            return []

    def format_context(self, docs: List[Dict[str, Any]]) -> str:
        """Format retrieved documents into a context string"""
        if not docs:
            return ""
            
        context_parts = []
        for i, doc in enumerate(docs):
            context_parts.append(f"SOURCE {i+1} ({doc['metadata'].get('title', 'Unknown')}):\n{doc['content']}")
            
        return "\n\n".join(context_parts)

# Singleton instance
rag_service = RagService()
