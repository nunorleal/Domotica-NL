/* The screensaver never sends a device command. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaMeteoCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function idle({now=Date.now,delay=30000,onIdle,blocked=()=>false}){
  let last=now(),active=true;
  return {activity(){last=now()},setActive(value){active=value;last=now()},setDelay(value){delay=value;last=now()},tick(){if(active&&delay>0&&now()-last>=delay&&!blocked()){active=false;onIdle()}},get active(){return active}};
 }
 const SCREENSAVER_SECONDS=[0,15,30,60,120,300,600,900,1800];
 function screensaver(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!SCREENSAVER_SECONDS.includes(value.seconds))throw Error('Tempo do protetor de ecrã inválido.');
  return {seconds:value.seconds};
 }
 function preferences(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Preferências MeteoNL inválidas.');
  const choices={night:['auto','on','off'],temp:['C','F'],wind:['kmh','ms','mph'],demo:['auto','sunny','cold','night','rain','storm','fog','sunset']};
  const booleans=['seconds','clock12','animations','dynamic'];const result={};
  for(const [k,v]of Object.entries(value)){
   const valid=booleans.includes(k)?typeof v==='boolean':choices[k]?choices[k].includes(v):['start','end'].includes(k)?typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v):['dim','effects','cold'].includes(k)?Number.isFinite(v)&&v>=(k==='cold'?-30:0)&&v<=(k==='cold'?40:100):false;
   if(!valid)throw Error('Preferências MeteoNL inválidas.');result[k]=v;
  }return result;
 }
 async function lampAction(s,settings){
  if(!s)return;
  const lamp=s.lampSnapshot('master');
  if(!lamp.configured){settings();return}
  if(lamp.busy)return;
  if(!lamp.ready||!lamp.state){await s.refresh({quiet:true});return}
  await s.commandLight('master',!lamp.state.on);
 }
 return {idle,preferences,lampAction,screensaver};
});
