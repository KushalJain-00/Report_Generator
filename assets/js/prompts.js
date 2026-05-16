// ── PROMPTS ───────────────────────────────────────────────────────
function buildPrompt(doc,p,b){
  const systemPersona = S.prompts.systemPersona;
  
  const ctx = `--- PROJECT & CONTEXT PARAMETERS ---
Service/Project Name: ${p.name}
Industry/Sector: ${p.sector||'Not Specified'}
Geographical Scope: ${p.geo||'Not Specified'}
Target Client/Organization: ${p.client||'Not Specified'}
Target Audience/Stakeholders: ${p.audience||'Not Specified'}
Estimated Duration: ${p.duration||'Not Specified'}
Estimated Budget/Value: ${p.price||'Not Specified'}
Relevant Standards/Compliances: ${p.standards||'Not Specified'}
Project Description: ${p.desc||'Not Specified'}
${p.referenceText ? `\n--- STYLE & CONTENT REFERENCE ---\nThe following is a reference document provided by the user. Align the tone, formatting, and structural approach with this reference, while addressing the core project context above:\n\n${p.referenceText}\n` : ''}
--- BRANDING & AUTHORSHIP ---
${b.cname?`Consulting Firm/Company: ${b.cname}\nContact Email: ${b.email||'Not Specified'}\nContact Phone: ${b.phone||'Not Specified'}\nWebsite: ${b.web||'Not Specified'}`:'Authorship: Independent Consulting Professional'}
${b.watermark?`CONFIDENTIALITY NOTE: This document is classified as [${b.watermarkText}].`:''}`;

  const outputDirectivesBase = S.prompts.outputDirectives.replace('{lang}', p.lang || 'English');
  const ownershipDirective = b.cname ? `\n6. Ownership: Subtly position the document as the intellectual property and expert deliverable of ${b.cname}.` : '\n6. Ownership: Present this as a professional proprietary document.';
  const outputDirectives = outputDirectivesBase + ownershipDirective;

  const pm={
    overview:`Generate a "Brief Overview of the Service" document. Structure: (1) What is "${p.name}"? (2) Why is it important/mandatory? (3) Who needs it? (4) High-level process involved. (5) Key outcomes and benefits. (6) Summary table of key facts. Make it clear and compelling — suitable for a client brochure.`,
    applicability:`Generate "Applicability of the Service" document. Include: (1) Industries/sectors applicable (table), (2) Organisation types and sizes, (3) Geographic/regulatory applicability, (4) When it is legally or operationally mandatory, (5) Decision-maker profiles who benefit. Use clear tables.`,
    proscons:`Generate "Pro's and Con's of the Service". PROS section (minimum 10 with explanation), CONS section (minimum 6 with mitigation strategies), Overall Recommendation, 5 common client objections with answers. Help clients make informed decisions.`,
    tableofcontent:`Generate a master "Table of Contents" for a complete report package. Number all sections. Parts: I — Project Initiation, II — Planning, III — Data Collection & Analysis, IV — Findings & Recommendations, V — Annexures. Include sub-sections with estimated page counts.`,
    casestudy:`Generate a detailed "Case Study". Structure: (1) Client Profile (realistic fictional), (2) Problem Statement, (3) Approach & Methodology, (4) Implementation Timeline, (5) Key Findings, (6) Solutions Recommended, (7) Outcomes & Impact (with numbers), (8) Client Testimonial, (9) Lessons Learned.`,
    dashboard:`Generate a "Dashboard Template" structure. Include: (1) KPI Cards (8-10 metrics with units), (2) Status Overview section, (3) Progress Tracker, (4) Financial Summary, (5) Timeline/Milestone view, (6) Risk/Issue log summary, (7) Next Actions. Describe each widget for Excel/software implementation.`,
    charter:`Generate a professional "Project Charter". Include: Project Title, Date, Sponsor, PM, Objectives (5 SMART), Scope Summary, Budget Estimate, Key Milestones (6), Stakeholders, Risks, Authority Granted, Approval signatures table.`,
    sow:`Generate a detailed "Scope of Work (SOW)". Include: Introduction, In-Scope (numbered), Out-of-Scope (numbered), Deliverables table (name, description, due date, format), Performance Standards, Payment Milestones, Termination Clauses, Signatures.`,
    wbs:`Generate a "Work Breakdown Structure". Table: WBS ID | Task Name | Phase | Duration (days) | Dependencies | Responsible | Status. Include 5+ phases and 25+ tasks. Add phase summary.`,
    gantt:`Generate a text-format "Gantt Chart". Table: Task | Phase | Start Wk | End Wk | Duration | then 16-week grid using █ (active) · (inactive). 20+ tasks across: Planning, Mobilisation, Field/Data, Analysis, Reporting.`,
    resource:`Generate a "Resource Allocation Plan". Include: Org chart (text), Role table (Role | Qualification | Responsibility | Days | Rate | Total Cost), Individual Scope of Work per role, Equipment list, Budget Summary.`,
    assumption:`Generate "Assumption & Constraint Log". TABLE 1 Assumptions (ID | Assumption | Basis | Impact if Wrong | Probability | Owner | Date) — 12 entries. TABLE 2 Constraints (ID | Constraint | Type | Impact | Mitigation | Owner) — 10 entries.`,
    risk:`Generate a "Risk Register". Table: Risk ID | Category | Description | Cause | Probability H/M/L | Impact H/M/L | Score | Mitigation | Contingency | Owner | Review Date | Status. Minimum 18 risks across Technical, Financial, Operational, Environmental, Regulatory.`,
    sop:`Generate a comprehensive "SOP for Preparation of ${p.name}". Include: Purpose, Scope, Definitions table, Roles & Responsibilities, Detailed Numbered Steps (with sub-steps, decision points), Quality Checks at each stage, Non-Conformance handling, Documentation requirements, Review cycle, Revision History.`,
    methodology:`Generate a "Methodology of Work" document. Include: Overview/Philosophy, Research Design, Data Collection Methods (primary & secondary), Tools & Equipment, Analytical Framework, QA/QC, Limitations, Ethical Considerations.`,
    tor:`Generate "Terms of Reference (ToR)". Include: Background, Objectives, Scope, Tasks (detailed numbered), Deliverables with timelines, Reporting Requirements, Team Qualifications, Duration & Budget, Evaluation Criteria.`,
    stakeholder:`Generate a "Stakeholder Register". Table: Stakeholder | Organisation | Role | Interest H/M/L | Influence H/M/L | Engagement Strategy | Communication Preference | Key Concerns | Expectations | Status. Minimum 15 stakeholders.`,
    comms:`Generate a "Communication Plan". Include: Communication Matrix table (Audience | Info | Method | Frequency | Responsible | Format | Distribution), Meeting Schedule, Reporting Calendar, Escalation Matrix.`,
    flow:`Generate a "Process Flow Diagram" in text/ASCII format for delivering "${p.name}" end-to-end. Include: Phase table, ASCII flowchart, RACI matrix (Activity | PM | Field | Analyst | Client | QA), Quality Checkpoints per phase.`,
    gap:`Generate a "Gap Analysis Template". Include: Current State Assessment, Desired State, Gap Analysis Matrix (Area | Sub-area | Current | Required | Gap | Severity H/M/L | Priority | Action | Timeline | Responsible), Implementation Roadmap.`,
    compliance:`Generate a "Compliance Check" document. Table: Requirement | Regulatory Reference | Compliance Status | Evidence Required | Current Evidence | Gap | Corrective Action | Deadline | Responsible. Add Non-Compliance Summary.`,
    toolsequip:`Generate "Tools & Equipment Required" list. Sections: (1) Field Instruments, (2) Safety Equipment, (3) Sampling Equipment, (4) Lab Equipment, (5) IT/Computing. Table: Item | Specification | Purpose | Quantity | Source (Own/Hire/Buy) | Estimated Cost.`,
    softwares:`Generate "Softwares & Digital Tools Required". Sections: (1) Data Collection, (2) Analysis & Modelling, (3) Reporting & Visualisation, (4) Project Management, (5) Communication. Table: Software | Version/Tier | Purpose | Cost/License | Free Alternative.`,
    peoplerequired:`Generate "People & Expertise Required". Include: (1) Team Structure diagram (text), (2) Role table (Role | No. of Persons | Min Qualification | Experience | Key Skills | Certifications), (3) Individual Scope of Work per role, (4) Hiring vs. subcontracting recommendation.`,
    dosdonts:`Generate "Do's & Don'ts / Things to Take Care" for "${p.name}". Categories: Project Planning, Data Collection, Stakeholder Engagement, Analysis, Report Writing, QA, Ethics, Client Communication, Team Management. Each: 8 Do's + 8 Don'ts with explanations.`,
    checklist:`Generate "Data & Documents Required Checklist". Sections: Primary Data, Secondary Data, Legal & Regulatory, Technical Docs, Financial Records, Stakeholder Contacts. Format: [ ] Item | Source | Format | Responsible | Due Date | Status. Minimum 50 items.`,
    datacollection:`Generate 3 "Data Collection Templates". FORM 1: Primary Survey (18+ questions). FORM 2: Field Measurement Log (Parameter | Unit | Method | Instrument | Reading 1-3 | Average | Standard | Status | Remarks). FORM 3: Photographic Evidence Log.`,
    tracker:`Generate "Document Submission Tracker". Pre-fill 25 rows: Doc ID | Name | Category | Version | Required By | Submitted Date | By | Reviewed By | Review Date | Status | Remarks. Add status dashboard section.`,
    sitevisit:`Generate "Site Visit / Field Observation Form". Include: Site Info, Visit Details, Safety Observations, Parameters table (Parameter | Location | Observation | Reading | Standard | Compliance | Remarks), Issues Found, Photos Required, Recommendations, Signatures.`,
    interview:`Generate "Interview & Questionnaire Templates". PART 1: Interview Guide (25 open-ended questions by theme). PART 2: Structured Questionnaire (20 questions with Likert 1-5 scales). PART 3: Focus Group Discussion Guide with facilitation notes.`,
    secondary:`Generate "Secondary Data Review Sheet". Include: Data Sources table (Source | Type | Year | Publisher | Relevance | Key Data | Gaps | Reliability H/M/L), Detailed Findings, Data Triangulation Analysis, Quality Assessment.`,
    sample:`Generate a "Sample Format" document. Include: Title Page template, Document Control table, all section headings with content descriptions, Figure/Table list, Abbreviations, References format, Formatting Guidelines.`,
    draft:`Generate a comprehensive "Draft Report". Sections: (1) Title Page, (2) Executive Summary (300 words), (3) TOC, (4) Introduction (250 words), (5) Objectives, (6) Methodology, (7) Key Findings & Analysis (500+ words with subsections), (8) Discussion, (9) Conclusions, (10) Recommendations (10 prioritised), (11) Way Forward, (12) References, (13) Annexures.`,
    pricing:`Generate "Pricing Calculation Reference Format" for ${p.name}. Include: Cost Components table (Labour, Equipment, Travel, Overheads, Profit, Taxes), Day Rate Calculator by role, Pricing tiers (Small/Medium/Large project), Optional add-ons, Sample Quotation layout, Pricing Assumptions.`,
    techquote:`Generate a "Techno-Commercial Quotation Format". Include: Company header, Client info, Quotation No./Date, Technical Scope table (Item | Description | Specification | Qty | Unit | Rate | Amount), Terms & Conditions, Payment Schedule, Validity, Signature block.`,
    bizplan:`Generate a "Complete Business Plan" for providing ${p.name} as a service. Include: Executive Summary, Company Overview, Vision/Mission/Values, Market Analysis (SWOT, TAM/SAM/SOM, competition), Services Portfolio, Marketing & Sales Strategy, Operations Plan, Team Structure, Financial Projections (3-year P&L, break-even), Risk Analysis, Growth Roadmap.`,
    excel:`Generate "Multi-Project Excel Tracker" structure for ${p.name}. (1) Dashboard layout — KPI cards: Total Projects, On Track, At Risk, Delayed, Budget Utilisation, Revenue. (2) Project Registry (20 columns): Project ID | Client | Name | Status | Priority | Start | End | % Complete | Contract Value | PO Details | Invoice No. | Payment Status | Amount Received | Balance | PM | Location | RAG | Next Milestone | Issues | Notes. (3) Key Excel formulas and conditional formatting rules to implement.`,
    pitch:`Generate a "Client Pitch" document for ${p.name}. Cover: WHY (problem, why now), WHAT (what we offer), HOW (methodology, approach), WHEN (timeline, phases), WHO (our team, credentials), HOW MUCH (pricing, ROI), NEXT STEPS (CTA). Make it compelling for ${p.client||'the client'}.`,
    pitchdeck:`Generate a "VC / Investor Pitch Deck" for the business of ${p.name} services. 12 slides: 1-Cover, 2-Problem, 3-Solution, 4-Market Opportunity (TAM/SAM/SOM), 5-Business Model, 6-Traction/Credibility, 7-Methodology/Tech, 8-Team, 9-Competitive Landscape, 10-Financials & Projections, 11-The Ask/Use of Funds, 12-CTA/Contact. Each slide: Key Message + 5 bullets + Visual suggestion + Speaker Notes.`,
    clientpresentation:`Generate a "Client Presentation" for ${p.name} for ${p.client||'the client'}. 12-15 slides: 1-Title, 2-Agenda, 3-About Us, 4-Your Challenge, 5-Our Solution, 6-Scope & Deliverables, 7-Methodology, 8-Team & Credentials, 9-Project Timeline, 10-Investment, 11-Case Study, 12-Next Steps, 13-Q&A/Contact. Include talking points and visual suggestions per slide.`,
    marketing:`Generate a "Marketing & Sales Plan" for ${p.name} services. Include: ICP (Ideal Client Profile) analysis, Value Proposition canvas, Marketing Channels (digital + offline), Sales Funnel with conversion activities, 3-month Content Calendar, Pricing Strategy, KPIs & metrics, Monthly budget template.`,
    emailmarketing:`Generate "Email Marketing Content" for ${p.name}. Create: (1) Cold Outreach Sequence (5 emails — intro, value, case study, urgency, breakup), (2) Follow-up Sequence (3 emails), (3) Newsletter Template, (4) Proposal Follow-up, (5) Onboarding Welcome. Each: Subject line (3 options), Body, CTA.`,
    whatsapp:`Generate "WhatsApp Marketing Content" for ${p.name}. Create: (1) Cold Outreach Messages (5 variants), (2) Follow-up Messages (3 variants), (3) Broadcast Announcement Template, (4) Festival/Occasion Greeting with service mention, (5) Reference Request, (6) Quote Follow-up, (7) Testimonial Request. Keep messages concise and mobile-friendly.`,
    pharmasample:`Generate "Sample Copy of ${p.name} — Pharma Industry" version. Adapt all content specifically for pharmaceutical companies: use pharma terminology, regulatory references (WHO-GMP, Schedule M, FDA 21 CFR, ICH guidelines), pharma-specific parameters, stakeholders. Show how this service applies in a pharma manufacturing context.`,
  };

  const taskDef = pm[doc.id]||`Generate a professional "${doc.name}" document for the service "${p.name}". Make it detailed, ready to use and practical.`;
  
  return `${systemPersona}\n\n${ctx}\n\n--- DOCUMENT TASK ---\n${taskDef}\n\n${outputDirectives}`;
}
