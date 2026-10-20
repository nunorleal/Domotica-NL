/* Settings backup controls; import never sends commands to devices. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);let pending=null;
 function status(message,error=false){$('backup-status').textContent=message;$('backup-status').classList.toggle('error',error)}
 function clear(){pending=null;$('backup-preview').hidden=true;$('backup-file').value=''}
 $('export-data').addEventListener('click',()=>{
  try{
   persist();persistRoomLayout();
   // Always include defaults even before the user has changed a preference.
   const env=CasaEnvironment.getState();localStorage.setItem('casa-nl-environment-v1',JSON.stringify({city:env.city,mode:env.mode}));localStorage.setItem('casa-nl-show-banners',JSON.stringify(labels));localStorage.setItem('casa-nl-show-blind-banners',JSON.stringify(showBlindBanners));
   const version=document.querySelector('[data-app-version]').textContent.replace(/^Versão\s*/,'').trim();
   const backup=CasaBackup.create(localStorage,version),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=`casa-nl-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Cópia de segurança exportada. Guarde o ficheiro JSON num local seguro.');
  }catch(e){status(e.message||'Não foi possível exportar os dados.',true)}
 });
 $('import-data').addEventListener('click',()=>{clear();$('backup-file').click()});
 $('backup-file').addEventListener('change',async()=>{
  const file=$('backup-file').files[0];if(!file)return;
  try{
   if(file.size>CasaBackup.MAX_BYTES)throw new Error('O ficheiro deve ter no máximo 2 MB.');
   pending=CasaBackup.parse(await file.text());
   // Reject room centres outside their respective floor polygons.
   for(const [id,r]of Object.entries(pending.data['casa-nl-room-layout-v1']))if(!BannerGeometry.rectFits(roomPolygons(id),{x:r.lx*10.24,y:140+r.ly*11.8},1,1))throw new Error('O ficheiro contém uma posição de divisão inválida.');
   const env=pending.data['casa-nl-environment-v1'],shellyKeys=Object.keys(pending.data).filter(k=>k.includes('shelly'));
   $('backup-summary').textContent=`8 divisões · ${env.city?.name||'Cidade por selecionar'} · ${shellyKeys.length?'Inclui configuração Shelly':'Sem configuração Shelly guardada'}. Esta operação substitui a configuração atual neste navegador.`;
   $('backup-preview').hidden=false;status('Ficheiro validado. Pronto para restaurar.');
  }catch(e){clear();status(e.message||'Não foi possível ler o ficheiro.',true)}
 });
 $('cancel-import').addEventListener('click',()=>{clear();status('Importação cancelada. Os dados atuais foram mantidos.')});
 $('confirm-import').addEventListener('click',()=>{
  if(!pending)return;
  try{
   CasaBackup.restore(localStorage,pending);
   for(const id of [...motions.keys()])stopMotion(id);
   // The pagehide persistence must use imported states, never the previous rooms.
   const saved=pending.data['casa-nl-realistic-v2'];rooms=defaults.map(r=>({...r,...saved.find(s=>s.id===r.id)}));
   restoreRoomLayout();persist();window.location.reload();
  }catch(e){status(e.message||'Não foi possível importar os dados.',true)}
 });
})();
