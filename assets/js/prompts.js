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
    overview:`Generate an Executive "Brief Overview of the Service" using a BLUF (Bottom Line Up Front) approach. Structure: (1) Strategic Context & Imperative, (2) MECE Breakdown of Process/Value Chain, (3) Key Value Drivers & ROI, (4) Target Applicability. Conclude with a crisp Summary Matrix of key facts. Ensure actionable insights.`,
    applicability:`Generate an Executive "Applicability of the Service" report. Include: (1) BLUF on regulatory/market drivers, (2) MECE segmentation of applicable industries/sectors (table format), (3) Operational triggers for mandating this service, (4) Decision-maker impact (C-Suite vs. VP level). Focus on strategic alignment.`,
    proscons:`Generate a Strategic "Pros and Cons" assessment. Use a MECE structure. PROS section (10 drivers with strategic impact), CONS section (6 risks with concrete mitigation strategies), Executive Recommendation, and 5 common stakeholder objections with data-driven rebuttals. Keep tone highly objective.`,
    tableofcontent:`Generate a Master "Table of Contents" for a Big-4 grade report package. Number all sections rigorously. Parts: I — Executive Summary & Strategic Context, II — Current State Assessment, III — Deep-Dive Analysis & Findings, IV — Strategic Recommendations & Roadmap, V — Annexures. Estimate page counts.`,
    casestudy:`Generate an Enterprise "Case Study". Structure: (1) Executive Summary (BLUF), (2) Client Context & Challenge, (3) Hypothesis-Driven Approach & Methodology, (4) Implementation Roadmap, (5) Quantitative Impact & Outcomes (ROI/Metrics), (6) Strategic "Lessons Learned". Use a polished, professional tone.`,
    dashboard:`Generate an Executive "Dashboard Template" architecture. Include: (1) Leading & Lagging KPI Cards (8-10 metrics), (2) RAG Status Overview, (3) Financial Variance Summary, (4) Critical Path Timeline, (5) Key Risks & Mitigation. Detail widget logic for BI/Dashboard implementation.`,
    charter:`Generate a rigorous "Project Charter". Include: Executive Sponsor, Business Case (BLUF), 5 SMART Objectives, Strict In/Out of Scope boundaries (MECE), Financial Baseline, Milestone Roadmap, Risk Profile, and Governance/Approval Matrix.`,
    sow:`Generate a robust "Scope of Work (SOW)". Include: Strategic Objectives, MECE In-Scope Activities, Explicit Out-of-Scope Activities, Deliverables Matrix (Name, Format, SLA, Due Date), Acceptance Criteria, Payment Milestones, and Risk Allocation. Ensure iron-clad commercial language.`,
    wbs:`Generate a "Work Breakdown Structure" (WBS). Present a highly structured Table: WBS ID | Phase | Task Name | Duration | Dependencies | RACI (Responsible, Accountable, Consulted, Informed) | Deliverable. Minimum 5 MECE phases and 25 sub-tasks.`,
    gantt:`Generate a text-based "Gantt Chart" and Implementation Timeline. Table: Phase | Task | Start | End | Duration | Critical Path (Y/N). Use a 16-week matrix grid (█ active, · inactive). Ensure a logical sequencing of Planning, Execution, Analysis, and Handoff.`,
    resource:`Generate a "Resource Allocation & Capacity Plan". Include: Hierarchical Org Chart (text), Role/FTE Matrix (Role | Qualifications | Utilization % | Rate | Cost), Detailed SOW per capability, Equipment/Software needs, and Total Cost of Delivery summary.`,
    assumption:`Generate an "Assumption, Constraint & Dependency Log". TABLE 1: Assumptions (ID | Description | Business Impact | Validation Strategy | Owner). TABLE 2: Constraints (ID | Type | Impact | Workaround | Owner). Provide actionable mitigation for top 3 risks.`,
    risk:`Generate an Enterprise "Risk Register". Enforce MECE categorization (Operational, Financial, Regulatory, Strategic). Table: Risk ID | Category | Description | Root Cause | Probability (1-5) | Impact (1-5) | Risk Score | Mitigation Strategy | Contingency Plan | Owner. Minimum 18 risks.`,
    sop:`Generate a strict "Standard Operating Procedure (SOP)". Include: Purpose, Scope, Definitions, RACI Matrix. Detail the procedure in rigorous numbered steps with decision-tree logic (If X, then Y). Include QA/QC gateways, Non-Conformance protocols, and Audit trails.`,
    methodology:`Generate a "Methodology & Analytical Approach" document. Outline the Hypothesis-Driven design. Include: Diagnostic Framework, Data Collection Protocols (Primary/Secondary), MECE Analytical Models utilized, QA/QC rigor, Limitations, and Mitigation of analytical bias.`,
    tor:`Generate formal "Terms of Reference (ToR)". Include: Strategic Background, Core Objectives, MECE Scope of Services, Explicit Deliverables with Timelines, Governance & Reporting Cadence, Key Personnel Qualifications, and KPIs for Evaluation.`,
    stakeholder:`Generate a "Stakeholder Analysis & Engagement Plan". Table: Stakeholder Group | Role | Power/Interest Grid (High/Low) | Strategic Priorities | Potential Resistance | Tailored Engagement Strategy | Communication Cadence. Minimum 15 groups mapped.`,
    comms:`Generate a Corporate "Communication Plan". Include a Communication Matrix: Audience | Core Message | Channel | Frequency | Owner | Feedback Loop. Detail the escalation matrix and governance meeting cadence (SteerCo, OpCo).`,
    flow:`Generate a "Process Flow & Value Chain Diagram" (text/ASCII). Include: MECE Phase mapping, Decision Nodes, and a RACI matrix overlay (Phase | Activity | R | A | C | I). Highlight quality gateways and critical handoffs.`,
    gap:`Generate a "Gap Analysis & Transformation Roadmap". Include: Current State Assessment (As-Is), Target Operating Model (To-Be), Gap Matrix (Dimension | Current | Target | Root Cause of Gap | Severity | Remediation Initiative | Owner).`,
    compliance:`Generate a "Regulatory & Compliance Matrix". Table: Regulatory Framework/Standard | Specific Clause | Current Compliance Status | Evidence/Artifact | Gap Identified | Remediation Action | Deadline | Owner. Focus on strict audit readiness.`,
    toolsequip:`Generate a "Resource & Equipment Requisition Matrix". Categorize (MECE): Field, Lab, Safety, IT. Table: Asset Class | Specification | Purpose | Qty | Procurement Strategy (CapEx vs OpEx) | Estimated Cost | Lead Time.`,
    softwares:`Generate a "Digital & Tech Stack Requirements" list. Categorize (MECE): Data Collection, Advanced Analytics, Visualization, Project Mgmt. Table: Software | Tier/License | Business Capability | Cost | Open-Source/Cost-Effective Alternative.`,
    peoplerequired:`Generate a "Talent & Capability Requirements" plan. Include: Target Operating Model (Team Structure), Capability Matrix (Role | Headcount | Minimum Credentials | SME Skills), and a strategic Build vs. Buy (Hiring vs. Subcontracting) recommendation.`,
    dosdonts:`Generate "Best Practices & Pitfalls (Do's & Don'ts)". Categorize by project lifecycle phases. For each phase, provide 8 high-impact "Do's" (Strategic best practices) and 8 critical "Don'ts" (Common failure modes with root-cause prevention).`,
    checklist:`Generate a "Comprehensive Data & Artifact Requisition Checklist". Categorize (MECE): Primary, Secondary, Regulatory, Financial, Technical. Format: [ ] Item | Source System | Format | Owner | SLA/Due Date | Status. Minimum 50 distinct items.`,
    datacollection:`Generate 3 rigorous "Data Collection Protocols". FORM 1: Primary Stakeholder Survey (18+ structured questions). FORM 2: Field/Operational Measurement Log (Param | Unit | Method | Variance | Standard). FORM 3: QA/Photographic Evidence Log. Ensure robust data integrity.`,
    tracker:`Generate a "Deliverable & Submission Tracker". Pre-fill 25 rows: Deliverable ID | Nomenclature | Category | Version Control | Regulatory Driver | Submission Date | Author | QA Reviewer | Status | Remediation Notes. Add an executive summary dashboard.`,
    sitevisit:`Generate a "Field Diagnostic / Site Visit Audit Form". Include: Site Context, Safety Briefing, Assessment Matrix (Area | Parameter | Standard/Benchmark | Observed Variance | Root Cause | RAG Status), Critical Non-Conformances, and Corrective Action Plan (CAPA).`,
    interview:`Generate "Stakeholder Interview & Diagnostic Guides". PART 1: Executive Interview Guide (25 strategic, open-ended questions). PART 2: Quantitative Questionnaire (20 questions, 5-point Likert). PART 3: Focus Group Facilitation Guide with behavioral probes.`,
    secondary:`Generate a "Secondary Research & Literature Review Matrix". Table: Source | Publisher | Year | Strategic Relevance | Key Data Points | Methodological Flaws | Reliability (H/M/L). Conclude with a Data Triangulation and Synthesis summary.`,
    sample:`Generate a "Standardized Report Template / Boilerplate". Include: Title Page architecture, Version Control matrix, Executive Summary placeholder (BLUF format), MECE Section Headings with instructional text for authors, standardized Table/Figure formatting.`,
    draft:`Generate a comprehensive "Zero-Draft Report". Sections: (1) Executive Summary (BLUF, 300 words), (2) Context & Objectives, (3) Diagnostic Methodology, (4) Deep-Dive Findings (MECE structure, 500+ words), (5) Strategic Implications ("So What?"), (6) Prioritized Recommendations (Impact vs Effort), (7) Implementation Roadmap.`,
    pricing:`Generate a "Commercial Pricing & Margin Model". Include: Bottom-up Costing Table (Labor, Tech, Travel, SGA, Target Margin), Role-based Rate Card, Tiered Pricing Options (Bronze/Silver/Gold scopes), Commercial Assumptions, and Risk Premium factors.`,
    techquote:`Generate an "Executive Techno-Commercial Proposal". Include: Executive Letter, Client Context, Value Proposition, MECE Technical Scope Table (Item | Spec | Qty | Rate | Total), Commercial Terms & Conditions, Payment Milestones, and Validity clauses.`,
    bizplan:`Generate an Enterprise "Go-to-Market & Business Plan" for this service. Include: Executive Summary (BLUF), Value Proposition, TAM/SAM/SOM Analysis, Competitive Moat, Target Operating Model, GTM Strategy, 3-Year Financial Projections (P&L, Cash Flow), and Key Strategic Risks.`,
    excel:`Generate the architecture for a "PMO Portfolio Excel Tracker". Define Tabs: (1) Executive Dashboard (KPIs, Burn Rate, RAG), (2) Master Project Registry (Project ID, Sponsor, Status, Financials, Schedule Variance, Critical Risks, Next Milestone). Specify essential DAX/Excel formulas to drive insights.`,
    pitch:`Generate a "C-Level Executive Pitch". Structure: The Burning Platform (Why change?), The Strategic Imperative (Why now?), Our Value Proposition (What?), Hypothesis & Approach (How?), Team Pedigree (Who?), Business Case/ROI (Financials), and Immediate Next Steps.`,
    pitchdeck:`Generate a "Board-Level Pitch Deck" (12 slides). Follow the Pyramid Principle. Slides: 1-Title, 2-Executive Summary, 3-Market Disruption, 4-The Strategic Gap, 5-Our Solution, 6-Value Creation/ROI, 7-Operating Model, 8-Competitive Advantage, 9-Leadership, 10-Financials, 11-Investment/Ask, 12-Roadmap. Provide Headline, Evidence, & Visuals for each.`,
    clientpresentation:`Generate a "SteerCo / Client Presentation" (12-15 slides). Focus on actionable insights. Slides: 1-Title, 2-BLUF/Exec Summary, 3-Current State Diagnostic, 4-Root Cause Analysis, 5-Proposed Target State, 6-Transformation Roadmap, 7-Business Case, 8-Risk & Mitigation, 9-Next Steps. Include Speaker Notes emphasizing "So What?".`,
    marketing:`Generate a "Strategic Marketing & Go-To-Market Plan". Include: Ideal Customer Profile (ICP) matrix, Differentiated Value Proposition, Omnichannel Campaign Strategy, Lead Generation Funnel metrics (CAC, LTV targets), 90-Day Activation Plan, and Marketing Budget ROI model.`,
    emailmarketing:`Generate a "B2B Cold Outreach & Nurture Sequence". Use consulting copywriting (direct, insight-led). (1) Cold Outreach (5 touches: insight, value, proof, urgency, breakup), (2) Warm Nurture (3 touches), (3) Proposal Follow-up. Provide A/B subject lines and clear Call-to-Actions (CTAs).`,
    whatsapp:`Generate a "B2B WhatsApp/SMS Outreach Sequence". Keep it hyper-concise and professional. Include: (1) Warm Introduction (insight-led), (2) High-Value Content Drop, (3) Meeting Follow-up, (4) Event/Webinar Invite, (5) Testimonial/Case Study snippet. Avoid spammy language.`,
    pharmasample:`Generate a "Pharma-Specific Service Blueprint". Strictly adhere to Life Sciences terminology. Incorporate GxP, FDA 21 CFR Part 11, ICH guidelines, and WHO-GMP frameworks. Frame the service's impact on compliance readiness, batch release timelines, and quality risk management (QRM).`,
  };

  const taskDef = pm[doc.id]||`Generate a professional "${doc.name}" document for the service "${p.name}". Make it detailed, ready to use and practical.`;
  
  return `${systemPersona}\n\n${ctx}\n\n--- DOCUMENT TASK ---\n${taskDef}\n\n${outputDirectives}`;
}
