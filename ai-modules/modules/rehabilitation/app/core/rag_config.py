
"""
RAG Configuration settings and in-memory knowledge retrieval.
Uses keyword-based retrieval (no external vector DB needed) and injects
relevant documents into LLM prompts for grounded, evidence-based responses.
"""

from typing import Dict, List, Optional
import re

# RAG specific settings
RAG_ENABLED = True
EMBEDDING_MODEL = "text-embedding-3-small"
CHUNKING_SIZE = 1000
CHUNKING_OVERLAP = 200
TOP_K_RETRIEVAL = 3

# ---------------------------------------------------------------------------
# Knowledge Base Documents
# ---------------------------------------------------------------------------

INITIAL_KNOWLEDGE_BASE = [
    {
        "id": "sl_law_001",
        "title": "Sri Lanka Prisons Ordinance – Early Release Criteria",
        "tags": ["early_release", "sentence", "legal"],
        "content": """
Criteria for Early Release under Sri Lanka Prisons Ordinance (Cap. 72) and subsequent amendments:
1. Minimum 50% of sentence served (non-violent offences); 66% for violent offences.
2. Good conduct certificate from Prison Superintendent required.
3. Behavioural score must exceed 65/100 for the 6 months preceding application.
4. No disciplinary punishments in the last 12 months.
5. Rehabilitation program completion improves eligibility significantly.
6. Victims' objection may be considered for violent crimes.
7. Risk assessment by a qualified probation officer is mandatory.
8. Repeat offenders (≥2 prior convictions) require Commissioner General's approval.
        """,
    },
    {
        "id": "sl_law_002",
        "title": "Presidential Pardons – Sri Lanka Legal Framework",
        "tags": ["pardon", "presidential", "legal"],
        "content": """
Presidential Pardon criteria under the Sri Lanka Constitution, Article 34:
1. Generally granted after 75%+ of sentence served.
2. Capital offences (murder, terrorism) are rarely pardoned; exceptional humanitarian grounds only.
3. First-time offenders with no violations and completed rehab have significantly higher approval rates.
4. Offences of severity ≤ 2 (petty, minor fraud) have highest approval rates.
5. Applications processed through Prisons Advisory Board → Ministry of Justice → President's office.
6. Medical compassionate pardon may be granted for terminally ill inmates regardless of sentence %.
7. Crimes against children or elderly are less likely to be pardoned.
        """,
    },
    {
        "id": "sl_law_003",
        "title": "Home Leave / Furlough Guidelines – Sri Lanka Prisons",
        "tags": ["home_leave", "furlough", "gps"],
        "content": """
Home Leave eligibility under Prisons Regulations Section 47B:
1. Inmate must have served at least 33% of sentence.
2. No institutional violations in the past 6 months.
3. Behavioural score ≥ 70/100.
4. Family support confirmed by welfare officer.
5. First home leave: maximum 3 days; subsequent grants up to 14 days.
6. GPS ankle monitoring mandatory for crimes of severity ≥ 3.
7. Daily telephone check-in required.
8. Return by 18:00 on final day; late return without notice results in immediate revocation.
9. Risk score > 0.7 requires divisional magistrate approval.
10. Substance abuse history requires written declaration and random testing during leave.
        """,
    },
    {
        "id": "rehab_guidelines_001",
        "title": "Rehabilitation Program Eligibility Guidelines 2024",
        "tags": ["eligibility", "programs", "behaviour"],
        "content": """
Eligibility for rehabilitation programs in Sri Lankan prisons:
1. Behavior Score > 60 → generally eligible. Score > 80 → prioritised for advanced programs.
2. Risk Level: Low (< 0.4) and Medium (0.4–0.7) preferred; high risk require special clearance.
3. Completion of initial counseling improves eligibility by 20%.
4. Sentence Duration: Inmates with > 6 months remaining prioritised for long-term programs.
5. Non-violent offenders automatically considered; violent offenders need 6 months good behaviour.
6. Mental health issues do NOT disqualify – bespoke therapeutic programs available.
7. Substance abuse requires parallel addiction treatment programme alongside vocational training.
        """,
    },
    {
        "id": "case_study_financial_fraud",
        "title": "Case Study: Financial Fraud – Successful Rehabilitation",
        "tags": ["fraud", "vocational", "case_study"],
        "content": """
Subject: Male, 45, Financial Fraud conviction (first offence).
History: Cooperative, educated, no institutional violations.
Intervention: Enrolled in IT/Accounting vocational program.
Outcome: Behavior score improved from 72 → 91 over 18 months.
Early Release: Granted at 52% sentence served.
Key Factor: Non-violent, highly motivated; strong family support.
Home Leave: Granted twice (3 days, then 7 days). No incidents.
Recidivism Risk at Discharge: Very low (0.12).
        """,
    },
    {
        "id": "case_study_substance_abuse",
        "title": "Case Study: Drug Possession – Therapeutic Programme",
        "tags": ["drug", "substance_abuse", "case_study"],
        "content": """
Subject: Male, 28, Drug possession (2nd offence).
History: Addiction issues, 2 minor disciplinary infractions early in sentence.
Intervention: Therapeutic community + Carpentry vocational training.
Outcome: Behavior score rose from 45 → 75 over 8 months.
Home Leave: Conditional – GPS ankle monitor + daily call-in. 3-day grant initially.
Early Release: Denied first application; granted after 66% served and clean 12-month record.
Key Learning: Dual-intervention (addiction treatment + skills training) shows 40% better outcomes.
        """,
    },
    {
        "id": "case_study_violence",
        "title": "Case Study: Violent Offence – Risk-Managed Rehabilitation",
        "tags": ["violence", "risk", "case_study"],
        "content": """
Subject: Male, 34, Assault with grievous bodily harm (crime severity 3).
History: 1 prior conviction, anger management issues.
Intervention: Anger management program + vocational training (Plumbing).
Timeline: 18-month anger management program. Violations: 0 after month 6.
Home Leave: Only granted after 50% sentence served + magistrate approval. GPS mandatory.
Early Release: Applied at 60% – approved. Risk score reduced from 0.71 → 0.48.
Key Learning: Court-mandated anger management as prerequisite substantially reduced reoffending risk.
        """,
    },
    {
        "id": "mental_health_protocol",
        "title": "Mental Health Assessment and Integration Protocol",
        "tags": ["mental_health", "counseling", "protocol"],
        "content": """
Mental health protocols for rehabilitation assessment:
1. Avg counseling score ≥ 7/10 over ≥ 4 sessions indicates good therapeutic engagement.
2. Untreated depression/anxiety raises reoffending risk by 35% – treat before release planning.
3. Psychotic conditions require stable medication compliance for 6 months before any leave.
4. PTSD treatment reduces violent reoffending by 28% in follow-up studies.
5. Counseling notes should be factored into all eligibility decisions.
6. Therapeutic alliance score (session engagement) is a strong predictor of compliance.
        """,
    },
    {
        "id": "protocol_medical",
        "title": "Medical Clearance Protocol",
        "tags": ["medical", "clearance"],
        "content": """
Medical clearance requirements before program placement or home leave:
1. Chronic conditions (diabetes, cardiac) must be cleared by prison medical officer before physical vocational training.
2. Administrative / seated work recommended for mobility impairment.
3. Medications must be dispensed via guardian or pharmacist during home leave.
4. Medical compassionate pardon route available for terminal illness.
        """,
    },
    {
        "id": "recidivism_research_001",
        "title": "Recidivism Risk Factors – Evidence-Based Summary",
        "tags": ["risk", "recidivism", "research"],
        "content": """
Evidence-based recidivism risk factors (adapted for Sri Lanka context):
HIGH-RISK FACTORS:
- Prior convictions ≥ 3: 3× recidivism rate.
- Institutional violations > 5: 2.5× recidivism rate.
- Risk score > 0.7: Predictive of reoffending within 2 years.
- Unemployment at release: 60% higher recidivism.
PROTECTIVE FACTORS:
- Strong family support: 45% lower recidivism.
- Employment secured before release: 50% lower recidivism.
- Completion of vocational program: 38% lower recidivism.
- ≥ 8 counseling sessions with avg score ≥ 7: 42% lower recidivism.
- Community ties score ≥ 0.7: 35% lower recidivism.
        """,
    },
]

# ---------------------------------------------------------------------------
# Knowledge Retrieval (keyword / tag-based; no vector DB required)
# ---------------------------------------------------------------------------

def _score_document(doc: Dict, query_tags: List[str], query_text: str) -> float:
    """Simple relevance score: tag matches + keyword hits in content."""
    score = 0.0
    doc_tags = doc.get("tags", [])
    for tag in query_tags:
        if tag in doc_tags:
            score += 2.0
    words = re.findall(r"\w+", query_text.lower())
    content_lower = doc["content"].lower() + doc["title"].lower()
    for word in words:
        if len(word) > 4 and word in content_lower:
            score += 0.5
    return score


def retrieve_context(
    query_tags: List[str],
    query_text: str = "",
    top_k: int = TOP_K_RETRIEVAL,
) -> str:
    """
    Retrieve the most relevant knowledge-base documents and format them
    as a context block for injection into an LLM prompt.
    """
    if not RAG_ENABLED:
        return ""
    scored = [
        (doc, _score_document(doc, query_tags, query_text))
        for doc in INITIAL_KNOWLEDGE_BASE
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    top = [doc for doc, sc in scored[:top_k] if sc > 0]
    if not top:
        # fallback: return first 2 docs
        top = INITIAL_KNOWLEDGE_BASE[:2]
    return "\n\n".join(
        f"[{doc['title']}]\n{doc['content'].strip()}"
        for doc in top
    )
