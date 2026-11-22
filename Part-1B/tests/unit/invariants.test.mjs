import test from 'node:test'; import assert from 'node:assert/strict'; import { checkInvariants } from '../../harness/invariant-checks.mjs';
const req={requestId:'r1',requestText:'Remind me to submit report tomorrow at 10 AM',context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:'Asia/Kolkata',reminders:[]}};
const out=()=>({decision:'propose_action',intent:'create',proposal:{kind:'create',title:'submit report',dueAt:'2026-11-15T10:00:00+05:30'},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:'submit report',timePhrase:'tomorrow at 10 AM',targetPhrase:null}});
test('accepts grounded future proposal',()=>assert.deepEqual(checkInvariants(req,out()).failures,[]));
test('rejects past due, missing target, and ungrounded evidence',()=>{let x=out();x.proposal.dueAt='2026-11-13T10:00:00+05:30';assert.ok(checkInvariants(req,x).failures.some(y=>/future/i.test(y)));x=out();x.intent='reschedule';x.proposal={kind:'reschedule',targetReminderId:'missing',dueAt:'2026-11-15T10:00:00+05:30'};assert.ok(checkInvariants(req,x).failures.length);x=out();x.evidence.subjectPhrase='secret meeting';assert.ok(checkInvariants(req,x).failures.some(y=>/ground/i.test(y)));});
test('checks later-of-now-or-due snooze arithmetic independently',()=>{const r={...req,requestText:'Snooze medication for 30 minutes',context:{...req.context,reminders:[{id:'m1',title:'medication',dueAt:'2026-11-14T09:00:00+05:30'}]}};const o={decision:'propose_action',intent:'snooze',proposal:{kind:'snooze',targetReminderId:'m1',dueAt:'2026-11-14T10:30:00+05:30'},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:null,timePhrase:'30 minutes',targetPhrase:'medication'}};assert.deepEqual(checkInvariants(r,o,{snoozeDurationMinutes:30}).failures,[]);o.proposal.dueAt='2026-11-14T10:31:00+05:30';assert.ok(checkInvariants(r,o,{snoozeDurationMinutes:30}).failures.some(y=>/snooze/i.test(y)));});

test('rejects a dueAt offset inconsistent with the supplied IANA zone',()=>{
 const x=out();x.proposal.dueAt='2026-11-15T10:00:00Z';
 assert.ok(checkInvariants(req,x).failures.some(y=>/offset/i.test(y)));
});
test('rejects proposal-bearing clarification or unsupported decisions',()=>{
 const clarification=out();clarification.decision='clarification_required';clarification.intent=null;clarification.missingInformation=['time'];clarification.clarificationQuestion='What time should I use?';
 assert.ok(checkInvariants(req,clarification).failures.some(y=>/proposal/i.test(y)));
 const unsupported=out();unsupported.decision='unsupported';unsupported.intent=null;unsupported.unsupportedReason='The action is unsupported.';
 assert.ok(checkInvariants(req,unsupported).failures.some(y=>/unsupported/i.test(y)));
});
test('requires a target ID to identify exactly one context reminder',()=>{
 const request={...req,requestText:'Move my medication reminder to tomorrow at 10 AM',context:{...req.context,reminders:[{id:'m1',title:'medication',dueAt:'2026-11-15T09:00:00+05:30'},{id:'m1',title:'medicine',dueAt:'2026-11-15T09:30:00+05:30'}]}};
 const output={decision:'propose_action',intent:'reschedule',proposal:{kind:'reschedule',targetReminderId:'m1',dueAt:'2026-11-16T10:00:00+05:30'},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:null,timePhrase:'tomorrow at 10 AM',targetPhrase:'medication reminder'}};
 assert.ok(checkInvariants(request,output).failures.some(y=>/exactly one/i.test(y)));
});
