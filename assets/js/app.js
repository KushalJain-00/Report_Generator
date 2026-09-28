/* RIG frontend — vanilla JS, no build step. Catalog comes from GET /api/docs. */

let DOCS = [];

const PROVIDERS = {
  groq: { name: 'Groq', models: ['qwen/qwen3.8-27b', 'qwen/qwen3.6-27b', 'allam-2-7b', 'openai/gpt-oss-120b'], defaultModel: 'qwen/qwen3.8-27b', needsKey: true },
  ollama: { name: 'Ollama', models: ['llama3', 'llama3:8b', 'llama3:70b', 'qwen2.5:7b', 'qwen2.5:14b', 'mistral', 'phi3', 'gemma2'], defaultModel: 'llama3', needsKey: false, defaultUrl: 'http://localhost:11434' },
  openrouter: { name: 'OpenRouter', models: ['nvidia/nemotron-3-ultra-550b-a55b:free', 'qwen/qwen3-coder-480b-a35b:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'openai/gpt-oss-120b:free', 'google/gemma-4-31b-it:free', 'nvidia/nemotron-3-nano-30b-a3b:free', 'meta-llama/llama-3-8b-instruct:free'], defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free', needsKey: true },
  gemini: { name: 'Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-flash-latest'], defaultModel: 'gemini-2.5-flash', needsKey: true }
};

const S = { selected: new Set(), filter: 'all', blobUrl: null, provider: 'groq', generatedFiles: [], previewIndex: null };
const CAT_ICONS = { overview: '\u{1F4D6}', planning: '\u{1F4CB}', operations: '\u2699\uFE0F', data: '\u{1F4CA}', business: '\u{1F4BC}', marketing: '\u{1F4E3}' };
const DEFAULT_FALLBACK = ['openrouter', 'groq', 'gemini', 'ollama'];

const $ = (id) => document.getElementById(id);

/* ── SETTINGS ─────────────────────────────────────────── */
function loadSettings() {
  try { return JSON.parse(localStorage.getItem('rig_settings')) || null } catch (e) { return null }
}
function saveSettings(s) { localStorage.setItem('rig_settings', JSON.stringify(s)) }
function getSettings() {
  const saved = loadSettings();
  return saved || {
    fallbackOrder: DEFAULT_FALLBACK.slice(),
    enabled: { openrouter: true, groq: false, gemini: false, ollama: false },
    keys: { groq: [], gemini: [], openrouter: [] },
    models: {
      groq: PROVIDERS.groq.defaultModel,
      gemini: PROVIDERS.gemini.defaultModel,
      openrouter: PROVIDERS.openrouter.defaultModel,
      ollama: PROVIDERS.ollama.defaultModel
    },
    ollamaUrl: 'http://localhost:11434',
    watermark: { text: '', opacity: 0.15, fontSize: 48 }
  };
}
function parseKeys(text) {
  return text.split('\n').map((k) => k.trim()).filter((k) => k.length > 0);
}

/* ── DRAWER ───────────────────────────────────────────── */
function openDrawer() {
  const s = getSettings();
  $('s-ollama-url').value = s.ollamaUrl || 'http://localhost:11434';
  $('s-groq-keys').value = (s.keys.groq || []).join('\n');
  $('s-gemini-keys').value = (s.keys.gemini || []).join('\n');
  $('s-openrouter-keys').value = (s.keys.openrouter || []).join('\n');
  populateModelSelect('s-groq-model', 'groq', s.models.groq);
  populateModelSelect('s-gemini-model', 'gemini', s.models.gemini);
  populateModelSelect('s-openrouter-model', 'openrouter', s.models.openrouter);
  renderFallbackList(s.fallbackOrder, s.enabled);
  const wm = s.watermark || {};
  $('s-wm-text').value = wm.text || '';
  $('s-wm-opacity').value = wm.opacity || 0.15;
  $('s-wm-fontsize').value = wm.fontSize || 48;
  switchProvider(S.provider);
  $('settings-drawer').classList.add('open');
  $('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  $('settings-drawer').classList.remove('open');
  $('drawer-overlay').classList.remove('open');
}
function populateModelSelect(id, provider, selected) {
  const el = $(id);
  if (!el) return;
  const cfg = PROVIDERS[provider];
  el.innerHTML = cfg.models
    .map((m) => `<option value="${m}"${m === selected ? ' selected' : ''}>${m}</option>`)
    .join('');
}

/* ── FALLBACK DRAG-TO-REORDER ─────────────────────────── */
let dragItem = null;
function renderFallbackList(order, enabled) {
  const list = $('fallback-list');
  if (!list) return;
  list.innerHTML = order.map((p) => {
    const cfg = PROVIDERS[p];
    if (!cfg) return '';
    const isOn = enabled[p] !== false;
    return `<div class="fallback-item" draggable="true" data-prov="${p}">
      <span class="drag-handle">\u2630</span>
      <span class="fb-name">${cfg.name}</span>
      <label class="fb-toggle"><input type="checkbox" data-enable="${p}"${isOn ? ' checked' : ''}><span class="slider"></span></label>
    </div>`;
  }).join('');

  list.querySelectorAll('.fallback-item').forEach((el) => {
    el.addEventListener('dragstart', (e) => { dragItem = el; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move' });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); dragItem = null });
    el.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragItem && dragItem !== el) {
        const items = Array.from(list.children);
        const from = items.indexOf(dragItem), to = items.indexOf(el);
        if (from < to) list.insertBefore(dragItem, el.nextSibling);
        else list.insertBefore(dragItem, el);
      }
    });
  });
}
function getFallbackOrder() {
  const list = $('fallback-list');
  if (!list) return DEFAULT_FALLBACK.slice();
  return Array.from(list.querySelectorAll('.fallback-item')).map((el) => el.dataset.prov);
}
function getEnabled() {
  const en = {};
  document.querySelectorAll('[data-enable]').forEach((cb) => { en[cb.dataset.enable] = cb.checked });
  return en;
}

/* ── NAV ─────────────────────────────────────────────── */
function goTo(n) {
  ['view-form', 'view-docs', 'view-gen', 'view-done'].forEach((id, i) => $(id).classList.toggle('active', i === n - 1));
  document.querySelectorAll('.step').forEach((el) => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.remove('active', 'done');
    if (s === n) el.classList.add('active');
    else if (s < n) el.classList.add('done');
  });
  const h = $('hero');
  if (h) h.style.display = n === 1 ? '' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── PROVIDER ────────────────────────────────────────── */
const PROV_NOTES = {
  groq: '<strong>Groq</strong> \u2014 Ultra-fast inference. Free key at <a href="https://console.groq.com" target="_blank">console.groq.com</a>',
  ollama: '<strong>Ollama</strong> \u2014 100% local, zero cost. <a href="https://ollama.com" target="_blank">Install</a>, then <code>ollama pull llama3</code>.',
  openrouter: '<strong>OpenRouter</strong> \u2014 Multiple models. Free tier at <a href="https://openrouter.ai" target="_blank">openrouter.ai</a>',
  gemini: '<strong>Gemini</strong> \u2014 Google free tier. Key at <a href="https://aistudio.google.com/apikey" target="_blank">AI Studio</a>'
};
function switchProvider(provider) {
  S.provider = provider;
  document.querySelectorAll('#drawer-providers .prov-tab').forEach((t) => t.classList.remove('active'));
  const active = document.querySelector(`#drawer-providers .prov-tab[data-provider="${provider}"]`);
  if (active) active.classList.add('active');
  const ne = $('prov-note');
  if (ne) ne.innerHTML = PROV_NOTES[provider] || '';
  updateProvStatus(provider);
}
function updateProvStatus(provider) {
  const el = $('prov-status');
  if (!el) return;
  const cfg = PROVIDERS[provider];
  const s = getSettings();
  if (!cfg.needsKey) {
    el.className = 'prov-status local';
    el.textContent = 'No API key needed \u2014 runs locally via Ollama';
    return;
  }
  const keys = s.keys[provider] || [];
  if (keys.length > 0) {
    el.className = 'prov-status configured';
    el.textContent = `${keys.length} key${keys.length > 1 ? 's' : ''} configured`;
  } else {
    el.className = 'prov-status missing';
    el.textContent = 'No API key configured';
  }
}

/* ── DOC GRID ────────────────────────────────────────── */
function renderDocGrid() {
  const filtered = S.filter === 'all' ? DOCS : DOCS.filter((d) => d.cat === S.filter);
  const g = $('doc-grid');
  if (!g) return;
  g.innerHTML = filtered.map((d) => `<div class="doc-card${S.selected.has(d.id) ? ' sel' : ''}" data-id="${d.id}" title="${d.tip}"><div class="dc-check">\u2713</div><div class="dc-icon">${d.icon}</div><div class="dc-name">${d.name}</div><div class="dc-cat">${d.cat}</div></div>`).join('');
  updateSelCount();
}
function toggleDoc(id, el) {
  S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
  if (el) el.classList.toggle('sel', S.selected.has(id));
  updateSelCount();
}
function filterDocs(el, cat) {
  S.filter = cat;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
  renderDocGrid();
}
function selAll(v) {
  DOCS.forEach((d) => { v ? S.selected.add(d.id) : S.selected.delete(d.id) });
  renderDocGrid();
}
function updateSelCount() {
  const e = $('sel-count');
  if (e) e.textContent = `${S.selected.size} selected`;
}

/* ── TOAST ───────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type) {
  clearTimeout(toastTimer);
  const t = $('toast');
  if (!t) return;
  t.className = `toast ${type || 'ok'}`;
  $('t-icon').innerHTML = type === 'err' ? '&#10005;' : '&#10003;';
  $('t-msg').textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ── LOG ─────────────────────────────────────────────── */
function log(msg, type, time) {
  const p = $('status-ticker');
  if (!p) return;
  p.querySelectorAll('.log-line').forEach((l) => l.classList.remove('active'));
  const d = document.createElement('div');
  d.className = `log-line ${type || 'active'}`;
  const ts = time || (() => {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
  })();
  d.innerHTML = `<span class="log-time">${ts}</span>${msg}`;
  p.appendChild(d);
  p.scrollTop = p.scrollHeight;
}

/* ── PREVIEW / RESULTS ───────────────────────────────── */
function previewDoc(i) {
  S.previewIndex = i;
  const doc = S.generatedFiles[i];
  if (!doc) return;
  document.querySelectorAll('.doc-list-item').forEach((el, j) => el.classList.toggle('active', j === i));
  const tb = $('preview-toolbar'), tt = $('pv-title'), ct = $('pv-content');
  if (tb) tb.style.display = '';
  if (tt) tt.textContent = `${doc.docName} \u2014 ${doc.wordCount} words`;
  if (ct) {
    if (doc.error) ct.innerHTML = `<div class="preview-empty" style="color:var(--red)"><div class="preview-empty-icon">\u2715</div>${doc.errorMessage || 'Generation failed'}</div>`;
    else if (doc.html) ct.innerHTML = doc.html;
    else {
      const e = document.createElement('div');
      e.textContent = doc.markdown || 'No content';
      ct.innerHTML = `<pre style="white-space:pre-wrap">${e.innerHTML}</pre>`;
    }
  }
}
function copyMarkdown() {
  const d = S.generatedFiles[S.previewIndex];
  if (!d) return;
  navigator.clipboard.writeText(d.markdown || '').then(() => showToast('Markdown copied'));
}
function openInNewTab() {
  const d = S.generatedFiles[S.previewIndex];
  if (!d || !d.html) return;
  const w = window.open('', '_blank');
  w.document.write(d.html);
  w.document.close();
}
function renderResults() {
  const list = $('results-list');
  if (!list || !S.generatedFiles.length) return;
  list.innerHTML = S.generatedFiles.map((doc, i) => {
    const icon = CAT_ICONS[doc.category] || '\u{1F4C4}';
    const badge = doc.error ? '<div class="dli-badge err">\u2715</div>' : '<div class="dli-badge ok">\u2713</div>';
    return `<div class="doc-list-item${doc.error ? ' error' : ''}" data-index="${i}"><div class="dli-icon">${icon}</div><div class="dli-info"><div class="dli-name">${doc.docName}</div><div class="dli-meta">${doc.wordCount} words${doc.usedProvider ? ' \u00b7 ' + doc.usedProvider : ''}</div></div>${badge}</div>`;
  }).join('');
  S.previewIndex = null;
  document.querySelectorAll('.doc-list-item').forEach((el) => el.classList.remove('active'));
  const tb = $('preview-toolbar');
  if (tb) tb.style.display = 'none';
  const c = $('pv-content');
  if (c) c.innerHTML = '<div class="preview-empty"><div class="preview-empty-icon">&#128196;</div>Select a document to preview</div>';
}
function restart() {
  if (S.blobUrl) { URL.revokeObjectURL(S.blobUrl); S.blobUrl = null }
  S.generatedFiles = [];
  S.previewIndex = null;
  goTo(1);
}

/* ── GENERATION ──────────────────────────────────────── */
function renderMarkdownInline(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\|(.+)\|$/gm, (m) => {
      const cells = m.split('|').filter((c) => c.trim() !== '');
      if (cells.every((c) => /^[\s\-:]+$/.test(c))) return '';
      return '<tr>' + cells.map((c) => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, (m) => `<table>${m}</table>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function setProg(p, text, lbl, fill, pct) {
  if (fill) fill.style.width = `${p}%`;
  if (lbl) lbl.textContent = text;
  if (pct) pct.textContent = `${Math.round(p)}%`;
}

async function startGeneration() {
  if (S.selected.size === 0) { showToast('Select at least one document', 'err'); return }
  const s = getSettings();
  const payload = {
    provider: S.provider,
    ollamaUrl: s.ollamaUrl || 'http://localhost:11434',
    ollamaModel: s.models.ollama || 'llama3',
    groqKeys: s.keys.groq || [],
    groqModel: s.models.groq || PROVIDERS.groq.defaultModel,
    openrouterKeys: s.keys.openrouter || [],
    openrouterModel: s.models.openrouter || PROVIDERS.openrouter.defaultModel,
    geminiKeys: s.keys.gemini || [],
    geminiModel: s.models.gemini || PROVIDERS.gemini.defaultModel,
    fallbackOrder: s.fallbackOrder || DEFAULT_FALLBACK,
    enabled: s.enabled || {},
    watermark: s.watermark || {},
    metadata: {
      name: $('f-name').value.trim(),
      sector: $('f-sector').value.trim(),
      geo: $('f-geo').value.trim(),
      client: $('f-client').value.trim(),
      audience: $('f-audience').value.trim(),
      desc: $('f-desc').value.trim(),
      standards: $('f-standards').value.trim(),
      price: $('f-price').value.trim(),
      duration: $('f-duration').value.trim(),
      lang: $('f-lang').value.trim()
    },
    documents: DOCS.filter((d) => S.selected.has(d.id))
  };

  goTo(3);
  const panel = $('status-ticker');
  if (panel) panel.innerHTML = '';
  const fill = $('prog-fill'), lbl = $('prog-lbl'), pct = $('prog-pct');
  const lp = $('live-preview'), lpName = $('live-doc-name');
  let seenLogs = 0;

  try {
    setProg(2, 'Starting...', lbl, fill, pct);

    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`Start failed: ${resp.status}`);
    const jobId = (await resp.json()).jobId;

    while (true) {
      await new Promise((r) => setTimeout(r, 1000));
      const sr = await fetch('/api/status/' + jobId);
      if (!sr.ok) throw new Error('Lost connection');
      const st = await sr.json();

      if (st.logs && st.logs.length > seenLogs) {
        for (let i = seenLogs; i < st.logs.length; i++) {
          const entry = st.logs[i];
          log(entry.message, entry.type === 'error' ? 'error' : entry.type === 'success' ? 'success' : 'active', entry.time);
        }
        seenLogs = st.logs.length;
      }

      if (st.currentDocName && lpName) lpName.textContent = 'Generating: ' + st.currentDocName;
      else if (lpName) lpName.textContent = '';

      if (st.currentContent && lp) {
        lp.innerHTML = renderMarkdownInline(st.currentContent);
        lp.scrollTop = lp.scrollHeight;
      } else if (lp && st.currentDocName) {
        lp.innerHTML = '<div class="preview-empty" style="padding:20px;color:var(--text3)">Streaming content...</div>';
      }

      if (st.total > 0) {
        const p = Math.round((st.current / st.total) * 90) + 5;
        setProg(p, `${st.current}/${st.total} documents`, lbl, fill, pct);
      }

      if (st.status === 'done') {
        setProg(100, 'Complete', lbl, fill, pct);
        S.generatedFiles = st.results || [];
        const dl = await fetch('/api/download/' + jobId);
        const blob = await dl.blob();
        S.blobUrl = URL.createObjectURL(blob);
        log(`ZIP ready (${(blob.size / 1024).toFixed(1)} KB)`, 'success');
        setTimeout(() => { goTo(4); renderResults() }, 800);
        return;
      }
      if (st.status === 'error') throw new Error(st.error || 'Failed');
    }
  } catch (err) {
    log('Error: ' + err.message, 'error');
    if (fill) fill.style.background = 'var(--red)';
    if (lbl) lbl.textContent = 'Failed';
    if (pct) pct.textContent = '\u2715';
    showToast(err.message, 'err');
    setTimeout(() => {
      if (confirm('Failed. Return to setup?')) { goTo(1); if (fill) fill.style.background = '' }
    }, 2500);
  }
}

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/docs');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DOCS = await res.json();
    if (!Array.isArray(DOCS) || DOCS.length === 0) throw new Error('empty catalog');
  } catch (e) {
    DOCS = [];
    showToast('Failed to load document catalog', 'err');
  }
  S.selected = new Set(DOCS.map((d) => d.id));
  renderDocGrid();

  const s = getSettings();
  const initProv = s.fallbackOrder && s.fallbackOrder.length ? s.fallbackOrder[0] : 'openrouter';
  switchProvider(initProv);
  updateProvStatus(initProv);

  $('btn-settings').addEventListener('click', openDrawer);
  $('drawer-close').addEventListener('click', closeDrawer);
  $('drawer-overlay').addEventListener('click', closeDrawer);

  $('drawer-save').addEventListener('click', () => {
    saveSettings({
      fallbackOrder: getFallbackOrder(),
      enabled: getEnabled(),
      keys: {
        groq: parseKeys($('s-groq-keys').value),
        gemini: parseKeys($('s-gemini-keys').value),
        openrouter: parseKeys($('s-openrouter-keys').value)
      },
      models: {
        groq: $('s-groq-model').value,
        gemini: $('s-gemini-model').value,
        openrouter: $('s-openrouter-model').value,
        ollama: PROVIDERS.ollama.defaultModel
      },
      ollamaUrl: $('s-ollama-url').value.trim(),
      watermark: {
        text: $('s-wm-text').value.trim(),
        opacity: parseFloat($('s-wm-opacity').value) || 0.15,
        fontSize: parseInt($('s-wm-fontsize').value, 10) || 48
      }
    });
    closeDrawer();
    updateProvStatus(S.provider);
    showToast('Settings saved');
  });

  $('btn-to-docs').addEventListener('click', () => {
    if (!$('f-name').value.trim()) { showToast('Enter a Project/Service Name', 'err'); return }
    const st = getSettings();
    const cfg = PROVIDERS[S.provider];
    if (cfg.needsKey) {
      const keys = st.keys[S.provider];
      if (!keys || keys.length === 0) { showToast('Add API key in Settings for ' + cfg.name, 'err'); return }
    }
    goTo(2);
  });

  $('btn-back').addEventListener('click', () => goTo(1));
  $('btn-generate').addEventListener('click', startGeneration);
  $('btn-restart').addEventListener('click', restart);
  $('btn-copy-md').addEventListener('click', copyMarkdown);
  $('btn-open-html').addEventListener('click', openInNewTab);

  $('btn-download-result').addEventListener('click', () => {
    if (!S.blobUrl) return;
    const a = document.createElement('a');
    a.href = S.blobUrl;
    a.download = 'RIG_' + ($('f-name').value.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'package') + '.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => filterDocs(c, c.dataset.cat)));
  $('btn-sel-all').addEventListener('click', () => selAll(true));
  $('btn-sel-none').addEventListener('click', () => selAll(false));
  document.querySelectorAll('#drawer-providers .prov-tab').forEach((t) => t.addEventListener('click', () => switchProvider(t.dataset.provider)));

  $('doc-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.doc-card');
    if (card) toggleDoc(card.dataset.id, card);
  });
  $('results-list').addEventListener('click', (e) => {
    const item = e.target.closest('.doc-list-item');
    if (item) previewDoc(Number(item.dataset.index));
  });
});
