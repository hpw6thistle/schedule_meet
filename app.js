'use strict';
const $=id=>document.getElementById(id),ROOMS=[{id:'3s',name:'3F 小會議室',desc:'4 人',equipment:['白板','視訊']},{id:'3l',name:'3F 大會議室',desc:'12 人',equipment:['投影機','白板','視訊']},{id:'6f',name:'6F 會議室',desc:'4 人',equipment:['投影機','白板','視訊']},{id:'7s',name:'7F 會議室(玻)',desc:'6 人',equipment:['投影機','白板','視訊']},{id:'7l',name:'7F 會議室(石)',desc:'6 人',equipment:['投影機','白板','視訊']}];
const DEPTS={joint:'聯訂',hr:'人事部',legal:'法務部',finance:'財務部',planning:'企劃部',management:'管理部',it:'資訊部',procurement:'採購部',renewal:'都更部',leasing:'招商部',rd:'研發部',advertising:'廣告部',design:'設計部',general:'總務部',secretariat:'秘書部',acceptance:'驗收部',building85:'85大樓',construction:'建設部'};
const TZ='Asia/Taipei',STORAGE='roomly_v3_bookings';
const storage=(()=>{try{let k='__roomly_check';localStorage.setItem(k,'1');localStorage.removeItem(k);return localStorage}catch{return{getItem:()=>null,setItem:()=>{}}}})();
const todayISO=()=>{let p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:TZ}).formatToParts(new Date());return `${p.find(v=>v.type==='year').value}-${p.find(v=>v.type==='month').value}-${p.find(v=>v.type==='day').value}`};
const iso=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const day=ds=>new Date(ds+'T12:00:00Z');
const plusDays=(ds,n)=>{let x=day(ds);x.setUTCDate(x.getUTCDate()+n);return iso(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate())};
const monthExact=(ds,n)=>{let d=day(ds),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1,12)),dd=d.getUTCDate();return dd<=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate()?iso(target.getUTCFullYear(),target.getUTCMonth()+1,dd):null};
const nameDate=(ds,long=false)=>{let d=day(ds),w='日一二三四五六'[d.getUTCDay()];return long?`${d.getUTCFullYear()} 年 ${d.getUTCMonth()+1} 月 ${d.getUTCDate()} 日（${w}）`:`${d.getUTCMonth()+1}/${d.getUTCDate()}（${w}）`};
const toTime=i=>`${String(9+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`;
const nowSlot=()=>{let p=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number);return (p[0]-9)*2+Math.ceil(p[1]/30)};
const validTime=(ds,start)=>ds>todayISO()||(ds===todayISO()&&start>=nowSlot());
const overlap=(a,b,c,d)=>a<d&&c<b;
const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'r-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function samples(){let base=todayISO(),rows=[['3s',1,3,'planning'],['3s',9,12,'design'],['3l',4,7,'management'],['3l',12,15,'finance'],['7s',2,4,'design'],['7s',11,13,'it'],['7l',0,2,'general'],['7l',7,10,'construction']],out=[];for(let o=0;o<40;o++)for(let k=0;k<rows.length;k++){if((o+k)%4===0)continue;let [room,s,e,dept]=rows[k],shift=o%3;out.push({id:`demo-${o}-${k}`,date:plusDays(base,o),room,start:Math.min(16,s+shift),end:Math.min(18,e+shift),dept,mine:false,authorized:(o+k)%7!==0})}return out}
function loadSaved(){try{const a=JSON.parse(storage.getItem(STORAGE)||'[]');return Array.isArray(a)?a.filter(b=>b&&b.id&&b.date&&ROOMS.some(r=>r.id===b.room)&&Number.isInteger(b.start)&&Number.isInteger(b.end)&&b.end>b.start&&b.end<=18).map(b=>({...b,mine:true})):[]}catch{return[]}}
const state={date:todayISO(),month:todayISO().slice(0,7),duration:2,view:'home',demo:samples(),saved:loadSaved(),editing:null,repeat:'none',popup:null,returnFocus:null,homeIntroPlayed:false,homeTimers:[],highlightAvailability:false,scheduleMode:'day',monthlyRoom:'all',calendarMode:"day",mobileRoom:'3s'};
const allBookings=()=>state.demo.concat(state.saved);
const sameDay=ds=>allBookings().filter(b=>b.date===ds);
const canBook=(ds,room,s,e,excluded=[])=>Number.isInteger(s)&&Number.isInteger(e)&&s>=0&&e<=18&&s<e&&validTime(ds,s)&&!allBookings().some(b=>b.date===ds&&b.room===room&&!excluded.includes(b.id)&&overlap(s,e,b.start,b.end));
const save=()=>{storage.setItem(STORAGE,JSON.stringify(state.saved));if(state.view==='home')renderHome()};
let toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2900)}
function clearHomeIntro(){state.homeTimers.forEach(clearTimeout);state.homeTimers=[];document.body.classList.remove('hero-content-ready','hero-softened')}
function playHomeIntro(force=false){if(state.homeIntroPlayed&&!force){document.body.classList.add('hero-content-ready','hero-softened');return}clearHomeIntro();state.homeTimers.push(setTimeout(()=>document.body.classList.add('hero-content-ready'),320));state.homeTimers.push(setTimeout(()=>document.body.classList.add('hero-softened'),1700));state.homeIntroPlayed=true}
const b=(label,fn,kind='')=>{let x=document.createElement('button');x.className='btn '+kind;x.type='button';x.textContent=label;x.onclick=fn;return x};
function setCalendarOpen(open){const popup=$('calendarPopover');popup.hidden=!open;$('dateTrigger').setAttribute('aria-expanded',String(open));document.querySelector('.scheduleSurface').classList.toggle('calendar-open',open);if(open){setQuickOpen(false);state.calendarMode='day';renderCalendar()}}
function setDate(ds){state.date=ds;state.month=ds.slice(0,7);setCalendarOpen(false);renderSchedule()}
function setView(view){if(!['home','schedule','mine'].includes(view))view='home';if(view!=='schedule'){if(!$('calendarPopover').hidden)setCalendarOpen(false);if(!$('quickPopover').hidden)setQuickOpen(false)}state.view=view;document.body.dataset.view=view;$('homeView').hidden=view!=='home';$('scheduleView').hidden=view!=='schedule';$('mineView').hidden=view!=='mine';$('integrationFooter').hidden=view!=='schedule';for(const [id,key] of [['navHome','home'],['navSchedule','schedule'],['topMine','mine']]){const el=$(id);el.classList.toggle('current',view===key);if(view===key)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')}if(view==='mine'){clearHomeIntro();renderMine()}else if(view==='schedule'){clearHomeIntro();renderSchedule()}else{renderHome();playHomeIntro()}window.scrollTo({top:0,behavior:'instant'});if(location.hash!=='#'+view)history.replaceState(null,'','#'+view)}
const clockDateFormat=new Intl.DateTimeFormat('zh-TW',{timeZone:TZ,year:'numeric',month:'long',day:'numeric',weekday:'long'});
const clockTimeFormat=new Intl.DateTimeFormat('zh-TW',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function renderHomeClock(){
 const root=$('heroDate');if(!root)return;
 const now=new Date(),parts=clockTimeFormat.formatToParts(now);
 const get=type=>parts.find(p=>p.type===type)?.value||'00';
 const dp=clockDateFormat.formatToParts(now),dget=t=>dp.find(p=>p.type===t)?.value||'';
 const date=dget('year')+'年'+dget('month')+'月'+dget('day')+'日（'+dget('weekday').replace('星期','')+'）',hm=get('hour')+':'+get('minute');
 if(root.dataset.date!==date){root.replaceChildren();const d=document.createElement('span');d.className='heroClockDate';d.textContent=date;const row=document.createElement('span');row.className='heroClockTime';const main=document.createElement('span');main.className='heroClockMain';row.append(main);root.append(d,row);root.dataset.date=date}
 const main=root.querySelector('.heroClockMain');
 if(main.textContent!==hm)main.textContent=hm;
 if(window.matchMedia('(max-width:767.98px)').matches){
  const width=main.offsetWidth,dateWidth=root.querySelector('.heroClockDate').getBoundingClientRect().width;
  if(width&&dateWidth)main.style.setProperty('--clock-width-ratio',String(dateWidth/width));
 }
}
// Update the clock each second; refresh status cards only when the minute changes.
let lastStatusMinute='';
setInterval(()=>{if(document.body.dataset.view!=='home')return;renderHomeClock();const minuteKey=todayISO()+'-'+new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());if(minuteKey!==lastStatusMinute){lastStatusMinute=minuteKey;renderHome()}},1000);
// Homepage status uses the existing local schedule data until Calendar sync is enabled.
function renderHome(){
 renderHomeClock();
 const list=$('todayRoomsList'),scroll=$('todayRooms'),previousScroll=scroll.scrollTop;
 list.querySelectorAll('.todayRoomChip').forEach(card=>card.remove());
 const current=nowSlot(),date=todayISO(),events=sameDay(date);
 const [hour,minute]=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number),live=(hour-9)*2+minute/30;
 for(const room of ROOMS){
  const active=live>=0&&live<18&&events.some(e=>e.room===room.id&&e.start<=live&&live<e.end);
  const nextFree=Array.from({length:18},(_,i)=>i).find(i=>i>=Math.max(0,current)&&canBook(date,room.id,i,i+1));
  const card=document.createElement('button');card.type='button';card.className='todayRoomChip'+(active||nextFree===undefined?' isUnavailable':'');
  const name=document.createElement('span');name.className='todayRoomName';name.textContent=room.name;
  const status=document.createElement('span');status.className='todayRoomStatus';
  const dot=document.createElement('span');dot.className='todayRoomDot'+(active?' isBusy':nextFree===undefined?' isClosed':' isFree');dot.setAttribute('aria-hidden','true');
  const label=active?'使用中':nextFree===undefined?'無剩餘時段':'空閒中';status.append(dot);
  const detail=document.createElement('span');detail.className='todayRoomDetail';
  if(live>=18)detail.textContent='今日排程已結束';
  else if(nextFree===undefined)detail.textContent='今日時段已滿';
  else if(live<0||active||nextFree>live)detail.textContent=toTime(nextFree)+' 後可使用';
  else detail.textContent='可立即使用';
  card.append(status,name,detail);
  card.title=room.name+'｜快速預約';card.setAttribute('aria-label',room.name+'，'+label+'，'+detail.textContent+'，快速預約（示範資料）');
  card.addEventListener('click',()=>{
   state.mobileRoom=room.id;let targetDate=todayISO(),start,duration=1;
   for(let day=0;day<40&&start===undefined;day++){const ds=plusDays(todayISO(),day);for(let i=0;i<18;i++){if(canBook(ds,room.id,i,i+duration)){targetDate=ds;start=i;break}}}
   setDate(targetDate);setView('schedule');
   if(start===undefined){showMessage('預約會議','此會議室近期沒有符合所選時長的空檔，請調整日期或時長。');return}
   openBooking({date:targetDate,room:room.id,start,duration});
  });
  list.append(card);
 }
 scroll.scrollTop=previousScroll;
}
function renderRoomOptions(){
 const select=$('mineRoom'),chosen=select.value;select.replaceChildren();
 addOpts(select,[['all','所有會議室'],...ROOMS.map(r=>[r.id,r.name])]);
 select.value=ROOMS.some(r=>r.id===chosen)?chosen:'all';
}
function renderMobileRooms(){
 const root=$('mobileRoomPicker');root.replaceChildren();
 for(const room of ROOMS){const active=state.mobileRoom===room.id;const btn=b(room.name,()=>{state.mobileRoom=room.id;renderSchedule()},'mobileRoomButton'+(active?' active':''));
 btn.setAttribute('aria-pressed',String(active));root.append(btn)}
}
function updateQuickUI(){
  $('quickDurationLabel').textContent=state.duration*30+' 分鐘';
  $('quickOpen').classList.toggle('is-active',state.highlightAvailability);
  $('quickApply').textContent=state.highlightAvailability?'隱藏空檔':'顯示空檔';
  document.querySelectorAll('[data-quick-duration]').forEach(el=>{const selected=Number(el.dataset.quickDuration)===state.duration;el.classList.toggle('current',selected);el.setAttribute('aria-pressed',String(selected))})
}
function setQuickOpen(open){
  $('quickPopover').hidden=!open;$('quickOpen').setAttribute('aria-expanded',String(open));
  document.querySelector('.scheduleSurface').classList.toggle('quick-open',open);
  if(open){setCalendarOpen(false);updateQuickUI()}
}
function renderCalendar(){
  const [y,m]=state.month.split('-').map(Number);
  const heading=$('monthTitle'),root=$('calGrid');root.replaceChildren();
  const mode=state.calendarMode;
  root.className=mode==='day'?'calGrid':'calGrid calendarChoices';
  $('monthPrev').hidden=mode==='year';$('monthNext').hidden=mode==='year';
  if(mode==='year'){
    const cy=Number(todayISO().slice(0,4));heading.textContent=`${cy-5}–${cy+5} 年`;
    heading.setAttribute('aria-label','返回月份選擇');
    for(let yr=cy-5;yr<=cy+5;yr++){
      const selected=yr===y;const cell=b(String(yr),()=>{state.month=iso(yr,m,1).slice(0,7);state.calendarMode='month';renderCalendar()});
      cell.className='calendarChoice'+(selected?' current':'');root.append(cell)
    }
    return
  }
  if(mode==='month'){
    heading.textContent=`${y} 年 ▾`;heading.setAttribute('aria-label','選擇年份');
    for(let month=1;month<=12;month++){
      const selected=month===m;
      const cell=b(`${month} 月`,()=>{const day=Number(state.date.slice(-2));const last=new Date(Date.UTC(y,month,0)).getUTCDate();const requested=iso(y,month,Math.min(day,last));setDate(requested<todayISO()?todayISO():requested)});
      cell.className='calendarChoice'+(selected?' current':'');root.append(cell)
    }
    return
  }
  heading.textContent=`${y} 年 ${m} 月 ▾`;heading.setAttribute('aria-label','選擇月份');
  for(const x of '日一二三四五六'){const el=document.createElement('span');el.className='calDow';el.textContent=x;root.append(el)}
  const first=new Date(Date.UTC(y,m-1,1,12)).getUTCDay();
  for(let i=0;i<42;i++){
    const d=new Date(Date.UTC(y,m-1,i-first+1,12)),ds=iso(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
    const cell=b(String(d.getUTCDate()),()=>setDate(ds));
    cell.className='dateButton'+(ds===state.date?' current':'')+(ds===todayISO()?' today':'')+(d.getUTCMonth()!==m-1?' outside':'');
    cell.disabled=ds<todayISO();cell.title=nameDate(ds,true);root.append(cell)
  }
}
function renderSchedule(){if(state.view!=='schedule')return;const monthly=state.scheduleMode==='month';$('currentDate').textContent=state.date.replaceAll('-','/')+'('+'日一二三四五六'[day(state.date).getUTCDay()]+')';$('monthViewToggle').textContent=monthly?'按日檢視':'按月檢視';$('monthViewToggle').setAttribute('aria-pressed',String(monthly));$('monthlyView').hidden=!monthly;document.querySelector('.scheduleSurface').classList.toggle('month-mode',monthly);$('monthlyRoomFilter').hidden=!monthly;$('scheduleScroll').hidden=monthly;$('mobileRoomPicker').hidden=monthly;document.querySelector('#scheduleView .titleRow').hidden=monthly;if(monthly){renderMonthly();return}renderMobileRooms();const mobile=window.matchMedia('(max-width:700px)').matches;const visibleRooms=mobile?ROOMS.filter(r=>r.id===state.mobileRoom):ROOMS;updateQuickUI();renderCalendar();let root=$('schedule');root.classList.toggle('showAvailability',state.highlightAvailability);root.replaceChildren();let corner=document.createElement('div');corner.className='corner';corner.textContent='UTC+8';root.append(corner);visibleRooms.forEach((room,i)=>{let el=document.createElement('div');el.className='roomHeader';el.style.gridColumn=i+2;el.style.gridRow='1';el.dataset.mobileRoom=room.id;el.classList.toggle('mobileActive',room.id===state.mobileRoom);let strong=document.createElement('strong');strong.textContent=room.name;let sm=document.createElement('small');sm.textContent=room.desc;let tip=document.createElement('div');tip.className='roomEquipment';tip.setAttribute('role','tooltip');let cap=document.createElement('span');cap.textContent='容納 '+room.desc;tip.append(cap);for(const name of room.equipment){let tag=document.createElement('span');tag.textContent=name;tip.append(tag)}el.tabIndex=0;el.setAttribute('aria-label',room.name+'，容納 '+room.desc+'，設備 '+room.equipment.join('、'));el.append(strong,tip);root.append(el)});let axis=document.createElement('div');axis.className='axis';for(let i=0;i<=9;i++){let tick=document.createElement('span');tick.className='timeTick';tick.style.top=(i/9*100)+'%';tick.textContent=String(i+9).padStart(2,'0')+':00';axis.append(tick)}root.append(axis);visibleRooms.forEach((room,i)=>{const lane=document.createElement('div');lane.className='lane';lane.style.gridColumn=i+2;lane.style.gridRow='2';lane.dataset.mobileRoom=room.id;lane.classList.toggle('mobileActive',room.id===state.mobileRoom);lane.setAttribute('aria-label',room.name+' 空閒時段');let hover=document.createElement('div');hover.className='slotHover';lane.append(hover);lane.onmousemove=e=>{let rect=lane.getBoundingClientRect(),slot=Math.min(17,Math.max(0,Math.floor((e.clientY-rect.top)/rect.height*18)));hover.style.top=(slot/18*100)+'%';hover.style.height=(100/18*state.duration)+'%';hover.hidden=!canBook(state.date,room.id,slot,slot+state.duration)};lane.onmouseleave=()=>hover.hidden=true;lane.onclick=e=>{if(e.target.closest('.event'))return;let r=lane.getBoundingClientRect(),s=Math.min(17,Math.max(0,Math.floor((e.clientY-r.top)/r.height*18)));if(!canBook(state.date,room.id,s,s+state.duration)){toast(validTime(state.date,s)?'此時段無法完整預約':'不能預約過去時段');return}openBooking({date:state.date,room:room.id,start:s,duration:state.duration})};sameDay(state.date).filter(x=>x.room===room.id).forEach(ev=>{let item=document.createElement('button');item.type='button';item.className='event '+(ev.authorized===false?'busy':ev.dept||'other');item.style.top=`calc(${ev.start/18*100}% + 3px)`;item.style.height=`calc(${(ev.end-ev.start)/18*100}% - 6px)`;let label=ev.title?.trim()||'未命名會議';let dept=document.createElement('span');dept.className='eventDept';dept.textContent=DEPTS[ev.dept]||'未分類';let strong=document.createElement('strong');strong.textContent=label;let small=document.createElement('small');small.className='eventTime';small.textContent=toTime(ev.start)+' – '+toTime(ev.end);item.classList.add(ev.end-ev.start===1?'eventShort':'eventFull');item.append(dept,strong,small);item.title=`${dept.textContent}｜${label}｜${room.name}｜${small.textContent}`;item.onclick=e=>{e.stopPropagation();if(ev.mine)openBookingActions(ev);else showMessage('預約詳情',`${dept.textContent} · ${label} · ${room.name} · ${nameDate(ev.date)} · ${toTime(ev.start)}–${toTime(ev.end)}${ev.notes?' · 備註：'+ev.notes:''}`)};lane.append(item)});if(state.highlightAvailability){let runs=[];let runStart=-1;for(let j=0;j<=18;j++){const free=j<18&&canBook(state.date,room.id,j,j+1);if(free&&runStart<0)runStart=j;if(!free&&runStart>=0){if(j-runStart>=state.duration)runs.push([runStart,j]);runStart=-1}}for(const [a,z] of runs){let mark=document.createElement('div');mark.className='freeWindow';mark.style.top=`calc(${a/18*100}% + 3px)`;mark.style.height=`calc(${(z-a)/18*100}% - 6px)`;let label=document.createElement('span');label.className='freeWindowLabel';label.textContent=`可預約 · ${(z-a)*30} 分鐘`;mark.append(label);lane.append(mark)}}root.append(lane)})}
function renderMonthly(){
 const [y,m]=state.date.slice(0,7).split('-').map(Number),first=iso(y,m,1),offset=day(first).getUTCDay(),days=new Date(Date.UTC(y,m,0)).getUTCDate(),root=$('monthlyGrid');
 $('monthlyTitle').textContent=y+'年'+m+'月';root.replaceChildren();
 for(const w of '日一二三四五六'){const el=document.createElement('div');el.className='monthlyDow';el.textContent='週'+w;root.append(el)}
 const bookings=allBookings().filter(x=>x.date.startsWith(first.slice(0,7))&&(state.monthlyRoom==='all'||x.room===state.monthlyRoom)).sort((a,b)=>a.start-b.start||a.room.localeCompare(b.room));
 for(let i=0;i<Math.ceil((offset+days)/7)*7;i++){
  const ds=plusDays(first,i-offset),inside=ds.slice(0,7)===first.slice(0,7),cell=document.createElement('div');cell.className='monthlyCell'+(inside?'':' outside');
  const date=b(String(day(ds).getUTCDate()),()=>openMonthlyBooking(ds),'monthlyDate');date.disabled=!inside||ds<todayISO();date.classList.toggle('today',ds===todayISO());date.setAttribute('aria-label',nameDate(ds,true)+'，新增預約');cell.append(date);if(inside&&ds>=todayISO()){cell.classList.add('bookable');cell.onclick=e=>{if(!e.target.closest('button'))openMonthlyBooking(ds)}}
  if(inside)for(const ev of bookings.filter(x=>x.date===ds)){const item=document.createElement('button');item.type='button';item.className='monthlyEvent event';const time=toTime(ev.start)+'–'+toTime(ev.end),dept=ev.authorized===false?'已預約':(DEPTS[ev.dept]||'未分類'),label=ev.authorized===false?'':(ev.title?.trim()||'');item.textContent=time+' '+dept;item.title=[time,dept,roomName(ev.room),label].filter(Boolean).join('｜');item.setAttribute('aria-label',item.title);item.onclick=()=>{if(ev.mine)openBookingActions(ev);else showMessage('預約詳情',item.title)};cell.append(item)}
  root.append(cell)
 }
}
function openMonthlyBooking(ds){
 const rooms=state.monthlyRoom==='all'?ROOMS:ROOMS.filter(r=>r.id===state.monthlyRoom);
 for(const duration of [...new Set([state.duration,1])])for(let start=0;start+duration<=18;start++)for(const room of rooms){
  if(canBook(ds,room.id,start,start+duration)){openBooking({date:ds,room:room.id,start,duration});return}
 }
 toast('此日期及會議室沒有可預約時段')
}
function shiftMonthly(delta){const d=day(state.date),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+delta,1,12));setDate(iso(target.getUTCFullYear(),target.getUTCMonth()+1,1))}
$('monthViewToggle').onclick=()=>{setCalendarOpen(false);setQuickOpen(false);state.scheduleMode=state.scheduleMode==='month'?'day':'month';if(state.scheduleMode==='day'&&state.date<todayISO())state.date=todayISO();renderSchedule()};
addOpts($('monthlyRoomFilter'),[['all','所有會議室'],...ROOMS.map(r=>[r.id,r.name])]);$('monthlyRoomFilter').onchange=e=>{state.monthlyRoom=e.target.value;renderMonthly()};
$('monthlyPrev').onclick=()=>shiftMonthly(-1);$('monthlyNext').onclick=()=>shiftMonthly(1);
function future(b){return b.date>todayISO()||(b.date===todayISO()&&b.end>nowSlot())}
function renderMine(){
 const futureList=state.saved.filter(future);$('myCount').textContent=futureList.length;
 const mode=$('mineStatus').value,room=$('mineRoom').value,ds=$('mineDate').value;
 const all=state.saved.filter(x=>(mode==='all'||(mode==='upcoming'?future(x):!future(x)))&&(room==='all'||x.room===room)&&(!ds||ds===x.date)).sort((a,b)=>mode==='past'?b.date.localeCompare(a.date)||b.start-a.start:a.date.localeCompare(b.date)||a.start-b.start);
 const root=$('mineList');root.replaceChildren();
 if(!all.length){let empty=document.createElement('div');empty.className='empty emptyBooking';let icon=document.createElement('span');icon.className='emptyIcon';icon.textContent='◷';let title=document.createElement('strong');title.textContent=state.saved.length===0?'尚無預約紀錄':'沒有符合條件的預約';let action=b('查看會議室排程 ↗',()=>setView('schedule'),'orangeMini');empty.append(icon,title,action);root.append(empty);return}
 for(const item of all){
  const card=document.createElement('article');card.className='mineItem';
  const date=document.createElement('div');date.className='mineDay';date.textContent=nameDate(item.date);const dateSub=document.createElement('small');dateSub.textContent=item.date;date.append(dateSub);
  const desc=document.createElement('div');desc.className='mineDesc';const strong=document.createElement('strong');strong.textContent=roomName(item.room);const small=document.createElement('small');small.textContent=`${toTime(item.start)}–${toTime(item.end)} · ${(item.end-item.start)*30} 分鐘${item.group?' · 重複預約':''}`;
  const sync=document.createElement('span');sync.className='syncStatus';sync.textContent='○ 僅儲存於本機';sync.title='本機模擬預約尚未連接 Google 日曆，不能視為已同步';
  if(item.title){let title=document.createElement('div');title.textContent=item.title;desc.append(title)}desc.append(strong,small,sync);if(item.notes){let note=document.createElement('small');note.textContent='備註：'+item.notes;desc.append(note)}
  const actions=document.createElement('div');actions.className='mineButtons';
  // 會議室連結功能暫緩，待 Meet 整合後再開放。
  if(future(item)){actions.append(b('修改時段',()=>openBooking({date:item.date,room:item.room,start:item.start,duration:item.end-item.start},item)),b('延長 30 分鐘',()=>extendBooking(item)),b('一鍵取消',()=>cancelBooking(item)))}else actions.append(b('查看紀錄',()=>showMessage('預約紀錄',`${roomName(item.room)} · ${item.date} · ${toTime(item.start)}–${toTime(item.end)}`)));
  card.append(date,desc,actions);root.append(card)
 }
}
function roomName(id){return ROOMS.find(r=>r.id===id)?.name||id}
let popupCloseTimer;
function showPopup(title,content,actions=[],wide=false){clearTimeout(popupCloseTimer);$('popup').classList.remove('isClosing');state.returnFocus=document.activeElement;$('dialogTitle').textContent=title;$('dialogContent').replaceChildren();if(typeof content==='string'){let p=document.createElement('p');p.className='miniText';p.textContent=content;$('dialogContent').append(p)}else $('dialogContent').append(content);$('dialogFoot').replaceChildren(...actions.map(([label,fn,kind])=>b(label,fn,kind||'')));$('dialog').classList.toggle('wide',wide);$('popup').hidden=false;document.body.style.overflow='hidden';state.popup=true;$('dialogClose').focus()}
function closePopup(){if(!$('popup').hidden){$('popup').classList.add('isClosing');document.body.style.overflow='';state.popup=false;state.editing=null;const focusTarget=state.returnFocus;clearTimeout(popupCloseTimer);popupCloseTimer=setTimeout(()=>{if($('popup').classList.contains('isClosing')){$('popup').hidden=true;$('popup').classList.remove('isClosing');focusTarget?.focus?.()}},160)}}
function makeField(label,type,id,value){let wrap=document.createElement('div');wrap.className='fieldGroup';let l=document.createElement('label');l.htmlFor=id;l.textContent=label;let input=document.createElement(type==='select'?'select':'input');input.id=id;input.className='field';if(type!=='select')input.type=type;if(value!=null)input.value=value;wrap.append(l,input);return wrap}
function addOpts(select,opts){for(let [val,label] of opts){let opt=document.createElement('option');opt.value=val;opt.textContent=label;select.append(opt)}}
function repeatDates(ds,type,count,weekdays=[],monthDay=1){
 if(!ds||!Number.isInteger(count)||count<1||count>24)return [];
 if(type==='none')return [ds];
 const out=[];
 if(type==='monthly'){
  if(!Number.isInteger(monthDay)||monthDay<1||monthDay>31)return [];
  const base=day(ds);
  for(let n=0;n<120&&out.length<count;n++){
   const m=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+n,1,12)),y=m.getUTCFullYear(),mo=m.getUTCMonth()+1;
   if(monthDay>new Date(Date.UTC(y,mo,0,12)).getUTCDate())continue;
   const x=iso(y,mo,monthDay);if(x>=ds)out.push(x);
  }
 }else if(type==='daily'||type==='weekly'){
  if(type==='weekly'&&!weekdays.length)return [];
  for(let n=0;n<1000&&out.length<count;n++){
   const x=plusDays(ds,n),w=day(x).getUTCDay();
   if(w>=1&&w<=5&&(type==='daily'||weekdays.includes(w)))out.push(x);
  }
 }
 return out;
}
function openBooking(slot,editing=null){state.editing=editing;state.repeat='none';const content=document.createElement('div');let summary=document.createElement('div');summary.className='summary';summary.id='summary';content.append(summary);let room=makeField('會議室','select','editRoom');addOpts(room.lastChild,ROOMS.map(r=>[r.id,r.name]));room.lastChild.value=slot.room;let date=makeField('日期','date','editDate',slot.date);date.lastChild.min=todayISO();let time=makeField('開始時間','select','editStart');addOpts(time.lastChild,Array.from({length:18},(_,i)=>[i,toTime(i)]));time.lastChild.value=slot.start;let duration=makeField('時長','select','editDuration');addOpts(duration.lastChild,[[1,'30 分鐘'],[2,'60 分鐘'],[3,'90 分鐘'],[4,'120 分鐘']]);duration.lastChild.value=slot.duration;let dep=makeField('所屬部門','select','editDepartment');addOpts(dep.lastChild,Object.entries(DEPTS));dep.lastChild.value=DEPTS[editing?.dept]?editing.dept:'joint';let line=document.createElement('div');line.className='grid2';line.append(date,room);let line2=document.createElement('div');line2.className='grid2';line2.append(time,duration);let meeting=makeField('會議名稱 *','text','editTitle',editing?.title||'');meeting.lastChild.required=true;meeting.lastChild.maxLength=60;let notes=makeField('備註','text','editNotes',editing?.notes||'');notes.lastChild.maxLength=500;content.append(line,line2,dep,meeting,notes);let reminder=document.createElement('div');reminder.className='fieldGroup reminderGroup';let reminderLabel=document.createElement('label');let reminderCheck=document.createElement('input');reminderCheck.type='checkbox';reminderCheck.id='editReminder';reminderCheck.checked=Boolean(editing?.reminderEmail);reminderLabel.append(reminderCheck,document.createTextNode(' Email 提醒'));let reminderEmail=makeField('接收提醒的 Email','email','editReminderEmail',editing?.reminderEmail||'');reminderEmail.lastChild.autocomplete='email';reminderEmail.lastChild.maxLength=254;reminderEmail.hidden=true;reminderCheck.disabled=true;reminderEmail.lastChild.disabled=true;reminder.append(reminderLabel,reminderEmail);content.append(reminder);if(!editing){let repeat=document.createElement('div');repeat.className='fieldGroup';let lbl=document.createElement('label');lbl.textContent='重複預約';repeat.append(lbl);let tabs=document.createElement('div');tabs.className='repeatTabs';for(let [key,label] of [['none','不重複'],['daily','每日'],['weekly','每週'],['monthly','每月']]){let btn=b(label,()=>{state.repeat=key;[...tabs.children].forEach(x=>x.classList.toggle('active',x.dataset.repeat===key));refresh()});btn.className='repeatButton'+(key==='none'?' active':'');btn.dataset.repeat=key;tabs.append(btn)}repeat.append(tabs);let extra=document.createElement('div');extra.id='repeatExtra';extra.hidden=true;let week=document.createElement('div');week.id='repeatWeekdays';week.className='repeatTabs';for(let i=1;i<=5;i++){let btn=b('星期'+'一二三四五'[i-1],()=>{btn.setAttribute('aria-pressed',String(btn.getAttribute('aria-pressed')!=='true'));btn.classList.toggle('active',btn.getAttribute('aria-pressed')==='true');refresh()});btn.className='repeatButton';btn.dataset.weekday=i;btn.setAttribute('aria-pressed',String(day(slot.date).getUTCDay()===i));btn.classList.toggle('active',btn.getAttribute('aria-pressed')==='true');week.append(btn)}extra.append(week);let month=makeField('每月日期','select','repeatMonthDay');month.id='repeatMonthField';addOpts(month.lastChild,Array.from({length:31},(_,i)=>[i+1,(i+1)+' 日']));month.lastChild.value=day(slot.date).getUTCDate();extra.append(month);let count=makeField('預約次數','select','repeatCount');addOpts(count.lastChild,[[4,'4 次'],[6,'6 次'],[12,'12 次'],[24,'24 次']]);count.lastChild.value=6;extra.append(count);let preview=document.createElement('div');preview.id='repeatPreview';preview.className='repeatPreview';extra.append(preview);repeat.append(extra);content.append(repeat)}
function values(){return{date:$('editDate').value,room:$('editRoom').value,start:Number($('editStart').value),duration:Number($('editDuration').value),dept:$('editDepartment').value,title:$('editTitle').value.trim(),notes:$('editNotes').value.trim()}}
function selectedDates(v){return repeatDates(v.date,state.repeat,Number($('repeatCount')?.value||1),Array.from(document.querySelectorAll('#repeatWeekdays [aria-pressed="true"]'),el=>Number(el.dataset.weekday)),Number($('repeatMonthDay')?.value||1))}
function refresh(){let v=values();let summ=$('summary');summ.replaceChildren();let title=document.createElement('strong');title.textContent=`${roomName(v.room)} · ${toTime(v.start)}–${toTime(Math.min(18,v.start+v.duration))}`;let info=document.createElement('small');info.textContent=nameDate(v.date,true);summ.append(title,info);let extra=$('repeatExtra');if(extra){extra.hidden=state.repeat==='none';$('repeatWeekdays').hidden=state.repeat!=='weekly';$('repeatMonthField').hidden=state.repeat!=='monthly';if(!extra.hidden){let dates=selectedDates(v),bad=dates.filter(ds=>!canBook(ds,v.room,v.start,v.start+v.duration));$('repeatPreview').replaceChildren();let summary=document.createElement('strong');summary.textContent=dates.length?`${dates.length} 次 · ${bad.length?bad.length+' 次不可預約':'全部可預約'}`:'請至少選擇一天';$('repeatPreview').append(summary);let list=document.createElement('ul');dates.forEach(ds=>{let li=document.createElement('li');li.textContent=ds+(bad.includes(ds)?' · 不可預約':'');if(bad.includes(ds))li.className='conflict';list.append(li)});$('repeatPreview').append(list)}}}
function submit(){let v=values(),end=v.start+v.duration,edit=state.editing,exclude=edit?[edit.id]:[];if(!v.title||v.title.length>60||v.notes.length>500){toast('請輸入會議名稱（最多 60 字），備註最多 500 字');$('editTitle').focus();return}if(!v.date||!ROOMS.some(r=>r.id===v.room)||!Number.isInteger(v.start)||!Number.isInteger(v.duration)){toast('請檢查預約內容');return}let dates=edit?[v.date]:selectedDates(v);if(!dates.length||dates.length>24){toast('重複預約次數無效');return}let clashes=dates.filter(ds=>!canBook(ds,v.room,v.start,end,exclude));if(clashes.length){toast(`${clashes.length} 個日期無法預約，未建立任何預約`);refresh();return}if(edit){let target=state.saved.find(x=>x.id===edit.id);if(!target){toast('預約不存在');return}Object.assign(target,v,{end});toast('預約已更新')}else{let group=dates.length>1?makeId():null;dates.forEach(ds=>state.saved.push({id:makeId(),group,date:ds,room:v.room,start:v.start,end,dept:v.dept,title:v.title,notes:v.notes,mine:true}));toast(dates.length>1?`已完成 ${dates.length} 次預約`:'預約成功')}save();closePopup();setDate(v.date);renderMine();const summary=`${v.title}｜${DEPTS[v.dept]}｜${roomName(v.room)}｜${nameDate(v.date,true)}｜${toTime(v.start)}–${toTime(end)}${dates.length>1?'｜共 '+dates.length+' 次':''}`;showMessage(edit?'預約修改成功（僅儲存於本機）':'預約建立成功（僅儲存於本機）',summary)}
showPopup(editing?'修改預約':'預約會議室',content,[['取消',closePopup],['確認'+(editing?'修改':'預約'),submit,'blue']],true);for(let id of ['editRoom','editDate','editStart','editDuration','editDepartment','repeatCount','repeatMonthDay'])$(id)?.addEventListener('change',refresh);refresh()}
function showMessage(title,text){showPopup(title,text,[['關閉',closePopup]])}
function openBookingActions(ev){showPopup('我的預約',`${ev.title||'既有預約'} · ${roomName(ev.room)} · ${nameDate(ev.date,true)} · ${toTime(ev.start)}–${toTime(ev.end)}${ev.notes?' · 備註：'+ev.notes:''}`,[['關閉',closePopup],['修改',()=>{closePopup();openBooking({date:ev.date,room:ev.room,start:ev.start,duration:ev.end-ev.start},ev)},'blue']])}
function cancelBooking(ev){let group=ev.group?state.saved.filter(x=>x.group===ev.group):[];
function cancel(all){state.saved=state.saved.filter(x=>all?x.group!==ev.group:x.id!==ev.id);save();closePopup();renderMine();renderSchedule();toast(all?'已取消整組預約':'預約已取消')}let actions=[['返回',closePopup],['取消這次',()=>cancel(false)]];if(group.length>1)actions.push([`取消整組（${group.length} 次）`,()=>cancel(true)]);showPopup('取消預約',`${roomName(ev.room)} · ${nameDate(ev.date)} · ${toTime(ev.start)}–${toTime(ev.end)}`,actions)}
function extendBooking(ev){if(!canBook(ev.date,ev.room,ev.end,ev.end+1,[ev.id])){toast('下一時段不可用，無法延長');return}showPopup('延長 30 分鐘',`${roomName(ev.room)} · ${nameDate(ev.date)} · ${toTime(ev.start)}–${toTime(ev.end+1)}`,[['返回',closePopup],['確認延長',()=>{let x=state.saved.find(y=>y.id===ev.id);if(!x||!canBook(x.date,x.room,x.end,x.end+1,[x.id])){toast('時段已不可用');return}x.end++;save();closePopup();renderMine();renderSchedule();toast('已延長 30 分鐘')},'blue']])}
function integration(){showPopup('Google 日曆',`此版本僅使用本機模擬預約資料，尚未連接 Google Calendar。正式版將透過系統授權連結部門及會議室資源日曆，不提供一般使用者自行匯入或匯出。`,[['知道了',closePopup]])}
$('navHome').onclick=()=>setView('home');$('navSchedule').onclick=()=>setView('schedule');$('topMine').onclick=()=>setView('mine');$('heroMinePrimary').onclick=()=>setView('schedule');$('backSchedule').onclick=()=>setView('schedule');$('prevDay').onclick=()=>setDate(plusDays(state.date,-1)<todayISO()?todayISO():plusDays(state.date,-1));$('nextDay').onclick=()=>setDate(plusDays(state.date,1));$('todayBtn').onclick=()=>setDate(todayISO());$('calendarPopover').addEventListener('click',e=>e.stopPropagation());$('dateTrigger').onclick=()=>setCalendarOpen($('calendarPopover').hidden);$('monthTitle').onclick=()=>{state.calendarMode=state.calendarMode==='day'?'month':state.calendarMode==='month'?'year':'month';renderCalendar()};$('monthPrev').onclick=()=>{let [y,m]=state.month.split('-').map(Number);let d=new Date(Date.UTC(y,m-(state.calendarMode==='month'?13:2),1,12));state.month=iso(d.getUTCFullYear(),d.getUTCMonth()+1,1).slice(0,7);renderCalendar()};$('monthNext').onclick=()=>{let [y,m]=state.month.split('-').map(Number);let d=new Date(Date.UTC(y,m+(state.calendarMode==='month'?11:0),1,12));state.month=iso(d.getUTCFullYear(),d.getUTCMonth()+1,1).slice(0,7);renderCalendar()};$('calendarToday').onclick=()=>setDate(todayISO());$('quickOpen').onclick=()=>setQuickOpen($('quickPopover').hidden);
document.querySelectorAll('[data-quick-duration]').forEach(el=>el.onclick=()=>{state.duration=Number(el.dataset.quickDuration);updateQuickUI();if(state.highlightAvailability)renderSchedule()});
$('quickApply').onclick=()=>{state.highlightAvailability=!state.highlightAvailability;updateQuickUI();setQuickOpen(false);renderSchedule();toast(state.highlightAvailability?'已標出可連續預約的時段':'已隱藏空檔')};$('integrationBtn').onclick=integration;$('dialogClose').onclick=$('scrim').onclick=closePopup;
['mineStatus','mineRoom','mineDate'].forEach(id=>$(id).onchange=renderMine);$('clearMineFilters').onclick=()=>{$('mineStatus').value='upcoming';$('mineRoom').value='all';$('mineDate').value='';renderMine()};document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('popup').hidden)closePopup();else if(!$('calendarPopover').hidden)setCalendarOpen(false);else if(!$('quickPopover').hidden)setQuickOpen(false)}});document.addEventListener('click',e=>{if(!$('calendarPopover').hidden&&!e.target.closest('#calendarPopover')&&!e.target.closest('#dateTrigger'))setCalendarOpen(false);if(!$('quickPopover').hidden&&!e.target.closest('#quickPopover')&&!e.target.closest('#quickOpen'))setQuickOpen(false)});window.addEventListener('storage',e=>{if(e.key===STORAGE){state.saved=loadSaved();renderSchedule();renderMine()}});
renderRoomOptions();window.addEventListener('resize',()=>{if(state.view==='schedule')renderSchedule()});const incoming=new URL(location.href);const queryDate=incoming.searchParams.get('date');if(queryDate&&/^\d{4}-\d{2}-\d{2}$/.test(queryDate)&&queryDate>=todayISO()){state.date=queryDate;state.month=queryDate.slice(0,7)}renderMine();setView(['home','schedule','mine'].includes(location.hash.slice(1))?location.hash.slice(1):'home');
