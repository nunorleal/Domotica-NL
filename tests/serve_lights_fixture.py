"""UI-only fixture on 8083: fake credentials and fetch interception, never physical devices."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
ROOT=Path(__file__).resolve().parents[1]
SHIM=r'''<script>
(()=>{
const cloud={schemaVersion:1,server:'https://shelly-1-eu.shelly.cloud',authKey:'',rememberKey:false,bindings:{},lightBindings:{master:{deviceId:'deadbeef1111',channel:0,type:'switch'},bedroom2:{deviceId:'deadbeef2222',channel:1,type:'light'},living:{deviceId:'deadbeef3333',channel:0,type:'switch'}}};
if(new URLSearchParams(location.search).has('wrongtype'))for(const b of Object.values(cloud.lightBindings))b.type='switch';
const sensorTestParams=new URLSearchParams(location.search);if(sensorTestParams.has('sensors')||sensorTestParams.has('sensorsonly'))cloud.sensorBindings={living:{deviceId:'deadbeef4444',temperatureChannel:0,humidityChannel:0},master:{deviceId:'deadbeef5555',temperatureChannel:0,humidityChannel:0}};if(sensorTestParams.has('sensorsonly'))cloud.lightBindings={};
if(sensorTestParams.has('ev')){cloud.ev={thresholdWatts:50,meter:{deviceId:'deadbeef6666',channel:0,component:'emeter'},relay:{deviceId:'deadbeef6666',channel:sensorTestParams.has('evbadchannel')?1:0}};if(sensorTestParams.has('evtotal'))cloud.ev.totalMeter={deviceId:'deadbeef7777',channel:0,component:'emeter'}}
if(sensorTestParams.has('energy')&&cloud.ev)cloud.ev.meter.channel=1;
if(sensorTestParams.has('cellartemp'))cloud.sensorBindings={...cloud.sensorBindings,cellar:{deviceId:'deadbeefcc01',temperatureChannel:0,humidityChannel:0,type:'door-window2'}};
localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));sessionStorage.setItem('casa-nl-shelly-session-v1',JSON.stringify({server:cloud.server,key:'FAKE-ISOLATED-LIGHTS-ONLY'}));
if(sensorTestParams.has('door')){cloud.door={deviceId:sensorTestParams.has('bluopen')?'XB66172384118439':'deadbeef8888',source:sensorTestParams.has('bthome')?'bthome':'blu',component:sensorTestParams.has('bthome')?200:0};localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));}
if(sensorTestParams.has('cellar')){cloud.cellarDoor={deviceId:'XB12345678901234',source:'blu',component:0};localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));}
if(sensorTestParams.has('alarm')){cloud.alarm={arm:{deviceId:'deadbeefaa01',channel:1,activeWhenOn:true},trigger:{deviceId:'deadbeefaa02',channel:0,activeWhenOn:true}};localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));}
if(sensorTestParams.has('fan')){cloud.fan={deviceId:'deadbeefbb01',channel:0};localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));}
if(sensorTestParams.has('media')){cloud.mediaBindings=Object.fromEntries(['tv','soundbar','playstation','vodafone','unifi'].map((id,i)=>[id,{deviceId:'deadbeefff0'+i,channel:0}]));cloud.officeBindings={monitor:{deviceId:'deadbeefee01',channel:0}};localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));}
if(sensorTestParams.has('office')){cloud.officeBindings=Object.fromEntries(['monitor','apollo','terramaster','blackdrive'].map((id,i)=>[id,{deviceId:'deadbeefee0'+i,channel:0}]));localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));}
const states={deadbeef1111:false,deadbeef2222:false,deadbeef3333:false},types={deadbeef1111:'switch',deadbeef2222:'light',deadbeef3333:'switch'},channels={deadbeef1111:0,deadbeef2222:1,deadbeef3333:0},commands=[];
if(sensorTestParams.has('alarm')){const m=sensorTestParams.get('alarm');states.deadbeefaa01=['armed','sounding','partial','offline','armoffline'].includes(m);states.deadbeefaa02=['sounding','disarmed-trigger'].includes(m);types.deadbeefaa01=types.deadbeefaa02='switch';channels.deadbeefaa01=1;channels.deadbeefaa02=0;}
states.deadbeefbb01=sensorTestParams.get('fan')==='on';types.deadbeefbb01='switch';channels.deadbeefbb01=0;
if(sensorTestParams.has('livinglight'))states.deadbeef3333=sensorTestParams.get('livinglight')==='on';
if(sensorTestParams.has('media'))for(let i=0;i<5;i++){const id='deadbeefff0'+i;states[id]=i%2===1||sensorTestParams.has('mediaactive')&&[0,2].includes(i)||sensorTestParams.has('mediastandby')&&[0,2].includes(i);types[id]='switch';channels[id]=0;}
if(sensorTestParams.has('office'))for(let i=0;i<4;i++){const id='deadbeefee0'+i;states[id]=i%2===0;types[id]='switch';channels[id]=0;}
let evMode=sensorTestParams.get('ev')||'charging';if(sensorTestParams.has('ev')){states.deadbeef6666=evMode!=='off';types.deadbeef6666='switch';channels.deadbeef6666=0;}
 document.addEventListener('DOMContentLoaded',()=>{if(!sensorTestParams.has('ev')||sensorTestParams.has('evproof'))return;const panel=document.createElement('aside');panel.style='position:fixed;top:80px;right:5px;z-index:9000;display:flex;gap:4px';for(const [mode,label]of [['charging','Carga fictícia'],['idle','Espera fictícia'],['offline','Offline fictício']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{evMode=mode});panel.append(b)}const hide=document.createElement('button');hide.type='button';hide.textContent='Ocultar controlos de teste';hide.addEventListener('click',()=>{panel.hidden=true;panel.style.display='none'});panel.append(hide);panel.style.color='#163f43';document.body.append(panel)});
const native=window.fetch.bind(window),params=new URLSearchParams(location.search);window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(!url.hostname.endsWith('.shelly.cloud'))return native(input,options);
 const data=JSON.parse(options.body||'{}');let status=200,result={};
 if(params.has('wrongtype'))for(const id of Object.keys(types))types[id]='light';
 if(params.has('wrongchannel'))channels.deadbeef2222=2;
 if(url.pathname==='/v2/devices/api/get')result=data.ids.map(id=>{
  if(/^deadbeefff0[0-4]$/.test(id))return {id,online:params.get('media')==='offline'?0:1,status:{relays:[{ison:params.get('media')==='unknown'?null:states[id]}],...(params.has('medianometer')?{}:{meters:[{power:params.has('mediainvalid')?null:params.has('mediastandby')&&['deadbeefff00','deadbeefff02'].includes(id)?0:states[id]?23.5+Number(id.slice(-1))*8:0,total:720000+Number(id.slice(-1))*60000,is_valid:!params.has('mediainvalid')}]})}};
  if(id==='deadbeefdd01'||id==='e465b8b9c64c'){const m=params.get('gateway');return m==='missing'?null:{id,online:m==='offline'?0:1,status:m==='empty'?{}:{'bthomesensor:200':{value:84},'bthomesensor:201':{value:m==='open',last_updated_ts:Date.now()/1000},'bthomesensor:202':{value:28.2}}}}
  if(id==='deadbeefcc01'){const mode=params.get('cellartemp');return {id,online:mode==='offline'?0:1,code:'SHDW-2',status:{is_valid:true,tmp:{tC:mode==='invalid'?null:17.6,is_valid:true},bat:{value:84}}}}
  if(id==='deadbeefbb01')return {id,online:params.get('fan')==='offline'?0:1,status:{relays:[{ison:params.get('fan')==='unknown'?null:states[id]}]}};
  if(id==='deadbeefaa01'||id==='deadbeefaa02'){const m=params.get('alarm'),arm=id==='deadbeefaa01',online=m!=='offline'&&!(arm&&m==='armoffline')&&!(!arm&&m==='partial');return {id,online:online?1:0,code:'MOCK-ALARM',status:{relays:arm?[{ison:false},{ison:m==='unknown'?null:states[id]}]:[{ison:states[id]}]}}}
  if(/^deadbeefee0[0-3]$/.test(id)&&params.has('office')){const i=Number(id.slice(-1)),unknown=params.get('office')==='unknown',offline=params.get('office')==='offline';return {id,online:offline?0:1,status:{'switch:0':{output:unknown?null:states[id],apower:unknown?null:states[id]?25+i*12:0,aenergy:{total:15000+i*1000}}}};}
  if(id==='XB12345678901234'){const mode=params.get('cellar');return {id,online:mode==='offline'?0:1,status:{'window:0':params.has('cellarbluopen')?{open:mode==='unknown'?null:mode==='open'}:{value:mode==='unknown'?null:mode==='open'}}}}
  if(id==='XB66172384118439'){const mode=params.get('door');return {id,online:mode==='offline'?0:1,status:{'window:0':{id:0,open:mode==='unknown'?null:mode==='open'}}}}
  if(id==='deadbeef8888'){const mode=params.get('door'),value=mode==='unknown'?'invalid':mode==='open';return {id,online:mode==='offline'?0:1,status:params.has('bthome')?{'bthomesensor:200':{value,last_updated_ts:Date.now()/1000}}:{'window:0':{value}}}}
  if(id==='deadbeef6666'&&params.has('energy')){const mode=params.get('energy'),values={green:[1200,100],yellow:[4500,300],orange:[5700,1800],red:[6500,1200],over:[7300,400],unknown:[2000,null]},[power,reactive]=values[mode]||values.green;return {id,online:mode==='offline'?0:1,code:'MOCK-SHELLY-EM',status:{relays:[{ison:states[id]}],emeters:[{power,reactive,total:6949600,voltage:230,is_valid:mode!=='invalid'},{power:evMode==='idle'?3.2:3600,reactive:0,total:128450,is_valid:true}]}}}
  if(id==='deadbeef6666')return {id,online:evMode==='offline'?0:1,code:'MOCK-SHELLY-EM',status:{relays:[{ison:states[id]}],emeters:[{power:evMode==='unknown'?null:!states[id]?0:evMode==='idle'?3.2:3600,total:128450,is_valid:true}]}};
  if(id==='deadbeef7777')return {id,online:1,code:'MOCK-TOTAL-EM',status:{emeters:[{power:3600,total:450000,is_valid:true}]}};
  if(id==='deadbeef4444')return {id,online:1,code:'MOCK-HT-G1',status:{is_valid:true,tmp:{tC:21.8,is_valid:true},hum:{value:56,is_valid:true},bat:{value:73}}};
  if(id==='deadbeef5555')return {id,online:params.has('sensoroffline')?0:1,code:'MOCK-HT-G3',status:{'temperature:0':{tC:params.has('invalidsensor')?null:19.6},'humidity:0':{rh:49.1},'devicepower:0':{battery:{percent:85}}}};
  return {id,online:params.has('offline')&&id==='deadbeef2222'?0:1,code:'MOCK-LAMP',status:{[types[id]+':'+channels[id]]:{output:states[id],errors:[]}}};
 }).filter(Boolean);
 else if(['/v2/devices/api/set/switch','/v2/devices/api/set/light'].includes(url.pathname)){
  commands.push({path:url.pathname,...data});
  const log=document.getElementById('fixture-command-log');if(log)log.textContent=JSON.stringify(commands);
  if((params.has('reject')&&data.id==='deadbeef2222')||(params.has('evreject')&&data.id==='deadbeef6666')||(params.has('mediareject')&&data.id==='deadbeefff00')||(params.has('fanreject')&&data.id==='deadbeefbb01')||(params.has('alarmreject')&&data.id==='deadbeefaa01')||data.id==='deadbeefaa02'){status=400;result={error:'DEVICE_FAILED_COMMAND'}}
  else if(!(data.id in states)||url.pathname!=='/v2/devices/api/set/'+types[data.id]||data.channel!==channels[data.id]||typeof data.on!=='boolean'){status=400;result={error:'DEVICE_INVALID_CHANNEL'}}
  else if(!(params.has('alarmhold')&&data.id==='deadbeefaa01')&&!(params.has('mediahold')&&/^deadbeefff0/.test(data.id)))states[data.id]=data.on;
 }else throw Error('Forbidden Cloud route in isolated test');
 return new Response(JSON.stringify(result),{status,headers:{'Content-Type':'application/json'}});
};
})();</script>'''
class Fixture(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] not in ('/','/index.html'):return super().do_GET()
        text=(ROOT/'index.html').read_text().replace('<head>','<head>'+SHIM).replace('<body>','<body><aside style="position:fixed;bottom:8px;right:8px;z-index:1000;background:#a43d20;color:white;padding:6px;font-size:11px;pointer-events:none">TESTE · dispositivos fictícios</aside><pre id="fixture-command-log" hidden>[]</pre>')
        body=text.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(body)
if __name__=='__main__':
    print('Isolated light fixture http://127.0.0.1:8083/ (no physical devices)',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8083),partial(Fixture,directory=str(ROOT))).serve_forever()
