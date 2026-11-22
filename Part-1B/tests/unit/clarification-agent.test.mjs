import test from 'node:test'; import assert from 'node:assert/strict'; import { runAgent } from '../../src/reminder-agent.mjs';
const config={baseURL:'https://unused.invalid/v1',model:'test',apiKey:'fake',timeout:1000};
const samples=[
 ['missing-subject','Remind me tomorrow at 9 AM.','title','What should I remind you about?','tomorrow at 9 AM'],
 ['missing-time','Remind me to pay rent on November 20, 2026.','time','What time should I use?','November 20, 2026'],
 ['missing-date','Remind me to take medicine at 8 PM.','date','Which date should I use?','8 PM'],
 ['ambiguous-time','Remind me to call Sam tomorrow at 7.','ambiguous_time','Do you mean AM or PM?','at 7'],
 ['ambiguous-weekday','Remind me to submit the form on Friday.','date','Which Friday do you mean?','Friday'],
 ['missing-zone','Remind me to water plants tomorrow at 9 AM.','time_zone','Which time zone should I use?','tomorrow at 9 AM'],
 ['past-time','Remind me to submit the report today at 8 AM.','time','That time has passed; what future time should I use?','8 AM']
];
test('clarifies missing and ambiguous mandatory information without proposals',async()=>{
 for(const [id,requestText,missing,question,timePhrase] of samples){
  const request={requestId:id,requestText,context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:id==='missing-zone'?null:'Asia/Kolkata',reminders:[]}};
  const output={decision:'clarification_required',intent:null,proposal:null,missingInformation:[missing],clarificationQuestion:question,unsupportedReason:null,evidence:{subjectPhrase:id==='missing-subject'?null:requestText.split('Remind me to ')[1]?.split(' ').slice(0,2).join(' ')??null,timePhrase,targetPhrase:null}};
  const result=await runAgent(request,config,async()=>JSON.stringify(output));
  assert.equal(result.decision,'clarification_required',id);assert.equal(result.proposal,null,id);assert.ok(result.missingInformation.includes(missing),id);
 }
});
test('clarifies daylight-saving gap and overlap rather than accepting ambiguous walls',async()=>{
 for(const [id,when,ref,zone] of [['gap','March 8, 2026 at 2:30 AM','2026-03-07T12:00:00-05:00','America/New_York'],['overlap','November 1, 2026 at 1:30 AM','2026-10-31T12:00:00-04:00','America/New_York']]){
  const request={requestId:id,requestText:`Remind me to call Alex on ${when}.`,context:{referenceNow:ref,timeZone:zone,reminders:[]}};
  const output={decision:'clarification_required',intent:null,proposal:null,missingInformation:['ambiguous_time'],clarificationQuestion:'Which valid occurrence of this local time do you mean?',unsupportedReason:null,evidence:{subjectPhrase:'call Alex',timePhrase:when,targetPhrase:null}};
  assert.equal((await runAgent(request,config,async()=>JSON.stringify(output))).decision,'clarification_required');
 }
});
