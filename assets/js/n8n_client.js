const DOCS = [
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

const S = {
  selected: new Set(DOCS.map(d => d.id)),
  filter: 'all',
  blobUrl: null
};

// ── NAV ───────────────────────────────────────────────────────────
function goTo(n) {
  ['view-form','view-docs','view-gen','view-done'].forEach((id,i) => {
    document.getElementById(id).classList.toggle('active', i === n - 1);
  });
  ['sp1','sp2','sp3','sp4'].forEach((id,i) => {
    const el = document.getElementById(id);
    if(el) {
      el.classList.remove('active','done');
      if(i + 1 === n) el.classList.add('active');
      else if(i + 1 < n) el.classList.add('done');
    }
  });
  window.scrollTo({top:0, behavior:'smooth'});
}

// ── DOC GRID ──────────────────────────────────────────────────────
function renderDocGrid() {
  const filtered = S.filter === 'all' ? DOCS : DOCS.filter(d => d.cat === S.filter);
  const grid = document.getElementById('doc-grid');
  if (grid) {
    grid.innerHTML = filtered.map(d => 
      `<div class="doc-card ${S.selected.has(d.id) ? 'sel' : ''}" id="dc-${d.id}" onclick="toggleDoc('${d.id}')" title="${d.tip}">
        <div class="dc-check">✓</div>
        <div class="dc-icon">${d.icon}</div>
        <div class="dc-name">${d.name}</div>
        <div class="dc-cat">${d.cat}</div>
      </div>`
    ).join('');
    updateSelCount();
  }
}

window.toggleDoc = function(id) {
  S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
  const el = document.getElementById(`dc-${id}`);
  if(el) el.classList.toggle('sel', S.selected.has(id));
  updateSelCount();
}

window.filterDocs = function(el, cat) {
  S.filter = cat;
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderDocGrid();
}

window.selAll = function(v) {
  DOCS.forEach(d => v ? S.selected.add(d.id) : S.selected.delete(d.id));
  renderDocGrid();
}

function updateSelCount() {
  const el = document.getElementById('sel-count');
  if(el) el.textContent = `${S.selected.size} selected`;
}

// ── INITIALIZATION ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDocGrid();
  
  // Bind form validation
  const btnDocs = document.getElementById('btn-to-docs');
  if (btnDocs) {
    btnDocs.addEventListener('click', () => {
      const url = document.getElementById('n8n-url').value.trim();
      const name = document.getElementById('f-name').value.trim();
      
      if (!url) {
        showToast('Please enter your n8n Webhook URL', 'err');
        return;
      }
      if (!name) {
        showToast('Please enter a Project/Service Name', 'err');
        return;
      }
      goTo(2);
    });
  }
  
  const btnDownload = document.getElementById('btn-download-result');
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (S.blobUrl) {
        const a = document.createElement('a');
        a.href = S.blobUrl;
        a.download = `RIG_Package_${document.getElementById('f-name').value.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    });
  }
});

// ── TOAST ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type='ok') {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  const icon = document.getElementById('t-icon');
  const m = document.getElementById('t-msg');
  if(!t) return;
  t.className = `toast ${type}`;
  if(icon) icon.textContent = type === 'ok' ? '✓' : '✕';
  if(m) m.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── N8N COMMUNICATION ─────────────────────────────────────────────
function tick(msg, type="active") {
  const ticker = document.getElementById('status-ticker');
  if(!ticker) return;
  const lines = ticker.querySelectorAll('.ticker-line');
  lines.forEach(l => l.classList.remove('active'));
  
  const d = document.createElement('div');
  d.className = `ticker-line ${type}`;
  d.textContent = msg;
  ticker.appendChild(d);
  ticker.scrollTop = ticker.scrollHeight;
}

window.sendToN8N = async function() {
  if (S.selected.size === 0) {
    showToast('Select at least one document', 'err');
    return;
  }
  
  const url = document.getElementById('n8n-url').value.trim();
  
  // Collect payload
  const payload = {
    metadata: {
      name: document.getElementById('f-name').value.trim(),
      sector: document.getElementById('f-sector').value.trim(),
      geo: document.getElementById('f-geo').value.trim(),
      client: document.getElementById('f-client').value.trim(),
      audience: document.getElementById('f-audience').value.trim(),
      desc: document.getElementById('f-desc').value.trim(),
      standards: document.getElementById('f-standards').value.trim(),
      price: document.getElementById('f-price').value.trim(),
      duration: document.getElementById('f-duration').value.trim(),
      lang: document.getElementById('f-lang').value.trim(),
    },
    documents: DOCS.filter(d => S.selected.has(d.id))
  };

  goTo(3);
  
  const ticker = document.getElementById('status-ticker');
  if(ticker) ticker.innerHTML = '<div class="ticker-line active">Connecting to n8n webhook...</div>';
  const progFill = document.getElementById('prog-fill');
  
  try {
    if(progFill) progFill.style.width = '10%';
    tick(`Sending ${payload.documents.length} document requests to ${url}...`);
    
    // Animate progress bar slowly for UI UX
    let prog = 10;
    const progInterval = setInterval(() => {
      prog += (100 - prog) * 0.05;
      if (prog > 90) prog = 90;
      if(progFill) progFill.style.width = `${prog}%`;
    }, 2000);
    
    // We expect a ZIP file blob back from the n8n "Respond to Webhook" node
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    clearInterval(progInterval);
    if(progFill) progFill.style.width = '100%';

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    tick("Received response from n8n!", "success");
    
    // Read response as blob (binary zip data)
    const blob = await response.blob();
    
    if (blob.type === "application/json") {
      // It might have failed and returned a JSON error
      const text = await blob.text();
      throw new Error("n8n returned JSON instead of a ZIP file: " + text);
    }
    
    S.blobUrl = window.URL.createObjectURL(blob);
    
    tick("Package compiled and ready for download.", "success");
    
    setTimeout(() => {
      goTo(4);
    }, 1500);
    
  } catch (error) {
    tick(`Error: ${error.message}`, "err");
    if(progFill) progFill.style.background = 'var(--rose)';
    showToast('Execution failed. Check n8n logs.', 'err');
    setTimeout(() => {
        if(confirm("Failed to execute. Do you want to return to configuration?")) {
            goTo(1);
            if(progFill) progFill.style.background = 'var(--cyan)';
        }
    }, 3000);
  }
}

window.restart = function() {
  if (S.blobUrl) {
    window.URL.revokeObjectURL(S.blobUrl);
    S.blobUrl = null;
  }
  goTo(1);
}
