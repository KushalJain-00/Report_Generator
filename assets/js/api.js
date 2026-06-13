// ── API ENGINE ────────────────────────────────────────────────────
function estimateTokens(text){ return Math.ceil((text||'').length / 4); }

async function callAI(doc, apiIndex=0, attempt=1, onChunk=null, previousContent="", isContinuation=false, signal=null, contextData="", degraded=false){
  if (!S.apiQueue || S.apiQueue.length === 0) {
    if (S.api && S.api.key) { S.apiQueue = [S.api]; } 
    else { throw new Error("No API profiles configured in settings."); }
  }
  
  if (apiIndex >= S.apiQueue.length) {
    throw new Error(`All fallback API profiles exhausted after ${apiIndex} failovers.`);
  }

  const apiConfig = S.apiQueue[apiIndex];
  const {provider:p, key} = apiConfig;
  let model = apiConfig.model;
  
  if (degraded && PROV[p] && PROV[p].fallbackModel) {
      model = PROV[p].fallbackModel;
  }
  
  const projectContext = {...S.project};
  if (projectContext.referenceText && Object.keys(S.generated).length >= 3) {
      if (!S.notifiedRefDrop) {
          showToast("Token Saver: Dropping heavy reference file for remaining docs to save API limits.", "warn");
          S.notifiedRefDrop = true;
      }
      projectContext.referenceText = "";
  }
  
  let prompt = buildPrompt(doc, projectContext, S.brand);
  if (contextData) {
    prompt += `\n\n--- PREVIOUS DOCUMENT CONTEXT ---\nTo maintain consistency across the entire report, here are summaries/snippets of previously generated documents in this package:\n${contextData}\nMake sure your new content aligns with these facts.`;
  }
  if (isContinuation) {
    prompt += `\n\n--- CONTINUATION INSTRUCTION ---\nThe following is what you have generated so far. You hit the maximum token limit. Continue generating EXACTLY where you left off. Do not include introductory text, do not repeat what is already written. Just continue the next sentence.\n\n[PREVIOUS CONTENT]\n${previousContent}`;
  }

  const promptTokensEst = estimateTokens(prompt);
  let cutOff = false;
  
  // AbortController logic for explicit timeout & user cancel
  const localController = new AbortController();
  const onAbort = () => localController.abort();
  if (signal) {
    if (signal.aborted) throw new Error('AbortError');
    signal.addEventListener('abort', onAbort);
  }
  
  let chunkTimeout;
  const resetTimeout = () => {
    clearTimeout(chunkTimeout);
    chunkTimeout = setTimeout(() => {
      localController.abort(new Error('TIMEOUT'));
    }, 45000);
  };
  
  try {
    resetTimeout();
    let url, headers, body;
    if(p==='anthropic'){
      url='https://api.anthropic.com/v1/messages';
      headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
      body=JSON.stringify({model,max_tokens:4096,messages:[{role:'user',content:prompt}],stream:true});
    }else if(['openai','openrouter','groq','deepseek'].includes(p)){
      url=p==='openai'?'https://api.openai.com/v1/chat/completions':(p==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':(p==='deepseek'?'https://api.deepseek.com/chat/completions':'https://api.groq.com/openai/v1/chat/completions'));
      headers={'Content-Type':'application/json','Authorization':`Bearer ${key}`};
      if(p==='openrouter') headers['HTTP-Referer']='https://rig-app.com';
      let bodyPayload = {max_tokens:4096,messages:[{role:'user',content:prompt}],stream:true,stream_options:{include_usage:true}};
      if (p==='openrouter' && model.includes(',')) {
        bodyPayload.models = model.split(',').map(m => m.trim());
      } else {
        bodyPayload.model = model;
      }
      body=JSON.stringify(bodyPayload);
    }else if(p==='gemini'){
      url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
      headers={'Content-Type':'application/json'};
      body=JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:4096}});
    }else throw new Error('Unknown provider');

    const r=await fetch(url,{method:'POST',headers,body,signal:localController.signal});
    if(!r.ok){
      if(r.status === 429) {
        const retryAfter = r.headers.get('retry-after');
        if(retryAfter) throw new Error(`RATE_LIMIT:${retryAfter}`);
      }
      const e=await r.json().catch(()=>({}));
      let msg=e.error?.message||`HTTP ${r.status}`;
      if(e.error?.metadata?.raw) msg+=`\nDetails: ${JSON.stringify(e.error.metadata.raw)}`;
      throw new Error(msg);
    }
    
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let tokIn = 0, tokOut = 0;
    
    while(true){
      resetTimeout();
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
            
            if(data.stop_reason === 'max_tokens' || data.message?.stop_reason === 'max_tokens') cutOff = true;
            if(data.choices?.[0]?.finish_reason === 'length') cutOff = true;
            if(data.candidates?.[0]?.finishReason === 'MAX_TOKENS') cutOff = true;

            if(p==='anthropic'){
              if(data.type==='content_block_delta') textDelta = data.delta?.text||'';
              if(data.type==='message_start' && data.message?.usage) tokIn = data.message.usage.input_tokens||0;
              if(data.type==='message_delta' && data.usage) tokOut = data.usage.output_tokens||0;
            } else if(['openai','openrouter','groq','deepseek'].includes(p)){
              textDelta = data.choices?.[0]?.delta?.content||'';
              if(data.usage){tokIn=data.usage.prompt_tokens||0;tokOut=data.usage.completion_tokens||0;}
            } else if(p==='gemini'){
              textDelta = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
              if(data.usageMetadata){tokIn=data.usageMetadata.promptTokenCount||0;tokOut=data.usageMetadata.candidatesTokenCount||0;}
            }
            if(textDelta){
              content += textDelta;
              if(onChunk) onChunk(previousContent + content, textDelta);
            }
          }catch(e){}
        }
      }
    }
    clearTimeout(chunkTimeout);
    if(signal) signal.removeEventListener('abort', onAbort);
    
    if(!tokIn) tokIn = promptTokensEst;
    if(!tokOut) tokOut = estimateTokens(content);
    S.tokenUsage.input += tokIn;
    S.tokenUsage.output += tokOut;
    S.tokenUsage.total = S.tokenUsage.input + S.tokenUsage.output;
    
    const fullContent = previousContent + content;
    
    if (cutOff) {
      console.warn(`[RIG] Token cut-off detected for ${doc.id}. Auto-continuing...`);
      if (document.getElementById('prog-cur')) document.getElementById('prog-cur').textContent=`Hit max tokens. Auto-continuing document...`;
      return await callAI(doc, apiIndex, 1, onChunk, fullContent, true, signal, contextData);
    }
    
    return fullContent;
  } catch(err) {
    clearTimeout(chunkTimeout);
    if(signal) signal.removeEventListener('abort', onAbort);
    
    const errStr = err.message.toLowerCase();
    
    // Check if user manually aborted
    if (err.name === 'AbortError' || errStr.includes('aborterror')) {
      throw err; // propagate up
    }

    const isAuthError = errStr.includes('401') || errStr.includes('403') || errStr.includes('invalid api key') || errStr.includes('unauthorized') || errStr.includes('api_key');
    const isBadRequest = errStr.includes('400') || errStr.includes('bad request');
    const failedName = `${PROV[p]?.name||p} / ${model}`;
    
    if (isAuthError || isBadRequest) {
      if (apiIndex + 1 < S.apiQueue.length) {
        const next = S.apiQueue[apiIndex + 1];
        showToast(`${failedName} failed (${isAuthError ? 'auth' : 'bad request'}). Falling back...`, 'err');
        return callAI(doc, apiIndex + 1, 1, onChunk, previousContent, isContinuation, signal, contextData);
      }
      return callAI(doc, apiIndex + 1, 1, onChunk, previousContent, isContinuation, signal, contextData);
    }
    
    let isRateLimit = err.message.startsWith('RATE_LIMIT:') || err.message.match(/try again in ([0-9.]+)s/i) || err.message.includes('429');
    let maxAttempts = isRateLimit ? 8 : 5; // Allow more retries for rate limits
    
    if (attempt < maxAttempts) {
      let waitTime = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      
      if (err.message.startsWith('RATE_LIMIT:')) {
        const ra = parseFloat(err.message.split(':')[1]);
        if (!isNaN(ra)) waitTime = (ra * 1000) + 1000;
      } else if (err.message.match(/try again in ([0-9.]+)s/i)) {
        const match = err.message.match(/try again in ([0-9.]+)s/i);
        const ra = parseFloat(match[1]);
        if (!isNaN(ra)) waitTime = (ra * 1000) + 1000;
      } else if (isRateLimit) {
        waitTime = Math.max(waitTime, 10000); // Minimum 10s wait for generic 429
      }
      
      const waitSec = Math.round(waitTime/1000);
      if(document.getElementById('prog-cur')) document.getElementById('prog-cur').textContent=`${failedName}: API Busy. Retrying in ${waitSec}s... (Attempt ${attempt}/${maxAttempts})`;
      
      try { await new Promise((res, rej) => {
        let t = setTimeout(res, waitTime);
        if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(new Error('AbortError')); });
      }); } catch(e) { throw e; }
      
      return callAI(doc, apiIndex, attempt+1, onChunk, previousContent, isContinuation, signal, contextData);
    }
    
    // --- EXHAUSTION LOGIC ---
    
    // 1. API Key Rotation (Same Provider, Same Model, Next Key)
    if (S.engine && S.engine.keyRotation) {
        let nextSameProvIdx = -1;
        for (let i = apiIndex + 1; i < S.apiQueue.length; i++) {
            if (S.apiQueue[i].provider === p && S.apiQueue[i].model === apiConfig.model) {
                nextSameProvIdx = i; break;
            }
        }
        if (nextSameProvIdx !== -1) {
            showToast(`Rotating ${p} API key...`, 'warn');
            return callAI(doc, nextSameProvIdx, 1, onChunk, previousContent, isContinuation, signal, contextData, degraded);
        }
    }
    
    // 2. Model Degradation (Same Provider, Lighter Model, First Key)
    if (S.engine && S.engine.degradeModels && !degraded) {
        const fallback = PROV[p]?.fallbackModel;
        if (fallback && fallback !== apiConfig.model) {
            showToast(`Rate limited. Degrading ${p} to lighter model (${fallback})...`, 'warn');
            
            // Find the FIRST key for this provider to start the rotation over with the lighter model
            let firstProvIdx = apiIndex;
            if (S.engine.keyRotation) {
                for (let i = 0; i <= apiIndex; i++) {
                    if (S.apiQueue[i].provider === p) { firstProvIdx = i; break; }
                }
            }
            return callAI(doc, firstProvIdx, 1, onChunk, previousContent, isContinuation, signal, contextData, true);
        }
    }
    
    // 3. Complete Fallback (Next Provider in Queue)
    if (apiIndex + 1 < S.apiQueue.length) {
      showToast(`${failedName} exhausted retries. Falling back to next provider...`, 'err');
    }
    return callAI(doc, apiIndex + 1, 1, onChunk, previousContent, isContinuation, signal, contextData, false);
  }
}
