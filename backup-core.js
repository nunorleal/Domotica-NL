/* Portable local configuration backup. Weather cache is regenerated. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaBackup=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const IDS=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 const BLINDS=IDS.slice(0,4),MAX_BYTES=2*1024*1024;
 const allowed=k=>/^casa-nl-[a-z0-9-]+$/.test(k)&&k!=='casa-nl-weather-v1';
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function fail(){throw new Error('Ficheiro de cópia de segurança inválido ou incompatível.')}
 function safe(v,depth=0){if(depth>30)fail();if(v===null||typeof v==='boolean'||typeof v==='string')return;if(typeof v==='number'){if(!Number.isFinite(v))fail();return}if(Array.isArray(v)){v.forEach(x=>safe(x,depth+1));return}if(!object(v))fail();for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))fail();safe(x,depth+1)}}
 function validateStorage(data){
  if(!object(data)||Object.keys(data).length>100)fail();safe(data);
  for(const k of Object.keys(data))if(!allowed(k))fail();
  const states=data['casa-nl-realistic-v2'];
  if(!Array.isArray(states)||states.length!==IDS.length||new Set(states.map(r=>r?.id)).size!==IDS.length)fail();
  for(const r of states){if(!object(r)||!IDS.includes(r.id)||typeof r.light!=='boolean')fail();if(BLINDS.includes(r.id)&&(!Number.isFinite(r.blind)||r.blind<0||r.blind>100))fail()}
  data['casa-nl-realistic-v2']=states.map(r=>({id:r.id,light:r.light,...(BLINDS.includes(r.id)?{blind:r.blind}:{})}));
  const layout=data['casa-nl-room-layout-v1'];if(!object(layout)||Object.keys(layout).length!==IDS.length)fail();
  for(const [id,r]of Object.entries(layout)){if(!IDS.includes(id)||!object(r)||!(r.name===null||(typeof r.name==='string'&&r.name.trim()&&r.name.length<=40))||!Number.isFinite(r.lx)||!Number.isFinite(r.ly)||r.lx<0||r.lx>100||r.ly<0||r.ly>100)fail()}
  if(typeof data['casa-nl-show-banners']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-show-blind-banners')&&typeof data['casa-nl-show-blind-banners']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-shelly-cloud-v1')){try{const core=typeof module==='object'&&module.exports?require('./shelly-core.js'):globalThis.ShellyCore;data['casa-nl-shelly-cloud-v1']=core.config(data['casa-nl-shelly-cloud-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-meteo-v1')){try{const core=typeof module==='object'&&module.exports?require('./meteo-core.js'):globalThis.CasaMeteoCore;data['casa-nl-meteo-v1']=core.preferences(data['casa-nl-meteo-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-screensaver-v1')){try{const core=typeof module==='object'&&module.exports?require('./meteo-core.js'):globalThis.CasaMeteoCore;data['casa-nl-screensaver-v1']=core.screensaver(data['casa-nl-screensaver-v1'])}catch{fail()}}
  const env=data['casa-nl-environment-v1'];if(!object(env)||!['auto','day','night'].includes(env.mode))fail();
  const c=env.city;if(c!==null&&(!object(c)||typeof c.name!=='string'||!c.name.trim()||c.name.length>150||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180))fail();
  return data;
 }
 function create(storage,appVersion){const data={};for(let i=0;i<storage.length;i++){const k=storage.key(i);if(allowed(k)){try{data[k]=JSON.parse(storage.getItem(k))}catch{throw new Error('Não foi possível ler os dados guardados: '+k)}}}validateStorage(data);return {application:'Casa NL',schemaVersion:1,appVersion,exportedAt:new Date().toISOString(),data}}
 function parse(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('O ficheiro deve ter no máximo 2 MB.');let value;try{value=JSON.parse(text)}catch{fail()}if(!object(value)||value.application!=='Casa NL'||value.schemaVersion!==1)fail();validateStorage(value.data);return value}
 function restore(storage,backup){const data=validateStorage(backup.data),previous=new Map();for(let i=0;i<storage.length;i++){const k=storage.key(i);if(allowed(k))previous.set(k,storage.getItem(k))}try{for(const k of previous.keys())storage.removeItem(k);for(const [k,v]of Object.entries(data))storage.setItem(k,JSON.stringify(v))}catch(e){try{for(const k of Object.keys(data))storage.removeItem(k);for(const [k,v]of previous)storage.setItem(k,v)}catch{}throw new Error('Não foi possível guardar a importação neste navegador. Verifique o espaço disponível.')}}
 return {create,parse,restore,MAX_BYTES};
});
