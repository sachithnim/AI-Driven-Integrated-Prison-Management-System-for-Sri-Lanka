
"""
RAG Configuration settings
"""

from typing import Dict, List

# RAG specific settings
RAG_ENABLED = True
EMBEDDING_MODEL = "text-embedding-3-small"
CHUNKING_SIZE = 1000
CHUNKING_OVERLAP = 200
TOP_K_RETRIEVAL = 3

# Mock documents for initial knowledge base
# In a real system, these would be loaded from files or a database
INITIAL_KNOWLEDGE_BASE = [
    {
        "id": "doc_001",
        "title": "Rehabilitation Eligibility Guidelines 2024",
        "content": """
        Eligibility for rehabilitation programs in Sri Lankan prisons is determined by:
        1. Behavior Score: Inmates with a score > 60 are generally eligible. Scores > 80 are prioritized.
        2. Risk Level: Low risk (< 0.4) and Medium risk (0.4-0.7) inmates are preferred. High risk require special clearance.
        3. Program History: Completion of initial counseling is improving eligibility chances.
        4. Sentence Duration: Inmates with > 6 months remaining are prioritized for long-term programs.
        5. Nature of Offence: Non-violent offenders are automatically considered. Violent offenders need 6 months good behavior.
        """
    },
    {
        "id": "case_study_102",
        "title": "Case Study: Financial Fraud Rehabilitation Success",
        "content": """
        Subject: Male, 45, Fraud conviction.
        History: First time offender, cooperative.
        Outcome: Enrolled in vocational training (IT/Accounting).
        Result: Successfully rehabilitated. Low recidivism risk.
        Key Factor: Educational background and non-violent nature made him an ideal candidate despite high value of fraud.
        Approved for: Open Prison Camp transfer after 1 year.
        """
    },
    {
        "id": "case_study_205",
        "title": "Case Study: Substance Abuse Integration",
        "content": """
        Subject: Male, 28, Drug possession.
        History: Addiction issues, minor disciplinary infractions.
        Outcome: Enrolled in therapeutic community program.
        Result: Initial relapse risk high, but structure improved behavior score from 45 to 75 over 6 months.
        Key Factor: Combined medical treatment with vocational training (Carpentry).
        """
    },
    {
        "id": "protocol_medical",
        "title": "Medical Clearance Protocol",
        "content": """
        Inmates with chronic conditions (diabetes, heart conditions) must be cleared by prison medical officer before physical vocational training.
        Administrative or seated work is recommended for those with mobility issues.
        """
    }
]
