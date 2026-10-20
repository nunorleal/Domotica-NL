/* Shelly Cloud status and user-initiated cover control. Secrets never appear in DOM messages or console. */
(function(){
 'use strict';
 const CORE=window.ShellyCore,KEY='casa-nl-shelly-cloud-v1',SESSION='casa-nl-shelly-session-v1',$=id=>document.getElementById(id);
 let config={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{},lightBindings:{}},key='',busy=false,generation=0,lastFetched=0;
 const resultOpen=new Map();
 const sensorReadings=new Map();
 const sensorBinding=id=>config.sensorBindings?.[id]||null;
 const sensorReading=id=>sensorReadings.get(id)||null;
 const lightReadings=new Map(),lightTargets=new Map(),lightMessages=new Map();let lightGroupBusy=false;
 const readings=new Map(),targets=new Map(),sequences=new Map();let commandCount=0,groupBusy=false,stopping=false,pollTimer,pollUntil=0,pollFloor=0,lastMessage='',lastError=false;
 try{const saved=localStorage.getItem(KEY);if(saved)config=CORE.config(JSON.parse(saved));const session=JSON.parse(sessionStorage.getItem(SESSION)||'null');key=config.authKey||(session?.server===config.server?session.key:'')||''}catch{}
 const binding=id=>config.bindings[id]||null;
 const lightBinding=id=>config.lightBindings?.[id]||null;
 const lightReading=id=>lightReadings.get(id)||null;
 const reading=id=>readings.get(id)||null;
 const stateName=s=>({open:'Aberto',closed:'Fechado',opening:'A abrir',closing:'A fechar',stop:'Parado',stopped:'Parado',close:'A fechar',calibrating:'A calibrar'})[s]||s||'Não disponível';
 function caption(id){const d=reading(id);if(!d)return 'Shelly Cloud · por consultar';if(d.error)return 'Shelly Cloud · consulta indisponível';if(d.missing)return 'ID não encontrado nesta conta · verifique o ID e o servidor';if(!d.online)return 'Shelly Cloud · offline (dados guardados)';if(!d.hasCover)return 'Canal de estore não encontrado';return `${stateName(d.state)}${d.position===null?' · posição desconhecida':''} · Cloud${Date.now()-lastFetched>120000?' · dados desatualizados':''}`}
 function feedback(text,error=false){lastMessage=text;lastError=error;$('shelly-feedback').textContent=text;$('shelly-feedback').classList.toggle('error',error);const p=document.querySelector('.shelly-room-feedback');if(p){p.textContent=text;p.classList.toggle('error',error)}}
 function fill(){
  $('shelly-server').value=config.server;$('shelly-key').value=key;$('shelly-remember').checked=config.rememberKey;
  $('shelly-mappings').innerHTML=CORE.ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=binding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-id-${id}">Device ID</label><input id="shelly-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><label for="shelly-channel-${id}">Canal</label><input id="shelly-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></fieldset>`}).join('');
  const lampNames={master:'Abajur com flores',bedroom2:'Candeeiro preto',living:'Candeeiro de pé cromado'};
  $('shelly-light-mappings').innerHTML=CORE.LIGHT_ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=lightBinding(id);return `<fieldset class="shelly-mapping shelly-light-mapping"><legend>${escapeHTML(r.name)}</legend><p class="settings-explanation">${lampNames[id]}</p><label for="shelly-light-id-${id}">Device ID do candeeiro</label><input id="shelly-light-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><div class="shelly-light-options"><div><label for="shelly-light-channel-${id}">Canal da luz</label><input id="shelly-light-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></div><div><label for="shelly-light-type-${id}">Tipo preferido</label><select id="shelly-light-type-${id}"><option value="switch"${b?.type!=='light'?' selected':''}>switch · Relé / tomada</option><option value="light"${b?.type==='light'?' selected':''}>light · Luz / dimmer</option></select></div></div><p class="settings-explanation light-mapping-state">${b?'Associação guardada':'Sem associação'}</p></fieldset>`}).join('');

  $('shelly-sensor-mappings').innerHTML=CORE.SENSOR_ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=sensorBinding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-sensor-id-${id}">Device ID do sensor</label><input id="shelly-sensor-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><details class="shelly-help"><summary>Componentes do sensor (avançado)</summary><p class="settings-explanation">Nos H&amp;T habituais ambos são 0. Altere apenas se o dispositivo usar outros IDs de componente.</p><div class="shelly-light-options"><div><label for="shelly-sensor-temperature-${id}">Temperatura</label><input id="shelly-sensor-temperature-${id}" type="number" min="0" max="255" step="1" value="${b?.temperatureChannel??0}"></div><div><label for="shelly-sensor-humidity-${id}">Humidade</label><input id="shelly-sensor-humidity-${id}" type="number" min="0" max="255" step="1" value="${b?.humidityChannel??0}"></div></div></details><p class="settings-explanation light-mapping-state">${b?'Sensor associado':'Sem associação'}</p></fieldset>`}).join('');

 }
 function dirty(){if($('shelly-server').value.trim()!==config.server||$('shelly-key').value.trim()!==key||$('shelly-remember').checked!==config.rememberKey)return true;return CORE.SENSOR_ROOM_IDS.some(id=>$('shelly-sensor-id-'+id).value.trim().toLowerCase()!==(sensorBinding(id)?.deviceId||'')||Number($('shelly-sensor-temperature-'+id).value)!==(sensorBinding(id)?.temperatureChannel??0)||Number($('shelly-sensor-humidity-'+id).value)!==(sensorBinding(id)?.humidityChannel??0))||CORE.LIGHT_ROOM_IDS.some(id=>$('shelly-light-id-'+id).value.trim().toLowerCase()!==(lightBinding(id)?.deviceId||'')||Number($('shelly-light-channel-'+id).value)!==(lightBinding(id)?.channel??0)||$('shelly-light-type-'+id).value!==(lightBinding(id)?.type||'switch'))||CORE.ROOM_IDS.some(id=>$('shelly-id-'+id).value.trim().toLowerCase()!==(binding(id)?.deviceId||'')||Number($('shelly-channel-'+id).value)!==(binding(id)?.channel??0))}
 function reapply(){for(const id of CORE.ROOM_IDS){const r=rooms.find(r=>r.id===id);if(!binding(id))continue;stopMotion(id);const d=reading(id);r.blind=d?.online&&d.position!==null?d.position:0}for(const id of CORE.LIGHT_ROOM_IDS){if(!lightBinding(id))continue;const r=rooms.find(r=>r.id===id),d=lightReading(id);r.light=typeof d?.on==='boolean'?d.on:false}}
 function lightCaption(id){
  const d=lightReading(id);
  if(!d)return 'Candeeiro Shelly Cloud · por consultar';
  if(d.missing)return 'Candeeiro: ID não encontrado nesta conta';
  if(d.error)return 'Candeeiro: consulta indisponível · estado por confirmar';
  if(!d.online)return 'Candeeiro offline · último estado conhecido';
  if(!d.hasOutput){const b=lightBinding(id);return `Saída ${b.type}:${b.channel} não encontrada · ${d.availableOutputs?.length?'disponíveis: '+d.availableOutputs.join(', '):'o dispositivo não reportou saídas de luz/relé; confirme o Device ID'}`}
  if(typeof d.on!=='boolean')return 'Candeeiro: estado desconhecido';
  if(d.errors?.length)return 'Candeeiro: erro reportado pelo Shelly';
  return `Candeeiro ${d.on?'ligado':'desligado'} · Cloud${d.detected?' · '+d.resolvedType+':'+lightBinding(id).channel+' detetada':''}${Date.now()-d.fetchedAt>120000?' · dados desatualizados':''}`;
 }
 function lightValue(id){const d=lightReading(id);return d?.online&&!d.error&&typeof d.on==='boolean'?(d.on?'Ligada':'Desligada'):'Por confirmar'}
 function decorateLight(r){
  if(!lightBinding(r.id))return;
  const host=$('detail-card'),control=$('light-toggle'),section=host.querySelector('.light-control');
  control.disabled=busy||commandCount>0||lightGroupBusy||groupBusy||dirty()||!key||!config.server||!CORE.canLightControl(lightReading(r.id));
  control.setAttribute('aria-label',`Iluminação real de ${r.name}`);
  const caption=host.querySelector('.room-light-caption');caption.textContent=lightCaption(r.id);
  const p=document.createElement('p');p.className='shelly-light-feedback';p.setAttribute('role','status');p.textContent=lightMessages.get(r.id)||'';section.append(p);
  const b=document.createElement('button');b.className='secondary-action';b.textContent='Atualizar dados do candeeiro';b.disabled=busy||commandCount>0||lightGroupBusy;b.addEventListener('click',()=>refresh());section.append(b);
  const note=host.querySelector('.selected-device-note');note.textContent='Candeeiro real Shelly Cloud'+(binding(r.id)?' · estore real Shelly Cloud.':'. Estore sem associação em simulação.');
 }
 async function commandLight(id,on){
  if(!lightBinding(id)||busy||commandCount||groupBusy||lightGroupBusy)return;
  if(dirty()||!key||!config.server||!CORE.canLightControl(lightReading(id))){lightMessages.set(id,'Atualize os dados e confirme o tipo de saída, canal e ligação Cloud.');render();return}
  const version=generation,payload=CORE.resolvedLightCommand(lightBinding(id),lightReading(id),on);commandCount++;lightMessages.set(id,'A enviar o comando ao candeeiro…');summary();render();
  try{
   const result=await api('light',payload);if(version!==generation)return;if(!result.accepted)throw Error('O Cloud não confirmou o comando.');
   lightTargets.set(id,on);pollUntil=Date.now()+90000;pollFloor=Date.now()+6000;lightMessages.set(id,'Comando aceite. A aguardar o estado reportado pelo candeeiro.');
  }catch(error){if(version===generation){lightMessages.set(id,error.message);notify('Não foi possível confirmar o comando do candeeiro.')}}
  finally{commandCount--;if(version===generation){summary();render();await refresh({quiet:true});settleLights();render();schedulePoll()}}
 }
 function settleLights(){for(const [id,on]of lightTargets){const d=lightReading(id);if(d?.online&&!d.error&&d.on===on){lightTargets.delete(id);lightMessages.set(id,`Candeeiro ${on?'ligado':'desligado'} · estado confirmado pelo Shelly.`)}}}
 function lightGroupFeedback(text,error=false){const p=$('all-light-status');p.textContent=text;p.hidden=mode!=='lights';p.classList.toggle('error',error)}
 async function commandAllLights(on,demoCount=0){
  if(busy||commandCount||groupBusy||lightGroupBusy)return;
  const version=generation,report=[];let accepted=0,failed=0;lightGroupBusy=true;summary();
  try{
   if(dirty()||!key||!config.server)throw Error('Guarde as credenciais antes de controlar os candeeiros.');
   lightGroupFeedback('A verificar os candeeiros Cloud…');
   if(Object.keys(config.lightBindings||{}).some(id=>!CORE.canLightControl(lightReading(id))||Date.now()-lightReading(id).fetchedAt>30000))await refresh({quiet:true});
   if(version!==generation)return;
   commandCount++;summary();render();
   try{for(const [id,b]of Object.entries(config.lightBindings||{})){
    const name=rooms.find(r=>r.id===id).name;
    if(!CORE.canLightControl(lightReading(id))){failed++;report.push(name+': '+lightCaption(id));continue}
    try{const result=await api('light',CORE.resolvedLightCommand(b,lightReading(id),on));if(version!==generation)return;if(!result.accepted)throw Error('Sem confirmação');accepted++;lightTargets.set(id,on);lightMessages.set(id,'Comando aceite. A aguardar o estado reportado.');report.push(name+': comando aceite')}
    catch(error){if(version!==generation)return;failed++;lightMessages.set(id,error.message);report.push(name+': '+error.message)}
   }}finally{commandCount--}
   if(accepted){pollUntil=Date.now()+90000;pollFloor=Date.now()+6000}
   lightGroupFeedback([`${on?'Ligar':'Apagar'}: ${accepted} ${accepted===1?'candeeiro':'candeeiros'} Cloud com comando aceite.`,...report,demoCount?`${demoCount} ${demoCount===1?'luz':'luzes'} sem associação em simulação.`:''].filter(Boolean).join('\n'),failed>0);
  }catch(error){if(version===generation)lightGroupFeedback(error.message,true)}
  finally{lightGroupBusy=false;summary();if(version===generation){await refresh({quiet:true});settleLights();render();schedulePoll()}}
 }
 function sensorCaption(id){
  const d=sensorReading(id);if(!d)return 'Sensor Shelly Cloud · por consultar';
  if(d.missing)return 'Sensor não encontrado · confirme o Device ID';
  if(d.error)return 'Consulta indisponível · últimas leituras recebidas';
  if(!d.online)return 'Offline ou em repouso · última leitura disponível na Cloud';
  if(!d.hasSensor)return 'Temperatura e humidade não encontradas · confirme os componentes';
  if(d.temperature===null&&d.humidity===null)return 'Sensor sem leituras válidas';
  return 'Leituras reportadas pela Shelly Cloud';
 }
 function sensorMarkup(id){
  const d=sensorReading(id),value=(v,unit)=>Number.isFinite(v)?v.toLocaleString('pt-PT',{maximumFractionDigits:1})+unit:'—';
  return `<div class="sensor-metrics"><div><span>Temperatura</span><strong data-sensor-temperature>${value(d?.temperature,' °C')}</strong></div><div><span>Humidade</span><strong data-sensor-humidity>${value(d?.humidity,' %')}</strong></div></div><p class="sensor-caption">${escapeHTML(sensorCaption(id))}</p>${d?.battery!==null&&d?.battery!==undefined?`<p class="sensor-caption">Bateria: ${value(d.battery,' %')}</p>`:''}${d?.fetchedAt?`<small class="sensor-caption">Consultado na Cloud: ${new Date(d.fetchedAt).toLocaleString('pt-PT')}. A hora da medição pode ser anterior.</small>`:''}`;
 }
 function resultCard(id,type,body){
  const key=type+'-'+id,name=rooms.find(r=>r.id===id).name;
  return `<details class="shelly-result shelly-equipment-group" data-shelly-result="${key}"${resultOpen.get(key)?' open':''}><summary><span>${escapeHTML(name)}<small>${type==='cover'?'Estore':type==='light'?'Candeeiro':'Temperatura e humidade'}</small></span></summary><div class="shelly-result-content">${body}</div></details>`;
 }
 function sensorCard(id){return sensorBinding(id)?resultCard(id,'sensor',sensorMarkup(id)):''}
 function decorateSensor(r){
  if(!sensorBinding(r.id))return;
  const host=$('detail-card'),section=document.createElement('section');section.className='detail-divider sensor-room-info';section.setAttribute('aria-label','Temperatura e humidade de '+r.name);section.innerHTML='<h3>Temperatura e humidade</h3>'+sensorMarkup(r.id);
  const b=document.createElement('button');b.className='secondary-action';b.textContent='Atualizar sensor';b.disabled=busy||commandCount>0||lightGroupBusy;b.addEventListener('click',()=>refresh());section.append(b);host.querySelector('.light-control').before(section);const note=host.querySelector('.selected-device-note');if(note)note.textContent='Sensor real Shelly Cloud. Os equipamentos sem associação continuam em simulação.';
 }
 function metric(value,unit=''){return Number.isFinite(value)?`${value.toLocaleString('pt-PT',{maximumFractionDigits:2})}${unit}`:'Não disponível'}
 function card(id){const r=rooms.find(r=>r.id===id),d=reading(id),b=binding(id);if(!b)return '';const rows=d?[
  ['Ligação',d.missing?'ID não encontrado':d.online?'Online':'Offline'],['Modelo',[d.model,d.generation].filter(Boolean).join(' · ')||'Não disponível'],['Posição',metric(d.position,'%')],['Movimento',stateName(d.state)],['Calibrado',typeof d.calibrated!=='boolean'?'Não disponível':d.calibrated?'Sim':'Não'],['Potência',metric(d.power,' W')],['Energia acumulada',metric(d.energy,' Wh')],['Tensão',metric(d.voltage,' V')],['Corrente',metric(d.current,' A')],['Temperatura interna',metric(d.temperature,' °C')],['Erros',d.errors?.join(', ')||'Nenhum reportado']]:[];
  return resultCard(id,'cover',`<p>${escapeHTML(b.deviceId)} · canal ${b.channel}</p><p>${escapeHTML(caption(id))}</p>${rows.length?`<dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>`:''}${d?.fetchedAt?`<small>Consultado às ${new Date(d.fetchedAt).toLocaleTimeString('pt-PT')}</small>`:''}`);
 }
 function summary(){document.querySelectorAll('#shelly-data [data-shelly-result]').forEach(el=>resultOpen.set(el.dataset.shellyResult,el.open));const n=Object.keys(config.bindings).length,l=Object.keys(config.lightBindings||{}).length,s=Object.keys(config.sensorBindings||{}).length;$('shelly-summary').textContent=[l?`${l} ${l===1?'luz':'luzes'}`:'',n?`${n} estore${n===1?'':'s'}`:'',s?`${s} sensor${s===1?'':'es'}`:''].filter(Boolean).join(' · ')||'Por configurar';$('shelly-data').innerHTML=CORE.ROOM_IDS.map(card).join('')+CORE.LIGHT_ROOM_IDS.filter(id=>lightBinding(id)).map(id=>resultCard(id,'light',`<p>${escapeHTML(lightCaption(id))}</p><p>${escapeHTML(lightReading(id)?.model||'')}</p>`)).join('')+CORE.SENSOR_ROOM_IDS.map(sensorCard).join('');$('shelly-refresh').disabled=busy||commandCount>0||!(n+l+s)||!config.server||!key;for(const id of ['all-open','all-close'])$(id).disabled=busy||commandCount>0||groupBusy||lightGroupBusy}
 function controlReady(id,position){return (position==='stop'||!dirty())&&!!key&&!!config.server&&CORE.canControl(reading(id),position)&&(!(busy||commandCount||groupBusy)||position==='stop')&&!(position==='stop'&&stopping)}
 function decorateRoom(r){
  decorateSensor(r);decorateLight(r);if(!binding(r.id))return;const host=$('detail-card'),range=host.querySelector('#blind-range');if(range)range.disabled=!controlReady(r.id,50);
  host.querySelectorAll('[data-command]').forEach(b=>b.disabled=!controlReady(r.id,b.dataset.command==='pause'?'stop':b.dataset.command));
  const note=host.querySelector('.selected-device-note');if(note)note.textContent=lightBinding(r.id)?'Candeeiro e estore reais Shelly Cloud.':'Estore real Shelly Cloud. A iluminação continua em demonstração.';
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
  clearTimeout(pollTimer);if(Date.now()>=pollUntil){if(lightTargets.size){for(const id of lightTargets.keys())lightMessages.set(id,'O estado pedido não foi confirmado. Atualize os dados antes de tentar novamente.');lightTargets.clear();render()}return}
  pollTimer=setTimeout(async()=>{if(busy||commandCount||lightGroupBusy){schedulePoll();return}await refresh({quiet:true});settleLights();
   const hadTargets=targets.size;for(const [id,target]of targets){const d=reading(id);if(!d||!d.online||d.error)continue;if(target==='stop'?!['opening','closing','calibrating'].includes(d.state):Number.isFinite(d.position)&&Math.abs(d.position-target)<=1)targets.delete(id)}
   if(hadTargets&&!targets.size)feedback('Posição e estado atualizados com a resposta do Shelly.');
   if(Date.now()<pollFloor||targets.size||lightTargets.size||[...readings.values()].some(d=>['opening','closing'].includes(d.state)))schedulePoll();
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
  const ids=CORE.deviceIds(config);if(!ids.length||!key||!config.server){feedback('Guarde o servidor, a chave e pelo menos um ID.',true);return}
  busy=true;const version=generation;summary();if(!quiet)feedback('A consultar os dispositivos na Shelly Cloud…');
  try{
   const result=await api('status',{ids});if(!Array.isArray(result.devices))throw Error('Resposta inesperada do Cloud.');if(version!==generation)return;
   lastFetched=Date.now();for(const [id,b]of Object.entries(config.bindings)){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.status(device,b.channel);readings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasCover:false,position:null,state:null,calibrated:null,errors:[],fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries(config.lightBindings||{})){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.lightStatus(device,b);lightReadings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasOutput:false,on:null,fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries(config.sensorBindings||{})){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.sensorStatus(device,b);sensorReadings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,temperature:null,humidity:null,battery:null,fetchedAt:lastFetched})}
   reapply();settleLights();if(!quiet||lastError)feedback('Dados atualizados com os estados reportados pelo Shelly.');
  }catch(e){if(version!==generation)return;for(const id of Object.keys(config.bindings)){const old=reading(id);readings.set(id,old?{...old,error:true}:{online:false,hasCover:false,position:null,errors:[],error:true})}for(const id of Object.keys(config.lightBindings||{})){const old=lightReading(id);lightReadings.set(id,{...old,error:true})}for(const id of Object.keys(config.sensorBindings||{}))sensorReadings.set(id,{...sensorReading(id),error:true});feedback(e.name==='AbortError'?'A consulta demorou demasiado. Tente novamente.':e.message||'Consulta indisponível.',true)}
  finally{busy=false;summary();if(document.querySelector('#blind-range:active')){drawPlan();drawList();updateSummary()}else render();if(version!==generation&&key&&config.server&&CORE.deviceIds(config).length)refresh({quiet:true})}
 }
 $('open-shelly').addEventListener('click',()=>{fill();summary();showPopup('shelly-dialog')});
 $('shelly-refresh').addEventListener('click',refresh);
 $('shelly-form').addEventListener('invalid',e=>{let group=e.target.closest('details');while(group){group.open=true;group=group.parentElement.closest('details')}},true);
 $('shelly-form').addEventListener('submit',e=>{
  e.preventDefault();
  try{
   const bindings={};for(const id of CORE.ROOM_IDS){const input=$('shelly-id-'+id).value.trim();if(input)bindings[id]={deviceId:CORE.deviceId(input),channel:Number($('shelly-channel-'+id).value)}}
   const lightBindings={};for(const id of CORE.LIGHT_ROOM_IDS){const input=$('shelly-light-id-'+id).value.trim();if(input)lightBindings[id]={deviceId:CORE.deviceId(input),channel:Number($('shelly-light-channel-'+id).value),type:$('shelly-light-type-'+id).value}}
   const sensorBindings={};for(const id of CORE.SENSOR_ROOM_IDS){const input=$('shelly-sensor-id-'+id).value.trim();if(input)sensorBindings[id]={deviceId:CORE.deviceId(input),temperatureChannel:Number($('shelly-sensor-temperature-'+id).value),humidityChannel:Number($('shelly-sensor-humidity-'+id).value)}}
   const newKey=$('shelly-key').value.trim(),rememberKey=$('shelly-remember').checked;
   const next=CORE.config({schemaVersion:1,server:$('shelly-server').value.trim(),authKey:newKey,rememberKey,bindings,lightBindings,sensorBindings});
   if((Object.keys(bindings).length||Object.keys(lightBindings).length||Object.keys(sensorBindings).length)&&(!next.server||!newKey))throw Error('Indique o servidor e a chave para associar os equipamentos.');
   const before=localStorage.getItem(KEY),beforeSession=sessionStorage.getItem(SESSION);
   try{localStorage.setItem(KEY,JSON.stringify(next));if(rememberKey)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,JSON.stringify({server:next.server,key:newKey}))}catch(error){if(before===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,before);if(beforeSession===null)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,beforeSession);throw Error('Não foi possível guardar a configuração neste navegador.')}
   generation++;clearTimeout(pollTimer);targets.clear();lightTargets.clear();lightMessages.clear();pollUntil=0;config=next;key=newKey;readings.clear();lightReadings.clear();sensorReadings.clear();reapply();fill();summary();render();feedback('Configuração guardada. Consulte os dados para ativar os controlos reais dos equipamentos associados.');if(key&&config.server)refresh({quiet:true});
  }catch(error){feedback(error.message,true)}
 });
 function ensureFresh(id){const d=reading(id),l=lightReading(id),s=sensorReading(id);if((binding(id)&&(!d?.fetchedAt||Date.now()-d.fetchedAt>30000||d.error))||(lightBinding(id)&&(!l?.fetchedAt||Date.now()-l.fetchedAt>30000||l.error))||(sensorBinding(id)&&(!s?.fetchedAt||Date.now()-s.fetchedAt>60000||s.error)))refresh({quiet:true})}
 function lampSnapshot(id){const d=lightReading(id),configured=!!lightBinding(id),working=busy||commandCount>0||lightGroupBusy||groupBusy;
  return {configured,state:d?.online&&!d.error&&typeof d.on==='boolean'?{on:d.on,checkedAt:d.fetchedAt}:null,busy:working,ready:configured&&!working&&!dirty()&&!!key&&!!config.server&&CORE.canLightControl(d),error:!configured?'':(!CORE.canLightControl(d)?lightCaption(id):(/não|erro|falh|indispon|demor|atualize/i.test(lightMessages.get(id)||'')?lightMessages.get(id):''))};
 }
 window.CasaShelly={lampSnapshot,isBusy:()=>busy||commandCount>0||lightGroupBusy||groupBusy,sensorBinding,sensorReading,lightBinding,lightReading,lightCaption,lightValue,commandLight,commandAllLights,binding,reading,roomCaption:caption,decorateRoom,reapply,refresh,command,commandAll,ensureFresh};
 fill();summary();reapply();render();
 if(key&&config.server&&CORE.deviceIds(config).length)refresh({quiet:true});
 setInterval(()=>{if(document.visibilityState==='visible'&&Object.keys(config.sensorBindings||{}).length&&key&&config.server&&!busy&&!commandCount&&!lightGroupBusy&&!groupBusy&&!dirty())refresh({quiet:true})},60000);
})();
