// ── MAIN APP LOGIC ────────────────────────────────────────────────
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
  if(!S.apiQueue || S.apiQueue.length === 0){showToast('Please configure at least one API key first','err');openApi();return;}
  S.project={name,sector:document.getElementById('f-sector').value,geo:document.getElementById('f-geo').value,client:document.getElementById('f-client').value,audience:document.getElementById('f-audience').value,desc:document.getElementById('f-desc').value,standards:document.getElementById('f-standards').value,price:document.getElementById('f-price').value,duration:document.getElementById('f-duration').value,lang:document.getElementById('f-lang').value, referenceText: S.referenceText};
  renderDocGrid();goTo(2);
};

function cancelGen() {
  if (S.genController) {
    S.genController.abort();
    document.getElementById('prog-cur').textContent = 'Cancelling... please wait.';
    document.getElementById('btn-cancel-gen').style.display = 'none';
    
    // Fallback: if the async flow hasn't transitioned us away in 3 seconds, force it
    setTimeout(() => {
      if (S.view === 3) { // still stuck on generation view
        forcePostCancel();
      }
    }, 3000);
  }
}

function forcePostCancel() {
  const toGen = DOCS.filter(d => S.selected.has(d.id));
  const hasAnyContent = toGen.some(d => S.generated[d.id]);
  
  if (hasAnyContent) {
    document.getElementById('prog-lbl').textContent = 'Generation Cancelled';
    document.getElementById('prog-cur').textContent = 'Loading results...';
    setTimeout(() => showResults(toGen), 300);
  } else {
    document.getElementById('prog-lbl').textContent = 'Generation Cancelled';
    document.getElementById('prog-cur').textContent = 'No documents were completed.';
    // Show a back button so the user isn't stranded
    const btnRow = document.querySelector('#view-gen .btn-row');
    if (btnRow && !document.getElementById('btn-cancel-back')) {
      btnRow.innerHTML = `<button class="btn btn-ghost" id="btn-cancel-back" onclick="goTo(2)" style="flex:1;justify-content:center">← Back to Documents</button>
        <button class="btn btn-lime" id="btn-cancel-retry" onclick="startGen()" style="flex:1;justify-content:center">Retry Generation</button>`;
    }
  }
}

async function startGen(restoreDraft = false){
  if(S.selected.size===0){showToast('Select at least one document','err');return;}
  
  if (!restoreDraft) {
    S.generated={};
    S.summaries={};
    S.startTime=Date.now();
    S.tokenUsage={input:0,output:0,total:0};
  }
  
  S.genController = new AbortController();
  document.getElementById('btn-cancel-gen').style.display = 'flex';
  
  const toGen=DOCS.filter(d=>S.selected.has(d.id));
  document.getElementById('gen-grid').innerHTML=toGen.map(d=>{
    const status = S.generated[d.id] ? (S.generated[d.id].startsWith('[Generation error') ? 'err' : 'done') : 'wait';
    return `<div class="gc ${status==='done'?'done':(status==='err'?'error':'')}" id="gc-${d.id}"><div class="gc-status s-${status}" id="gs-${d.id}">${status}</div><div class="gc-icon">${d.icon}</div><div class="gc-name">${d.name}</div></div>`
  }).join('');
  
  updateTokenUI();
  goTo(3);
  
  const CONCURRENCY_LIMIT = 1; // Enforced sequential generation for contextual memory
  let queue = toGen.filter(d => !S.generated[d.id] || S.generated[d.id].startsWith('[Generation error'));
  let doneCount = toGen.length - queue.length;
  let inProgress = 0;
  
  document.getElementById('cnt-left').textContent=queue.length;
  document.getElementById('cnt-done').textContent=doneCount;
  document.getElementById('cnt-gen').textContent=0;
  S.notifiedRefDrop = false; // Reset the token saver notification flag
  
  const processDocument = async (doc) => {
    if (S.genController.signal.aborted) return;
    inProgress++;
    const card=document.getElementById(`gc-${doc.id}`),stat=document.getElementById(`gs-${doc.id}`);
    card?.classList.remove('error');
    card?.classList.add('generating');if(stat){stat.className='gc-status s-gen';stat.textContent='gen';}
    
    document.getElementById('prog-lbl').textContent=`${doc.icon} ${doc.name}`;
    document.getElementById('prog-cur').textContent=doc.tip;
    document.getElementById('cnt-gen').textContent=inProgress;
    document.getElementById('cnt-left').textContent=toGen.length-doneCount-inProgress;
    
    // Cross-document Context (Summaries only)
    // Cross-document Context (Summaries only) - Trimmed to prevent token exhaustion
    let contextData = '';
    const doneKeys = Object.keys(S.summaries || {});
    if (doneKeys.length > 0) {
      const coreDocs = ['overview', 'charter'];
      const recentKeys = doneKeys.filter(k => !coreDocs.includes(k)).slice(-3);
      const keysToUse = [...new Set([...coreDocs.filter(k => doneKeys.includes(k)), ...recentKeys])];
      keysToUse.forEach(k => {
         const docObj = DOCS.find(d=>d.id===k);
         if(docObj) contextData += `\n[Document: ${docObj.name}]\n${S.summaries[k]}\n`;
      });
    }

    try {
      let rawText = await callAI(doc, 0, 1, null, "", false, S.genController.signal, contextData);
      
      let finalText = rawText;
      let summary = "";
      if (rawText.includes("---DOC_SUMMARY---")) {
          const parts = rawText.split("---DOC_SUMMARY---");
          finalText = parts[0].trim();
          summary = parts[1] ? parts[1].trim() : "";
      } else {
          // Fallback if AI disobeys instruction
          summary = rawText.substring(0, 400) + "... (No summary provided by AI)";
      }
      
      S.generated[doc.id] = finalText;
      S.summaries = S.summaries || {};
      S.summaries[doc.id] = summary;
      
      card?.classList.remove('generating');card?.classList.add('done');
      if(stat){stat.className='gc-status s-done';stat.textContent='done';}
    } catch(e) {
      if (e.name === 'AbortError' || e.message.includes('TIMEOUT')) {
         S.generated[doc.id] = `[Generation error]\n\nCancelled / Timeout`;
      } else {
         S.generated[doc.id]=`[Generation error]\n\n${e.message}`;
      }
      card?.classList.remove('generating');card?.classList.add('error');
      if(stat){stat.className='gc-status s-err';stat.textContent='err';}
    }
    
    inProgress--;
    doneCount++;
    
    persistSave('rig_drafts', { project: S.project, generated: S.generated, summaries: S.summaries, tokenUsage: S.tokenUsage });
    
    updateTokenUI();
    document.getElementById('cnt-done').textContent=doneCount;
    document.getElementById('cnt-gen').textContent=inProgress;
    
    const pct=Math.round((doneCount/toGen.length)*100);
    document.getElementById('prog-fill').style.width=pct+'%';
    document.getElementById('prog-pct').textContent=pct+'%';
  };

  const workers = [];
  for(let i=0; i<Math.min(CONCURRENCY_LIMIT, queue.length); i++) {
    workers.push((async () => {
      while(queue.length > 0 && !S.genController.signal.aborted) {
        const doc = queue.shift();
        await processDocument(doc);
      }
    })());
  }
  
  await Promise.all(workers);

  document.getElementById('btn-cancel-gen').style.display = 'none';

  if (S.genController.signal.aborted) {
    forcePostCancel();
    return;
  }

  document.getElementById('prog-lbl').textContent='Generation Complete!';
  document.getElementById('prog-cur').textContent='All documents ready — preparing results...';
  setTimeout(()=>showResults(toGen),800);
}

function restart(){
    S.generated={};
    S.summaries={};
    S.selected=new Set(DOCS.map(d=>d.id));
    S.project={};
    S.referenceText='';
    S.tokenUsage={input:0,output:0,total:0};
    idbDelete('rig_drafts').catch(()=>{}); // clear drafts
    document.getElementById('ref-status').textContent='';
    if(document.getElementById('f-reference'))document.getElementById('f-reference').value='';
    document.querySelectorAll('#view-form input,#view-form textarea').forEach(el=>el.value='');
    document.getElementById('f-lang').value='English';
    goTo(1);
}

// ── INIT ──────────────────────────────────────────────────────────
function applyApiState(a) {
  if (a && a.length > 0) {
    S.apiQueue = a;
    updateApiTopbar();
    return true;
  }
  return false;
}

function applyBrandsState(data) {
  if (data && data.profiles && data.profiles.length > 0) {
    S.brandProfiles = data.profiles;
    S.activeBrandIdx = data.activeIdx >= 0 && data.activeIdx < data.profiles.length ? data.activeIdx : 0;
    S.brand = {...S.brandProfiles[S.activeBrandIdx]};
    updateBrandTopbar();
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

  // API Queue
  let apiLoaded = false;
  try {
    const a = await persistLoad('rig_api_queue');
    if (a && a.length) { apiLoaded = applyApiState(a); }
    else {
        // Migration from old single API format
        const oldApi = await persistLoad('rig_api');
        if (oldApi && oldApi.key) {
            S.apiQueue = [oldApi];
            persistSave('rig_api_queue', S.apiQueue);
            apiLoaded = applyApiState(S.apiQueue);
        }
    }
  } catch(e) {}

  // Branding (Multi-Profile)
  try {
    const data = await persistLoad('rig_brands');
    if (data) { applyBrandsState(data); }
  } catch(e) {}

  // Prompts and Engine Settings
  try {
      const p = await persistLoad('rig_prompts');
      if (p && p.systemPersona) {
          if (!p.outputDirectives.includes('TO AVOID SYNTAX ERRORS')) {
             // Force migration to new rich content prompts with Mermaid fixes
             persistSave('rig_prompts', S.prompts);
          } else {
             S.prompts = p;
          }
      }
      const e = await persistLoad('rig_engine');
      if (e) S.engine = {...S.engine, ...e};
  } catch(e) {}

  renderDocGrid();
  
  // Drafts
  try {
      const draft = await persistLoad('rig_drafts');
      if (draft && draft.generated && Object.keys(draft.generated).length > 0) {
          const banner = document.createElement('div');
          banner.style.cssText = 'background:var(--ink2); border-bottom:1px solid var(--wire); padding:12px 20px; display:flex; justify-content:space-between; align-items:center; color:var(--white); font-size:13px; z-index:9999; position:relative;';
          banner.innerHTML = `
            <div><strong>Unsaved Session</strong> &mdash; You have a previously generated report. Would you like to restore it?</div>
            <div style="display:flex;gap:10px">
              <button id="btn-restore-yes" class="btn btn-lime" style="padding:6px 14px;min-height:0;font-size:12px;">Restore</button>
              <button id="btn-restore-no" class="btn btn-ghost" style="padding:6px 14px;min-height:0;font-size:12px;border-color:var(--wire);color:var(--dim);">Discard</button>
            </div>
          `;
          document.body.insertBefore(banner, document.body.firstChild);

          document.getElementById('btn-restore-yes').onclick = () => {
              banner.remove();
              S.project = draft.project || {};
              S.generated = draft.generated;
              S.summaries = draft.summaries || {};
              S.tokenUsage = draft.tokenUsage || {input:0,output:0,total:0};
              
              // Pre-fill fields
              ['name','sector','geo','client','audience','desc','standards','price','duration','lang'].forEach(k=>{
                 const el = document.getElementById(\`f-\${k}\`);
                 if (el && S.project[k]) el.value = S.project[k];
              });
              
              // Select the generated docs
              S.selected = new Set(Object.keys(S.generated));
              renderDocGrid();
              showResults(DOCS.filter(d=>S.selected.has(d.id)));
          };

          document.getElementById('btn-restore-no').onclick = () => {
              banner.remove();
              idbDelete('rig_drafts').catch(()=>{});
          };
      }
  } catch(e) {}

})();
