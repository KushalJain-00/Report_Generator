// ── API ENGINE ────────────────────────────────────────────────────
function estimateTokens(text){ return Math.ceil((text||'').length / 4); }

async function callAI(doc, apiIndex=0, attempt=1, onChunk=null, previousContent="", isContinuation=false){
  if (!S.apiQueue || S.apiQueue.length === 0) {
    // Fallback if queue is empty but single key exists
    if (S.api && S.api.key) {
      S.apiQueue = [S.api];
    } else {
      throw new Error("No API profiles configured in settings.");
    }
  }
  
  if (apiIndex >= S.apiQueue.length) {
    throw new Error(`All fallback API profiles exhausted after ${apiIndex} failovers.`);
  }

  const apiConfig = S.apiQueue[apiIndex];
  const {provider:p, key, model} = apiConfig;
  
  let prompt = buildPrompt(doc, S.project, S.brand);
  if (isContinuation) {
    prompt += `\n\n--- CONTINUATION INSTRUCTION ---\nThe following is what you have generated so far. You hit the maximum token limit. Continue generating EXACTLY where you left off. Do not include introductory text, do not repeat what is already written. Just continue the next sentence.\n\n[PREVIOUS CONTENT]\n${previousContent}`;
  }

  const promptTokensEst = estimateTokens(prompt);
  let cutOff = false;
  
  try {
    let url, headers, body;
    if(p==='anthropic'){
      url='https://api.anthropic.com/v1/messages';
      headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
      body=JSON.stringify({model,max_tokens:4096,messages:[{role:'user',content:prompt}],stream:true});
    }else if(['openai','openrouter','groq'].includes(p)){
      url=p==='openai'?'https://api.openai.com/v1/chat/completions':(p==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':'https://api.groq.com/openai/v1/chat/completions');
      headers={'Content-Type':'application/json','Authorization':`Bearer ${key}`};
      if(p==='openrouter') headers['HTTP-Referer']='https://rig-app.com';
      
      // Handle OpenRouter multiple fallback models
      let selectedModel = model;
      if (p==='openrouter' && model.includes(',')) {
        selectedModel = model.split(',').map(m => m.trim()); // Array for OpenRouter auto fallback
      }
      body=JSON.stringify({model:selectedModel,max_tokens:4096,messages:[{role:'user',content:prompt}],stream:true,stream_options:{include_usage:true}});
    }else if(p==='gemini'){
      url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
      headers={'Content-Type':'application/json'};
      body=JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:4096}});
    }else throw new Error('Unknown provider');

    const r=await fetch(url,{method:'POST',headers,body});
    if(!r.ok){
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
            
            // Detect token limits
            if(data.stop_reason === 'max_tokens' || data.message?.stop_reason === 'max_tokens') cutOff = true;
            if(data.choices?.[0]?.finish_reason === 'length') cutOff = true;
            if(data.candidates?.[0]?.finishReason === 'MAX_TOKENS') cutOff = true;

            // Extract token usage and text
            if(p==='anthropic'){
              if(data.type==='content_block_delta') textDelta = data.delta?.text||'';
              if(data.type==='message_start' && data.message?.usage) tokIn = data.message.usage.input_tokens||0;
              if(data.type==='message_delta' && data.usage) tokOut = data.usage.output_tokens||0;
            } else if(['openai','openrouter','groq'].includes(p)){
              textDelta = data.choices?.[0]?.delta?.content||'';
              if(data.usage){tokIn=data.usage.prompt_tokens||0;tokOut=data.usage.completion_tokens||0;}
            } else if(p==='gemini'){
              textDelta = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
              if(data.usageMetadata){tokIn=data.usageMetadata.promptTokenCount||0;tokOut=data.usageMetadata.candidatesTokenCount||0;}
            }
            if(textDelta){
              content += textDelta;
              if(onChunk) onChunk(previousContent + content);
            }
          }catch(e){}
        }
      }
    }
    // Fallback estimation
    if(!tokIn) tokIn = promptTokensEst;
    if(!tokOut) tokOut = estimateTokens(content);
    S.tokenUsage.input += tokIn;
    S.tokenUsage.output += tokOut;
    S.tokenUsage.total = S.tokenUsage.input + S.tokenUsage.output;
    
    const fullContent = previousContent + content;
    
    // Auto Continuation if cut off
    if (cutOff) {
      console.warn(`[RIG] Token cut-off detected for ${doc.id}. Auto-continuing...`);
      if (document.getElementById('prog-cur')) {
         document.getElementById('prog-cur').textContent=`Hit max tokens. Auto-continuing document...`;
      }
      return await callAI(doc, apiIndex, 1, onChunk, fullContent, true);
    }
    
    return fullContent;
  } catch(err) {
    const errStr = err.message.toLowerCase();
    const isAuthError = errStr.includes('401') || errStr.includes('403') || errStr.includes('invalid api key') || errStr.includes('unauthorized') || errStr.includes('api_key');
    
    const failedName = `${PROV[p]?.name||p} / ${model}`;
    
    // Auth error -> Immediate Failover
    if (isAuthError) {
      console.warn(`[RIG] Auth error on profile ${apiIndex}. Failing over to next profile.`);
      if (apiIndex + 1 < S.apiQueue.length) {
        const next = S.apiQueue[apiIndex + 1];
        const nextName = `${PROV[next.provider]?.name||next.provider} / ${next.model}`;
        showToast(`${failedName} failed (auth). Falling back to ${nextName}`, 'err');
        if(document.getElementById('prog-cur')) document.getElementById('prog-cur').textContent=`Auth error on ${failedName}. Switching to ${nextName}...`;
      }
      return callAI(doc, apiIndex + 1, 1, onChunk, previousContent, isContinuation);
    }
    
    // Transient error -> Retry
    if (attempt < 5) {
      const waitTime = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      const waitSec = Math.round(waitTime/1000);
      console.warn(`[RIG] API Error generating ${doc.id}: ${err.message}. Retrying in ${waitSec}s... (Attempt ${attempt}/5)`);
      if(document.getElementById('prog-cur')) document.getElementById('prog-cur').textContent=`${failedName}: Error. Retrying in ${waitSec}s... (Attempt ${attempt}/5)`;
      showToast(`${failedName}: ${err.message.substring(0,80)}. Retrying...`, 'err');
      await new Promise(r=>setTimeout(r, waitTime));
      return callAI(doc, apiIndex, attempt+1, onChunk, previousContent, isContinuation);
    }
    
    // All retries exhausted -> Failover
    console.warn(`[RIG] All retries exhausted on profile ${apiIndex}. Failing over to next profile.`);
    if (apiIndex + 1 < S.apiQueue.length) {
      const next = S.apiQueue[apiIndex + 1];
      const nextName = `${PROV[next.provider]?.name||next.provider} / ${next.model}`;
      showToast(`${failedName} exhausted retries. Falling back to ${nextName}`, 'err');
      if(document.getElementById('prog-cur')) document.getElementById('prog-cur').textContent=`All retries failed on ${failedName}. Switching to ${nextName}...`;
    } else {
      showToast(`All API profiles exhausted. ${failedName} was the last one.`, 'err');
    }
    return callAI(doc, apiIndex + 1, 1, onChunk, previousContent, isContinuation);
  }
}
