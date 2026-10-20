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
localStorage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(cloud));sessionStorage.setItem('casa-nl-shelly-session-v1',JSON.stringify({server:cloud.server,key:'FAKE-ISOLATED-LIGHTS-ONLY'}));
const states={deadbeef1111:false,deadbeef2222:false,deadbeef3333:false},types={deadbeef1111:'switch',deadbeef2222:'light',deadbeef3333:'switch'},channels={deadbeef1111:0,deadbeef2222:1,deadbeef3333:0},commands=[];
const native=window.fetch.bind(window),params=new URLSearchParams(location.search);window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(!url.hostname.endsWith('.shelly.cloud'))return native(input,options);
 const data=JSON.parse(options.body||'{}');let status=200,result={};
 if(params.has('wrongtype'))for(const id of Object.keys(types))types[id]='light';
 if(params.has('wrongchannel'))channels.deadbeef2222=2;
 if(url.pathname==='/v2/devices/api/get')result=data.ids.map(id=>{
  if(id==='deadbeef4444')return {id,online:1,code:'MOCK-HT-G1',status:{is_valid:true,tmp:{tC:21.8,is_valid:true},hum:{value:56,is_valid:true},bat:{value:73}}};
  if(id==='deadbeef5555')return {id,online:params.has('sensoroffline')?0:1,code:'MOCK-HT-G3',status:{'temperature:0':{tC:params.has('invalidsensor')?null:19.6},'humidity:0':{rh:49.1},'devicepower:0':{battery:{percent:85}}}};
  return {id,online:params.has('offline')&&id==='deadbeef2222'?0:1,code:'MOCK-LAMP',status:{[types[id]+':'+channels[id]]:{output:states[id],errors:[]}}};
 });
 else if(['/v2/devices/api/set/switch','/v2/devices/api/set/light'].includes(url.pathname)){
  commands.push({path:url.pathname,...data});
  const log=document.getElementById('fixture-command-log');if(log)log.textContent=JSON.stringify(commands);
  if(params.has('reject')&&data.id==='deadbeef2222'){status=400;result={error:'DEVICE_FAILED_COMMAND'}}
  else if(!(data.id in states)||url.pathname!=='/v2/devices/api/set/'+types[data.id]||data.channel!==channels[data.id]||typeof data.on!=='boolean'){status=400;result={error:'DEVICE_INVALID_CHANNEL'}}
  else states[data.id]=data.on;
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
