// ── DOCS (36) ─────────────────────────────────────────────────────
const DOCS=[
  {id:'overview',name:'Brief Overview',cat:'overview',icon:'📖',tip:'High-level summary — what it is, who needs it, and why it matters'},
  {id:'applicability',name:'Applicability of Service',cat:'overview',icon:'🎯',tip:'Who it applies to — industries, organisation size, regulatory requirement'},
  {id:'proscons',name:"Pro's and Con's",cat:'overview',icon:'⚖️',tip:'Balanced pros and cons for client decision-making'},
  {id:'tableofcontent',name:'Table of Contents',cat:'overview',icon:'📑',tip:'Master TOC for the full report package'},
  {id:'casestudy',name:'Case Study',cat:'overview',icon:'🏆',tip:'Real or illustrative case study with outcomes achieved'},
  {id:'dashboard',name:'Dashboard Template',cat:'overview',icon:'📊',tip:'Visual dashboard for tracking KPIs and status'},
  {id:'charter',name:'Project Charter',cat:'planning',icon:'📋',tip:'Authorization document defining project goals and authority'},
  {id:'sow',name:'Scope of Work',cat:'planning',icon:'📌',tip:'Inclusions, exclusions, deliverables, and contract boundaries'},
  {id:'wbs',name:'Project Plan / WBS',cat:'planning',icon:'🗂️',tip:'Work Breakdown Structure with tasks and milestones'},
  {id:'gantt',name:'Timeline / Gantt Chart',cat:'planning',icon:'📅',tip:'Week-by-week Gantt template with milestones'},
  {id:'resource',name:'Resource Allocation Plan',cat:'planning',icon:'👥',tip:'Team structure, roles, effort, individual scope of work'},
  {id:'assumption',name:'Assumption & Constraint Log',cat:'planning',icon:'🔒',tip:'Assumptions, constraints, dependencies and their impact'},
  {id:'risk',name:'Risk Register & Mitigation',cat:'planning',icon:'⚠️',tip:'Risk identification, probability, impact, mitigation'},
  {id:'sop',name:'SOP for Service Preparation',cat:'operations',icon:'⚙️',tip:'Step-by-step Standard Operating Procedure'},
  {id:'methodology',name:'Methodology of Work',cat:'operations',icon:'🔬',tip:'Approach, tools, techniques, analytical framework'},
  {id:'tor',name:'Terms of Reference',cat:'operations',icon:'📜',tip:'Roles, responsibilities, mandate, governance'},
  {id:'stakeholder',name:'Stakeholder Register',cat:'operations',icon:'🤝',tip:'All stakeholders with influence levels and engagement strategy'},
  {id:'comms',name:'Communication Plan',cat:'operations',icon:'📡',tip:'Communication matrix, meeting schedule, escalation path'},
  {id:'flow',name:'Process Flow Diagram',cat:'operations',icon:'🔄',tip:'Step-by-step process flow for delivering the service'},
  {id:'gap',name:'Gap Analysis Template',cat:'operations',icon:'🔍',tip:'Current vs. required state, gaps and action roadmap'},
  {id:'compliance',name:'Compliance Check',cat:'operations',icon:'🛡️',tip:'Regulatory and standards compliance matrix'},
  {id:'toolsequip',name:'Tools & Equipment List',cat:'operations',icon:'🔧',tip:'Physical tools and instruments required for the service'},
  {id:'softwares',name:'Softwares Required List',cat:'operations',icon:'💻',tip:'Software, platforms and digital tools required'},
  {id:'peoplerequired',name:'People & Expertise Required',cat:'operations',icon:'👨‍🔬',tip:'Qualifications, expertise needed, individual scope of work'},
  {id:'dosdonts',name:"Do's & Don'ts / Things to Take Care",cat:'operations',icon:'💡',tip:'Critical considerations and common mistakes to avoid'},
  {id:'checklist',name:'Data & Documents Checklist',cat:'data',icon:'✅',tip:'Complete checklist of data and documents required'},
  {id:'datacollection',name:'Data Collection Template',cat:'data',icon:'📋',tip:'Structured forms for primary data collection'},
  {id:'tracker',name:'Document Submission Tracker',cat:'data',icon:'🗃️',tip:'Track submissions, review status, deadlines and approvals'},
  {id:'sitevisit',name:'Site Visit / Field Observation',cat:'data',icon:'🏗️',tip:'Field observation form with parameters and findings'},
  {id:'interview',name:'Interview / Questionnaire',cat:'data',icon:'🎤',tip:'Stakeholder interview guide and questionnaire forms'},
  {id:'secondary',name:'Secondary Data Review Sheet',cat:'data',icon:'📰',tip:'Template for reviewing and documenting secondary data'},
  {id:'sample',name:'Sample Format for Service',cat:'data',icon:'📄',tip:'Sample report format with structure and placeholder content'},
  {id:'draft',name:'Draft Report',cat:'data',icon:'✍️',tip:'Full draft report with all major sections written'},
  {id:'pricing',name:'Pricing Calculation Reference',cat:'business',icon:'💰',tip:'Pricing model, fee structure and calculation format'},
  {id:'techquote',name:'Techno-Commercial Quotation',cat:'business',icon:'📃',tip:'Professional quotation with technical scope and commercial terms'},
  {id:'bizplan',name:'Complete Business Plan',cat:'business',icon:'🏢',tip:'Full business plan with market analysis, financials, roadmap'},
  {id:'excel',name:'Excel Project Tracker',cat:'business',icon:'📈',tip:'Multi-project tracker — PO, invoices, payments, admin, deadlines'},
  {id:'pitch',name:'Client Pitch',cat:'marketing',icon:'💼',tip:'Client pitch — why, what, how, when, value proposition'},
  {id:'pitchdeck',name:'Pitch Deck (VC / Investor)',cat:'marketing',icon:'🎯',tip:'Investor-grade pitch deck with market, team, traction, ask'},
  {id:'clientpresentation',name:'Client Presentation',cat:'marketing',icon:'🖥️',tip:'Professional client-facing presentation'},
  {id:'marketing',name:'Marketing & Sales Plan',cat:'marketing',icon:'📣',tip:'Marketing strategy, channels, sales funnel and KPIs'},
  {id:'emailmarketing',name:'Email Marketing Content',cat:'marketing',icon:'✉️',tip:'Email sequences for outreach, follow-ups and nurture'},
  {id:'whatsapp',name:'WhatsApp Marketing Content',cat:'marketing',icon:'💬',tip:'WhatsApp message scripts for outreach and campaigns'},
  {id:'pharmasample',name:'Sample Copy — Pharma Industry',cat:'marketing',icon:'💊',tip:'Industry-specific sample adapted for pharmaceutical sector'},
];

// ── STATE ─────────────────────────────────────────────────────────
const S={
  project:{},
  selected:new Set(DOCS.map(d=>d.id)),
  generated:{},
  filter:'all',
  view:1,
  startTime:null,
  referenceText:'',
  apiQueue:[], // Array of {provider, key, model} - Priority Fallback Queue
  brand:{cname:'',email:'',phone:'',web:'',addr:'',logoDataUrl:'',watermark:false,watermarkText:'CONFIDENTIAL'},
  brandProfiles:[],
  activeBrandIdx:-1,
  tokenUsage:{input:0,output:0,total:0},
  engine: { degradeModels: true, keyRotation: true },
  prompts: {
    systemPersona: `You are an elite, top-tier management consultant, project manager, and domain expert specializing in producing high-quality, professional-grade enterprise documentation. You deliver actionable, precise, and highly detailed reports with zero fluff. You use business-appropriate language, adhere strictly to requested structures, and provide rich, realistic, and contextually accurate insights based on the provided parameters.`,
    outputDirectives: `--- OUTPUT DIRECTIVES ---
1. Language: Strictly write in {lang}.
2. Formatting: Use extremely well-structured Markdown. Use clear, hierarchical headings (H1, H2, H3), bullet points, and bold text for emphasis.
3. Tables & Data: Use proper Markdown tables extensively (with | Column | Column | syntax). EVERY document must contain detailed tables with rich, researched data points (metrics, costs, percentages, dates, etc). NEVER use ASCII art for tables.
4. Diagrams & Graphs: Use Mermaid.js (fenced code block with \`\`\`mermaid) to generate relevant diagrams. TO AVOID SYNTAX ERRORS: Do not use special characters ()[]{} inside node text unless the text is strictly enclosed in double quotes (e.g., A["Node text (info)"]).
5. Professionalism: Maintain a formal, authoritative, and consultative tone. Avoid generic AI introductory or concluding remarks. Start immediately with the document content.
6. Detail Level & Deep Research: Maximize depth. Write extremely content-rich, long-form sections. Do not use placeholders like "[Insert Date]". Generate highly realistic, meticulously researched hypothetical data, technical details, timelines, and quantitative metrics that perfectly match the project context.
7. Hidden Memory Summary: At the very end of your response, you MUST append a new section starting exactly with the exact text "---DOC_SUMMARY---" on a new line, followed by a dense 3-4 sentence summary of the key facts, figures, and strategic decisions established in this document. DO NOT include any markdown tables, bullet lists, or mermaid diagrams in this summary. This summary will be used as memory for future AI generation steps.`
  }
};

const PROV={
  anthropic:{name:'Anthropic',models:['claude-3-5-sonnet-20241022','claude-3-opus-20240229','claude-3-5-haiku-20241022'], fallbackModel: 'claude-3-5-haiku-20241022', ph:'sk-ant-api03-...',note:'Get key at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>'},
  openai:{name:'OpenAI',models:['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'], fallbackModel: 'gpt-4o-mini', ph:'sk-proj-...',note:'Get key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>'},
  gemini:{name:'Gemini',models:['gemini-2.0-flash','gemini-1.5-pro','gemini-1.5-flash'], fallbackModel: 'gemini-1.5-flash', ph:'AIza...',note:'Get key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a>'},
  openrouter:{name:'OpenRouter',models:['google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free,qwen/qwen-2.5-72b-instruct:free', 'anthropic/claude-3.5-sonnet','openai/gpt-4o','google/gemini-2.0-flash-exp:free','meta-llama/llama-3.3-70b-instruct'], fallbackModel: 'google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free,qwen/qwen-2.5-72b-instruct:free', ph:'sk-or-v1-...',note:'Get key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai</a> — Select the first model for native Free Auto-Fallback!'},
  groq:{name:'Groq',models:['llama-3.3-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768','gemma2-9b-it'], fallbackModel: 'llama-3.1-8b-instant', ph:'gsk_...',note:'Get key at <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a>'},
  deepseek:{name:'DeepSeek',models:['deepseek-chat','deepseek-reasoner'], fallbackModel: 'deepseek-chat', ph:'sk-...',note:'Get key at <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>'},
};

// ── PERSISTENT STORAGE (localStorage + IndexedDB fallback) ────────
const RIG_DB_NAME = 'rig_store';
const RIG_DB_VERSION = 2; // Updated version for prompts and drafts
const RIG_STORE_NAME = 'settings';

function openRigDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(RIG_DB_NAME, RIG_DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(RIG_STORE_NAME)) {
          db.createObjectStore(RIG_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch(e) { reject(e); }
  });
}

async function idbSet(key, value) {
  try {
    const db = await openRigDB();
    const tx = db.transaction(RIG_STORE_NAME, 'readwrite');
    tx.objectStore(RIG_STORE_NAME).put(value, key);
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch(e) { /* IndexedDB not available */ }
}

async function idbGet(key) {
  try {
    const db = await openRigDB();
    const tx = db.transaction(RIG_STORE_NAME, 'readonly');
    const req = tx.objectStore(RIG_STORE_NAME).get(key);
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
  } catch(e) { return undefined; }
}

async function idbDelete(key) {
    try {
        const db = await openRigDB();
        const tx = db.transaction(RIG_STORE_NAME, 'readwrite');
        tx.objectStore(RIG_STORE_NAME).delete(key);
        return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    } catch(e) {}
}

function persistSave(key, obj) {
  const json = JSON.stringify(obj);
  try { localStorage.setItem(key, json); } catch(e) {}
  idbSet(key, obj).catch(() => {});
}

async function persistLoad(key) {
  try {
    const ls = localStorage.getItem(key);
    if (ls) return JSON.parse(ls);
  } catch(e) {}
  const val = await idbGet(key);
  if (val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
  }
  return val || null;
}
