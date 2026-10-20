/* Cloud configuration and Gen1/Gen2+ status normalization, shared with tests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ShellyCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const ROOM_IDS=['master','bedroom2','living','kitchen'];
 function server(value){let u;try{u=new URL(value.includes('://')?value:'https://'+value)}catch{throw Error('Indique o servidor Shelly Cloud da sua conta.')}if(u.protocol!=='https:'||!/^shelly-[a-z0-9-]+\.shelly\.cloud$/i.test(u.hostname)||u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use apenas o endereço HTTPS do servidor Shelly Cloud, sem caminhos ou parâmetros.');return u.origin}
 function deviceId(value){const id=String(value).trim().toLowerCase().replace(/:/g,'');if(!/^[a-f0-9]{6,32}$/.test(id))throw Error('O ID deve ser o Device ID hexadecimal do Shelly (não o nome nem o endereço IP).');return id}
 function config(value){if(!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==1)throw Error('Configuração Shelly incompatível.');const host=value.server?server(value.server):'';if(typeof value.authKey!=='string'||value.authKey.length>4096||typeof value.rememberKey!=='boolean'||!value.bindings||typeof value.bindings!=='object'||Array.isArray(value.bindings))throw Error('Configuração Shelly inválida.');const bindings={},used=new Set();for(const [room,b]of Object.entries(value.bindings)){if(!ROOM_IDS.includes(room)||!b||!Number.isInteger(b.channel)||b.channel<0||b.channel>15)throw Error('Associação de estore inválida.');const id=deviceId(b.deviceId),key=id+':'+b.channel;if(used.has(key))throw Error('O mesmo Shelly e canal não pode estar associado a dois estores.');used.add(key);bindings[room]={deviceId:id,channel:b.channel}}return {schemaVersion:1,server:host,authKey:value.rememberKey?value.authKey:'',rememberKey:value.rememberKey,bindings}}
 const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 function status(device,channel){
  if(!device||typeof device!=='object')return null;const s=device.status||{},c=s['cover:'+channel]||s.rollers?.[channel],online=device.online===1||device.online===true,position=number(c?.current_pos),errors=Array.isArray(c?.errors)?c.errors.filter(x=>typeof x==='string').slice(0,20):[];
  if(c?.overtemperature)errors.push('overtemperature');if(c?.safety_switch)errors.push('safety_switch');if(c?.stop_reason&&c.stop_reason!=='normal')errors.push(String(c.stop_reason).slice(0,80));
  return {online,hasCover:!!c,model:String(device.code||device.type||'').slice(0,100),generation:String(device.gen||'').slice(0,20),position:position!==null&&position>=0&&position<=100?position:null,state:typeof c?.state==='string'?(s['cover:'+channel]?c.state:({open:'opening',close:'closing',stop:'stopped'}[c.state]||c.state)).slice(0,40):null,calibrated:typeof c?.pos_control==='boolean'?c.pos_control:typeof c?.positioning==='boolean'?c.positioning:null,power:number(c?.apower??c?.power),voltage:number(c?.voltage),current:number(c?.current),energy:number(c?.aenergy?.total),temperature:number(c?.temperature?.tC??s.tmp?.tC),errors};
 }
 function command(binding,position){
  if(!binding||!Number.isInteger(binding.channel)||binding.channel<0||binding.channel>15)throw Error('Associação de estore inválida.');
  if(!(typeof position==='string'&&['open','close','stop'].includes(position))&&!(typeof position==='number'&&Number.isFinite(position)&&position>=0&&position<=100))throw Error('Comando ou percentagem inválidos.');
  return {id:deviceId(binding.deviceId),channel:binding.channel,position};
 }
 function canControl(d,position,now=Date.now()){
  if(!d||!d.hasCover||d.missing)return false;
  if(position==='stop')return true;
  if(!d.online||d.error||!Number.isFinite(d.fetchedAt)||now-d.fetchedAt>120000)return false;
  if(d.errors?.length||d.state==='calibrating')return false;
  return typeof position!=='number'||(d.calibrated===true&&Number.isFinite(d.position));
 }
 function groupCommand(bindings,position){
  if(!['open','close'].includes(position)||!bindings||typeof bindings!=='object')throw Error('Comando conjunto inválido.');
  const used=new Set(),devices=[];
  for(const [room,b]of Object.entries(bindings)){if(!ROOM_IDS.includes(room))throw Error('Divisão inválida.');const c=command(b,position),id=c.id+'_'+c.channel;if(used.has(id))throw Error('Estores repetidos.');used.add(id);devices.push({id:c.id,channel:c.channel})}
  if(!devices.length||devices.length>4)throw Error('Selecione entre 1 e 4 estores.');return {devices,position};
 }
 return {ROOM_IDS,server,deviceId,config,status,command,canControl,groupCommand};
});
