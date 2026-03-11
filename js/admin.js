/* === ADMIN MODULE (lazy-loaded for admin users only) === */
(function(){

/* --- Profile Form State --- */
var formOverlay=document.getElementById('formOverlay');
var formFields=['fName','fAge','fBody','fHeight','fCup','fVal1','fVal2','fVal3','fSpecial','fExp','fStartDate','fLang','fType','fDesc'];
var formLabels=[];
document.getElementById('formClose').onclick=()=>formOverlay.classList.remove('open');
document.getElementById('formCancel').onclick=()=>formOverlay.classList.remove('open');
formOverlay.onclick=e=>{if(e.target===formOverlay)formOverlay.classList.remove('open')};
var formPhotos=[],formPhotosToDelete=[],formNewPhotos=[],formNewFiles=[];
var formCountries=[];
var selectedPhotoIdx=null;
var COUNTRY_OPTIONS=['Chinese','French','Italian','Japanese','Korean','Russian','Thailand','Vietnamese','Other'];

function renderFormCountries(){var wrap=document.getElementById('fCountryOptions');wrap.innerHTML='';
COUNTRY_OPTIONS.forEach(c=>{var btn=document.createElement('div');btn.className='country-opt'+(formCountries.includes(c)?' selected':'');btn.textContent=c;btn.onclick=()=>{if(formCountries.includes(c))formCountries=formCountries.filter(x=>x!==c);else formCountries.push(c);renderFormCountries()};wrap.appendChild(btn)})}

function renderFormPhotos(){var g=document.getElementById('fPhotoGrid'),count=document.getElementById('fPhotoCount');g.innerHTML='';count.textContent=`(${formPhotos.length} / ${MAX_PHOTOS})`;
if(formPhotos.length>1){var hint=document.createElement('div');hint.style.cssText='width:100%;font-family:"Rajdhani",sans-serif;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:1px;margin-bottom:6px';hint.textContent='Click to select · ← → to move · Drag to reorder';g.appendChild(hint)}
var _dragIdx=null;
formPhotos.forEach((src,i)=>{var w=document.createElement('div');w.style.cssText='position:relative;display:inline-block;cursor:grab';w.draggable=true;
var t=document.createElement('div');t.style.cssText='width:64px;height:64px;border:2px solid rgba(255,255,255,0.1);overflow:hidden;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));transition:border-color .15s';if(selectedPhotoIdx===i)t.style.borderColor='var(--accent)';t.innerHTML=`<img src="${src}" style="width:100%;height:100%;object-fit:cover;pointer-events:none">`;
w.onclick=e=>{if(e.target===rm||rm.contains(e.target))return;selectedPhotoIdx=(selectedPhotoIdx===i)?null:i;renderFormPhotos()};
var rm=document.createElement('button');rm.style.cssText='position:absolute;top:1px;right:1px;width:18px;height:18px;background:rgba(0,0,0,0.85);border:1px solid rgba(255,68,68,0.5);color:#ff4444;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:2px;z-index:2';rm.innerHTML='&#x2715;';rm.onclick=e=>{e.stopPropagation();if(selectedPhotoIdx===i)selectedPhotoIdx=null;else if(selectedPhotoIdx>i)selectedPhotoIdx--;var removed=formPhotos[i];if(removed.startsWith('data:')){var ni=formNewPhotos.indexOf(removed);if(ni>=0){formNewPhotos.splice(ni,1);formNewFiles.splice(ni,1)}}formPhotosToDelete.push(removed);formPhotos.splice(i,1);renderFormPhotos()};
w.ondragstart=e=>{_dragIdx=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));setTimeout(()=>{w.style.opacity='0.35'},0)};
w.ondragend=()=>{w.style.opacity='';_dragIdx=null;g.querySelectorAll('div[draggable]').forEach(el=>{var inner=el.querySelector('div');if(inner)inner.style.borderColor='rgba(255,255,255,0.1)'})};
w.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';if(_dragIdx!==null&&_dragIdx!==i)t.style.borderColor='var(--accent)'};
w.ondragleave=()=>{t.style.borderColor='rgba(255,255,255,0.1)'};
w.ondrop=e=>{e.preventDefault();t.style.borderColor='rgba(255,255,255,0.1)';var from=parseInt(e.dataTransfer.getData('text/plain'));var to=i;if(from===to||isNaN(from))return;var moved=formPhotos.splice(from,1)[0];formPhotos.splice(to,0,moved);renderFormPhotos()};
w.appendChild(t);w.appendChild(rm);g.appendChild(w)});
if(formPhotos.length<MAX_PHOTOS){var addBtn=document.createElement('div');addBtn.style.cssText='width:64px;height:64px;border:2px dashed rgba(180,74,255,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--accent);font-size:22px;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));transition:all .3s';addBtn.innerHTML='+';addBtn.onmouseenter=()=>{addBtn.style.borderColor='var(--accent)';addBtn.style.background='rgba(180,74,255,0.06)'};addBtn.onmouseleave=()=>{addBtn.style.borderColor='rgba(180,74,255,0.3)';addBtn.style.background='none'};
addBtn.onclick=()=>{var rem=MAX_PHOTOS-formPhotos.length;if(rem<=0)return;var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=true;inp.onchange=e=>{var files=Array.from(e.target.files).slice(0,rem);var loaded=0;files.forEach(f=>{var r=new FileReader();r.onload=ev=>{formPhotos.push(ev.target.result);formNewPhotos.push(ev.target.result);formNewFiles.push(f.name);loaded++;if(loaded===files.length)renderFormPhotos()};r.readAsDataURL(f)})};inp.click()};g.appendChild(addBtn)}}

function renderFormLabels(){var c=document.getElementById('fLabelTags');c.innerHTML='';
formLabels.forEach((lbl,i)=>{var tag=document.createElement('span');tag.className='label-tag';tag.innerHTML=`${lbl}<button class="label-remove" title="Remove">&times;</button>`;tag.querySelector('.label-remove').onclick=()=>{formLabels.splice(i,1);renderFormLabels()};c.appendChild(tag)})}

/* Label input + arrow key photo reorder (DOMContentLoaded already fired) */
var inp=document.getElementById('fLabelInput');if(inp){inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();var v=sanitize(inp.value);if(v&&!formLabels.includes(v)){formLabels.push(v);renderFormLabels()}inp.value=''}})}
document.addEventListener('keydown',e=>{
  if(!formOverlay.classList.contains('open'))return;
  if(selectedPhotoIdx===null)return;
  if(document.activeElement&&document.activeElement.matches('input,textarea,select'))return;
  if(e.key==='ArrowLeft'&&selectedPhotoIdx>0){e.preventDefault();var moved=formPhotos.splice(selectedPhotoIdx,1)[0];selectedPhotoIdx--;formPhotos.splice(selectedPhotoIdx,0,moved);renderFormPhotos()}
  else if(e.key==='ArrowRight'&&selectedPhotoIdx<formPhotos.length-1){e.preventDefault();var moved=formPhotos.splice(selectedPhotoIdx,1)[0];selectedPhotoIdx++;formPhotos.splice(selectedPhotoIdx,0,moved);renderFormPhotos()}
});

/* Override openForm stub */
window.openForm=function(idx){if(typeof idx==='undefined')idx=-1;document.getElementById('editIndex').value=idx;formPhotosToDelete=[];formNewPhotos=[];formNewFiles=[];selectedPhotoIdx=null;
if(idx>=0){document.getElementById('formTitle').textContent=t('form.editGirl');var g=girls[idx];document.getElementById('fName').value=g.name;var gc=g.country||'';formCountries=Array.isArray(gc)?[...gc]:(gc?[gc]:[]);document.getElementById('fAge').value=g.age;document.getElementById('fBody').value=g.body;document.getElementById('fHeight').value=g.height;document.getElementById('fCup').value=g.cup;document.getElementById('fVal1').value=g.val1||'';document.getElementById('fVal2').value=g.val2||'';document.getElementById('fVal3').value=g.val3||'';document.getElementById('fSpecial').value=g.special||'';document.getElementById('fExp').value=g.exp||'';document.getElementById('fStartDate').value=g.startDate||fmtDate(getAEDTDate());document.getElementById('fLang').value=g.lang||'';document.getElementById('fType').value=g.type||'';document.getElementById('fDesc').value=g.desc;formPhotos=[...(g.photos||[])];formLabels=[...(g.labels||[])]}
else{document.getElementById('formTitle').textContent=t('form.addGirl');formFields.forEach(id=>document.getElementById(id).value='');document.getElementById('fStartDate').value=fmtDate(getAEDTDate());formPhotos=[];formLabels=[];formCountries=[]}renderFormPhotos();renderFormLabels();renderFormCountries();formOverlay.classList.add('open')};

/* Save handler */
document.getElementById('formSave').onclick=async()=>{
var req=[{id:'fName',label:'Name'},{id:'fAge',label:'Age'},{id:'fBody',label:'Body Size'},{id:'fHeight',label:'Height'},{id:'fCup',label:'Cup Size'},{id:'fExp',label:'Experience'},{id:'fVal3',label:'Value 3'},{id:'fStartDate',label:'Start Date'},{id:'fLang',label:'Language'},{id:'fType',label:'Type'},{id:'fDesc',label:'Description'}];
for(var f of req){var el=document.getElementById(f.id);if(!el.value.trim()){el.focus();showToast(f.label+' is required','error');return}}
if(formCountries.length===0){showToast('Country is required','error');return}
if(formPhotos.length===0){showToast('At least one photo is required','error');return}
var name=sanitize(document.getElementById('fName').value);var saveBtn=document.getElementById('formSave');saveBtn.textContent='SAVING...';saveBtn.style.pointerEvents='none';
try{for(var url of formPhotosToDelete){if(url.includes('githubusercontent.com'))await deleteFromGithub(url)}
var finalPhotos=[];for(var src of formPhotos){if(src.startsWith('data:')){if(GT){var ni=formNewPhotos.indexOf(src);finalPhotos.push(await uploadToGithub(src,name,ni>=0?formNewFiles[ni]:genFn()))}else finalPhotos.push(src)}else finalPhotos.push(src)}
var special=document.getElementById('fSpecial').value.trim(),lang=document.getElementById('fLang').value.trim(),type=document.getElementById('fType').value.trim(),desc=sanitize(document.getElementById('fDesc').value);
var o={name,location:'Empire',country:[...formCountries],age:document.getElementById('fAge').value.trim(),body:document.getElementById('fBody').value.trim(),height:document.getElementById('fHeight').value.trim(),cup:document.getElementById('fCup').value.trim(),val1:document.getElementById('fVal1').value.trim(),val2:document.getElementById('fVal2').value.trim(),val3:document.getElementById('fVal3').value.trim(),special,exp:document.getElementById('fExp').value.trim(),startDate:document.getElementById('fStartDate').value.trim(),lang,type,desc,specialJa:special,langJa:lang,typeJa:type,descJa:desc,photos:finalPhotos,labels:[...formLabels],labelsJa:[...formLabels],lastModified:new Date().toISOString()};
var idx=parseInt(document.getElementById('editIndex').value);if(idx>=0)girls[idx]=o;else girls.push(o);
if(await saveData()){logAdminAction(idx>=0?'profile_edit':'profile_add',name);formOverlay.classList.remove('open');renderFilters();renderGrid();renderRoster();renderHome();if(document.getElementById('profilePage').classList.contains('active')&&idx>=0)showProfile(idx);showToast(idx>=0?'Profile updated':'Profile added')}}catch(err){showToast('Error: '+err.message,'error')}finally{saveBtn.textContent='SAVE';saveBtn.style.pointerEvents='auto'}};

/* --- Delete Profile --- */
var deleteOverlay=document.getElementById('deleteOverlay');
var deleteTarget=-1;
document.getElementById('deleteCancel').onclick=()=>deleteOverlay.classList.remove('open');
deleteOverlay.onclick=e=>{if(e.target===deleteOverlay)deleteOverlay.classList.remove('open')};

window.openDelete=function(idx){deleteTarget=idx;document.getElementById('deleteMsg').textContent=`Remove "${girls[idx].name}" from the roster?`;deleteOverlay.classList.add('open')};

document.getElementById('deleteConfirm').onclick=async()=>{if(deleteTarget>=0){var g=girls[deleteTarget];if(g.photos&&GT)for(var url of g.photos){if(url.includes('githubusercontent.com'))await deleteFromGithub(url)}var deletedName=g.name;girls.splice(deleteTarget,1);await saveData();logAdminAction('profile_delete',deletedName);deleteTarget=-1;deleteOverlay.classList.remove('open');renderFilters();renderGrid();renderRoster();renderHome();if(document.getElementById('profilePage').classList.contains('active'))showPage('homePage');showToast('Profile deleted')}};

/* --- Calendar: Copy Time Modal --- */
var copyTimeResolve=null;
function closeCopyTimeModal(result){var modal=document.getElementById('copyTimeModal');modal.classList.remove('open');if(copyTimeResolve){copyTimeResolve(result);copyTimeResolve=null}}

window.findExistingTimes=function(name,excludeDate){var dates=getWeekDates();for(var dt of dates){if(dt===excludeDate)continue;var entry=getCalEntry(name,dt);if(entry&&entry.start&&entry.end)return{date:dt,start:entry.start,end:entry.end}}return null};

window.showCopyTimePrompt=function(name,sourceDate,start,end){return new Promise(resolve=>{var modal=document.getElementById('copyTimeModal');var f=dispDate(sourceDate);document.getElementById('copyTimeMsg').innerHTML=`<strong style="color:#fff">${name}</strong> has existing times from <strong style="color:#fff">${f.day} ${f.date}</strong>`;document.getElementById('copyTimeDetail').textContent=fmtTime12(start)+' \u2014 '+fmtTime12(end);copyTimeResolve=resolve;modal.classList.add('open')})};

document.getElementById('copyTimeCopy').onclick=()=>closeCopyTimeModal('copy');
document.getElementById('copyTimeNew').onclick=()=>closeCopyTimeModal('new');
document.getElementById('copyTimeCancel').onclick=()=>closeCopyTimeModal('cancel');
document.getElementById('copyTimeModal').onclick=e=>{if(e.target===document.getElementById('copyTimeModal'))closeCopyTimeModal('cancel')};
window.addEventListener('beforeunload',()=>closeCopyTimeModal('cancel'));

/* --- Calendar: Copy Day Modal --- */
var copyDaySource=null,copyDayTargets=[];

function getScheduledForDay(ds){return girls.filter(g=>{if(!g.name)return false;var e=getCalEntry(g.name,ds);return e&&e.start&&e.end})}

function renderCopyDayModal(){
var dates=getWeekDates();var ts=dates[0];
var sc=document.getElementById('copyDaySources');sc.innerHTML='';
dates.forEach(ds=>{var f=dispDate(ds);var count=getScheduledForDay(ds).length;
var b=document.createElement('button');b.className='copy-day-btn'+(ds===copyDaySource?' active':'')+(count===0?' disabled':'');
b.innerHTML=(ds===ts?t('ui.today'):f.day)+' <span style="opacity:.5;font-size:11px">('+count+')</span>';
b.onclick=()=>{copyDaySource=ds;copyDayTargets=copyDayTargets.filter(t=>t!==ds);renderCopyDayModal()};sc.appendChild(b)});
var prev=document.getElementById('copyDayPreview');
var scheduled=getScheduledForDay(copyDaySource);
if(scheduled.length){
var f=dispDate(copyDaySource);
prev.innerHTML='<div class="copy-day-preview-title">'+f.day+' '+f.date+' — '+scheduled.length+' girl'+(scheduled.length>1?'s':'')+'</div><div class="copy-day-preview-list">'+
scheduled.map(g=>{var e=getCalEntry(g.name,copyDaySource);return '<div class="copy-day-preview-item"><span class="cdp-name">'+g.name+'</span><span class="cdp-time">'+fmtTime12(e.start)+' — '+fmtTime12(e.end)+'</span></div>'}).join('')+'</div>';
}else{prev.innerHTML='<div class="copy-day-preview-empty">'+t('cal.noScheduled')+'</div>'}
var tc=document.getElementById('copyDayTargets');tc.innerHTML='';
dates.forEach(ds=>{if(ds===copyDaySource)return;
var f=dispDate(ds);var existing=getScheduledForDay(ds).length;
var b=document.createElement('button');b.className='copy-day-btn'+(copyDayTargets.includes(ds)?' target-active':'');
b.innerHTML=(ds===ts?t('ui.today'):f.day)+(existing>0?' <span style="opacity:.5;font-size:11px">('+existing+')</span>':'');
b.onclick=()=>{var idx=copyDayTargets.indexOf(ds);if(idx>=0)copyDayTargets.splice(idx,1);else copyDayTargets.push(ds);renderCopyDayModal()};tc.appendChild(b)});
var allTargets=dates.filter(ds=>ds!==copyDaySource);
if(allTargets.length>1){var ab=document.createElement('button');ab.className='copy-day-btn'+(copyDayTargets.length===allTargets.length?' target-active':'');
ab.style.fontStyle='italic';ab.textContent=t('cal.all');ab.onclick=()=>{if(copyDayTargets.length===allTargets.length)copyDayTargets=[];else copyDayTargets=[...allTargets];renderCopyDayModal()};tc.appendChild(ab)}
var applyBtn=document.getElementById('copyDayApply');
applyBtn.disabled=scheduled.length===0||copyDayTargets.length===0;
applyBtn.style.opacity=applyBtn.disabled?'.4':'1';
applyBtn.style.pointerEvents=applyBtn.disabled?'none':'auto';
}

function closeCopyDayModal(){document.getElementById('copyDayModal').classList.remove('open')}

window.openCopyDayModal=function(){
var dates=getWeekDates();
copyDaySource=null;copyDayTargets=[];
for(var ds of dates){var count=getScheduledForDay(ds).length;if(count>0){copyDaySource=ds;break}}
if(!copyDaySource)copyDaySource=dates[0];
renderCopyDayModal();
document.getElementById('copyDayModal').classList.add('open');
};

document.getElementById('copyDayCancel').onclick=closeCopyDayModal;
document.getElementById('copyDayModal').onclick=e=>{if(e.target===document.getElementById('copyDayModal'))closeCopyDayModal()};

document.getElementById('copyDayApply').onclick=async function(){
var scheduled=getScheduledForDay(copyDaySource);
if(!scheduled.length||!copyDayTargets.length)return;
var overwrite=document.getElementById('copyDayOverwrite').checked;
var copied=0;
copyDayTargets.forEach(targetDate=>{
scheduled.forEach(g=>{
var entry=getCalEntry(g.name,copyDaySource);
if(!entry||!entry.start||!entry.end)return;
var existing=getCalEntry(g.name,targetDate);
if(existing&&existing.start&&existing.end&&!overwrite)return;
if(!calData[g.name])calData[g.name]={};
calData[g.name][targetDate]={start:entry.start,end:entry.end};
copied++;
})});
if(copied>0){
this.textContent='Saving...';this.style.pointerEvents='none';
await saveCalData();
this.textContent=t('cal.copyDayBtn');this.style.pointerEvents='auto';
renderCalendar();renderRoster();renderGrid();renderHome();
showToast('Copied '+scheduled.length+' schedule'+(scheduled.length>1?'s':'')+' to '+copyDayTargets.length+' day'+(copyDayTargets.length>1?'s':''));
}else{showToast('Nothing to copy (all targets already have entries)','error')}
closeCopyDayModal();};

/* --- Calendar: Bulk Time Modal --- */
var bulkTimeName='',bulkTimeDays=[];

function renderBulkTimeDays(){
var dates=getWeekDates();var ts=dates[0];
var tc=document.getElementById('bulkTimeDays');tc.innerHTML='';
dates.forEach(ds=>{var f=dispDate(ds);var has=getCalEntry(bulkTimeName,ds);
var b=document.createElement('button');b.className='copy-day-btn'+(bulkTimeDays.includes(ds)?' target-active':'');
b.innerHTML=(ds===ts?t('ui.today'):f.day)+(has&&has.start?' <span style="opacity:.4;font-size:10px">\u2713</span>':'');
b.onclick=()=>{var idx=bulkTimeDays.indexOf(ds);if(idx>=0)bulkTimeDays.splice(idx,1);else bulkTimeDays.push(ds);renderBulkTimeDays()};tc.appendChild(b)});
var ab=document.createElement('button');ab.className='copy-day-btn'+(bulkTimeDays.length===dates.length?' target-active':'');
ab.style.fontStyle='italic';ab.textContent=t('cal.all');
ab.onclick=()=>{if(bulkTimeDays.length===dates.length)bulkTimeDays=[];else bulkTimeDays=[...dates];renderBulkTimeDays()};tc.appendChild(ab);
var applyBtn=document.getElementById('bulkTimeApply');
applyBtn.disabled=bulkTimeDays.length===0;
applyBtn.style.opacity=applyBtn.disabled?'.4':'1';
applyBtn.style.pointerEvents=applyBtn.disabled?'none':'auto';
}

function closeBulkTimeModal(){document.getElementById('bulkTimeModal').classList.remove('open')}

window.openBulkTimeModal=function(name){
bulkTimeName=name;
var dates=getWeekDates();
bulkTimeDays=dates.filter(ds=>{var e=getCalEntry(name,ds);return !e||!e.start||!e.end});
if(!bulkTimeDays.length)bulkTimeDays=[...dates];
var preStart='',preEnd='';
for(var ds of dates){var e=getCalEntry(name,ds);if(e&&e.start&&e.end){preStart=e.start;preEnd=e.end;break}}
document.getElementById('bulkTimeName').textContent=name;
var tOpts=generateTimeOptions();
document.getElementById('bulkTimeStart').innerHTML=tOpts;
document.getElementById('bulkTimeEnd').innerHTML=tOpts;
if(preStart)document.getElementById('bulkTimeStart').value=preStart;
if(preEnd)document.getElementById('bulkTimeEnd').value=preEnd;
renderBulkTimeDays();
document.getElementById('bulkTimeModal').classList.add('open');
};

document.getElementById('bulkTimeCancel').onclick=closeBulkTimeModal;
document.getElementById('bulkTimeModal').onclick=e=>{if(e.target===document.getElementById('bulkTimeModal'))closeBulkTimeModal()};

document.getElementById('bulkTimeApply').onclick=async function(){
var start=document.getElementById('bulkTimeStart').value;
var end=document.getElementById('bulkTimeEnd').value;
if(!start||!end){showToast('Please set both start and end times','error');return}
var name=bulkTimeName;
if(!calData[name])calData[name]={};
bulkTimeDays.forEach(ds=>{calData[name][ds]={start,end};if(calPending[name])delete calPending[name][ds]});
this.textContent='Saving...';this.style.pointerEvents='none';
await saveCalData();
this.textContent=t('cal.apply');this.style.pointerEvents='auto';
renderCalendar();renderRoster();renderGrid();renderHome();
showToast(name+' marked available for '+bulkTimeDays.length+' day'+(bulkTimeDays.length>1?'s':''));
closeBulkTimeModal();
};

window._adminLoaded=true;
})();
