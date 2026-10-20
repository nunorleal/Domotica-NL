/* Direct Cloud v2 transport: static hosting, serialized requests, no command retries. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./shelly-core.js'));else root.ShellyTransport=factory(root.ShellyCore)})(typeof window==='undefined'?globalThis:window,function(CORE){
 'use strict';
 const errors={DEVICE_OFFLINE:'O Shelly está offline.',DEVICE_NOT_FOUND:'ID não encontrado nesta conta.',DEVICE_INVALID_CHANNEL:'Canal inválido para este Shelly.',DEVICE_INVALID_MODE:'O Shelly não está em modo estore.',DEVICE_FAILED_COMMAND:'O Shelly recusou o comando.',DEVICE_UNSUPPORTED_COMMAND:'Comando não suportado pelo Shelly.',BAD_REQUEST:'A Shelly Cloud recusou os parâmetros do pedido.',INSTANCE_NOT_FOUND:'O servidor Shelly não encontrou este dispositivo.'};
 function build(credentials,path,payload){
  const host=CORE.server(credentials.server),key=credentials.authKey;
  if(typeof key!=='string'||!key.trim()||key.length>4096)throw Error('Indique a chave de autorização Shelly Cloud.');
  let endpoint,body,keys=[];
  if(path==='status'){
   if(!Array.isArray(payload.ids)||!payload.ids.length||payload.ids.length>10)throw Error('Consulta de dispositivos inválida.');
   endpoint='get';body={ids:[...new Set(payload.ids.map(CORE.deviceId))],select:['status']};
  }else if(path==='cover'){
   endpoint='set/cover';body=CORE.command({deviceId:payload.id,channel:payload.channel},payload.position);
  }else if(path==='covers'){
   if(!Array.isArray(payload.devices)||!payload.devices.length||payload.devices.length>4||!['open','close'].includes(payload.position))throw Error('Comando conjunto inválido.');
   keys=payload.devices.map(d=>{const c=CORE.command({deviceId:d.id,channel:d.channel},payload.position);return c.id+'_'+c.channel});
   if(new Set(keys).size!==keys.length)throw Error('Estores repetidos.');
   endpoint='set/groups';body={cover:{ids:keys,command:{position:payload.position}}};
  }else throw Error('Pedido Shelly inválido.');
  const url=new URL('/v2/devices/api/'+endpoint,host);url.searchParams.set('auth_key',key);
  return {url:url.href,body,keys,path};
 }
 function decode(request,status,text){
  if(status===401||status===403)throw Error('Autorização Shelly recusada. Confirme a chave e o servidor.');
  if(status===429)throw Error('Limite de pedidos Shelly atingido. Aguarde antes de tentar novamente.');
  let data=null;
  try{if(text.trim())data=JSON.parse(text)}catch{throw Error('Resposta inesperada da Shelly Cloud. Atualize os dados antes de repetir um comando.');}
  if(status!==200||data?.error)throw Error(errors[data?.error]||'A Shelly Cloud não confirmou o pedido. Atualize os dados antes de repetir um comando.');
  if(request.path==='status'){
   if(!Array.isArray(data)||data.some(d=>!d||typeof d!=='object'||typeof d.id!=='string'))throw Error('Resposta de estados inesperada da Shelly Cloud.');
   return {devices:data};
  }
  if(data!==null&&(typeof data!=='object'||Array.isArray(data)))throw Error('Resposta de comando inesperada da Shelly Cloud.');
  if(request.path==='cover')return {accepted:true};
  const failed={};
  if(data?.failedCommands!==undefined){
   if(!data.failedCommands||typeof data.failedCommands!=='object'||Array.isArray(data.failedCommands))throw Error('Resposta de grupo inesperada da Shelly Cloud.');
   for(const [id,code]of Object.entries(data.failedCommands)){
    const k=id.toLowerCase();if(!request.keys.includes(k)||typeof code!=='string'||!code)throw Error('Resultado de grupo inesperado da Shelly Cloud.');
    failed[k]=code;
   }
  }
  return {accepted:request.keys.filter(k=>!Object.hasOwn(failed,k)),failed};
 }
 function create({fetch:send=globalThis.fetch,storage=null,now=()=>Date.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),interval=1100,timeout=20000}={}){
  let chain=Promise.resolve(),last=0;const timestampKey='casa-nl-shelly-last-request';
  function lastTime(){let saved=0;try{saved=Number(storage?.getItem(timestampKey))||0}catch{}return Math.max(last,Number.isFinite(saved)?saved:0)}
  function request(credentials,path,payload,isCurrent=()=>true){
   // Snapshot before queueing: edits must never change a queued command's destination.
   let built;try{built=build(credentials,path,payload)}catch(error){return Promise.reject(error)}
   const task=chain.then(async()=>{
    await sleep(Math.max(0,interval-(now()-lastTime())));
    if(!isCurrent())throw Error('Configuração alterada. O pedido pendente foi cancelado.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    last=now();try{storage?.setItem(timestampKey,String(last))}catch{}
    try{
     const response=await send(built.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(built.body),signal:controller.signal,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'});
     return decode(built,response.status,await response.text());
    }catch(error){
     if(error.name==='AbortError')throw Error('Pedido sem confirmação por demora na ligação. Atualize os dados antes de repetir um comando.');
     if(error instanceof TypeError)throw Error('Não foi possível ligar à Shelly Cloud. Verifique a rede e as permissões do navegador; o pedido não foi repetido.');
     throw error;
    }finally{clearTimeout(timer)}
   });
   chain=task.catch(()=>{});return task;
  }
  return {request};
 }
 return {build,decode,create};
});
