/**
 * Google Apps Script backend foundation (NOT deployed).
 * Set SCRIPT properties: SPREADSHEET_ID, CAL_3S, CAL_3L, CAL_6F, CAL_7S, CAL_7L.
 * Never put these values, secrets, or employee records in GitHub Pages.
 *
 * Security gate: Employee ID alone is NOT authentication. Public doPost is
 * deliberately disabled until verified sessions and a safe browser transport
 * are implemented. Do not enable anonymous writes.
 */
const CONFIG = Object.freeze({
  spreadsheetProperty: 'SPREADSHEET_ID',
  calendars: Object.freeze({
    '3s':'CAL_3S','3l':'CAL_3L','6f':'CAL_6F','7s':'CAL_7S','7l':'CAL_7L'
  }),
  timezone: 'Asia/Taipei'
});
const EMPLOYEE_COLUMNS = ['employeeId','department','displayName','workEmail','active','emailVerifiedAt','createdAt','updatedAt'];
const AUDIT_COLUMNS = ['timestamp','action','employeeId','bookingId','roomId','details'];
const BOOKING_COLUMNS = ['bookingId','employeeId','roomId','title','notes','startIso','endIso','calendarEventId','status','createdAt','updatedAt'];

function spreadsheet_(){
  const id=PropertiesService.getScriptProperties().getProperty(CONFIG.spreadsheetProperty);
  if(!id)throw new Error('Spreadsheet is not configured');
  return SpreadsheetApp.openById(id);
}
function sheet_(name,headers){
  const ss=spreadsheet_();
  let sheet=ss.getSheetByName(name);
  if(!sheet)sheet=ss.insertSheet(name);
  const count=sheet.getLastColumn();
  const existing=count?sheet.getRange(1,1,1,count).getValues()[0]:[];
  if(existing.length>headers.length||existing.some((value,i)=>value!==headers[i]))throw new Error('Unexpected schema: '+name);
  if(existing.length<headers.length)sheet.getRange(1,existing.length+1,1,headers.length-existing.length).setValues([headers.slice(existing.length)]);
  sheet.setFrozenRows(1);
  return sheet;
}
const EXTRA_SCHEMAS=Object.freeze({
  OTP:['challengeId','employeeId','codeDigest','expiresAt','attempts','usedAt','createdAt'],
  Sessions:['tokenDigest','employeeId','expiresAt','revokedAt','createdAt'],
  EmailRequests:['requestId','employeeId','requestedEmail','status','createdAt','reviewedAt'],
  Preferences:['employeeId','bookingNotifications','reminderEnabled','reminderMinutes'],
  Requests:['requestId','employeeId','action','status','bookingId','createdAt','updatedAt']
});
/** Owner-only manual test setup. Never deploy this project publicly. */
function initializeStorage(){
  assertTestEnvironment_();
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const employees=sheet_('Employees',EMPLOYEE_COLUMNS);
    employees.getRange('A:A').setNumberFormat('@');
    sheet_('Bookings',BOOKING_COLUMNS);
    sheet_('Audit',AUDIT_COLUMNS);
    Object.keys(EXTRA_SCHEMAS).forEach(name=>sheet_(name,EXTRA_SCHEMAS[name]));
    SpreadsheetApp.flush();
  }finally{lock.releaseLock()}
}
function assertTestEnvironment_(){
  if(PropertiesService.getScriptProperties().getProperty('APP_ENV')!=='TEST')throw new Error('TEST environment required');
}
/** Read-only connectivity check. No identifiers or employee data are logged. */
function verifyTestConnections(){
  assertTestEnvironment_();
  const ss=spreadsheet_();
  if(ss.getSpreadsheetTimeZone()!==CONFIG.timezone||Session.getScriptTimeZone()!==CONFIG.timezone)throw new Error('Set spreadsheet and script timezone to Asia/Taipei');
  const props=PropertiesService.getScriptProperties();
  const ids=Object.values(CONFIG.calendars).map(key=>props.getProperty(key));
  if(ids.some(id=>!id)||new Set(ids).size!==5)throw new Error('Five distinct calendars required');
  const rooms=Object.keys(CONFIG.calendars).map(roomId=>{
    const cal=calendar_(roomId);
    if(cal.getTimeZone()!==CONFIG.timezone)throw new Error('Incorrect calendar timezone: '+roomId);
    cal.getEvents(new Date(),new Date(Date.now()+60000));
    return {roomId,readable:true};
  });
  const result={environment:'TEST',spreadsheetReadable:true,rooms};
  console.log(JSON.stringify(result));
  return result;
}
/** Employee lookup is internal only. Never return the whole employee roster. */
function findEmployee_(employeeId){
  if(typeof employeeId!=='string'||!/^[A-Za-z0-9_-]{1,32}$/.test(employeeId))return null;
  const sheet=sheet_('Employees',EMPLOYEE_COLUMNS),values=sheet.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    const row=values[i];
    if(String(row[0])===employeeId&&String(row[4]).toLowerCase()==='true'){
      return {employeeId:String(row[0]),department:String(row[1]),displayName:String(row[2]),workEmail:String(row[3])};
    }
  }
  return null;
}
function calendar_(roomId){
  const key=CONFIG.calendars[roomId];
  if(!key)throw new Error('Unknown room');
  const id=PropertiesService.getScriptProperties().getProperty(key);
  if(!id)throw new Error('Calendar not configured');
  const cal=CalendarApp.getCalendarById(id);
  if(!cal)throw new Error('Calendar unavailable');
  return cal;
}
function assertBooking_(booking){
  if(!booking||!CONFIG.calendars[booking.roomId])throw new Error('Invalid room');
  if(typeof booking.title!=='string'||!booking.title.trim()||booking.title.length>120)throw new Error('Invalid title');
  if(typeof booking.notes!=='string'||booking.notes.length>500)throw new Error('Invalid notes');
  const start=new Date(booking.startIso),end=new Date(booking.endIso);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end)throw new Error('Invalid time');
  return {start,end};
}
function audit_(action,employeeId,bookingId,roomId,details){
  sheet_('Audit',AUDIT_COLUMNS).appendRow([new Date(),action,employeeId,bookingId,roomId,details||'']);
}
/**
 * PRIVATE service routine; only call after a VERIFIED session has established
 * employeeId on the server. Never trust employeeId supplied by a client body.
 * Lock serializes reservations through this Apps Script deployment.
 */
function createBookingForVerifiedEmployee_(verifiedEmployeeId,booking){
  const employee=findEmployee_(verifiedEmployeeId);
  if(!employee)throw new Error('Employee not authorized');
  const {start,end}=assertBooking_(booking);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Booking service busy; retry');
  try{
    const calendar=calendar_(booking.roomId);
    // Re-check inside lock immediately before creation; do not rely on frontend.
    if(calendar.getEvents(start,end).some(event=>event.getStartTime()<end&&event.getEndTime()>start)){
      throw new Error('該時段已有人預約');
    }
    const id=Utilities.getUuid(),now=new Date();
    const event=calendar.createEvent(booking.title.trim(),start,end,{
      description:booking.notes+'\n預約編號：'+id
    });
    try{
      sheet_('Bookings',BOOKING_COLUMNS).appendRow([
        id,employee.employeeId,booking.roomId,booking.title.trim(),booking.notes,
        booking.startIso,booking.endIso,event.getId(),'active',now,now
      ]);
      audit_('CREATE',employee.employeeId,id,booking.roomId,'');
    }catch(error){
      // Best-effort rollback if Sheets write fails after Calendar succeeds.
      try{event.deleteEvent()}catch(rollbackError){console.error('ROLLBACK FAILED',id,rollbackError)}
      throw error;
    }
    return {ok:true,bookingId:id,roomId:booking.roomId,startIso:booking.startIso,endIso:booking.endIso};
  }finally{lock.releaseLock()}
}
/** Read-only calendar aggregation, for a future authenticated API. */
function listRoomEvents_(roomId,startIso,endIso){
  const start=new Date(startIso),end=new Date(endIso);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||(end-start)>31*86400000)throw new Error('Invalid range');
  return calendar_(roomId).getEvents(start,end).map(e=>({
    title:e.getTitle(),start:e.getStartTime().toISOString(),end:e.getEndTime().toISOString()
  }));
}
/** Fail closed: no public API until authenticated transport is configured. */
function doPost(){return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Authentication not configured'})).setMimeType(ContentService.MimeType.JSON)}
function doGet(){return ContentService.createTextOutput(JSON.stringify({ok:false,error:'API not configured'})).setMimeType(ContentService.MimeType.JSON)}
