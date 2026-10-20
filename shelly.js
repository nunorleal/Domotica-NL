/* Shelly Cloud status and user-initiated cover control. Secrets never appear in DOM messages or console. */
(function(){
 'use strict';
 const CORE=window.ShellyCore,KEY='casa-nl-shelly-cloud-v1',SESSION='casa-nl-shelly-session-v1',$=id=>document.getElementById(id);
 let config={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{}},key='',busy=false,generation=0,lastFetched=0;
 const readings=new Map(),targets=new Map(),sequences=new Map();let commandCount=0,groupBusy=false,stopping=false,pollTimer,pollUntil=0,pollFloor=0,lastMessage='',lastError=false;
 try{const saved=localStorage.getItem(KEY);if(saved)config=CORE.config(JSON.parse(saved));const session=JSON.parse(sessionStorage.getItem(SESSION)||'null');key=config.authKey||(session?.server===config.server?session.key:'')||''}catch{}
 const binding=id=>config.bindings[id]||null;
 const reading=id=>readings.get(id)||null;
 const stateName=s=>({open:'Aberto',closed:'Fechado',opening:'A abrir',closing:'A fechar',stop:'Parado',stopped:'Parado',close:'A fechar',calibrating:'A calibrar'})[s]||s||'Não disponível';
 function caption(id){const d=reading(id);if(!d)return 'Shelly Cloud · por consultar';if(d.error)return 'Shelly Cloud · consulta indisponível';if(d.missing)return 'ID não encontrado nesta conta · verifique o ID e o servidor';if(!d.online)return 'Shelly Cloud · offline (dados guardados)';if(!d.hasCover)return 'Canal de estore não encontrado';return `${stateName(d.state)}${d.position===null?' · posição desconhecida':''} · Cloud${Date.now()-lastFetched>120000?' · dados desatualizados':''}`}
 function feedback(text,error=false){lastMessage=text;lastError=error;$('shelly-feedback').textContent=text;$('shelly-feedback').classList.toggle('error',error);const p=document.querySelector('.shelly-room-feedback');if(p){p.textContent=text;p.classList.toggle('error',error)}}
 function fill(){
  $('shelly-server').value=config.server;$('shelly-key').value=key;$('shelly-remember').checked=config.rememberKey;
  $('shelly-mappings').innerHTML=CORE.ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=binding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-id-${id}">Device ID</label><input id="shelly-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><label for="shelly-channel-${id}">Canal</label><input id="shelly-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></fieldset>`}).join('');
 }
 function dirty(){if($('shelly-server').value.trim()!==config.server||$('shelly-key').value.trim()!==key||$('shelly-remember').checked!==config.rememberKey)return true;return CORE.ROOM_IDS.some(id=>$('shelly-id-'+id).value.trim().toLowerCase()!==(binding(id)?.deviceId||'')||Number($('shelly-channel-'+id).value)!==(binding(id)?.channel??0))}
 function reapply(){for(const id of CORE.ROOM_IDS){const r=rooms.find(r=>r.id===id);if(!binding(id))continue;stopMotion(id);const d=reading(id);r.blind=d?.online&&d.position!==null?d.position:0}}
 function metric(value,unit=''){return Number.isFinite(value)?`${value.toLocaleString('pt-PT',{maximumFractionDigits:2})}${unit}`:'Não disponível'}
 function card(id){const r=rooms.find(r=>r.id===id),d=reading(id),b=binding(id);if(!b)return '';const rows=d?[
  ['Ligação',d.missing?'ID não encontrado':d.online?'Online':'Offline'],['Modelo',[d.model,d.generation].filter(Boolean).join(' · ')||'Não disponível'],['Posição',metric(d.position,'%')],['Movimento',stateName(d.state)],['Calibrado',typeof d.calibrated!=='boolean'?'Não disponível':d.calibrated?'Sim':'Não'],['Potência',metric(d.power,' W')],['Energia acumulada',metric(d.energy,' Wh')],['Tensão',metric(d.voltage,' V')],['Corrente',metric(d.current,' A')],['Temperatura interna',metric(d.temperature,' °C')],['Erros',d.errors?.join(', ')||'Nenhum reportado']]:[];
  return `<section class="shelly-result"><h3>${escapeHTML(r.name)}</h3><p>${escapeHTML(b.deviceId)} · canal ${b.channel}</p><p>${escapeHTML(caption(id))}</p>${rows.length?`<dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>`:''}${d?.fetchedAt?`<small>Consultado às ${new Date(d.fetchedAt).toLocaleTimeString('pt-PT')}</small>`:''}</section>`;
 }
 function summary(){const n=Object.keys(config.bindings).length;$('shelly-summary').textContent=n?`${n} estore${n===1?'':'s'}`:'Por configurar';$('shelly-data').innerHTML=CORE.ROOM_IDS.map(card).join('');$('shelly-refresh').disabled=busy||commandCount>0||!n||!config.server||!key;for(const id of ['all-open','all-close'])$(id).disabled=mode==='blinds'&&(groupBusy||busy||commandCount>0)}
 function controlReady(id,position){return (position==='stop'||!dirty())&&!!key&&!!config.server&&CORE.canControl(reading(id),position)&&(!(busy||commandCount||groupBusy)||position==='stop')&&!(position==='stop'&&stopping)}
 function decorateRoom(r){
  if(!binding(r.id))return;const host=$('detail-card'),range=host.querySelector('#blind-range');if(range)range.disabled=!controlReady(r.id,50);
  host.querySelectorAll('[data-command]').forEach(b=>b.disabled=!controlReady(r.id,b.dataset.command==='pause'?'stop':b.dataset.command));
  const note=host.querySelector('.selected-device-note');if(note)note.textContent='Estore real Shelly Cloud. A iluminação continua em demonstração.';
  const section=document.createElement('div');section.className='shelly-room-info';const p=document.createElement('p');p.textContent=caption(r.id);
  const status=document.createElement('p');status.className='shelly-room-feedback'+(lastError?' error':'');status.setAttribute('role','status');status.textContent=lastMessage;
  if(reading(r.id)?.calibrated!==true){const hint=document.createElement('p');hint.textContent='A percentagem requer calibração confirmada pelo Shelly. Abrir, parar e fechar podem continuar disponíveis.';section.append(hint)}
  const b=document.createElement('button');b.className='secondary-action';b.textContent='Atualizar dados do estore';b.disabled=busy||commandCount>0;b.addEventListener('click',()=>refresh());section.append(p,status,b);host.append(section)
 }
 let transportStorage=null;try{transportStorage=sessionStorage}catch{}
 const transport=window.ShellyTransport.create({storage:transportStorage});
 function api(path,payload){
  const version=generation;
  return transport.request({server:config.server,authKey:key},path,payload,()=>version===generation);
 }
 function schedulePoll(){
  clearTimeout(pollTimer);if(Date.now()>=pollUntil)return;
  pollTimer=setTimeout(async()=>{if(busy||commandCount){schedulePoll();return}await refresh({quiet:true});
   const hadTargets=targets.size;for(const [id,target]of targets){const d=reading(id);if(!d||!d.online||d.error)continue;if(target==='stop'?!['opening','closing','calibrating'].includes(d.state):Number.isFinite(d.position)&&Math.abs(d.position-target)<=1)targets.delete(id)}
   if(hadTargets&&!targets.size)feedback('Posição e estado atualizados com a resposta do Shelly.');
   if(Date.now()<pollFloor||targets.size||[...readings.values()].some(d=>['opening','closing'].includes(d.state)))schedulePoll();
  },2000)
 }
 async function command(id,position){
  if(!binding(id))return;
  try{
   const payload=CORE.command(binding(id),position);if(!controlReady(id,position)){feedback('Atualize os dados. Confirme que o estore está online e, para percentagens, calibrado.',true);notify('Atualize os dados do estore antes de enviar o comando.');render();return}
   const version=generation,sequence=(sequences.get(id)||0)+1;sequences.set(id,sequence);commandCount++;if(position==='stop')stopping=true;feedback('A enviar o comando ao Shelly…');render();
   try{
    const result=await api('cover',payload);if(version!==generation||sequences.get(id)!==sequence)return;if(result.accepted!==true)throw Error('O comando não foi confirmado pelo servidor.');
    targets.set(id,position==='open'?100:position==='close'?0:position);pollUntil=Date.now()+90000;pollFloor=Date.now()+6000;
    feedback('Comando aceite pelo Cloud. A aguardar a posição reportada pelo estore.');notify('Comando enviado ao Shelly.');
   }catch(error){if(version!==generation)return;feedback(error.name==='AbortError'?'Comando sem confirmação. Atualize os dados para verificar a posição.':error.message,true);notify('Não foi possível confirmar o comando.');}
   finally{commandCount--;if(position==='stop')stopping=false;summary();render();schedulePoll()}
  }catch(error){feedback(error.message,true)}
 }
 function groupFeedback(text,error=false){$('all-status').textContent=text;$('all-status').hidden=mode!=='blinds';$('all-status').classList.toggle('error',error)}
 async function commandAll(position,demoCount=0){
  if(groupBusy||busy||commandCount)return;
  const version=generation,skipped=[],eligible={},tickets=new Map();let submitted=false;groupBusy=true;summary();
  try{
   if(!['open','close'].includes(position))throw Error('Comando conjunto inválido.');
   if(dirty()||!key||!config.server)throw Error('Guarde as credenciais antes de controlar os estores.');
   groupFeedback('A verificar os estores associados ao Cloud…');
   if(Object.keys(config.bindings).some(id=>!reading(id)?.fetchedAt||Date.now()-reading(id).fetchedAt>30000||reading(id).error))await refresh({quiet:true});
   if(version!==generation)return;
   for(const [id,b]of Object.entries(config.bindings)){const d=reading(id);if(CORE.canControl(d,position))eligible[id]=b;else skipped.push(rooms.find(r=>r.id===id).name+': '+(!d?.online?'offline ou por consultar':d.errors?.length?'erro no dispositivo':'dados indisponíveis'))}
   if(!Object.keys(eligible).length)throw Error('Nenhum estore Cloud disponível. '+skipped.join('; '));
   const payload=CORE.groupCommand(eligible,position);
   for(const id of Object.keys(eligible)){const seq=(sequences.get(id)||0)+1;sequences.set(id,seq);tickets.set(id,seq)}
   commandCount++;submitted=true;summary();render();groupFeedback('A enviar '+(position==='open'?'Abrir todos':'Fechar todos')+' para a Shelly Cloud…');
   const result=await api('covers',payload);if(version!==generation)return;
   if(!Array.isArray(result.accepted)||!result.failed||typeof result.failed!=='object')throw Error('O servidor não confirmou o resultado de cada estore.');
   const statuses=[],failed=[...skipped];let count=0;
   const reasons={DEVICE_OFFLINE:'offline',DEVICE_NOT_FOUND:'ID não encontrado',DEVICE_INVALID_CHANNEL:'canal inválido',DEVICE_INVALID_MODE:'modo inválido',DEVICE_UNSUPPORTED_COMMAND:'comando não suportado',DEVICE_FAILED_COMMAND:'comando recusado'};
   for(const [id,b]of Object.entries(eligible)){const k=b.deviceId+'_'+b.channel,name=rooms.find(r=>r.id===id).name;
    if(result.accepted.includes(k)){count++;statuses.push(name+': aceite');if(sequences.get(id)===tickets.get(id))targets.set(id,position==='open'?100:0)}
    else failed.push(name+': '+(reasons[result.failed[k]]||'sem confirmação'));
   }
   if(count){pollUntil=Date.now()+90000;pollFloor=Date.now()+6000}
   const report=[`${position==='open'?'Abrir todos':'Fechar todos'}: ${count} ${count===1?'estore':'estores'} Cloud com comando aceite.`,...statuses,failed.length?'Não enviados/recusados: '+failed.join('; '):'',demoCount?`${demoCount} ${demoCount===1?'estore':'estores'} sem associação em demonstração.`:''].filter(Boolean).join('\n');
   groupFeedback(report,failed.length>0);notify(count?'Comando conjunto enviado ao Shelly.':'Nenhum estore confirmou o comando.');
  }catch(error){if(version===generation){groupFeedback(error.name==='AbortError'?'Comando conjunto sem confirmação. Atualize os dados antes de tentar novamente.':error.message,true);notify('Verifique o resultado nos controlos gerais.')}}
  finally{if(submitted)commandCount--;groupBusy=false;summary();render();schedulePoll()}
 }
 async function refresh({quiet=false}={}){
  if(busy||commandCount)return;
  if(dirty()){feedback('Guarde a configuração antes de consultar os dados.',true);return}
  const ids=[...new Set(Object.values(config.bindings).map(b=>b.deviceId))];if(!ids.length||!key||!config.server){feedback('Guarde o servidor, a chave e pelo menos um ID.',true);return}
  busy=true;const version=generation;summary();if(!quiet)feedback('A consultar os dispositivos na Shelly Cloud…');
  try{
   const result=await api('status',{ids});if(!Array.isArray(result.devices))throw Error('Resposta inesperada do Cloud.');if(version!==generation)return;
   lastFetched=Date.now();for(const [id,b]of Object.entries(config.bindings)){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.status(device,b.channel);readings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasCover:false,position:null,state:null,calibrated:null,errors:[],fetchedAt:lastFetched})}
   reapply();if(!quiet||lastError)feedback('Dados atualizados com a posição reportada pelo Shelly.');
  }catch(e){if(version!==generation)return;for(const id of Object.keys(config.bindings)){const old=reading(id);readings.set(id,old?{...old,error:true}:{online:false,hasCover:false,position:null,errors:[],error:true})}feedback(e.name==='AbortError'?'A consulta demorou demasiado. Tente novamente.':e.message||'Consulta indisponível.',true)}
  finally{busy=false;summary();if(document.querySelector('#blind-range:active')){drawPlan();drawList();updateSummary()}else render()}
 }
 $('open-shelly').addEventListener('click',()=>{fill();summary();showPopup('shelly-dialog')});
 $('shelly-refresh').addEventListener('click',refresh);
 $('shelly-form').addEventListener('submit',e=>{
  e.preventDefault();
  try{
   const bindings={};for(const id of CORE.ROOM_IDS){const input=$('shelly-id-'+id).value.trim();if(input)bindings[id]={deviceId:CORE.deviceId(input),channel:Number($('shelly-channel-'+id).value)}}
   const newKey=$('shelly-key').value.trim(),rememberKey=$('shelly-remember').checked;
   const next=CORE.config({schemaVersion:1,server:$('shelly-server').value.trim(),authKey:newKey,rememberKey,bindings});
   if(Object.keys(bindings).length&&(!next.server||!newKey))throw Error('Indique o servidor e a chave para associar os estores.');
   const before=localStorage.getItem(KEY),beforeSession=sessionStorage.getItem(SESSION);
   try{localStorage.setItem(KEY,JSON.stringify(next));if(rememberKey)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,JSON.stringify({server:next.server,key:newKey}))}catch(error){if(before===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,before);if(beforeSession===null)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,beforeSession);throw Error('Não foi possível guardar a configuração neste navegador.')}
   generation++;clearTimeout(pollTimer);targets.clear();pollUntil=0;config=next;key=newKey;readings.clear();reapply();fill();summary();render();feedback('Configuração guardada. Use «Consultar dados» para verificar os IDs, canais e medições.');
  }catch(error){feedback(error.message,true)}
 });
 function ensureFresh(id){const d=reading(id);if(binding(id)&&(!d?.fetchedAt||Date.now()-d.fetchedAt>30000||d.error))refresh({quiet:true})}
 window.CasaShelly={binding,reading,roomCaption:caption,decorateRoom,reapply,refresh,command,commandAll,ensureFresh};
 fill();summary();reapply();render();
 if(key&&config.server&&Object.keys(config.bindings).length)refresh({quiet:true});
})();
