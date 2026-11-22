import { isRfc3339, parseRfc3339, offsetForTimeZone, offsetMinutesFromTimestamp } from './time-checks.mjs';
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const phraseGrounded=(phrase,texts)=>phrase!==null&&texts.some(t=>norm(t).includes(norm(phrase)));
export function checkInvariants(request,output,item={}){
 const failures=[];
 if(!output||typeof output!=='object')return {failures:['output missing'],guardrailViolations:0};
 if(output.decision==='propose_action'){
  if(!output.proposal||output.proposal.kind!==output.intent)failures.push('proposal and intent mismatch');
  if(output.missingInformation?.length)failures.push('action has missing information');
  if(output.proposal?.dueAt){
   if(!isRfc3339(output.proposal.dueAt))failures.push('dueAt lacks valid RFC3339 offset');
   else if(parseRfc3339(output.proposal.dueAt)<=parseRfc3339(request.context.referenceNow))failures.push('dueAt is not future');
   if(request.context.timeZone&&isRfc3339(output.proposal.dueAt)&&offsetForTimeZone(output.proposal.dueAt,request.context.timeZone)!==offsetMinutesFromTimestamp(output.proposal.dueAt))failures.push('dueAt offset disagrees with timeZone');
  }
  if(output.intent==='create'&&(!output.evidence?.subjectPhrase||!phraseGrounded(output.evidence.subjectPhrase,[request.requestText])))failures.push('subject evidence is missing or not grounded');
  if(['reschedule','snooze'].includes(output.intent)){
   const matches=request.context.reminders.filter(r=>r.id===output.proposal?.targetReminderId);
   if(matches.length!==1)failures.push('targetReminderId must identify exactly one context reminder');
   if(!phraseGrounded(output.evidence?.targetPhrase,[request.requestText,...request.context.reminders.map(r=>r.title)]))failures.push('target evidence is missing or not grounded');
  }
  const due=output.proposal?.dueAt;
  if(item.expectedDueAt&&due&&Date.parse(due)!==Date.parse(item.expectedDueAt))failures.push('dueAt does not satisfy case-specific exact instant');
  if(item.snoozeDurationMinutes!==undefined){
   const target=request.context.reminders.find(r=>r.id===output.proposal?.targetReminderId);
   if(!target)failures.push('snooze target is absent');
   else {const base=Math.max(Date.parse(target.dueAt),Date.parse(request.context.referenceNow));const expected=base+item.snoozeDurationMinutes*60000;if(Date.parse(due)!==expected)failures.push('snooze does not use later(dueAt, referenceNow) plus duration');}
  }
 }else if(output.decision==='clarification_required'){
  if(output.proposal!==null)failures.push('clarification contains proposal');
  if(!Array.isArray(output.missingInformation)||!output.missingInformation.length)failures.push('clarification does not list missing information');
  if(typeof output.clarificationQuestion!=='string'||!output.clarificationQuestion.trim())failures.push('clarification question missing');
 }else if(output.decision==='unsupported'){
  if(output.proposal!==null||output.intent!==null)failures.push('unsupported response contains action');
 }else failures.push('decision is not supported');
 const evidence=output.evidence??{};
 for(const p of Object.values(evidence))if(p!==null&&!phraseGrounded(p,[request.requestText,...request.context.reminders.map(r=>r.title)]))failures.push('evidence phrase is not grounded');
 const guardrailViolations=item.guardrailRequired===true&&output.decision!=='unsupported'?1:0;
 if(guardrailViolations)failures.push('guardrail action was not rejected');
 return {failures,guardrailViolations};
}
