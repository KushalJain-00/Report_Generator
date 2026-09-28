const DOCS = [
  {id:'overview',name:'Brief Overview',cat:'overview',icon:'\u{1F4D6}',tip:'High-level summary'},
  {id:'applicability',name:'Applicability of Service',cat:'overview',icon:'\u{1F3AF}',tip:'Who it applies to'},
  {id:'proscons',name:"Pro's and Con's",cat:'overview',icon:'\u2696\uFE0F',tip:'Balanced decision analysis'},
  {id:'tableofcontent',name:'Table of Contents',cat:'overview',icon:'\u{1F4D1}',tip:'Master TOC'},
  {id:'casestudy',name:'Case Study',cat:'overview',icon:'\u{1F3C6}',tip:'Illustrative case study'},
  {id:'dashboard',name:'Dashboard Template',cat:'overview',icon:'\u{1F4CA}',tip:'KPI tracking dashboard'},
  {id:'charter',name:'Project Charter',cat:'planning',icon:'\u{1F4CB}',tip:'Project authorization'},
  {id:'sow',name:'Scope of Work',cat:'planning',icon:'\u{1F4CC}',tip:'Deliverables & boundaries'},
  {id:'wbs',name:'Project Plan / WBS',cat:'planning',icon:'\u{1F5C2}\uFE0F',tip:'Work breakdown structure'},
  {id:'gantt',name:'Timeline / Gantt Chart',cat:'planning',icon:'\u{1F4C5}',tip:'Week-by-week timeline'},
  {id:'resource',name:'Resource Allocation Plan',cat:'planning',icon:'\u{1F465}',tip:'Team & roles'},
  {id:'assumption',name:'Assumption & Constraint Log',cat:'planning',icon:'\u{1F512}',tip:'Dependencies & impact'},
  {id:'risk',name:'Risk Register & Mitigation',cat:'planning',icon:'\u26A0\uFE0F',tip:'Risk identification & plan'},
  {id:'sop',name:'SOP for Service Preparation',cat:'operations',icon:'\u2699\uFE0F',tip:'Standard operating procedure'},
  {id:'methodology',name:'Methodology of Work',cat:'operations',icon:'\u{1F52C}',tip:'Approach & framework'},
  {id:'tor',name:'Terms of Reference',cat:'operations',icon:'\u{1F4DC}',tip:'Roles & governance'},
  {id:'stakeholder',name:'Stakeholder Register',cat:'operations',icon:'\u{1F91D}',tip:'Stakeholder mapping'},
  {id:'comms',name:'Communication Plan',cat:'operations',icon:'\u{1F4E1}',tip:'Communication matrix'},
  {id:'flow',name:'Process Flow Diagram',cat:'operations',icon:'\u{1F504}',tip:'Process flow'},
  {id:'gap',name:'Gap Analysis Template',cat:'operations',icon:'\u{1F50D}',tip:'Current vs required state'},
  {id:'compliance',name:'Compliance Check',cat:'operations',icon:'\u{1F6E1}\uFE0F',tip:'Compliance matrix'},
  {id:'toolsequip',name:'Tools & Equipment List',cat:'operations',icon:'\u{1F527}',tip:'Required tools'},
  {id:'softwares',name:'Softwares Required List',cat:'operations',icon:'\u{1F4BB}',tip:'Software requirements'},
  {id:'peoplerequired',name:'People & Expertise Required',cat:'operations',icon:'\u{1F468}\u200D\u{1F52C}',tip:'Qualifications needed'},
  {id:'dosdonts',name:"Do's & Don'ts",cat:'operations',icon:'\u{1F4A1}',tip:'Critical considerations'},
  {id:'checklist',name:'Data & Documents Checklist',cat:'data',icon:'\u2705',tip:'Required data checklist'},
  {id:'datacollection',name:'Data Collection Template',cat:'data',icon:'\u{1F4CB}',tip:'Data collection forms'},
  {id:'tracker',name:'Document Submission Tracker',cat:'data',icon:'\u{1F5C3}\uFE0F',tip:'Submission tracking'},
  {id:'sitevisit',name:'Site Visit / Field Observation',cat:'data',icon:'\u{1F3D7}\uFE0F',tip:'Field observation form'},
  {id:'interview',name:'Interview / Questionnaire',cat:'data',icon:'\u{1F3A4}',tip:'Interview guide'},
  {id:'secondary',name:'Secondary Data Review Sheet',cat:'data',icon:'\u{1F4F0}',tip:'Secondary data review'},
  {id:'sample',name:'Sample Format for Service',cat:'data',icon:'\u{1F4C4}',tip:'Sample report format'},
  {id:'draft',name:'Draft Report',cat:'data',icon:'\u270D\uFE0F',tip:'Full draft report'},
  {id:'pricing',name:'Pricing Calculation Reference',cat:'business',icon:'\u{1F4B0}',tip:'Fee structure & pricing'},
  {id:'techquote',name:'Techno-Commercial Quotation',cat:'business',icon:'\u{1F4C3}',tip:'Professional quotation'},
  {id:'bizplan',name:'Complete Business Plan',cat:'business',icon:'\u{1F3E2}',tip:'Full business plan'},
  {id:'excel',name:'Excel Project Tracker',cat:'business',icon:'\u{1F4C8}',tip:'Multi-project tracker'},
  {id:'pitch',name:'Client Pitch',cat:'marketing',icon:'\u{1F4BC}',tip:'Client pitch deck'},
  {id:'pitchdeck',name:'Pitch Deck (VC / Investor)',cat:'marketing',icon:'\u{1F3AF}',tip:'Investor pitch deck'},
  {id:'clientpresentation',name:'Client Presentation',cat:'marketing',icon:'\u{1F5A5}\uFE0F',tip:'Client presentation'},
  {id:'marketing',name:'Marketing & Sales Plan',cat:'marketing',icon:'\u{1F4E3}',tip:'Marketing strategy'},
  {id:'emailmarketing',name:'Email Marketing Content',cat:'marketing',icon:'\u2709\uFE0F',tip:'Email sequences'},
  {id:'whatsapp',name:'WhatsApp Marketing Content',cat:'marketing',icon:'\u{1F4AC}',tip:'WhatsApp scripts'},
  {id:'pharmasample',name:'Sample Copy \u2014 Pharma',cat:'marketing',icon:'\u{1F48A}',tip:'Pharma industry sample'},
];

const PROVIDERS = {
  groq:{name:'Groq',models:['qwen/qwen3.8-27b','qwen/qwen3.6-27b','allam-2-7b','openai/gpt-oss-120b'],defaultModel:'qwen/qwen3.8-27b',needsKey:true},
  ollama:{name:'Ollama',models:['llama3','llama3:8b','llama3:70b','qwen2.5:7b','qwen2.5:14b','mistral','phi3','gemma2'],defaultModel:'llama3',needsKey:false,defaultUrl:'http://localhost:11434'},
  openrouter:{name:'OpenRouter',models:['nvidia/nemotron-3-ultra-550b-a55b:free','qwen/qwen3-coder-480b-a35b:free','nvidia/nemotron-3-super-120b-a12b:free','openai/gpt-oss-120b:free','google/gemma-4-31b-it:free','nvidia/nemotron-3-nano-30b-a3b:free','meta-llama/llama-3-8b-instruct:free'],defaultModel:'nvidia/nemotron-3-ultra-550b-a55b:free',needsKey:true},
  gemini:{name:'Gemini',models:['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro','gemini-flash-latest'],defaultModel:'gemini-2.5-flash',needsKey:true}
};

const S={selected:new Set(DOCS.map(d=>d.id)),filter:'all',blobUrl:null,provider:'groq',generatedFiles:[],previewIndex:null};
const CAT_ICONS={overview:'\u{1F4D6}',planning:'\u{1F4CB}',operations:'\u2699\uFE0F',data:'\u{1F4CA}',business:'\u{1F4BC}',marketing:'\u{1F4E3}'};
const DEFAULT_FALLBACK=['openrouter','groq','gemini','ollama'];

/* ── SETTINGS ─────────────────────────────────────────── */
function loadSettings(){
  try{return JSON.parse(localStorage.getItem('rig_settings'))||null}catch(e){return null}
}
function saveSettings(s){localStorage.setItem('rig_settings',JSON.stringify(s))}
function getSettings(){
  var saved=loadSettings();
  return saved||{fallbackOrder:DEFAULT_FALLBACK.slice(),enabled:{openrouter:true,groq:false,gemini:false,ollama:false},
    keys:{groq:[],gemini:[],openrouter:[]},
    models:{groq:PROVIDERS.groq.defaultModel,gemini:PROVIDERS.gemini.defaultModel,openrouter:PROVIDERS.openrouter.defaultModel,ollama:PROVIDERS.ollama.defaultModel},
    ollamaUrl:'http://localhost:11434',
    watermark:{text:'',opacity:0.15,fontSize:48}};
}
function parseKeys(text){return text.split('\n').map(function(k){return k.trim()}).filter(function(k){return k.length>0})}

/* ── DRAWER ───────────────────────────────────────────── */
function openDrawer(){
  var s=getSettings();
  document.getElementById('s-ollama-url').value=s.ollamaUrl||'http://localhost:11434';
  document.getElementById('s-groq-keys').value=(s.keys.groq||[]).join('\n');
  document.getElementById('s-gemini-keys').value=(s.keys.gemini||[]).join('\n');
  document.getElementById('s-openrouter-keys').value=(s.keys.openrouter||[]).join('\n');
  populateModelSelect('s-groq-model','groq',s.models.groq);
  populateModelSelect('s-gemini-model','gemini',s.models.gemini);
  populateModelSelect('s-openrouter-model','openrouter',s.models.openrouter);
  renderFallbackList(s.fallbackOrder,s.enabled);
  var wm=s.watermark||{};
  document.getElementById('s-wm-text').value=wm.text||'';
  document.getElementById('s-wm-opacity').value=wm.opacity||0.15;
  document.getElementById('s-wm-fontsize').value=wm.fontSize||48;
  switchProvider(S.provider);
  document.getElementById('settings-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer(){
  document.getElementById('settings-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}
function populateModelSelect(id,provider,selected){
  var el=document.getElementById(id);if(!el)return;
  var cfg=PROVIDERS[provider];
  el.innerHTML=cfg.models.map(function(m){return '<option value="'+m+'"'+(m===selected?' selected':'')+'>'+m+'</option>'}).join('');
}

/* ── FALLBACK DRAG-TO-REORDER ─────────────────────────── */
var dragItem=null;
function renderFallbackList(order,enabled){
  var list=document.getElementById('fallback-list');if(!list)return;
  list.innerHTML=order.map(function(p){
    var cfg=PROVIDERS[p];if(!cfg)return'';
    var isOn=enabled[p]!==false;
    return '<div class="fallback-item" draggable="true" data-prov="'+p+'">'+
      '<span class="drag-handle">\u2630</span>'+
      '<span class="fb-name">'+cfg.name+'</span>'+
      '<label class="fb-toggle"><input type="checkbox" data-enable="'+p+'"'+(isOn?' checked':'')+'><span class="slider"></span></label>'+
    '</div>';
  }).join('');

  list.querySelectorAll('.fallback-item').forEach(function(el){
    el.addEventListener('dragstart',function(e){dragItem=el;el.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
    el.addEventListener('dragend',function(){el.classList.remove('dragging');dragItem=null});
    el.addEventListener('dragover',function(e){e.preventDefault();e.dataTransfer.dropEffect='move'});
    el.addEventListener('drop',function(e){
      e.preventDefault();
      if(dragItem&&dragItem!==el){
        var items=Array.from(list.children);
        var from=items.indexOf(dragItem),to=items.indexOf(el);
        if(from<to)list.insertBefore(dragItem,el.nextSibling);
        else list.insertBefore(dragItem,el);
      }
    });
  });
}
function getFallbackOrder(){
  var list=document.getElementById('fallback-list');if(!list)return DEFAULT_FALLBACK.slice();
  return Array.from(list.querySelectorAll('.fallback-item')).map(function(el){return el.dataset.prov});
}
function getEnabled(){
  var en={};
  document.querySelectorAll('[data-enable]').forEach(function(cb){en[cb.dataset.enable]=cb.checked});
  return en;
}

/* ── NAV ─────────────────────────────────────────────── */
function goTo(n){
  var ids=['view-form','view-docs','view-gen','view-done'];
  ids.forEach(function(id,i){document.getElementById(id).classList.toggle('active',i===n-1)});
  document.querySelectorAll('.step').forEach(function(el){
    var s=parseInt(el.dataset.step);
    el.classList.remove('active','done');
    if(s===n)el.classList.add('active');else if(s<n)el.classList.add('done');
  });
  var h=document.getElementById('hero');
  if(h)h.style.display=n===1?'':'none';
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ── PROVIDER ────────────────────────────────────────── */
window.switchProvider=function(provider){
  S.provider=provider;
  document.querySelectorAll('#drawer-providers .prov-tab').forEach(function(t){t.classList.remove('active')});
  var active=document.querySelector('#drawer-providers .prov-tab[data-provider="'+provider+'"]');
  if(active)active.classList.add('active');
  var notes={groq:'<strong>Groq</strong> \u2014 Ultra-fast inference. Free key at <a href="https://console.groq.com" target="_blank">console.groq.com</a>',ollama:'<strong>Ollama</strong> \u2014 100% local, zero cost. <a href="https://ollama.com" target="_blank">Install</a>, then <code>ollama pull llama3</code>.',openrouter:'<strong>OpenRouter</strong> \u2014 Multiple models. Free tier at <a href="https://openrouter.ai" target="_blank">openrouter.ai</a>',gemini:'<strong>Gemini</strong> \u2014 Google free tier. Key at <a href="https://aistudio.google.com/apikey" target="_blank">AI Studio</a>'};
  var ne=document.getElementById('prov-note');
  if(ne)ne.innerHTML=notes[provider]||'';
  updateProvStatus(provider);
};
function updateProvStatus(provider){
  var el=document.getElementById('prov-status');if(!el)return;
  var cfg=PROVIDERS[provider];
  var s=getSettings();
  if(!cfg.needsKey){el.className='prov-status local';el.textContent='No API key needed \u2014 runs locally via Ollama';return}
  var keys=s.keys[provider]||[];
  if(keys.length>0){el.className='prov-status configured';el.textContent=keys.length+' key'+(keys.length>1?'s':'')+' configured'}
  else{el.className='prov-status missing';el.textContent='No API key configured'}
}

/* ── DOC GRID ────────────────────────────────────────── */
function renderDocGrid(){
  var filtered=S.filter==='all'?DOCS:DOCS.filter(function(d){return d.cat===S.filter});
  var g=document.getElementById('doc-grid');if(!g)return;
  g.innerHTML=filtered.map(function(d){
    return '<div class="doc-card'+(S.selected.has(d.id)?' sel':'')+'" id="dc-'+d.id+'" onclick="toggleDoc(\''+d.id+'\')" title="'+d.tip+'"><div class="dc-check">\u2713</div><div class="dc-icon">'+d.icon+'</div><div class="dc-name">'+d.name+'</div><div class="dc-cat">'+d.cat+'</div></div>';
  }).join('');
  updateSelCount();
}
window.toggleDoc=function(id){S.selected.has(id)?S.selected.delete(id):S.selected.add(id);var e=document.getElementById('dc-'+id);if(e)e.classList.toggle('sel',S.selected.has(id));updateSelCount()};
window.filterDocs=function(el,cat){S.filter=cat;document.querySelectorAll('.chip').forEach(function(c){c.classList.remove('active')});el.classList.add('active');renderDocGrid()};
window.selAll=function(v){DOCS.forEach(function(d){v?S.selected.add(d.id):S.selected.delete(d.id)});renderDocGrid()};
function updateSelCount(){var e=document.getElementById('sel-count');if(e)e.textContent=S.selected.size+' selected'}

/* ── TOAST ───────────────────────────────────────────── */
var toastTimer;
function showToast(msg,type){
  clearTimeout(toastTimer);
  var t=document.getElementById('toast');if(!t)return;
  t.className='toast '+(type||'ok');
  document.getElementById('t-icon').innerHTML=type==='err'?'&#10005;':'&#10003;';
  document.getElementById('t-msg').textContent=msg;
  t.classList.add('show');
  toastTimer=setTimeout(function(){t.classList.remove('show')},3500);
}

/* ── LOG ─────────────────────────────────────────────── */
function log(msg,type){
  var p=document.getElementById('status-ticker');if(!p)return;
  p.querySelectorAll('.log-line').forEach(function(l){l.classList.remove('active')});
  var d=document.createElement('div');
  d.className='log-line '+(type||'active');
  var now=new Date();
  var ts=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
  d.innerHTML='<span class="log-time">'+ts+'</span>'+msg;
  p.appendChild(d);
  p.scrollTop=p.scrollHeight;
}

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',function(){
  renderDocGrid();
  var s=getSettings();
  var initProv=s.fallbackOrder&&s.fallbackOrder.length?s.fallbackOrder[0]:'openrouter';
  switchProvider(initProv);
  updateProvStatus(initProv);

  document.getElementById('btn-settings').addEventListener('click',openDrawer);
  document.getElementById('drawer-close').addEventListener('click',closeDrawer);
  document.getElementById('drawer-overlay').addEventListener('click',closeDrawer);

  document.getElementById('drawer-save').addEventListener('click',function(){
    var s={
      fallbackOrder:getFallbackOrder(),
      enabled:getEnabled(),
      keys:{
        groq:parseKeys(document.getElementById('s-groq-keys').value),
        gemini:parseKeys(document.getElementById('s-gemini-keys').value),
        openrouter:parseKeys(document.getElementById('s-openrouter-keys').value)
      },
      models:{
        groq:document.getElementById('s-groq-model').value,
        gemini:document.getElementById('s-gemini-model').value,
        openrouter:document.getElementById('s-openrouter-model').value,
        ollama:PROVIDERS.ollama.defaultModel
      },
      ollamaUrl:document.getElementById('s-ollama-url').value.trim(),
      watermark:{
        text:document.getElementById('s-wm-text').value.trim(),
        opacity:parseFloat(document.getElementById('s-wm-opacity').value)||0.15,
        fontSize:parseInt(document.getElementById('s-wm-fontsize').value)||48
      }
    };
    saveSettings(s);
    closeDrawer();
    updateProvStatus(S.provider);
    showToast('Settings saved');
  });

  document.getElementById('btn-to-docs').addEventListener('click',function(){
    var name=document.getElementById('f-name').value.trim();
    if(!name){showToast('Enter a Project/Service Name','err');return}
    var s=getSettings();
    var cfg=PROVIDERS[S.provider];
    if(cfg.needsKey){
      var keys=s.keys[S.provider];
      if(!keys||keys.length===0){showToast('Add API key in Settings for '+cfg.name,'err');return}
    }
    goTo(2);
  });

  document.getElementById('btn-download-result').addEventListener('click',function(){
    if(!S.blobUrl)return;
    var a=document.createElement('a');a.href=S.blobUrl;
    a.download='RIG_'+(document.getElementById('f-name').value.trim().replace(/[^a-z0-9]/gi,'_').toLowerCase()||'package')+'.zip';
    document.body.appendChild(a);a.click();a.remove();
  });
});

/* ── PREVIEW ─────────────────────────────────────────── */
window.previewDoc=function(i){
  S.previewIndex=i;var doc=S.generatedFiles[i];if(!doc)return;
  document.querySelectorAll('.doc-list-item').forEach(function(el,j){el.classList.toggle('active',j===i)});
  var tb=document.getElementById('preview-toolbar');
  var tt=document.getElementById('pv-title');
  var ct=document.getElementById('pv-content');
  if(tb)tb.style.display='';
  if(tt)tt.textContent=doc.docName+' \u2014 '+doc.wordCount+' words';
  if(ct){
    if(doc.error)ct.innerHTML='<div class="preview-empty" style="color:var(--red)"><div class="preview-empty-icon">\u2715</div>'+(doc.errorMessage||'Generation failed')+'</div>';
    else if(doc.html)ct.innerHTML=doc.html;
    else{var e=document.createElement('div');e.textContent=doc.markdown||'No content';ct.innerHTML='<pre style="white-space:pre-wrap">'+e.innerHTML+'</pre>'}
  }
};
window.copyMarkdown=function(){var d=S.generatedFiles[S.previewIndex];if(!d)return;navigator.clipboard.writeText(d.markdown||'').then(function(){showToast('Markdown copied')})};
window.openInNewTab=function(){var d=S.generatedFiles[S.previewIndex];if(!d||!d.html)return;var w=window.open('','_blank');w.document.write(d.html);w.document.close()};

/* ── GENERATION ──────────────────────────────────────── */
window.startGeneration=async function(){
  if(S.selected.size===0){showToast('Select at least one document','err');return}
  var s=getSettings();
  var payload={
    provider:S.provider,
    ollamaUrl:s.ollamaUrl||'http://localhost:11434',
    ollamaModel:s.models.ollama||'llama3',
    groqKeys:s.keys.groq||[],
    groqModel:s.models.groq||PROVIDERS.groq.defaultModel,
    openrouterKeys:s.keys.openrouter||[],
    openrouterModel:s.models.openrouter||PROVIDERS.openrouter.defaultModel,
    geminiKeys:s.keys.gemini||[],
    geminiModel:s.models.gemini||PROVIDERS.gemini.defaultModel,
    fallbackOrder:s.fallbackOrder||DEFAULT_FALLBACK,
    enabled:s.enabled||{},
    watermark:s.watermark||{},
    metadata:{
      name:document.getElementById('f-name').value.trim(),
      sector:document.getElementById('f-sector').value.trim(),
      geo:document.getElementById('f-geo').value.trim(),
      client:document.getElementById('f-client').value.trim(),
      audience:document.getElementById('f-audience').value.trim(),
      desc:document.getElementById('f-desc').value.trim(),
      standards:document.getElementById('f-standards').value.trim(),
      price:document.getElementById('f-price').value.trim(),
      duration:document.getElementById('f-duration').value.trim(),
      lang:document.getElementById('f-lang').value.trim()
    },
    documents:DOCS.filter(function(d){return S.selected.has(d.id)})
  };

  goTo(3);
  var panel=document.getElementById('status-ticker');if(panel)panel.innerHTML='';
  var fill=document.getElementById('prog-fill');
  var lbl=document.getElementById('prog-lbl');
  var pct=document.getElementById('prog-pct');
  var lp=document.getElementById('live-preview');
  var lpName=document.getElementById('live-doc-name');
  var seenLogs=0;

  try{
    setProg(2,'Starting...',lbl,fill,pct);

    var resp=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok)throw new Error('Start failed: '+resp.status);
    var jobId=(await resp.json()).jobId;

    while(true){
      await new Promise(function(r){setTimeout(r,1000)});
      var sr=await fetch('/api/status/'+jobId);
      if(!sr.ok)throw new Error('Lost connection');
      var st=await sr.json();

      if(st.logs&&st.logs.length>seenLogs){
        for(var i=seenLogs;i<st.logs.length;i++){
          var entry=st.logs[i];
          log(entry.message,entry.type==='error'?'error':entry.type==='success'?'success':'active');
        }
        seenLogs=st.logs.length;
      }

      if(st.currentDocName&&lpName)lpName.textContent='Generating: '+st.currentDocName;
      else if(lpName)lpName.textContent='';

      if(st.currentContent&&lp){
        lp.innerHTML=renderMarkdownInline(st.currentContent);
        lp.scrollTop=lp.scrollHeight;
      }else if(lp&&st.currentDocName){
        lp.innerHTML='<div class="preview-empty" style="padding:20px;color:var(--text3)">Streaming content...</div>';
      }

      if(st.total>0){var p=Math.round((st.current/st.total)*90)+5;setProg(p,st.current+'/'+st.total+' documents',lbl,fill,pct)}

      if(st.status==='done'){
        setProg(100,'Complete',lbl,fill,pct);
        S.generatedFiles=st.results||[];
        var dl=await fetch('/api/download/'+jobId);
        var blob=await dl.blob();
        S.blobUrl=URL.createObjectURL(blob);
        log('ZIP ready ('+(blob.size/1024).toFixed(1)+' KB)','success');
        setTimeout(function(){goTo(4);renderResults()},800);
        return;
      }
      if(st.status==='error')throw new Error(st.error||'Failed');
    }
  }catch(err){
    log('Error: '+err.message,'error');
    if(fill)fill.style.background='var(--red)';
    if(lbl)lbl.textContent='Failed';
    if(pct)pct.textContent='\u2715';
    showToast(err.message,'err');
    setTimeout(function(){if(confirm('Failed. Return to setup?')){goTo(1);if(fill)fill.style.background=''}},2500);
  }
};

function renderMarkdownInline(md){
  return md
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/^\|(.+)\|$/gm,function(m){
      var cells=m.split('|').filter(function(c){return c.trim()!==''});
      if(cells.every(function(c){return /^[\s\-:]+$/.test(c)}))return '';
      return '<tr>'+cells.map(function(c){return '<td>'+c.trim()+'</td>'}).join('')+'</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g,function(m){return '<table>'+m+'</table>'})
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g,function(m){return '<ul>'+m+'</ul>'})
    .replace(/\n{2,}/g,'<br><br>')
    .replace(/\n/g,'<br>');
}

function setProg(p,text,lbl,fill,pct){if(fill)fill.style.width=p+'%';if(lbl)lbl.textContent=text;if(pct)pct.textContent=Math.round(p)+'%'}

/* ── RESULTS ─────────────────────────────────────────── */
function renderResults(){
  var list=document.getElementById('results-list');
  if(!list||!S.generatedFiles.length)return;
  list.innerHTML=S.generatedFiles.map(function(doc,i){
    var icon=CAT_ICONS[doc.category]||'\u{1F4C4}';
    var badge=doc.error?'<div class="dli-badge err">\u2715</div>':'<div class="dli-badge ok">\u2713</div>';
    return '<div class="doc-list-item'+(doc.error?' error':'')+'" onclick="previewDoc('+i+')"><div class="dli-icon">'+icon+'</div><div class="dli-info"><div class="dli-name">'+doc.docName+'</div><div class="dli-meta">'+doc.wordCount+' words'+(doc.usedProvider?' \u00b7 '+doc.usedProvider:'')+'</div></div>'+badge+'</div>';
  }).join('');
  S.previewIndex=null;
  document.querySelectorAll('.doc-list-item').forEach(function(el){el.classList.remove('active')});
  var tb=document.getElementById('preview-toolbar');if(tb)tb.style.display='none';
  var c=document.getElementById('pv-content');if(c)c.innerHTML='<div class="preview-empty"><div class="preview-empty-icon">&#128196;</div>Select a document to preview</div>';
}

window.restart=function(){if(S.blobUrl){URL.revokeObjectURL(S.blobUrl);S.blobUrl=null}S.generatedFiles=[];S.previewIndex=null;goTo(1)};
