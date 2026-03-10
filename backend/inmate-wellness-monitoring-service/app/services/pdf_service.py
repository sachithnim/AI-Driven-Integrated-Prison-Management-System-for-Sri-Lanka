import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings 
from dotenv import load_dotenv

load_dotenv()

PERSIST_DIRECTORY_GENERAL = "./chroma_db"
PERSIST_DIRECTORY_INMATES = "./chroma_db_inmates"

def get_embeddings():
    """
    Returns a locally running Hugging Face embedding model.
    'all-MiniLM-L6-v2' is a standard, efficient model for RAG.
    Embedding Models should be chosen based on the vector DB's capabilities.
    """
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def store_pdf_in_vector_db(file_path, inmate_id=None):
    try:
        # 1. Load the PDF
        loader = PyPDFLoader(file_path)
        pages = loader.load_and_split()
        
        # 2. Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
        texts = text_splitter.split_documents(pages)
        
        # Add metadata
        if inmate_id:
            for doc in texts:
                doc.metadata['inmate_id'] = str(inmate_id)
                
        print(f"Total chunks created: {len(texts)}")
        
        # 3. Initialize Embeddings and Vector DB
        embeddings = get_embeddings()
        persist_dir = PERSIST_DIRECTORY_INMATES if inmate_id else PERSIST_DIRECTORY_GENERAL
        vector_db = Chroma(
            persist_directory=persist_dir, 
            embedding_function=embeddings
        )
        
        # 4. Add to DB
        # No batching/sleep needed for local execution
        print("Embedding and storing documents locally...")
        vector_db.add_documents(texts)
        
        print("All documents processed successfully.")
        return True
    
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return False