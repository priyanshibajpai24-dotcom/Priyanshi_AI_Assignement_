import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../../src/reminder-agent.mjs';

const config={baseURL:'https://unused.invalid/v1',model:'test',apiKey:'test',timeout:1000};
const baseRequest={requestId:'s1',requestText:'Snooze my medication reminder for 30 minutes.',context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:'Asia/Kolkata',reminders:[{id:'med-1',title:'medication',dueAt:'2026-11-14T09:00:00+05:30'}]}};
const output=dueAt=>({decision:'propose_action',intent:'snooze',proposal:{kind:'snooze',targetReminderId:'med-1',dueAt},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:null,timePhrase:'30 minutes',targetPhrase:'medication reminder'}});

test('uses a single positive duration from the later of reminder time and reference time',async()=>{
 const result=await runAgent(baseRequest,config,async()=>JSON.stringify(output('2026-11-14T10:30:00+05:30')));
 assert.equal(result.proposal.dueAt,'2026-11-14T10:30:00+05:30');
});

test('rejects negative, zero, and multiple snooze durations',async()=>{
 for(const requestText of ['Snooze my medication reminder for -30 minutes.','Snooze my medication reminder for negative 30 minutes.','Snooze my medication reminder for 0 minutes.','Snooze my medication reminder for 30 minutes and 1 hour.']){
  const request={...baseRequest,requestText};
  await assert.rejects(runAgent(request,config,async()=>JSON.stringify(output('2026-11-14T10:30:00+05:30'))),{code:'OUTPUT_INVARIANT_FAILED'},requestText);
 }
});

const rescheduleOutput=dueAt=>({decision:'propose_action',intent:'reschedule',proposal:{kind:'reschedule',targetReminderId:'med-1',dueAt},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:null,timePhrase:'November 17, 2026 at 10 AM',targetPhrase:'medication reminder'}});
test('reschedules one uniquely identified reminder to an explicit future time',async()=>{
 const request={...baseRequest,requestText:'Move my medication reminder to November 17, 2026 at 10 AM.'};
 const result=await runAgent(request,config,async()=>JSON.stringify(rescheduleOutput('2026-11-17T10:00:00+05:30')));
 assert.equal(result.proposal.targetReminderId,'med-1');
});
test('clarifies when the requested target is absent and rejects a duplicated target ID',async()=>{
 const absent={...baseRequest,requestText:'Move my dentist reminder to November 17, 2026 at 10 AM.',context:{...baseRequest.context,reminders:[]}};
 const clarification={decision:'clarification_required',intent:null,proposal:null,missingInformation:['target'],clarificationQuestion:'Which reminder do you mean?',unsupportedReason:null,evidence:{subjectPhrase:null,timePhrase:'November 17, 2026 at 10 AM',targetPhrase:'dentist reminder'}};
 assert.equal((await runAgent(absent,config,async()=>JSON.stringify(clarification))).decision,'clarification_required');
 const duplicate={...baseRequest,context:{...baseRequest.context,reminders:[...baseRequest.context.reminders,{id:'med-1',title:'medicine',dueAt:'2026-11-14T11:00:00+05:30'}]}};
 await assert.rejects(runAgent(duplicate,config,async()=>JSON.stringify(output('2026-11-14T10:30:00+05:30'))),{code:'OUTPUT_INVARIANT_FAILED'});
});
test('snoozes across midnight from the later reminder time',async()=>{
 const request={...baseRequest,requestText:'Snooze my medication reminder for 30 minutes.',context:{...baseRequest.context,referenceNow:'2026-11-14T23:50:00+05:30',reminders:[{id:'med-1',title:'medication',dueAt:'2026-11-14T23:55:00+05:30'}]}};
 const result=await runAgent(request,config,async()=>JSON.stringify(output('2026-11-15T00:25:00+05:30')));
 assert.equal(result.proposal.dueAt,'2026-11-15T00:25:00+05:30');
});
