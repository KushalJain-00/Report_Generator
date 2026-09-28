"""Document catalog — ported verbatim from legacy assets/js/app.js (44 entries)."""

from fastapi import HTTPException

DOCS: list[dict] = [
    {"id": "overview", "name": "Brief Overview", "cat": "overview", "icon": "📖", "tip": "High-level summary"},
    {"id": "applicability", "name": "Applicability of Service", "cat": "overview", "icon": "🎯", "tip": "Who it applies to"},
    {"id": "proscons", "name": "Pro's and Con's", "cat": "overview", "icon": "⚖️", "tip": "Balanced decision analysis"},
    {"id": "tableofcontent", "name": "Table of Contents", "cat": "overview", "icon": "📑", "tip": "Master TOC"},
    {"id": "casestudy", "name": "Case Study", "cat": "overview", "icon": "🏆", "tip": "Illustrative case study"},
    {"id": "dashboard", "name": "Dashboard Template", "cat": "overview", "icon": "📊", "tip": "KPI tracking dashboard"},
    {"id": "charter", "name": "Project Charter", "cat": "planning", "icon": "📋", "tip": "Project authorization"},
    {"id": "sow", "name": "Scope of Work", "cat": "planning", "icon": "📌", "tip": "Deliverables & boundaries"},
    {"id": "wbs", "name": "Project Plan / WBS", "cat": "planning", "icon": "🗂️", "tip": "Work breakdown structure"},
    {"id": "gantt", "name": "Timeline / Gantt Chart", "cat": "planning", "icon": "📅", "tip": "Week-by-week timeline"},
    {"id": "resource", "name": "Resource Allocation Plan", "cat": "planning", "icon": "👥", "tip": "Team & roles"},
    {"id": "assumption", "name": "Assumption & Constraint Log", "cat": "planning", "icon": "🔒", "tip": "Dependencies & impact"},
    {"id": "risk", "name": "Risk Register & Mitigation", "cat": "planning", "icon": "⚠️", "tip": "Risk identification & plan"},
    {"id": "sop", "name": "SOP for Service Preparation", "cat": "operations", "icon": "⚙️", "tip": "Standard operating procedure"},
    {"id": "methodology", "name": "Methodology of Work", "cat": "operations", "icon": "🔬", "tip": "Approach & framework"},
    {"id": "tor", "name": "Terms of Reference", "cat": "operations", "icon": "📜", "tip": "Roles & governance"},
    {"id": "stakeholder", "name": "Stakeholder Register", "cat": "operations", "icon": "🤝", "tip": "Stakeholder mapping"},
    {"id": "comms", "name": "Communication Plan", "cat": "operations", "icon": "📡", "tip": "Communication matrix"},
    {"id": "flow", "name": "Process Flow Diagram", "cat": "operations", "icon": "🔄", "tip": "Process flow"},
    {"id": "gap", "name": "Gap Analysis Template", "cat": "operations", "icon": "🔍", "tip": "Current vs required state"},
    {"id": "compliance", "name": "Compliance Check", "cat": "operations", "icon": "🛡️", "tip": "Compliance matrix"},
    {"id": "toolsequip", "name": "Tools & Equipment List", "cat": "operations", "icon": "🔧", "tip": "Required tools"},
    {"id": "softwares", "name": "Softwares Required List", "cat": "operations", "icon": "💻", "tip": "Software requirements"},
    {"id": "peoplerequired", "name": "People & Expertise Required", "cat": "operations", "icon": "👨‍🔬", "tip": "Qualifications needed"},
    {"id": "dosdonts", "name": "Do's & Don'ts", "cat": "operations", "icon": "💡", "tip": "Critical considerations"},
    {"id": "checklist", "name": "Data & Documents Checklist", "cat": "data", "icon": "✅", "tip": "Required data checklist"},
    {"id": "datacollection", "name": "Data Collection Template", "cat": "data", "icon": "📋", "tip": "Data collection forms"},
    {"id": "tracker", "name": "Document Submission Tracker", "cat": "data", "icon": "🗃️", "tip": "Submission tracking"},
    {"id": "sitevisit", "name": "Site Visit / Field Observation", "cat": "data", "icon": "🏗️", "tip": "Field observation form"},
    {"id": "interview", "name": "Interview / Questionnaire", "cat": "data", "icon": "🎤", "tip": "Interview guide"},
    {"id": "secondary", "name": "Secondary Data Review Sheet", "cat": "data", "icon": "📰", "tip": "Secondary data review"},
    {"id": "sample", "name": "Sample Format for Service", "cat": "data", "icon": "📄", "tip": "Sample report format"},
    {"id": "draft", "name": "Draft Report", "cat": "data", "icon": "✍️", "tip": "Full draft report"},
    {"id": "pricing", "name": "Pricing Calculation Reference", "cat": "business", "icon": "💰", "tip": "Fee structure & pricing"},
    {"id": "techquote", "name": "Techno-Commercial Quotation", "cat": "business", "icon": "📃", "tip": "Professional quotation"},
    {"id": "bizplan", "name": "Complete Business Plan", "cat": "business", "icon": "🏢", "tip": "Full business plan"},
    {"id": "excel", "name": "Excel Project Tracker", "cat": "business", "icon": "📈", "tip": "Multi-project tracker"},
    {"id": "pitch", "name": "Client Pitch", "cat": "marketing", "icon": "💼", "tip": "Client pitch deck"},
    {"id": "pitchdeck", "name": "Pitch Deck (VC / Investor)", "cat": "marketing", "icon": "🎯", "tip": "Investor pitch deck"},
    {"id": "clientpresentation", "name": "Client Presentation", "cat": "marketing", "icon": "🖥️", "tip": "Client presentation"},
    {"id": "marketing", "name": "Marketing & Sales Plan", "cat": "marketing", "icon": "📣", "tip": "Marketing strategy"},
    {"id": "emailmarketing", "name": "Email Marketing Content", "cat": "marketing", "icon": "✉️", "tip": "Email sequences"},
    {"id": "whatsapp", "name": "WhatsApp Marketing Content", "cat": "marketing", "icon": "💬", "tip": "WhatsApp scripts"},
    {"id": "pharmasample", "name": "Sample Copy — Pharma", "cat": "marketing", "icon": "💊", "tip": "Pharma industry sample"},
]


def validate_docs(ids: list[str]) -> list[dict]:
    by_id = {d["id"]: d for d in DOCS}
    missing = [i for i in ids if i not in by_id]
    if missing:
        raise HTTPException(422, f"Unknown document ids: {', '.join(missing)}")
    if not ids:
        raise HTTPException(422, "No documents selected")
    return [by_id[i] for i in ids]
