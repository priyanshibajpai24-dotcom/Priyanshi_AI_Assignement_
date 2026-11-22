import test from 'node:test'; import assert from 'node:assert/strict'; import { validateRequest } from '../../src/input-validator.mjs';
const req=()=>({requestId:'r1',requestText:'Remind me about my appointment tomorrow at 10 AM',context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:'Asia/Kolkata',reminders:[]}});
test('accepts valid and rejects unknown fields',()=>{assert.equal(validateRequest(req()).requestId,'r1');const x=req();x.extra=1;assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});});
test('enforces request, reminder, timestamp, timezone, uniqueness, and byte bounds',()=>{
 let x=req();x.requestId='x'.repeat(65);assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.requestText='x'.repeat(4001);assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.context.referenceNow='2026-11-14T10:00:00';assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.context.referenceNow='2026-02-30T10:00:00Z';assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.context.timeZone='Mars/Olympus';assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.context.reminders=[{id:'a',title:'one',dueAt:'2026-11-15T10:00:00+05:30'},{id:'a',title:'two',dueAt:'2026-11-16T10:00:00+05:30'}];assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.context.reminders=Array.from({length:51},(_,i)=>({id:String(i),title:'x',dueAt:'2026-11-15T10:00:00Z'}));assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
 x=req();x.requestText='x'.repeat(16000);assert.throws(()=>validateRequest(x),{code:'INPUT_INVALID'});
});
