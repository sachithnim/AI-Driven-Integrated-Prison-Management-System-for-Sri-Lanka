import os
from typing import List
from pydantic import BaseModel, Field
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

class HealthProfile(BaseModel):
    risk_level: str = Field(description="Risk level: Low, Medium, or High")
    suspected_conditions: List[str] = Field(description="List of potential mental health conditions identified")
    recommended_actions: List[str] = Field(description="Actionable steps for prison staff")
    urgent_alert: bool = Field(description="True if immediate medical intervention is required, else False")
    reasoning: str = Field(description="A brief summary explaining why this risk level was assigned")
    progress_indicator: str = Field(description="Tracking value comparing with previous profile: Improved, Stable, or Regressed. Use 'Initial' if no previous history.")


llm = ChatOpenAI(
    model="gpt-4o",  
    temperature=0.0, 
    api_key=os.getenv("OPENAI_API_KEY")
)

structured_llm = llm.with_structured_output(HealthProfile)

PERSIST_DIRECTORY_GENERAL = "./chroma_db"
PERSIST_DIRECTORY_INMATES = "./chroma_db_inmates"

def generate_health_profile(inmate_data, emotion_history, survey_summary, previous_profiles_str="None"):
    try:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # General guidelines from main Chroma DB
        general_vector_db = Chroma(persist_directory=PERSIST_DIRECTORY_GENERAL, embedding_function=embeddings)
        general_retriever = general_vector_db.as_retriever(search_kwargs={"k": 3})
        query = f"treatment guidelines for {survey_summary} and mental health interventions"
        general_docs = general_retriever.invoke(query)
        general_context = "\n\n".join([doc.page_content for doc in general_docs])

        # Inmate specific history from inmate Chroma DB
        inmate_context = "No specific medical records found."
        inmate_id = getattr(inmate_data, 'id', None)
        if inmate_id:
            try:
                inmate_vector_db = Chroma(persist_directory=PERSIST_DIRECTORY_INMATES, embedding_function=embeddings)
                inmate_retriever = inmate_vector_db.as_retriever(search_kwargs={"k": 3, "filter": {"inmate_id": str(inmate_id)}})
                inmate_query = "medical history conditions interventions records"
                inmate_docs = inmate_retriever.invoke(inmate_query)
                if inmate_docs:
                    inmate_context = "\n\n".join([doc.page_content for doc in inmate_docs])
            except Exception as inner_e:
                print(f"Warning: Could not fetch inmate records: {inner_e}")

        context = f"--- GENERIC MEDICAL GUIDELINES ---\n{general_context}\n\n--- INMATE MEDICAL RECORDS ---\n{inmate_context}"
        template = """
        You are an AI Prison Health Assistant. Analyze the inmate's profile based on the data provided.
        
        INMATE INFO:
        Age: {age}
        Gender: {gender}
        Crime: {crime}
        
        INITIAL VISUAL EMOTION:
        {visual_emotion}
        
        OCR PRESCRIPTION DATA:
        {ocr_prescription}
        
        RECENT EMOTIONS (Video Analysis):
        {emotions}
        
        SELF-REPORTED SYMPTOMS & VOICE EMOTION (Survey):
        {survey}
        PREVIOUS HEALTH PROFILES (History):
        {previous_profiles}
        
        MEDICAL GUIDELINES (Retrieved Context):
        {context}
        
        TASK:
        Analyze all the inputs (especially the correlation between what they said, their voice emotion, and their initial visual expression + prescription) and generate a health profile.
        Compare current status against `PREVIOUS HEALTH PROFILES` to determine the `progress_indicator`.
        Provide output based strictly on the schema provided.
        """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["age", "gender", "crime", "visual_emotion", "ocr_prescription", "emotions", "survey", "previous_profiles", "context"]
        )  
        input_data = {
            "age": getattr(inmate_data, 'age', 'N/A'),
            "gender": getattr(inmate_data, 'gender', 'Unknown'),
            "crime": getattr(inmate_data, 'crime_details', 'N/A'),
            "visual_emotion": getattr(inmate_data, 'visual_emotion', 'N/A'),
            "ocr_prescription": getattr(inmate_data, 'ocr_prescription', 'None'),
            "emotions": emotion_history,
            "survey": survey_summary,
            "previous_profiles": previous_profiles_str,
            "context": context
        }
        
        print("Generating health profile...\n", prompt.format(**input_data)) 
        
        chain = prompt | structured_llm
        response_obj = chain.invoke(input_data)
        return response_obj.model_dump()

    except Exception as e:
        print(f"Error generating profile: {e}")
        # Return a safe fallback structure on error
        return {
            "risk_level": "Unknown",
            "suspected_conditions": [],
            "recommended_actions": ["System Error - Manual Review Required"],
            "urgent_alert": False,
            "reasoning": str(e),
            "progress_indicator": "Error"
        }