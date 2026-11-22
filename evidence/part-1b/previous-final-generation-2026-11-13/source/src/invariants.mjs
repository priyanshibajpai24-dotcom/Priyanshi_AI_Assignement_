import { AgentError } from './errors.mjs';
import { isRfc3339, parseRfc3339, offsetForTimeZone, offsetMinutesFromTimestamp } from './time/zone-time.mjs';
function grounded(phrase,texts){if(phrase===null)return true;return typeof phrase==="string"&&phrase.trim().length>0&&texts.some(t=>String(t).toLowerCase().includes(phrase.toLowerCase()));}
function parseSnoozeMinutes(text){
 const matches=[...text.matchAll(/(?<![\w.])(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)(?!\w)/gi)];
 if(matches.length!==1)return null;
 const m=matches[0];
 const prefix=text.slice(Math.max(0,m.index-16),m.index);
 if(/(?:-\s*|minus\s+|negative\s+)$/i.test(prefix))return null;
 const n=Number(m[1]);const unit=m[2].toLowerCase();
 const factor=unit.startsWith('day')?1440:unit.startsWith('hour')||unit.startsWith('hr')?60:1;
 const total=n*factor;return Number.isSafeInteger(total)&&total>0?total:null;
}
export function enforceAgentInvariants(request,output){
 const fail=m=>{throw new AgentError('OUTPUT_INVARIANT_FAILED',m,5);};
 if(output.decision==='propose_action'){
  if(!output.intent||!output.proposal||output.proposal.kind!==output.intent)fail('Proposal decision and intent must agree.');
  if(parseRfc3339(output.proposal.dueAt)<=parseRfc3339(request.context.referenceNow))fail('Proposed time must be in the future.');
  if(request.context.timeZone&&offsetForTimeZone(output.proposal.dueAt,request.context.timeZone)!==offsetMinutesFromTimestamp(output.proposal.dueAt))fail('Proposed offset is inconsistent with the supplied time zone.');
  if(output.intent==='create'&&(!output.evidence.subjectPhrase||!grounded(output.evidence.subjectPhrase,[request.requestText])))fail('Create subject evidence must be non-empty and grounded in the request.');
  if(output.intent!=='create'){
   const matches=request.context.reminders.filter(r=>r.id===output.proposal.targetReminderId);
   if(matches.length!==1)fail('Target reminder must match exactly one supplied context ID.');
   if(!grounded(output.evidence.targetPhrase,[request.requestText,...request.context.reminders.map(r=>r.title)]))fail('Target evidence must be grounded in request or reminder context.');
  }
  if(output.intent==='snooze'){
   const duration=parseSnoozeMinutes(request.requestText);if(duration===null)fail('Snooze requires one explicit positive duration.');
   const target=request.context.reminders.find(r=>r.id===output.proposal.targetReminderId);
   const expected=Math.max(parseRfc3339(target.dueAt).getTime(),parseRfc3339(request.context.referenceNow).getTime())+duration*60000;
   if(!Number.isFinite(expected)||parseRfc3339(output.proposal.dueAt).getTime()!==expected)fail('Snooze time must equal later(existing dueAt, referenceNow) plus the requested duration.');
  }
 }else if(output.decision==='clarification_required'){
  if(output.proposal!==null||!output.missingInformation.length||!output.clarificationQuestion)fail('Clarification requires no proposal, a question, and missing-information fields.');
 }else if(output.decision==='unsupported'){
  if(output.proposal!==null||output.intent!==null||!output.unsupportedReason)fail('Unsupported action must not contain a proposal.');
 }else fail('Decision is not supported.');
 for(const phrase of Object.values(output.evidence))if(!grounded(phrase,[request.requestText,...request.context.reminders.map(r=>r.title)]))fail('Evidence phrases must be grounded in request or reminder context.');
 if(output.proposal&&(!isRfc3339(output.proposal.dueAt)||!Number.isFinite(Date.parse(output.proposal.dueAt))))fail('Proposed dueAt is invalid.');
 return output;
}
