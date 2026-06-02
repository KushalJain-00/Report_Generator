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

// ── COST ESTIMATION ───────────────────────────────────────────────
function estimateCost(inTok, outTok) {
  let inRate = 0, outRate = 0; // Default to 0 (Free)
  if (S.apiQueue && S.apiQueue.length > 0) {
    const p = S.apiQueue[0].provider;
    const m = S.apiQueue[0].model.toLowerCase();
    
    // Premium APIs
    if (p === 'anthropic') {
      if (m.includes('opus')) { inRate = 15; outRate = 75; }
      else if (m.includes('sonnet')) { inRate = 3; outRate = 15; }
      else if (m.includes('haiku')) { inRate = 0.25; outRate = 1.25; }
    } else if (p === 'openai') {
      if (m.includes('gpt-4o')) { inRate = 5; outRate = 15; }
      else if (m.includes('gpt-4-turbo')) { inRate = 10; outRate = 30; }
      else if (m.includes('gpt-3.5')) { inRate = 0.5; outRate = 1.5; }
    } else if (p === 'gemini' && (m.includes('1.5-pro') || m.includes('gemini-1.5-pro'))) { 
      inRate = 3.5; outRate = 10.5; 
    }
    // Groq and Gemini Flash/Free are kept as 0
  }
  return ((inTok / 1000000) * inRate) + ((outTok / 1000000) * outRate);
}

function updateTokenUI(){
  const fmt=n=>n>=1000?(Math.round(n/100)/10)+'k':n;
  const ti=document.getElementById('tok-in'),to=document.getElementById('tok-out'),tt=document.getElementById('tok-total');
  if(ti)ti.textContent=fmt(S.tokenUsage.input);
  if(to)to.textContent=fmt(S.tokenUsage.output);
  if(tt)tt.textContent=fmt(S.tokenUsage.total);
  
  const cost = estimateCost(S.tokenUsage.input, S.tokenUsage.output);
  const costStr = '$' + cost.toFixed(3);
  const ce1=document.getElementById('cost-est'), ce2=document.getElementById('r-cost-est');
  if (cost > 0) {
    if(ce1) { ce1.textContent = 'Est. Cost: ' + costStr; ce1.style.display = 'block'; }
    if(ce2) { ce2.textContent = 'Est. Cost: ' + costStr; ce2.style.display = 'block'; }
  } else {
    if(ce1) { ce1.style.display = 'none'; }
    if(ce2) { ce2.style.display = 'none'; }
  }
}

// ── RESULTS ───────────────────────────────────────────────────────
function showResults(docs){
  // Only show documents that actually have generated content
  const generatedDocs = docs.filter(d => S.generated[d.id]);
  
  const elapsed=Math.round((Date.now()-S.startTime)/1000);
  // Count words only from successfully generated (non-error) docs
  const successKeys = Object.keys(S.generated).filter(id => !S.generated[id].startsWith('[Generation error'));
  const totalWords=successKeys.reduce((a,id)=>{const c=S.generated[id]||'';return a+c.split(/\s+/).length},0);
  document.getElementById('r-docs').textContent=generatedDocs.length;
  document.getElementById('r-words').textContent=totalWords>=1000?(Math.round(totalWords/100)/10)+'k':totalWords;
  document.getElementById('r-time').textContent=elapsed+'s';
  const fmtT=n=>n>=1000?(Math.round(n/100)/10)+'k':n;
  document.getElementById('r-tok-in').textContent=fmtT(S.tokenUsage.input);
  document.getElementById('r-tok-out').textContent=fmtT(S.tokenUsage.output);
  document.getElementById('r-tok-total').textContent=fmtT(S.tokenUsage.total);
  document.getElementById('final-grid').innerHTML=generatedDocs.map(d=>{
    const isErr=S.generated[d.id]?.startsWith('[Generation error');
    return `<div class="fc-card ${isErr?'err-card':''}" onclick="previewDoc('${d.id}','${d.name.replace(/'/g,"\\'")}',this)">
      <div class="fc-badge">${isErr?'!':'✓'}</div>
      <div class="fc-icon">${d.icon}</div>
      <div class="fc-name">${d.name}</div>
      <div class="fc-cat">${d.cat}</div>
      <button onclick="regenDoc(event,'${d.id}')" title="Regenerate Document" style="position:absolute;top:8px;right:34px;background:var(--bg);border:1px solid var(--border);color:var(--dim);border-radius:4px;cursor:pointer;padding:2px 6px;font-size:12px;">↻</button>
    </div>`;
  }).join('');
  goTo(4);
}

let currentPreviewId = null;
let easyMDE = null;

function initEasyMDE() {
  if (typeof EasyMDE !== 'undefined' && !easyMDE) {
    easyMDE = new EasyMDE({
      element: document.getElementById('pv-edit'),
      spellChecker: false,
      maxHeight: "350px",
      status: false
    });
  }
}

function hideEditor() {
  if (easyMDE && easyMDE.gui && easyMDE.gui.wrapper) {
    easyMDE.gui.wrapper.style.display = 'none';
  }
  document.getElementById('pv-edit').style.display = 'none';
}

function renderMermaidGraphs() {
  if (typeof mermaid !== 'undefined') {
    document.querySelectorAll('.language-mermaid').forEach(block => {
       const div = document.createElement('div');
       div.className = 'mermaid';
       div.textContent = block.textContent;
       if (block.parentElement.tagName === 'PRE') {
           block.parentElement.replaceWith(div);
       } else {
           block.replaceWith(div);
       }
    });
    try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
  }
}

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
    setTimeout(renderMermaidGraphs, 10);
  }
  
  pvContent.style.display = 'block';
  hideEditor();

  const btnEdit = document.getElementById('btn-edit-pv');
  btnEdit.textContent = 'Edit';
  btnEdit.style.display = content === 'No content generated.' ? 'none' : 'block';
}

function toggleEditPv(){
  const btn = document.getElementById('btn-edit-pv');
  const pvContent = document.getElementById('pv-content');
  const pvEdit = document.getElementById('pv-edit');
  
  initEasyMDE();

  if(btn.textContent === 'Edit'){
    btn.textContent = 'Save';
    pvContent.style.display = 'none';
    if(easyMDE) {
        easyMDE.value(S.generated[currentPreviewId]||'');
        easyMDE.gui.wrapper.style.display = 'block';
    } else {
        pvEdit.value = S.generated[currentPreviewId]||'';
        pvEdit.style.display = 'block';
    }
  }else{
    btn.textContent = 'Edit';
    const newContent = easyMDE ? easyMDE.value() : pvEdit.value;
    S.generated[currentPreviewId] = newContent;
    persistSave('rig_drafts', S.generated);
    
    if(newContent.startsWith('[Generation error')){
      pvContent.textContent = newContent;
    }else{
      pvContent.innerHTML = marked.parse(newContent);
      setTimeout(renderMermaidGraphs, 10);
    }
    pvContent.style.display = 'block';
    hideEditor();
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
    let rawText = await callAI(doc, 0, 1, null);
    
    let finalText = rawText;
    let summary = "";
    if (rawText.includes("---DOC_SUMMARY---")) {
        const parts = rawText.split("---DOC_SUMMARY---");
        finalText = parts[0].trim();
        summary = parts[1] ? parts[1].trim() : "";
    } else {
        summary = rawText.substring(0, 400) + "... (No summary provided by AI)";
    }
    
    S.generated[id] = finalText;
    S.summaries = S.summaries || {};
    S.summaries[id] = summary;
    
    persistSave('rig_drafts', { project: S.project, generated: S.generated, summaries: S.summaries, tokenUsage: S.tokenUsage });
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

// ── API MODAL ─────────────────────────────────────────────────────
let activeProv='anthropic';

function openApi(){
  document.getElementById('api-overlay').classList.add('open');
  renderApiQueue();
  switchProv(document.querySelector(`.ptab[data-p="${activeProv}"]`),activeProv);
}
function closeApi(){document.getElementById('api-overlay').classList.remove('open');}
function handleOv(e,id,fn){if(e.target===document.getElementById(id))fn();}

async function switchProv(el,p){
  activeProv=p;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));el?.classList.add('active');
  const cfg=PROV[p];
  document.getElementById('api-key-inp').placeholder=cfg.ph;
  document.getElementById('api-note').innerHTML=cfg.note;
  
  // Handle OpenRouter multiple models instructions
  if (p === 'openrouter') {
      document.getElementById('api-note').innerHTML += '<br><span style="color:var(--cyan)">Tip: Select or enter multiple models separated by commas to let OpenRouter handle fallbacks.</span>';
  }

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
  document.getElementById('api-key-inp').value = '';
}

function toggleEye(){const i=document.getElementById('api-key-inp'),b=document.getElementById('eye-btn');if(i.type==='password'){i.type='text';b.textContent='🙈';}else{i.type='password';b.textContent='👁';}}

function addApiToQueue() {
  const key=document.getElementById('api-key-inp').value.trim();
  if(!key){showToast('Please paste an API key', 'err');return;}
  const model=document.getElementById('model-sel').value;
  if(!model){showToast('Please select a model', 'err');return;}
  
  // Check for duplicate
  const exists = S.apiQueue.some(a => a.provider === activeProv && a.key === key && a.model === model);
  if(exists){showToast('This exact profile already exists in the queue', 'err');return;}
  
  S.apiQueue.push({provider: activeProv, key, model});
  persistSave('rig_api_queue', S.apiQueue);
  document.getElementById('api-key-inp').value = '';
  renderApiQueue();
  updateApiTopbar();
  showToast(`Added ${PROV[activeProv].name} / ${model} to queue`, 'ok');
}

function removeApiFromQueue(idx) {
    const removed = S.apiQueue[idx];
    S.apiQueue.splice(idx, 1);
    persistSave('rig_api_queue', S.apiQueue);
    renderApiQueue();
    updateApiTopbar();
    showToast(`Removed ${PROV[removed?.provider]?.name||'profile'} from queue`, 'ok');
}

function moveApiQueueUp(idx) {
    if (idx <= 0) return;
    const temp = S.apiQueue[idx - 1];
    S.apiQueue[idx - 1] = S.apiQueue[idx];
    S.apiQueue[idx] = temp;
    persistSave('rig_api_queue', S.apiQueue);
    renderApiQueue();
    updateApiTopbar();
}

function moveApiQueueDown(idx) {
    if (idx >= S.apiQueue.length - 1) return;
    const temp = S.apiQueue[idx + 1];
    S.apiQueue[idx + 1] = S.apiQueue[idx];
    S.apiQueue[idx] = temp;
    persistSave('rig_api_queue', S.apiQueue);
    renderApiQueue();
    updateApiTopbar();
}

function renderApiQueue() {
    const list = document.getElementById('api-queue-list');
    if (!list) return;
    if (S.apiQueue.length === 0) {
        list.innerHTML = '<div style="font-size:12px;color:var(--dim);padding:6px 0 12px;text-align:center">No providers added yet</div>';
        return;
    }
    list.innerHTML = S.apiQueue.map((api, idx) => {
        const provName = PROV[api.provider]?.name || api.provider;
        const keyHint = api.key.substring(0,6) + '...' + api.key.slice(-4);
        const badge = idx === 0 ? '<span style="background:var(--lime);color:var(--ink);font-size:8px;padding:1px 6px;border-radius:10px;font-weight:700;margin-left:6px">PRIMARY</span>' : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px;background:var(--ink2);border:1px solid ${idx===0?'rgba(184,242,65,0.3)':'var(--wire)'};border-radius:8px;transition:all 0.2s">
            <div style="width:28px;height:28px;border-radius:6px;background:${idx===0?'rgba(184,242,65,0.12)':'var(--ink4)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${idx===0?'var(--lime)':'var(--dim)'};flex-shrink:0">${idx+1}</div>
            <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:var(--white);display:flex;align-items:center">${provName}${badge}</div>
                <div style="font-size:10px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${api.model} · ${keyHint}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
                <button onclick="moveApiQueueUp(${idx})" style="width:24px;height:24px;border-radius:4px;background:transparent;border:1px solid var(--wire);color:${idx===0?'var(--ink3)':'var(--dim)'};cursor:${idx===0?'default':'pointer'};font-size:10px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" ${idx!==0?'onmouseover="this.style.borderColor=\'var(--lime)\';this.style.color=\'var(--lime)\'" onmouseout="this.style.borderColor=\'var(--wire)\';this.style.color=\'var(--dim)\'"':''} title="Move Up">▲</button>
                <button onclick="moveApiQueueDown(${idx})" style="width:24px;height:24px;border-radius:4px;background:transparent;border:1px solid var(--wire);color:${idx===S.apiQueue.length-1?'var(--ink3)':'var(--dim)'};cursor:${idx===S.apiQueue.length-1?'default':'pointer'};font-size:10px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" ${idx!==S.apiQueue.length-1?'onmouseover="this.style.borderColor=\'var(--lime)\';this.style.color=\'var(--lime)\'" onmouseout="this.style.borderColor=\'var(--wire)\';this.style.color=\'var(--dim)\'"':''} title="Move Down">▼</button>
                <button onclick="removeApiFromQueue(${idx})" style="width:24px;height:24px;border-radius:4px;background:transparent;border:1px solid var(--wire);color:var(--dim);cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--rose)';this.style.color='var(--rose)'" onmouseout="this.style.borderColor='var(--wire)';this.style.color='var(--dim)'" title="Remove">✕</button>
            </div>
        </div>`;
    }).join('');
}

function updateApiTopbar(){
  const btn=document.getElementById('btn-api-open'),dot=document.getElementById('api-dot'),lbl=document.getElementById('api-lbl');
  if (S.apiQueue && S.apiQueue.length > 0) {
      btn.classList.remove('on-cyan');btn.classList.add('on-lime');dot.style.cssText='background:var(--lime);box-shadow:0 0 6px var(--lime)';
      lbl.textContent= `${PROV[S.apiQueue[0].provider]?.name} +${S.apiQueue.length-1}`;
  } else {
      btn.classList.remove('on-lime');dot.style.cssText='';lbl.textContent='API Key';
  }
}

// ── BRAND MODAL (Multi-Profile) ───────────────────────────────────
let editingBrandIdx = -1;
let tempLogoDataUrl = '';

function openBrand(){document.getElementById('brand-overlay').classList.add('open');showBrandList();}
function closeBrand(){document.getElementById('brand-overlay').classList.remove('open');}

function showBrandList(){
  document.getElementById('brand-list-view').style.display='';
  document.getElementById('brand-list-foot').style.display='';
  document.getElementById('brand-form-view').style.display='none';
  document.getElementById('brand-form-foot').style.display='none';
  document.getElementById('brand-modal-title').textContent='Company Branding';
  document.getElementById('brand-modal-sub').textContent='Manage your branding profiles. Select one to use in generated documents.';
  renderBrandList();
}

function renderBrandList(){
  const list=document.getElementById('brand-profiles-list');
  if(S.brandProfiles.length===0){
    list.innerHTML='<div class="bp-empty"><div class="bp-empty-icon">🏢</div>No branding profiles yet.<br>Add one to brand your documents.</div>';
    return;
  }
  list.innerHTML=S.brandProfiles.map((b,i)=>{
    const isActive = i===S.activeBrandIdx;
    return `<div class="bp-card${isActive?' bp-active':''}" onclick="selectBrandProfile(${i})">
      ${isActive?'<div class="bp-badge">Active</div>':''}
      <div class="bp-logo">${b.logoDataUrl?`<img src="${b.logoDataUrl}" alt="">`:'🏢'}</div>
      <div class="bp-info">
        <div class="bp-name">${b.cname||'Unnamed'}</div>
        <div class="bp-meta">${[b.email,b.phone,b.web].filter(Boolean).join(' · ')||'No details'}</div>
      </div>
      <div class="bp-actions">
        <button class="bp-abtn" onclick="event.stopPropagation();showBrandForm(${i})" title="Edit">✏️</button>
        <button class="bp-abtn bp-del" onclick="event.stopPropagation();deleteBrandProfile(${i})" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function selectBrandProfile(idx){
  S.activeBrandIdx=idx;S.brand={...S.brandProfiles[idx]};
  persistSaveBrands();updateBrandTopbar();renderBrandList();
  showToast(`Using "${S.brand.cname}" branding`,'ok');
}

function deleteBrandProfile(idx){
  if(!confirm(`Delete "${S.brandProfiles[idx].cname||'Unnamed'}" profile?`)) return;
  S.brandProfiles.splice(idx,1);
  if(S.activeBrandIdx===idx){S.activeBrandIdx=-1;S.brand={cname:'',email:'',phone:'',web:'',addr:'',logoDataUrl:'',watermark:false,watermarkText:'CONFIDENTIAL'};}
  else if(S.activeBrandIdx>idx) S.activeBrandIdx--;
  persistSaveBrands();updateBrandTopbar();renderBrandList();
}

function showBrandForm(idx){
  editingBrandIdx=idx;
  document.getElementById('brand-list-view').style.display='none';
  document.getElementById('brand-list-foot').style.display='none';
  document.getElementById('brand-form-view').style.display='';
  document.getElementById('brand-form-foot').style.display='';
  document.getElementById('brand-modal-title').textContent=idx===-1?'New Branding Profile':'Edit Branding Profile';
  const b=idx>=0?S.brandProfiles[idx]:{cname:'',email:'',phone:'',web:'',addr:'',logoDataUrl:'',watermark:false,watermarkText:'CONFIDENTIAL'};
  tempLogoDataUrl=b.logoDataUrl||'';
  ['cname','email','phone','web','addr'].forEach(k=>{const el=document.getElementById(`b-${k}`);if(el) el.value=b[k]||'';});
  document.getElementById('wm-enable').checked=b.watermark;
  document.getElementById('wm-type').disabled=!b.watermark;
  document.getElementById('wm-type').value=b.watermarkText||'CONFIDENTIAL';
  const img=document.getElementById('logo-img-prev');
  const label=document.getElementById('logo-upload-label');
  if(b.logoDataUrl){img.src=b.logoDataUrl;img.style.display='block';label.classList.add('has-logo');}
  else{img.src='';img.style.display='none';label.classList.remove('has-logo');}
}

function handleLogo(inp){
  const file=inp.files[0];if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const url=e.target.result;
    const img=document.getElementById('logo-img-prev');img.src=url;img.style.display='block';
    document.getElementById('logo-upload-label').classList.add('has-logo');
    tempLogoDataUrl=url;
  };
  reader.readAsDataURL(file);
}

function saveBrand(){
  const cname=document.getElementById('b-cname').value.trim();
  if(!cname){showToast('Company name is required','err');document.getElementById('b-cname').classList.add('err');return;}
  document.getElementById('b-cname').classList.remove('err');
  const profile={cname,email:document.getElementById('b-email').value.trim(),phone:document.getElementById('b-phone').value.trim(),web:document.getElementById('b-web').value.trim(),addr:document.getElementById('b-addr').value.trim(),logoDataUrl:tempLogoDataUrl||'',watermark:document.getElementById('wm-enable').checked,watermarkText:document.getElementById('wm-type').value};
  if(editingBrandIdx>=0){S.brandProfiles[editingBrandIdx]=profile;if(S.activeBrandIdx===editingBrandIdx) S.brand={...profile};}
  else{S.brandProfiles.push(profile);S.activeBrandIdx=S.brandProfiles.length-1;S.brand={...profile};}
  persistSaveBrands();updateBrandTopbar();showBrandList();showToast(`"${cname}" saved!`,'ok');
}

function persistSaveBrands(){
  const data=S.brandProfiles.map(b=>({...b,logoDataUrl:''}));
  persistSave('rig_brands',{profiles:data,activeIdx:S.activeBrandIdx});
}

function updateBrandTopbar(){
  const btn=document.getElementById('btn-brand-open'),dot=document.getElementById('brand-dot'),lbl=document.getElementById('brand-lbl');
  if(S.brand.cname){btn.classList.remove('on-lime');btn.classList.add('on-cyan');dot.style.cssText='background:var(--cyan);box-shadow:0 0 6px var(--cyan)';lbl.textContent=S.brand.cname;}
  else{btn.classList.remove('on-cyan');dot.style.cssText='';lbl.textContent='Branding';}
}

// ── SETTINGS MODAL ──────────────────────────────────────────────────
function openSettings() {
    document.getElementById('settings-overlay').classList.add('open');
    document.getElementById('s-persona').value = S.prompts.systemPersona;
    document.getElementById('s-directives').value = S.prompts.outputDirectives;
    document.getElementById('s-degrade').checked = S.engine.degradeModels;
    document.getElementById('s-rotate').checked = S.engine.keyRotation;
}

function closeSettings() {
    document.getElementById('settings-overlay').classList.remove('open');
}

function saveSettings() {
    S.prompts.systemPersona = document.getElementById('s-persona').value;
    S.prompts.outputDirectives = document.getElementById('s-directives').value;
    S.engine.degradeModels = document.getElementById('s-degrade').checked;
    S.engine.keyRotation = document.getElementById('s-rotate').checked;
    
    persistSave('rig_prompts', S.prompts);
    persistSave('rig_engine', S.engine);
    
    showToast('Settings saved successfully!', 'ok');
    closeSettings();
}

// ── TOAST ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg,type='ok'){clearTimeout(toastTimer);const t=document.getElementById('toast'),icon=document.getElementById('t-icon'),m=document.getElementById('t-msg');t.className=`toast ${type}`;icon.textContent=type==='ok'?'✓':'✕';m.textContent=msg;t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),3500);}
