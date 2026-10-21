/* Shelly Cloud status and user-initiated cover control. Secrets never appear in DOM messages or console. */
(function(){
 'use strict';
 const CORE=window.ShellyCore,KEY='casa-nl-shelly-cloud-v1',SESSION='casa-nl-shelly-session-v1',$=id=>document.getElementById(id);
 let config={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{},lightBindings:{}},key='',busy=false,generation=0,lastFetched=0;
 const MC=window.CasaMediaCore,mediaReadings={},mediaTargets=new Map(),mediaMessages=new Map();
 const resultOpen=new Map();
 let fanReading=null,fanTarget=null,fanMessage='',fanMigrationAllowed=true;
 const AL=window.CasaAlarmCore;let alarmReadings={},alarmTarget=null,alarmMessage='';
 const EV=window.CasaEVCore;let evReadings={},evMessage='',evTarget=null;
 let energyReading=null;
 let doorReading=null,cellarDoorReading=null;
 const sensorReadings=new Map();
 const sensorBinding=id=>config.sensorBindings?.[id]||null;
 const sensorReading=id=>sensorReadings.get(id)||null;
 const lightReadings=new Map(),lightTargets=new Map(),lightMessages=new Map();let lightGroupBusy=false;
 const readings=new Map(),targets=new Map(),sequences=new Map();let commandCount=0,groupBusy=false,stopping=false,pollTimer,pollUntil=0,pollFloor=0,lastMessage='',lastError=false;
 try{const saved=localStorage.getItem(KEY);if(saved)config=CORE.config(JSON.parse(saved));const session=JSON.parse(sessionStorage.getItem(SESSION)||'null');key=config.authKey||(session?.server===config.server?session.key:'')||''}catch{fanMigrationAllowed=false}
 if(fanMigrationAllowed&&config.fan===undefined){try{const next=CORE.config({...config,fan:{deviceId:'8819dc',channel:0}});localStorage.setItem(KEY,JSON.stringify(next));config=next}catch{fanMessage='Associe a ventoinha nas definições: ID 8819dc, canal 0.'}}
 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-cellar-temperature-added-v1')){if(!Object.hasOwn(config.sensorBindings||{},'cellar')){const next=CORE.config({...config,sensorBindings:{...config.sensorBindings,cellar:{deviceId:'7dc19d',temperatureChannel:0,humidityChannel:0,type:'door-window2'}}});localStorage.setItem(KEY,JSON.stringify(next));config=next}localStorage.setItem('casa-nl-cellar-temperature-added-v1','true')}}catch{}
 if(fanMigrationAllowed&&(config.mediaBindings===undefined||config.officeBindings===undefined)){try{const next=CORE.config({...config,...(config.mediaBindings===undefined?{mediaBindings:{tv:{deviceId:'437c82',channel:0},soundbar:{deviceId:'4359bb',channel:0},playstation:{deviceId:'435aa1',channel:0},vodafone:{deviceId:'e465b8b9c64c',channel:0},unifi:{deviceId:'e465b84553bc',channel:0}}}:{}),...(config.officeBindings===undefined?{officeBindings:{monitor:{deviceId:'441db8',channel:0},apollo:{deviceId:'e43ad8',channel:0},terramaster:{deviceId:'e9df12',channel:0},blackdrive:{deviceId:'bb8ac4',channel:0}}}:{})});localStorage.setItem(KEY,JSON.stringify(next));config=next}catch(error){for(const id of MC.IDS)mediaMessages.set(id,error.message)}}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-gui-ids-associated-v1')){const next=CORE.config({...config,officeBindings:MC.associateOffice(config.officeBindings)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-gui-ids-associated-v1','true')}}catch{for(const id of MC.OFFICE_IDS)mediaMessages.set(id,'Confirme a associação dos IDs da secretária nas definições.')}

 const binding=id=>config.bindings[id]||null;
 const lightBinding=id=>config.lightBindings?.[id]||null;
 const lightReading=id=>lightReadings.get(id)||null;
 const reading=id=>readings.get(id)||null;
 const stateName=s=>({open:'Aberto',closed:'Fechado',opening:'A abrir',closing:'A fechar',stop:'Parado',stopped:'Parado',close:'A fechar',calibrating:'A calibrar'})[s]||s||'Não disponível';
 function caption(id){const d=reading(id);if(!d)return 'Shelly Cloud · por consultar';if(d.error)return 'Shelly Cloud · consulta indisponível';if(d.missing)return 'ID não encontrado nesta conta · verifique o ID e o servidor';if(!d.online)return 'Shelly Cloud · offline (dados guardados)';if(!d.hasCover)return 'Canal de estore não encontrado';return `${stateName(d.state)}${d.position===null?' · posição desconhecida':''} · Cloud${Date.now()-lastFetched>120000?' · dados desatualizados':''}`}
 function feedback(text,error=false){lastMessage=text;lastError=error;$('shelly-feedback').textContent=text;$('shelly-feedback').classList.toggle('error',error);const p=document.querySelector('.shelly-room-feedback');if(p){p.textContent=text;p.classList.toggle('error',error)}}
 function fill(){window.CasaMediaForm.fill(config.mediaBindings,config.officeBindings);
  window.CasaAlarmForm.fill(config.alarm);window.CasaFanForm.fill(config.fan);
  window.CasaEnergyForm.fill(config.homeEnergy);
  window.CasaDoor.fill(config.door);window.CasaDoor.fill(config.cellarDoor,'cellar-door');
  window.CasaEVForm.fill(config.ev);
  $('shelly-server').value=config.server;$('shelly-key').value=key;$('shelly-remember').checked=config.rememberKey;
  $('shelly-mappings').innerHTML=CORE.ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=binding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-id-${id}">Device ID</label><input id="shelly-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><label for="shelly-channel-${id}">Canal</label><input id="shelly-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></fieldset>`}).join('');
  const lampNames={master:'Abajur com flores',bedroom2:'Candeeiro preto',living:'Candeeiro de pé cromado'};
  $('shelly-light-mappings').innerHTML=CORE.LIGHT_ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=lightBinding(id);return `<fieldset class="shelly-mapping shelly-light-mapping"><legend>${escapeHTML(r.name)}</legend><p class="settings-explanation">${lampNames[id]}</p><label for="shelly-light-id-${id}">Device ID do candeeiro</label><input id="shelly-light-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><div class="shelly-light-options"><div><label for="shelly-light-channel-${id}">Canal da luz</label><input id="shelly-light-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></div><div><label for="shelly-light-type-${id}">Tipo preferido</label><select id="shelly-light-type-${id}"><option value="switch"${b?.type!=='light'?' selected':''}>switch · Relé / tomada</option><option value="light"${b?.type==='light'?' selected':''}>light · Luz / dimmer</option></select></div></div><p class="settings-explanation light-mapping-state">${b?'Associação guardada':'Sem associação'}</p></fieldset>`}).join('');

  $('shelly-sensor-mappings').innerHTML=CORE.SENSOR_ROOM_IDS.map(id=>{const r=id==='cellar'?{name:'Cave'}:rooms.find(r=>r.id===id),b=sensorBinding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-sensor-id-${id}">Device ID do sensor</label><input id="shelly-sensor-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}">${id==='cellar'?`<label for="shelly-sensor-type-cellar">Tipo de sensor</label><select id="shelly-sensor-type-cellar"><option value="door-window2"${b?.type==='door-window2'?' selected':''}>Shelly Door Window 2 · temperatura</option><option value="environment"${b?.type!=='door-window2'?' selected':''}>Sensor de temperatura e humidade</option></select>`:''}<details class="shelly-help"><summary>Componentes do sensor (avançado)</summary><p class="settings-explanation">Nos H&amp;T habituais ambos são 0. Altere apenas se o dispositivo usar outros IDs de componente.</p><div class="shelly-light-options"><div><label for="shelly-sensor-temperature-${id}">Temperatura</label><input id="shelly-sensor-temperature-${id}" type="number" min="0" max="255" step="1" value="${b?.temperatureChannel??0}"></div><div><label for="shelly-sensor-humidity-${id}">Humidade</label><input id="shelly-sensor-humidity-${id}" type="number" min="0" max="255" step="1" value="${b?.humidityChannel??0}"></div></div></details><p class="settings-explanation light-mapping-state">${b?'Sensor associado':'Sem associação'}</p></fieldset>`}).join('');

 }
 function dirty(){if(window.CasaMediaForm.dirty(config.mediaBindings,config.officeBindings))return true;if($('shelly-sensor-type-cellar').value!==(sensorBinding('cellar')?.type||'environment'))return true;if(window.CasaFanForm.dirty(config.fan))return true;if(window.CasaAlarmForm.dirty(config.alarm))return true;if(window.CasaEnergyForm.dirty(config.homeEnergy))return true;if(window.CasaDoor.dirty(config.door)||window.CasaDoor.dirty(config.cellarDoor,'cellar-door'))return true;if(window.CasaEVForm.dirty(config.ev))return true;if($('shelly-server').value.trim()!==config.server||$('shelly-key').value.trim()!==key||$('shelly-remember').checked!==config.rememberKey)return true;return CORE.SENSOR_ROOM_IDS.some(id=>$('shelly-sensor-id-'+id).value.trim().toLowerCase()!==(sensorBinding(id)?.deviceId||'')||Number($('shelly-sensor-temperature-'+id).value)!==(sensorBinding(id)?.temperatureChannel??0)||Number($('shelly-sensor-humidity-'+id).value)!==(sensorBinding(id)?.humidityChannel??0))||CORE.LIGHT_ROOM_IDS.some(id=>$('shelly-light-id-'+id).value.trim().toLowerCase()!==(lightBinding(id)?.deviceId||'')||Number($('shelly-light-channel-'+id).value)!==(lightBinding(id)?.channel??0)||$('shelly-light-type-'+id).value!==(lightBinding(id)?.type||'switch'))||CORE.ROOM_IDS.some(id=>$('shelly-id-'+id).value.trim().toLowerCase()!==(binding(id)?.deviceId||'')||Number($('shelly-channel-'+id).value)!==(binding(id)?.channel??0))}
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
  return `<div class="sensor-metrics"><div><span>Temperatura</span><strong data-sensor-temperature>${value(d?.temperature,' °C')}</strong></div>${id==='cellar'&&sensorBinding(id)?.type==='door-window2'?'':`<div><span>Humidade</span><strong data-sensor-humidity>${value(d?.humidity,' %')}</strong></div>`}</div><p class="sensor-caption">${escapeHTML(sensorCaption(id))}</p>${d?.battery!==null&&d?.battery!==undefined?`<p class="sensor-caption">Bateria: ${value(d.battery,' %')}</p>`:''}${d?.fetchedAt?`<small class="sensor-caption">Consultado na Cloud: ${new Date(d.fetchedAt).toLocaleString('pt-PT')}. A hora da medição pode ser anterior.</small>`:''}`;
 }
 function resultCard(id,type,body,label){
  const key=type+'-'+id,name=label||(id==='cellar'?'Cave':rooms.find(r=>r.id===id).name);
  return `<details class="shelly-result shelly-equipment-group" data-shelly-result="${key}"${resultOpen.get(key)?' open':''}><summary><span>${escapeHTML(name)}<small>${type==='cover'?'Estore':type==='light'?'Candeeiro':type==='ev'?'Contador e interruptor':type==='door'?'Contacto da porta':type==='energy'?'Potência e energia':type==='alarm'?'Armação e disparo':type==='fan'?'Ventoinha':type==='media'?'Alimentação elétrica':'Temperatura e humidade'}</small></span></summary><div class="shelly-result-content">${body}</div></details>`;
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
 function summary(){window.dispatchEvent(new Event('mediachange'));window.dispatchEvent(new Event('sensorchange'));window.dispatchEvent(new Event('fanchange')); window.dispatchEvent(new Event('alarmchange'));window.dispatchEvent(new Event('energychange'));window.dispatchEvent(new Event('doorchange'));window.dispatchEvent(new Event('evchange'));document.querySelectorAll('#shelly-data [data-shelly-result]').forEach(el=>resultOpen.set(el.dataset.shellyResult,el.open));const n=Object.keys(config.bindings).length,l=Object.keys(config.lightBindings||{}).length,s=Object.keys(config.sensorBindings||{}).length,evCount=EV.ROLES.filter(k=>config.ev?.[k]).length;$('shelly-summary').textContent=[l?`${l} ${l===1?'luz':'luzes'}`:'',n?`${n} estore${n===1?'':'s'}`:'',s?`${s} sensor${s===1?'':'es'}`:'',evCount?'carregamento':'',config.fan?'ventoinha':'',Object.keys(config.mediaBindings||{}).length?'multimédia':'',Object.keys(config.officeBindings||{}).length?'secretária do Gui':'',config.door?'porta de entrada':'',config.cellarDoor?'porta da cave':'',window.CasaEnergyCore.binding(config)?'contador geral':'',AL.ROLES.some(k=>config.alarm?.[k])?'alarme':''].filter(Boolean).join(' · ')||'Por configurar';$('shelly-data').innerHTML=CORE.ROOM_IDS.map(card).join('')+CORE.LIGHT_ROOM_IDS.filter(id=>lightBinding(id)).map(id=>resultCard(id,'light',`<p>${escapeHTML(lightCaption(id))}</p><p>${escapeHTML(lightReading(id)?.model||'')}</p>`)).join('')+CORE.SENSOR_ROOM_IDS.map(sensorCard).join('')+evCard()+doorCard()+doorCard('cellar')+energyCard()+alarmCard()+fanCard()+[...MC.IDS,...MC.OFFICE_IDS].filter(id=>mediaBinding(id)).map(id=>resultCard(id,'media','<p>'+escapeHTML(mediaSnapshot(id).label)+'</p>',MC.NAMES[id])).join('');$('shelly-refresh').disabled=busy||commandCount>0||!CORE.deviceIds(config).length||!config.server||!key;for(const id of ['all-open','all-close'])$(id).disabled=busy||commandCount>0||groupBusy||lightGroupBusy}
 function controlReady(id,position){return (position==='stop'||!dirty())&&!!key&&!!config.server&&CORE.canControl(reading(id),position)&&(!(busy||commandCount||groupBusy)||position==='stop')&&!(position==='stop'&&stopping)}
 function decorateRoom(r){
  window.CasaDoor.decorateRoom(r);window.CasaMedia?.decorateRoom(r);decorateSensor(r);decorateLight(r);if(!binding(r.id))return;const host=$('detail-card'),range=host.querySelector('#blind-range');if(range)range.disabled=!controlReady(r.id,50);
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
  clearTimeout(pollTimer);if(Date.now()>=pollUntil){if(mediaTargets.size){for(const id of mediaTargets.keys())mediaMessages.set(id,"O estado pedido não foi confirmado. Atualize antes de repetir.");mediaTargets.clear();window.dispatchEvent(new Event("mediachange"))}if(fanTarget!==null){fanTarget=null;fanMessage="O estado pedido não foi confirmado. Atualize antes de repetir.";window.dispatchEvent(new Event("fanchange"))}if(alarmTarget!==null){alarmTarget=null;alarmMessage='A armação pedida não foi confirmada. Atualize antes de repetir.';window.dispatchEvent(new Event('alarmchange'))}if(evTarget!==null){evTarget=null;evMessage='O estado do ponto não foi confirmado. Atualize antes de repetir.';window.dispatchEvent(new Event('evchange'))}if(lightTargets.size){for(const id of lightTargets.keys())lightMessages.set(id,'O estado pedido não foi confirmado. Atualize os dados antes de tentar novamente.');lightTargets.clear();render()}return}
  pollTimer=setTimeout(async()=>{if(busy||commandCount||lightGroupBusy){schedulePoll();return}await refresh({quiet:true});settleLights();settleEV();settleAlarm();settleFan();settleMedia();
   const hadTargets=targets.size;for(const [id,target]of targets){const d=reading(id);if(!d||!d.online||d.error)continue;if(target==='stop'?!['opening','closing','calibrating'].includes(d.state):Number.isFinite(d.position)&&Math.abs(d.position-target)<=1)targets.delete(id)}
   if(hadTargets&&!targets.size)feedback('Posição e estado atualizados com a resposta do Shelly.');
   if(Date.now()<pollFloor||targets.size||lightTargets.size||evTarget!==null||alarmTarget!==null||fanTarget!==null||mediaTargets.size||[...readings.values()].some(d=>['opening','closing'].includes(d.state)))schedulePoll();
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
  if(alarmTarget===null&&alarmMessage.includes('Armação confirmada'))alarmMessage='';
  if(evTarget===null&&evMessage.includes('estado confirmado'))evMessage='';
  busy=true;const version=generation;summary();if(!quiet)feedback('A consultar os dispositivos na Shelly Cloud…');
  try{
   const result={devices:[]};for(const batch of CORE.deviceBatches(config)){if(version!==generation)return;const chunk=await api('status',{ids:batch});if(!Array.isArray(chunk.devices))throw Error('Resposta inesperada do Cloud.');result.devices.push(...chunk.devices)}if(version!==generation)return;
   lastFetched=Date.now();for(const [id,b]of Object.entries(config.bindings)){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.status(device,b.channel);readings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasCover:false,position:null,state:null,calibrated:null,errors:[],fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries(config.lightBindings||{})){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.lightStatus(device,b);lightReadings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasOutput:false,on:null,fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries(config.sensorBindings||{})){const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.sensorStatus(device,b);sensorReadings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,temperature:null,humidity:null,battery:null,fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries({...config.mediaBindings,...config.officeBindings})){const device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId);mediaReadings[id]={...EV.relayStatus(device,b),meter:EV.meterStatus(device,{...b,component:'auto'}),missing:!device,fetchedAt:lastFetched}}
   if(config.fan){const b=config.fan,device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId);fanReading={...EV.relayStatus(device,b),missing:!device,fetchedAt:lastFetched}}
   for(const role of AL.ROLES){const b=config.alarm?.[role];if(b){const device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId);alarmReadings[role]={...EV.relayStatus(device,b),missing:!device,fetchedAt:lastFetched}}}
   for(const role of EV.ROLES){const b=config.ev?.[role];if(!b)continue;const device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId);evReadings[role]={...(role==='relay'?EV.relayStatus(device,b):EV.meterStatus(device,b)),fetchedAt:lastFetched}}
   if(config.cellarDoor){const b=config.cellarDoor,device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId.toLowerCase());cellarDoorReading={...window.CasaDoorCore.status(device,b),fetchedAt:lastFetched}}
   if(config.door){const b=config.door,device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId.toLowerCase());doorReading={...window.CasaDoorCore.status(device,b),fetchedAt:lastFetched}}
   {const b=window.CasaEnergyCore.binding(config);if(b){const device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId);energyReading={...window.CasaEnergyCore.status(device,b),fetchedAt:lastFetched}}}
   reapply();settleLights();settleEV();settleAlarm();settleFan();settleMedia();if(!quiet||lastError)feedback('Dados atualizados com os estados reportados pelo Shelly.');
  }catch(e){if(version!==generation)return;for(const id of Object.keys({...config.mediaBindings,...config.officeBindings}))mediaReadings[id]={...mediaReadings[id],error:true};if(config.fan)fanReading={...fanReading,error:true};for(const id of Object.keys(config.bindings)){const old=reading(id);readings.set(id,old?{...old,error:true}:{online:false,hasCover:false,position:null,errors:[],error:true})}for(const id of Object.keys(config.lightBindings||{})){const old=lightReading(id);lightReadings.set(id,{...old,error:true})}for(const id of Object.keys(config.sensorBindings||{}))sensorReadings.set(id,{...sensorReading(id),error:true});for(const role of EV.ROLES)if(config.ev?.[role])evReadings[role]={...evReadings[role],error:true};if(window.CasaEnergyCore.binding(config))energyReading={...energyReading,error:true};if(config.door)doorReading={...doorReading,error:true};if(config.cellarDoor)cellarDoorReading={...cellarDoorReading,error:true};for(const role of AL.ROLES)if(config.alarm?.[role])alarmReadings[role]={...alarmReadings[role],error:true};feedback(e.name==='AbortError'?'A consulta demorou demasiado. Tente novamente.':e.message||'Consulta indisponível.',true)}
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
   const sensorBindings={};for(const id of CORE.SENSOR_ROOM_IDS){const input=$('shelly-sensor-id-'+id).value.trim();if(input)sensorBindings[id]={deviceId:CORE.deviceId(input),temperatureChannel:Number($('shelly-sensor-temperature-'+id).value),humidityChannel:Number($('shelly-sensor-humidity-'+id).value),...(id==='cellar'?{type:$('shelly-sensor-type-cellar').value}:{})}}
   const newKey=$('shelly-key').value.trim(),rememberKey=$('shelly-remember').checked;
   const ev=window.CasaEVForm.read(config.ev),door=window.CasaDoor.read(config.door),cellarDoor=window.CasaDoor.read(config.cellarDoor,'cellar-door'),homeEnergy=window.CasaEnergyForm.read(config.homeEnergy),alarm=window.CasaAlarmForm.read(config.alarm),fan=window.CasaFanForm.read(),mediaBindings=window.CasaMediaForm.read(config.mediaBindings),officeBindings=window.CasaMediaForm.readOffice(config.officeBindings);
   const next=CORE.config({schemaVersion:1,server:$('shelly-server').value.trim(),authKey:newKey,rememberKey,bindings,lightBindings,sensorBindings,...(ev!==undefined?{ev}:{}),...(door!==undefined?{door}:{}),...(homeEnergy!==undefined?{homeEnergy}:{}),...(cellarDoor!==undefined?{cellarDoor}:{}),...(alarm!==undefined?{alarm}:{}),...(mediaBindings!==undefined?{mediaBindings}:{}),...(officeBindings!==undefined?{officeBindings}:{}),fan});
   if(CORE.deviceIds(next).length&&(!next.server||!newKey))throw Error('Indique o servidor e a chave para associar os equipamentos.');
   const before=localStorage.getItem(KEY),beforeSession=sessionStorage.getItem(SESSION);
   try{localStorage.setItem(KEY,JSON.stringify(next));if(rememberKey)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,JSON.stringify({server:next.server,key:newKey}))}catch(error){if(before===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,before);if(beforeSession===null)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,beforeSession);throw Error('Não foi possível guardar a configuração neste navegador.')}
   generation++;for(const id of [...MC.IDS,...MC.OFFICE_IDS])delete mediaReadings[id];mediaTargets.clear();mediaMessages.clear();fanReading=null;fanTarget=null;fanMessage="";alarmReadings={};alarmTarget=null;alarmMessage='';energyReading=null;doorReading=null;cellarDoorReading=null;evReadings={};evTarget=null;evMessage='';clearTimeout(pollTimer);targets.clear();lightTargets.clear();lightMessages.clear();pollUntil=0;config=next;key=newKey;readings.clear();lightReadings.clear();sensorReadings.clear();reapply();fill();summary();render();feedback('Configuração guardada. Consulte os dados para ativar os controlos reais dos equipamentos associados.');if(key&&config.server)refresh({quiet:true});
  }catch(error){feedback(error.message,true)}
 });
 function ensureFresh(id){const d=reading(id),l=lightReading(id),s=sensorReading(id);if((binding(id)&&(!d?.fetchedAt||Date.now()-d.fetchedAt>30000||d.error))||(lightBinding(id)&&(!l?.fetchedAt||Date.now()-l.fetchedAt>30000||l.error))||(sensorBinding(id)&&(!s?.fetchedAt||Date.now()-s.fetchedAt>60000||s.error)))refresh({quiet:true})}
 function energySnapshot(){return {...window.CasaEnergyCore.state(config,energyReading),reading:energyReading?structuredClone(energyReading):null,busy:busy||commandCount>0||groupBusy||lightGroupBusy}}
 function energyCard(){const d=energySnapshot();if(!d.configured)return '';return resultCard('house','energy',`<p>Canal ${d.channel} · contratado ${metric(d.contractKVA,' kVA')}</p><dl><div><dt>Potência ativa</dt><dd>${Number.isFinite(d.powerKW)?d.powerKW.toLocaleString('pt-PT',{minimumFractionDigits:3,maximumFractionDigits:3})+' kW':'Não disponível'}</dd></div><div><dt>Potência aparente</dt><dd>${metric(d.apparentKVA,' kVA')}</dd></div><div><dt>Utilização</dt><dd>${metric(d.percent,'%')}</dd></div></dl>`,'Contador geral da casa')}
 function energyEnsureFresh(){if(window.CasaEnergyCore.binding(config)&&(!energyReading?.fetchedAt||Date.now()-energyReading.fetchedAt>10000||energyReading.error))refresh({quiet:true})}
 async function inspectDoorSensor(doorId='entrance'){
  if(!['entrance','cellar'].includes(doorId))throw Error('Porta inválida.');
  const binding=doorId==='cellar'?config.cellarDoor:config.door;
  if(!binding||binding.source!=='blu')throw Error('Associe primeiro o sensor BLU da porta e guarde.');
  if(busy||commandCount||groupBusy||lightGroupBusy)throw Error('Aguarde que a comunicação em curso termine.');
  if(dirty())throw Error('Guarde primeiro as alterações da configuração.');
  if(!key||!config.server)throw Error('Confirme a conta Shelly Cloud.');
  const version=generation,id=binding.deviceId;busy=true;summary();
  try{const result=await api('status',{ids:[id]});if(version!==generation)throw Error('A configuração mudou. Volte a verificar.');return window.CasaDoorCore.inspectSensor(result.devices.find(d=>d.id.toLowerCase()===id.toLowerCase()))}
  finally{busy=false;summary()}
 }
 async function inspectDoorGateway(rawId){
  const id=CORE.deviceId(rawId);if(busy||commandCount||groupBusy||lightGroupBusy)throw Error('Aguarde que a comunicação em curso termine.');
  if(dirty())throw Error('Guarde primeiro as alterações da configuração.');
  if(!key||!config.server)throw Error('Guarde o servidor e a chave Shelly Cloud antes de verificar o gateway.');
  const version=generation;busy=true;summary();
  try{const result=await api('status',{ids:[id]});if(version!==generation)throw Error('A configuração mudou. Volte a verificar.');const device=result.devices.find(d=>d.id.toLowerCase()===id);return window.CasaDoorCore.inspectGateway(device)}
  finally{busy=false;summary()}
 }
 function doorSnapshot(id='entrance'){const b=id==='cellar'?config.cellarDoor:config.door,d=id==='cellar'?cellarDoorReading:doorReading;return {configured:!!b,open:window.CasaDoorCore.state(d),reading:d?structuredClone(d):null}}
 function doorCard(id='entrance'){if(!(id==='cellar'?config.cellarDoor:config.door))return '';const d=doorSnapshot(id);return resultCard(id,'door','<p id="'+(id==='cellar'?'cellar-door-reading':'door-reading')+'">'+escapeHTML(window.CasaDoor.caption(d))+'</p>',id==='cellar'?'Porta da cave':'Porta de entrada')}
 function doorEnsureFresh(id='entrance'){const d=id==='cellar'?cellarDoorReading:doorReading,b=id==='cellar'?config.cellarDoor:config.door;if(b&&(!d?.fetchedAt||Date.now()-d.fetchedAt>10000||d.error))return refresh({quiet:true})}
 function evSnapshot(){
  const state=EV.state(config.ev,evReadings),working=busy||commandCount>0||groupBusy||lightGroupBusy;
  return {...state,busy:working,canControl:state.canControl&&!working&&!dirty()&&!!key&&!!config.server,message:evMessage,thresholdWatts:config.ev?.thresholdWatts??50,roles:EV.ROLES.filter(k=>config.ev?.[k]),readings:structuredClone(evReadings)};
 }
 function evCard(){if(!EV.ROLES.some(k=>config.ev?.[k]))return '';const d=evSnapshot();return resultCard('ev','ev',`<p>Carregamento do carro · ${d.charging===true?'a carregar':d.charging===false?'sem carregamento':'consumo por confirmar'}</p><dl><div><dt>Potência</dt><dd>${metric(d.powerKW,' kW')}</dd></div><div><dt>Total acumulado</dt><dd>${metric(d.energyKWh,' kWh')}${d.energyStale?' · última leitura':''}</dd></div></dl>`,'Carregamento do carro')}
 function evEnsureFresh(){if(EV.ROLES.some(role=>config.ev?.[role]&&(!EV.fresh(evReadings[role])||Date.now()-evReadings[role].fetchedAt>10000)))return refresh({quiet:true})}
 function settleEV(){if(evTarget!==null&&EV.canControl(evReadings.relay)&&evReadings.relay.on===evTarget){evMessage=evTarget?'Ponto ligado · estado confirmado pelo Shelly.':'Ponto desligado · estado confirmado pelo Shelly.';evTarget=null}}
 async function commandEV(on){
  if(typeof on!=='boolean'||busy||commandCount||groupBusy||lightGroupBusy)return;
  if(!config.ev?.relay||dirty()||!key||!config.server||!EV.canControl(evReadings.relay)){evMessage='Atualize os dados e confirme a associação do interruptor.';summary();return}
  const version=generation,b=config.ev.relay;commandCount++;evMessage='A enviar o comando ao ponto de carregamento…';summary();render();
  try{const result=await api('light',{id:b.deviceId,channel:b.channel,type:'switch',on});if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');evTarget=on;pollUntil=Date.now()+90000;pollFloor=Date.now()+6000;evMessage='Comando aceite. A aguardar o estado do interruptor.'}
  catch(error){if(version===generation)evMessage=error.message}
  finally{commandCount--;if(version===generation){summary();render();await refresh({quiet:true});settleEV();summary();schedulePoll()}}
 }
 function mediaBinding(id){return MC.IDS.includes(id)?config.mediaBindings?.[id]:MC.OFFICE_IDS.includes(id)?config.officeBindings?.[id]:null}
 function mediaSnapshot(id){const d=MC.state(mediaBinding(id),mediaReadings[id],Date.now(),MC.activityThreshold(id)),working=busy||commandCount>0||groupBusy||lightGroupBusy;return {...d,busy:working,pending:mediaTargets.has(id),canControl:d.canControl&&!working&&!mediaTargets.has(id)&&!dirty()&&!!key&&!!config.server,message:mediaMessages.get(id)||'',reading:mediaReadings[id]?{...mediaReadings[id]}:null}}
 function mediaEnsureFresh(ids=MC.IDS){if(ids.some(id=>mediaBinding(id)&&(!MC.state(mediaBinding(id),mediaReadings[id]).canControl||Date.now()-mediaReadings[id].fetchedAt>10000)))return refresh({quiet:true})}
 function settleMedia(){for(const [id,target]of mediaTargets)if(MC.state(mediaBinding(id),mediaReadings[id]).on===target){mediaTargets.delete(id);mediaMessages.set(id,'Alimentação '+(target?'ligada':'desligada')+' · estado confirmado pelo Shelly.')}}
 function commandMedia(id,on){if(MC.IDS.includes(id))return commandMediaDevice(id,on,false)}
 function commandOffice(id,on){if(MC.OFFICE_IDS.includes(id))return commandMediaDevice(id,on,true)}
 function officeEnsureFresh(){return mediaEnsureFresh(MC.OFFICE_IDS)}
 async function commandMediaDevice(id,on,office){
  if(!(office?MC.OFFICE_IDS:MC.IDS).includes(id)||typeof on!=='boolean'||busy||commandCount||groupBusy||lightGroupBusy||mediaTargets.has(id))return;
  if(!mediaSnapshot(id).canControl){mediaMessages.set(id,'Atualize o estado e confirme a associação.');summary();return}
  const version=generation,payload=office?MC.officeCommand(config.officeBindings,id,on):MC.command(config.mediaBindings,id,on);commandCount++;mediaMessages.set(id,'A enviar pedido ao Shelly…');summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');mediaTargets.set(id,on);pollUntil=Date.now()+90000;pollFloor=Date.now()+6000;mediaMessages.set(id,'Pedido aceite. A aguardar confirmação do Shelly.')}
  catch(error){if(version===generation)mediaMessages.set(id,error.message)}
  finally{commandCount--;if(version===generation){summary();await refresh({quiet:true});settleMedia();summary();schedulePoll()}}
 }
 function fanSnapshot(){const valid=AL.fresh(fanReading),working=busy||commandCount>0||groupBusy||lightGroupBusy;return {configured:!!config.fan,on:valid?fanReading.on:null,reading:fanReading?{...fanReading}:null,busy:working,pending:fanTarget!==null,canControl:!!config.fan&&valid&&!working&&fanTarget===null&&!dirty()&&!!key&&!!config.server,message:fanMessage}}
 function fanCard(){const d=fanSnapshot();return d.configured?resultCard('cellar','fan',`<p>${d.on===true?'Ligada':d.on===false?'Desligada':'Por confirmar'}</p>`,'Ventoinha da cave'):''}
 function fanEnsureFresh(){if(config.fan&&(!AL.fresh(fanReading)||Date.now()-fanReading.fetchedAt>10000))return refresh({quiet:true})}
 function settleFan(){if(fanTarget!==null&&AL.fresh(fanReading)&&fanReading.on===fanTarget){fanMessage='Estado confirmado pelo Shelly: '+(fanTarget?'ligada.':'desligada.');fanTarget=null}}
 async function commandFan(on){
  if(typeof on!=='boolean'||busy||commandCount||groupBusy||lightGroupBusy||fanTarget!==null)return;
  if(!fanSnapshot().canControl){fanMessage='Atualize o estado e confirme a associação da ventoinha.';summary();return}
  const version=generation,payload={id:config.fan.deviceId,channel:config.fan.channel,type:'switch',on};commandCount++;fanMessage=on?'A ligar a ventoinha…':'A desligar a ventoinha…';summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');fanTarget=on;pollUntil=Date.now()+90000;pollFloor=Date.now()+6000;fanMessage='Comando aceite. A aguardar confirmação do Shelly.'}
  catch(error){if(version===generation)fanMessage=error.message}
  finally{commandCount--;if(version===generation){summary();await refresh({quiet:true});settleFan();settleMedia();summary();schedulePoll()}}
 }
 function alarmSnapshot(){const d=AL.state(config.alarm,alarmReadings),working=busy||commandCount>0||groupBusy||lightGroupBusy;return {...d,busy:working,pending:alarmTarget!==null,canControl:d.canControl&&!working&&alarmTarget===null&&!dirty()&&!!key&&!!config.server,message:alarmMessage,readings:structuredClone(alarmReadings)}}
 function alarmCard(){const d=alarmSnapshot();if(!d.configured)return '';return resultCard('cellar','alarm',`<dl><div><dt>Armação</dt><dd>${d.armed===true?'Armado':d.armed===false?'Desarmado':'Por confirmar'}</dd></div><div><dt>Disparo</dt><dd>${d.triggered===true?'A tocar':d.triggered===false?'Sem disparo':'Por confirmar'}</dd></div></dl>`,'Alarme da cave')}
 function alarmEnsureFresh(){if(AL.ROLES.some(role=>config.alarm?.[role]&&(!AL.fresh(alarmReadings[role])||Date.now()-alarmReadings[role].fetchedAt>10000)))return refresh({quiet:true})}
 function settleAlarm(){if(alarmTarget!==null&&AL.state(config.alarm,alarmReadings).armed===alarmTarget){alarmMessage='Armação confirmada pelo Shelly: '+(alarmTarget?'armado.':'desarmado.');alarmTarget=null}}
 async function commandAlarm(armed){
  if(typeof armed!=='boolean'||busy||commandCount||groupBusy||lightGroupBusy||alarmTarget!==null)return;
  if(!alarmSnapshot().canControl){alarmMessage='Atualize o estado e confirme a associação do Shelly de armação.';summary();return}
  const version=generation,payload=AL.command(config.alarm,armed);commandCount++;alarmMessage=armed?'A enviar pedido de armação…':'A enviar pedido para desarmar…';summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');alarmTarget=armed;pollUntil=Date.now()+90000;pollFloor=Date.now()+6000;alarmMessage='Comando aceite. A aguardar o estado do Shelly de armação.'}
  catch(error){if(version===generation)alarmMessage=error.message}
  finally{commandCount--;if(version===generation){summary();await refresh({quiet:true});settleAlarm();settleFan();settleMedia();summary();schedulePoll()}}
 }
 function lampSnapshot(id){const d=lightReading(id),configured=!!lightBinding(id),working=busy||commandCount>0||lightGroupBusy||groupBusy;
  return {configured,state:d?.online&&!d.error&&typeof d.on==='boolean'?{on:d.on,checkedAt:d.fetchedAt}:null,busy:working,ready:configured&&!working&&!dirty()&&!!key&&!!config.server&&CORE.canLightControl(d),error:!configured?'':(!CORE.canLightControl(d)?lightCaption(id):(/não|erro|falh|indispon|demor|atualize/i.test(lightMessages.get(id)||'')?lightMessages.get(id):''))};
 }
 window.CasaShelly={commandOffice,officeEnsureFresh,mediaSnapshot,mediaEnsureFresh,commandMedia,inspectDoorSensor,inspectDoorGateway,sensorMarkup,sensorCaption,fanSnapshot,fanEnsureFresh,commandFan,alarmSnapshot,alarmEnsureFresh,commandAlarm,energySnapshot,energyEnsureFresh,doorSnapshot,doorEnsureFresh,evSnapshot,commandEV,evEnsureFresh,lampSnapshot,isBusy:()=>busy||commandCount>0||lightGroupBusy||groupBusy||alarmTarget!==null||fanTarget!==null||mediaTargets.size>0,sensorBinding,sensorReading,lightBinding,lightReading,lightCaption,lightValue,commandLight,commandAllLights,binding,reading,roomCaption:caption,decorateRoom,reapply,refresh,command,commandAll,ensureFresh};
 fill();summary();reapply();render();
 if(key&&config.server&&CORE.deviceIds(config).length)refresh({quiet:true});
 setInterval(()=>{if(document.visibilityState==='visible'&&(Object.keys(config.mediaBindings||{}).length||Object.keys(config.officeBindings||{}).length||config.fan||window.CasaEnergyCore.binding(config)||config.door||config.cellarDoor||AL.ROLES.some(k=>config.alarm?.[k])||EV.ROLES.some(k=>config.ev?.[k]))&&key&&config.server&&!busy&&!commandCount&&!lightGroupBusy&&!groupBusy&&!dirty())refresh({quiet:true})},15000);
 setInterval(()=>{if(document.visibilityState==='visible'&&Object.keys(config.sensorBindings||{}).length&&key&&config.server&&!busy&&!commandCount&&!lightGroupBusy&&!groupBusy&&!dirty())refresh({quiet:true})},60000);
})();
