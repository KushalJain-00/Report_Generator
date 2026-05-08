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
  project:{},selected:new Set(DOCS.map(d=>d.id)),generated:{},filter:'all',view:1,startTime:null,referenceText:'',
  api:{provider:'anthropic',key:'',model:''},
  brand:{cname:'',email:'',phone:'',web:'',addr:'',logoDataUrl:'',watermark:false,watermarkText:'CONFIDENTIAL'},
};
const PROV={
  anthropic:{name:'Anthropic',models:['claude-sonnet-4-20250514','claude-opus-4-5','claude-haiku-4-5-20251001'],ph:'sk-ant-api03-...',note:'Get key at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>'},
  openai:{name:'OpenAI',models:['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'],ph:'sk-proj-...',note:'Get key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>'},
  gemini:{name:'Gemini',models:['gemini-2.0-flash','gemini-1.5-pro','gemini-1.5-flash'],ph:'AIza...',note:'Get key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a>'},
  openrouter:{name:'OpenRouter',models:['anthropic/claude-sonnet-4-5','openai/gpt-4o','google/gemini-2.0-flash','meta-llama/llama-3.3-70b-instruct'],ph:'sk-or-v1-...',note:'Get key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai</a> — 300+ models'},
  groq:{name:'Groq',models:['llama-3.3-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768','gemma2-9b-it'],ph:'gsk_...',note:'Get key at <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a>'},
};

// ── PERSISTENT STORAGE (localStorage + IndexedDB fallback) ────────
const RIG_DB_NAME = 'rig_store';
const RIG_DB_VERSION = 1;
const RIG_STORE_NAME = 'settings';

function openRigDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(RIG_DB_NAME, RIG_DB_VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(RIG_STORE_NAME);
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

// Save to BOTH localStorage and IndexedDB for maximum persistence
function persistSave(key, obj) {
  const json = JSON.stringify(obj);
  try { localStorage.setItem(key, json); } catch(e) {}
  idbSet(key, obj).catch(() => {});
}

// Load from localStorage first, fall back to IndexedDB
async function persistLoad(key) {
  try {
    const ls = localStorage.getItem(key);
    if (ls) return JSON.parse(ls);
  } catch(e) {}
  // Fallback to IndexedDB
  const val = await idbGet(key);
  if (val) {
    // Sync back to localStorage for next time
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
  }
  return val || null;
}

// ── NAV & THEME ───────────────────────────────────────────────────
function toggleTheme(){
  const isLight = document.body.classList.toggle('light-theme');
  document.getElementById('theme-icon').textContent = isLight ? '🌙' : '☀️';
  try{localStorage.setItem('rig_theme', isLight ? 'light' : 'dark');}catch(e){}
}
function goTo(n){
  ['view-form','view-docs','view-gen','view-done'].forEach((id,i)=>document.getElementById(id).classList.toggle('active',i===n-1));
  ['sp1','sp2','sp3','sp4'].forEach((id,i)=>{const el=document.getElementById(id);el.classList.remove('active','done');if(i+1===n)el.classList.add('active');else if(i+1<n)el.classList.add('done');});
  S.view=n;window.scrollTo({top:0,behavior:'smooth'});
}

// ── VIEW 1 ────────────────────────────────────────────────────────
document.getElementById('f-reference')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) { S.referenceText = ''; document.getElementById('ref-status').textContent = ''; return; }
  document.getElementById('ref-status').textContent = 'Reading...';
  try {
    const text = await file.text();
    S.referenceText = text;
    document.getElementById('ref-status').textContent = `Loaded (${Math.round(text.length/1024)}kb)`;
  } catch(err) {
    document.getElementById('ref-status').textContent = 'Error reading file';
    S.referenceText = '';
  }
});
document.getElementById('btn-to-docs').onclick=()=>{
  const name=document.getElementById('f-name').value.trim();
  if(!name){document.getElementById('f-name').classList.add('err');showToast('Please enter a service / report name','err');return;}
  document.getElementById('f-name').classList.remove('err');
  if(!S.api.key){showToast('Please configure your API key first','err');openApi();return;}
  S.project={name,sector:document.getElementById('f-sector').value,geo:document.getElementById('f-geo').value,client:document.getElementById('f-client').value,audience:document.getElementById('f-audience').value,desc:document.getElementById('f-desc').value,standards:document.getElementById('f-standards').value,price:document.getElementById('f-price').value,duration:document.getElementById('f-duration').value,lang:document.getElementById('f-lang').value, referenceText: S.referenceText};
  renderDocGrid();goTo(2);
};

// ── DOC GRID ──────────────────────────────────────────────────────
function renderDocGrid(){
  const filtered=S.filter==='all'?DOCS:DOCS.filter(d=>d.cat===S.filter);
  document.getElementById('doc-grid').innerHTML=filtered.map(d=>`<div class="doc-card ${S.selected.has(d.id)?'sel':''}" id="dc-${d.id}" onclick="toggleDoc('${d.id}')" title="${d.tip}"><div class="dc-check">✓</div><div class="dc-icon">${d.icon}</div><div class="dc-name">${d.name}</div><div class="dc-cat">${d.cat}</div></div>`).join('');
  updateSelCount();
}
function toggleDoc(id){S.selected.has(id)?S.selected.delete(id):S.selected.add(id);document.getElementById(`dc-${id}`)?.classList.toggle('sel',S.selected.has(id));updateSelCount();}
function filterDocs(el,cat){S.filter=cat;document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderDocGrid();}
function selAll(v){DOCS.forEach(d=>v?S.selected.add(d.id):S.selected.delete(d.id));renderDocGrid();}
function updateSelCount(){document.getElementById('sel-count').textContent=`${S.selected.size} selected`;}

// ── GENERATION ────────────────────────────────────────────────────
async function startGen(){
  if(S.selected.size===0){showToast('Select at least one document','err');return;}
  S.generated={};S.startTime=Date.now();
  const toGen=DOCS.filter(d=>S.selected.has(d.id));
  document.getElementById('gen-grid').innerHTML=toGen.map(d=>`<div class="gc" id="gc-${d.id}"><div class="gc-status s-wait" id="gs-${d.id}">wait</div><div class="gc-icon">${d.icon}</div><div class="gc-name">${d.name}</div></div>`).join('');
  document.getElementById('cnt-left').textContent=toGen.length;document.getElementById('cnt-done').textContent=0;document.getElementById('cnt-gen').textContent=0;
  goTo(3);
  let done=0;
  for(let i=0;i<toGen.length;i++){
    const doc=toGen[i],card=document.getElementById(`gc-${doc.id}`),stat=document.getElementById(`gs-${doc.id}`);
    card?.classList.add('generating');if(stat){stat.className='gc-status s-gen';stat.textContent='gen';}
    document.getElementById('prog-lbl').textContent=`${doc.icon} ${doc.name}`;
    document.getElementById('prog-cur').textContent=doc.tip;
    document.getElementById('cnt-gen').textContent=1;
    document.getElementById('cnt-left').textContent=toGen.length-i-1;
    try{
      S.generated[doc.id]=await callAI(doc, 1, (chunk) => {
        document.getElementById('live-stream-content').innerHTML = marked.parse(chunk) + '<span class="cursor" style="opacity:0.5">|</span>';
        const lb = document.querySelector('.live-stream-box');
        if(lb) lb.scrollTop = lb.scrollHeight;
      });
      done++;
      card?.classList.remove('generating');card?.classList.add('done');
      if(stat){stat.className='gc-status s-done';stat.textContent='done';}
    }catch(e){
      S.generated[doc.id]=`[Generation error]\n\n${e.message}`;done++;
      card?.classList.remove('generating');card?.classList.add('error');
      if(stat){stat.className='gc-status s-err';stat.textContent='err';}
    }
    document.getElementById('cnt-done').textContent=done;
    document.getElementById('cnt-gen').textContent=0;
    const pct=Math.round(((i+1)/toGen.length)*100);
    document.getElementById('prog-fill').style.width=pct+'%';
    document.getElementById('prog-pct').textContent=pct+'%';
    if(i<toGen.length-1) await new Promise(res=>setTimeout(res, 4000));
  }
  document.getElementById('prog-lbl').textContent='Generation Complete!';
  document.getElementById('prog-cur').textContent='All documents ready — preparing results...';
  setTimeout(()=>showResults(toGen),800);
}

// ── AI CALL ───────────────────────────────────────────────────────
async function callAI(doc, attempt=1, onChunk=null){
  const {provider:p,key,model}=S.api;
  const prompt=buildPrompt(doc,S.project,S.brand);
  try{
    let url, headers, body;
    if(p==='anthropic'){
      url='https://api.anthropic.com/v1/messages';
      headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
      body=JSON.stringify({model,max_tokens:4096,messages:[{role:'user',content:prompt}],stream:true});
    }else if(['openai','openrouter','groq'].includes(p)){
      url=p==='openai'?'https://api.openai.com/v1/chat/completions':(p==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':'https://api.groq.com/openai/v1/chat/completions');
      headers={'Content-Type':'application/json','Authorization':`Bearer ${key}`};
      if(p==='openrouter') headers['HTTP-Referer']='https://rig-app.com';
      body=JSON.stringify({model,max_tokens:4096,messages:[{role:'user',content:prompt}],stream:true});
    }else if(p==='gemini'){
      url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
      headers={'Content-Type':'application/json'};
      body=JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:4096}});
    }else throw new Error('Unknown provider');

    const r=await fetch(url,{method:'POST',headers,body});
    if(r.status===429 && attempt<3) throw new Error('RETRY_429');
    if(!r.ok){
      const e=await r.json().catch(()=>({}));
      let msg=e.error?.message||`HTTP ${r.status}`;
      if(e.error?.metadata?.raw) msg+=`\nDetails: ${JSON.stringify(e.error.metadata.raw)}`;
      throw new Error(msg);
    }
    
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      const chunk = decoder.decode(value, {stream: true});
      const lines = chunk.split('\n');
      for(const line of lines){
        const tline = line.trim();
        if(tline.startsWith('data: ') && tline !== 'data: [DONE]'){
          try{
            const data = JSON.parse(tline.slice(6));
            let textDelta = '';
            if(p==='anthropic' && data.type==='content_block_delta') textDelta = data.delta?.text||'';
            else if(['openai','openrouter','groq'].includes(p)) textDelta = data.choices?.[0]?.delta?.content||'';
            else if(p==='gemini') textDelta = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
            if(textDelta){
              content += textDelta;
              if(onChunk) onChunk(content);
            }
          }catch(e){}
        }
      }
    }
    return content;
  } catch(err) {
    if(err.message==='RETRY_429' && attempt<3){
      document.getElementById('prog-cur').textContent=`Rate limited (429). Retrying in 10s... (Attempt ${attempt}/3)`;
      await new Promise(r=>setTimeout(r, 10000));
      document.getElementById('prog-cur').textContent=doc.tip;
      return callAI(doc, attempt+1, onChunk);
    }
    throw err;
  }
}

// ── PROMPTS ───────────────────────────────────────────────────────
function buildPrompt(doc,p,b){
  const systemPersona = `You are an elite, top-tier management consultant, project manager, and domain expert specializing in producing high-quality, professional-grade enterprise documentation. You deliver actionable, precise, and highly detailed reports with zero fluff. You use business-appropriate language, adhere strictly to requested structures, and provide rich, realistic, and contextually accurate insights based on the provided parameters.`;

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

  const outputDirectives = `--- OUTPUT DIRECTIVES ---
1. Language: Strictly write in ${p.lang}.
2. Formatting: Use extremely well-structured Markdown. Use clear, hierarchical headings (H1, H2, H3), bullet points, and bold text for emphasis.
3. Tables: Use proper Markdown tables extensively (with | Column | Column | syntax). NEVER use code-blocks, ASCII art, or plain text for tables. Always ensure tables have a clear header row and data rows. The layout must be ready to render beautifully into a Word document.
4. Professionalism: Maintain a formal, authoritative, and consultative tone. Avoid generic AI introductory or concluding remarks. Start immediately with the document content.
5. Detail Level: Maximize depth. Do not use placeholders like "[Insert Date]". Instead, generate highly realistic, hypothetical data, timelines, or scenarios that perfectly match the project context if exact data is missing.
${b.cname?`6. Ownership: Subtly position the document as the intellectual property and expert deliverable of ${b.cname}.`:'6. Ownership: Present this as a professional proprietary document.'}`;

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

// ── RESULTS ───────────────────────────────────────────────────────
function showResults(docs){
  const elapsed=Math.round((Date.now()-S.startTime)/1000);
  const totalWords=Object.values(S.generated).reduce((a,c)=>a+c.split(/\s+/).length,0);
  document.getElementById('r-docs').textContent=Object.keys(S.generated).length;
  document.getElementById('r-words').textContent=totalWords>=1000?(Math.round(totalWords/100)/10)+'k':totalWords;
  document.getElementById('r-time').textContent=elapsed+'s';
  document.getElementById('final-grid').innerHTML=docs.map(d=>{
    const isErr=S.generated[d.id]?.startsWith('[Generation error');
    return `<div class="fc-card ${isErr?'err-card':''}" onclick="previewDoc('${d.id}','${d.name.replace(/'/g,"\\'")}',this)">
      <div class="fc-badge">${isErr?'!':'✓'}</div>
      <div class="fc-icon">${d.icon}</div>
      <div class="fc-name">${d.name}</div>
      <div class="fc-cat">${d.cat}</div>
      <button onclick="regenDoc(event,'${d.id}')" title="Regenerate Document" style="position:absolute;top:8px;right:8px;background:var(--bg);border:1px solid var(--border);color:var(--dim);border-radius:4px;cursor:pointer;padding:2px 6px;font-size:12px;">↻</button>
    </div>`;
  }).join('');
  goTo(4);
}

let currentPreviewId = null;
function previewDoc(id,name,el){
  currentPreviewId = id;
  document.querySelectorAll('.fc-card').forEach(c=>c.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('pv-title').textContent=name;
  
  const content = S.generated[id]||'No content generated.';
  document.getElementById('pv-edit').value = content;
  
  const pvContent = document.getElementById('pv-content');
  if(content.startsWith('[Generation error') || content === 'No content generated.'){
    pvContent.textContent = content;
  }else{
    pvContent.innerHTML = marked.parse(content);
  }
  
  pvContent.style.display = 'block';
  document.getElementById('pv-edit').style.display = 'none';
  const btnEdit = document.getElementById('btn-edit-pv');
  btnEdit.textContent = 'Edit';
  btnEdit.style.display = content === 'No content generated.' ? 'none' : 'block';
}

function toggleEditPv(){
  const btn = document.getElementById('btn-edit-pv');
  const pvContent = document.getElementById('pv-content');
  const pvEdit = document.getElementById('pv-edit');
  if(btn.textContent === 'Edit'){
    btn.textContent = 'Save';
    pvContent.style.display = 'none';
    pvEdit.style.display = 'block';
  }else{
    btn.textContent = 'Edit';
    S.generated[currentPreviewId] = pvEdit.value;
    if(pvEdit.value.startsWith('[Generation error')){
      pvContent.textContent = pvEdit.value;
    }else{
      pvContent.innerHTML = marked.parse(pvEdit.value);
    }
    pvContent.style.display = 'block';
    pvEdit.style.display = 'none';
    showToast('Changes saved!','ok');
  }
}

async function regenDoc(e, id){
  e.stopPropagation();
  const doc = DOCS.find(d => d.id === id);
  if(!doc) return;
  const btn = e.target;
  btn.textContent = '⏳';
  btn.style.pointerEvents = 'none';
  showToast(`Regenerating ${doc.name}...`, 'ok');
  
  if(currentPreviewId === id) {
    document.getElementById('pv-content').innerHTML = '<div style="color:var(--dim)">Regenerating...</div>';
  }
  
  try {
    S.generated[id] = await callAI(doc, 1, (content) => {
      if(currentPreviewId === id) {
        document.getElementById('pv-content').innerHTML = marked.parse(content) + '<span class="cursor" style="opacity:0.5">|</span>';
        const pv = document.getElementById('pv-content');
        if(pv.parentElement) pv.parentElement.scrollTop = pv.parentElement.scrollHeight;
      }
    });
    showToast(`${doc.name} regenerated!`, 'ok');
  } catch(err) {
    S.generated[id] = `[Generation error]\n\n${err.message}`;
    showToast(`Failed to regenerate ${doc.name}`, 'err');
  }
  
  btn.textContent = '↻';
  btn.style.pointerEvents = 'auto';
  showResults(DOCS.filter(d=>S.selected.has(d.id))); // refresh UI
  if(currentPreviewId === id) previewDoc(id, doc.name);
}
function copyPv(){
  const txt=document.getElementById('pv-content').textContent;
  if(!txt||txt.includes('Select a')) return;
  navigator.clipboard.writeText(txt).then(()=>showToast('Copied!','ok')).catch(()=>showToast('Copy failed','err'));
}

// ── ZIP ───────────────────────────────────────────────────────────
async function downloadZip(){
  const btn=document.getElementById('btn-zip');btn.disabled=true;btn.textContent='Packaging...';
  try{
    const zip=new JSZip(),slug=S.project.name.replace(/[^a-z0-9]/gi,'_').substring(0,40),folder=zip.folder(slug),b=S.brand;
    const brandHdr=b.cname?`${b.cname}${b.email?' | '+b.email:''}${b.phone?' | '+b.phone:''}${b.web?' | '+b.web:''}`:'';
    const wm=b.watermark?`[${b.watermarkText}]`:'';
    DOCS.forEach((d,i)=>{
      if(S.generated[d.id]){
        const md = S.generated[d.id];
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', 'Calibri', sans-serif; font-size: 11pt; line-height: 1.6; color: #333333; }
    h1 { font-size: 22pt; color: #1a365d; margin-bottom: 16pt; border-bottom: 2pt solid #2b6cb0; padding-bottom: 4pt; }
    h2 { font-size: 16pt; color: #2b6cb0; margin-top: 20pt; margin-bottom: 10pt; }
    h3 { font-size: 13pt; color: #2d3748; margin-top: 16pt; margin-bottom: 8pt; font-weight: bold; }
    p { margin-bottom: 12pt; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin-top: 12pt; margin-bottom: 16pt; }
    th { background-color: #ebf8ff; color: #2b6cb0; font-weight: bold; padding: 8pt; border: 1pt solid #cbd5e0; text-align: left; }
    td { padding: 8pt; border: 1pt solid #cbd5e0; vertical-align: top; }
    tr:nth-child(even) { background-color: #f7fafc; }
    ul, ol { margin-bottom: 12pt; padding-left: 24pt; }
    li { margin-bottom: 6pt; }
    strong { color: #1a202c; }
    blockquote { border-left: 4pt solid #cbd5e0; padding-left: 12pt; color: #4a5568; font-style: italic; margin-left: 0; margin-bottom: 12pt; }
    .header { text-align: center; margin-bottom: 30pt; border-bottom: 2pt solid #e2e8f0; padding-bottom: 16pt; }
    .header-title { font-size: 26pt; font-weight: bold; color: #1a365d; margin-bottom: 8pt; text-transform: uppercase; letter-spacing: 1pt; }
    .header-sub { font-size: 11pt; color: #4a5568; line-height: 1.5; }
    .watermark { text-align: center; font-size: 16pt; font-weight: bold; color: #e53e3e; letter-spacing: 3pt; margin-bottom: 16pt; border: 2pt solid #e53e3e; padding: 4pt; display: inline-block; }
  </style>
</head>
<body>
  <div class="header">
    ${wm ? `<div class="watermark">${wm}</div>` : ''}
    <div class="header-title">${d.name.toUpperCase()}</div>
    <div class="header-sub">
      Service: ${S.project.name} | Client: ${S.project.client||'N/A'}<br>
      ${brandHdr ? brandHdr + '<br>' : ''}
      Generated: ${new Date().toLocaleString()}
    </div>
  </div>
  ${marked.parse(md)}
</body>
</html>`;
        const docxBlob = htmlDocx.asBlob(htmlContent);
        folder.file(`${String(i+1).padStart(2,'0')}_${d.name.replace(/[^a-z0-9]/gi,'_')}.docx`, docxBlob);
      }
    });
    const readme=`${b.cname?b.cname+' — ':''}REPORT INTELLIGENCE PACKAGE\n${'='.repeat(55)}\nService: ${S.project.name}\nClient: ${S.project.client||'N/A'}\nGenerated: ${new Date().toLocaleString()}\nTotal Documents: ${Object.keys(S.generated).length}\n${b.watermark?`Classification: ${b.watermarkText}\n`:''}\nFILES:\n${DOCS.filter(d=>S.generated[d.id]).map((d,i)=>`  ${i+1}. ${d.name}.docx [${d.cat}]`).join('\n')}\n\nGenerated by RIG — Report Intelligence Generator`;
    folder.file('00_README.txt',readme);
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${slug}_Package.zip`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    document.getElementById('zip-status').textContent=`✓ ZIP downloaded — ${Object.keys(S.generated).length} documents`;
    showToast('ZIP downloaded!','ok');
  }catch(e){document.getElementById('zip-status').textContent='Download failed: '+e.message;showToast('Download failed','err');}
  btn.disabled=false;btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download ZIP';
}
function restart(){S.generated={};S.selected=new Set(DOCS.map(d=>d.id));S.project={};S.referenceText='';document.getElementById('ref-status').textContent='';if(document.getElementById('f-reference'))document.getElementById('f-reference').value='';document.querySelectorAll('#view-form input,#view-form textarea').forEach(el=>el.value='');document.getElementById('f-lang').value='English';goTo(1);}

// ── API MODAL ─────────────────────────────────────────────────────
let activeProv='anthropic';
function openApi(){document.getElementById('api-overlay').classList.add('open');switchProv(document.querySelector(`.ptab[data-p="${activeProv}"]`),activeProv);if(S.api.key)document.getElementById('api-key-inp').value=S.api.key;if(S.api.model)document.getElementById('model-sel').value=S.api.model;}
function closeApi(){document.getElementById('api-overlay').classList.remove('open');}
function handleOv(e,id,fn){if(e.target===document.getElementById(id))fn();}
async function switchProv(el,p){
  activeProv=p;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));el?.classList.add('active');
  const cfg=PROV[p];
  document.getElementById('api-key-inp').placeholder=cfg.ph;
  document.getElementById('api-note').innerHTML=cfg.note;
  const ms=document.getElementById('model-sel');
  if(p==='openrouter'&&cfg.models.length<10){
    ms.innerHTML='<option>Loading models...</option>';
    try{
      const res=await fetch('https://openrouter.ai/api/v1/models');
      const data=await res.json();
      cfg.models=data.data.map(m=>m.id).sort();
    }catch(e){console.error(e);}
  }
  if(activeProv!==p)return;
  ms.innerHTML=cfg.models.map(m=>`<option value="${m}">${m}</option>`).join('');
  if(S.api.provider===p&&S.api.model) ms.value=S.api.model;
  document.getElementById('api-status-box').innerHTML='';
}
function toggleEye(){const i=document.getElementById('api-key-inp'),b=document.getElementById('eye-btn');if(i.type==='password'){i.type='text';b.textContent='🙈';}else{i.type='password';b.textContent='👁';}}
function saveApi(){
  const key=document.getElementById('api-key-inp').value.trim();
  if(!key){document.getElementById('api-status-box').innerHTML=`<div class="api-status-err"><div class="sdot"></div>Please paste your API key.</div>`;return;}
  const model=document.getElementById('model-sel').value;
  S.api={provider:activeProv,key,model};
  persistSave('rig_api', {provider:activeProv,key,model});
  document.getElementById('api-status-box').innerHTML=`<div class="api-status-ok"><div class="sdot"></div>Connected — ${PROV[activeProv].name} / ${model}</div>`;
  const btn=document.getElementById('btn-api-open'),dot=document.getElementById('api-dot'),lbl=document.getElementById('api-lbl');
  btn.classList.remove('on-cyan');btn.classList.add('on-lime');dot.style.cssText='background:var(--lime);box-shadow:0 0 6px var(--lime)';lbl.textContent=PROV[activeProv].name;
  setTimeout(closeApi,700);showToast(`API key saved — ${PROV[activeProv].name}`,'ok');
}

// ── BRAND MODAL ───────────────────────────────────────────────────
function openBrand(){
  document.getElementById('brand-overlay').classList.add('open');
  const b=S.brand;
  ['cname','email','phone','web','addr'].forEach(k=>{const el=document.getElementById(`b-${k}`);if(el) el.value=b[k]||'';});
  document.getElementById('wm-enable').checked=b.watermark;
  document.getElementById('wm-type').disabled=!b.watermark;
  document.getElementById('wm-type').value=b.watermarkText||'CONFIDENTIAL';
  if(b.logoDataUrl){const img=document.getElementById('logo-img-prev');img.src=b.logoDataUrl;img.style.display='block';document.getElementById('logo-upload-label').classList.add('has-logo');}
}
function closeBrand(){document.getElementById('brand-overlay').classList.remove('open');}
function handleLogo(inp){
  const file=inp.files[0];if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const url=e.target.result;
    const img=document.getElementById('logo-img-prev');img.src=url;img.style.display='block';
    document.getElementById('logo-upload-label').classList.add('has-logo');
    S.brand.logoDataUrl=url;
  };
  reader.readAsDataURL(file);
}
function saveBrand(){
  S.brand={cname:document.getElementById('b-cname').value.trim(),email:document.getElementById('b-email').value.trim(),phone:document.getElementById('b-phone').value.trim(),web:document.getElementById('b-web').value.trim(),addr:document.getElementById('b-addr').value.trim(),logoDataUrl:S.brand.logoDataUrl||'',watermark:document.getElementById('wm-enable').checked,watermarkText:document.getElementById('wm-type').value};
  const tmp={...S.brand,logoDataUrl:''};
  persistSave('rig_brand', tmp);
  const btn=document.getElementById('btn-brand-open'),dot=document.getElementById('brand-dot'),lbl=document.getElementById('brand-lbl');
  if(S.brand.cname||S.brand.logoDataUrl){btn.classList.remove('on-lime');btn.classList.add('on-cyan');dot.style.cssText='background:var(--cyan);box-shadow:0 0 6px var(--cyan)';lbl.textContent=S.brand.cname||'Branded';}
  closeBrand();showToast('Branding saved!','ok');
}

// ── TOAST ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg,type='ok'){clearTimeout(toastTimer);const t=document.getElementById('toast'),icon=document.getElementById('t-icon'),m=document.getElementById('t-msg');t.className=`toast ${type}`;icon.textContent=type==='ok'?'✓':'✕';m.textContent=msg;t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),3500);}

// ── INIT ──────────────────────────────────────────────────────────
function applyApiState(a) {
  if (a && a.key) {
    S.api = a;
    activeProv = a.provider || 'anthropic';
    const btn = document.getElementById('btn-api-open');
    const dot = document.getElementById('api-dot');
    const lbl = document.getElementById('api-lbl');
    btn.classList.add('on-lime');
    dot.style.cssText = 'background:var(--lime);box-shadow:0 0 6px var(--lime)';
    lbl.textContent = PROV[a.provider]?.name || 'Connected';
    return true;
  }
  return false;
}

function applyBrandState(b) {
  if (b && b.cname) {
    Object.assign(S.brand, b);
    const btn = document.getElementById('btn-brand-open');
    const dot = document.getElementById('brand-dot');
    const lbl = document.getElementById('brand-lbl');
    btn.classList.add('on-cyan');
    dot.style.cssText = 'background:var(--cyan);box-shadow:0 0 6px var(--cyan)';
    lbl.textContent = b.cname || 'Branded';
    return true;
  }
  return false;
}

(async function init(){
  // Theme
  try {
    if (localStorage.getItem('rig_theme') === 'light') {
      document.body.classList.add('light-theme');
      const ti = document.getElementById('theme-icon');
      if (ti) ti.textContent = '🌙';
    }
  } catch(e) {}

  // API Key — try localStorage first, then IndexedDB fallback
  let apiLoaded = false;
  try {
    const a = JSON.parse(localStorage.getItem('rig_api') || '{}');
    apiLoaded = applyApiState(a);
  } catch(e) {}

  if (!apiLoaded) {
    try {
      const a = await persistLoad('rig_api');
      apiLoaded = applyApiState(a);
      if (apiLoaded) console.log('[RIG] API key restored from IndexedDB backup');
    } catch(e) {}
  }

  // Branding — try localStorage first, then IndexedDB fallback
  let brandLoaded = false;
  try {
    const b = JSON.parse(localStorage.getItem('rig_brand') || '{}');
    brandLoaded = applyBrandState(b);
  } catch(e) {}

  if (!brandLoaded) {
    try {
      const b = await persistLoad('rig_brand');
      brandLoaded = applyBrandState(b);
    } catch(e) {}
  }

  // Show confirmation if API key was auto-loaded
  if (apiLoaded) {
    setTimeout(() => showToast(`API key loaded — ${PROV[S.api.provider]?.name || 'Connected'}`, 'ok'), 500);
  }

  renderDocGrid();
})();