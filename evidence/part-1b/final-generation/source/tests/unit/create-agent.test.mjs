import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../../src/reminder-agent.mjs';

const request={requestId:'create-1',requestText:'Remind me to submit report tomorrow at 10 AM',context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:'Asia/Kolkata',reminders:[]}};
const output={decision:'propose_action',intent:'create',proposal:{kind:'create',title:'submit report',dueAt:'2026-11-15T10:00:00+05:30'},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:'submit report',timePhrase:'tomorrow at 10 AM',targetPhrase:null}};
const config={baseURL:'https://unused.invalid/v1',model:'test',apiKey:'test',timeout:1000};

test('creates one grounded future proposal without invoking an action tool',async()=>{
 let providerCalls=0;
 const result=await runAgent(request,config,async()=>{providerCalls++;return JSON.stringify(output);});
 assert.equal(providerCalls,1);
 assert.equal(result.proposal.kind,'create');
 assert.equal(result.proposal.title,'submit report');
 assert.equal(result.proposal.dueAt,'2026-11-15T10:00:00+05:30');
 assert.deepEqual(Object.keys(result.proposal).sort(),['dueAt','kind','title']);
});

test('accepts a fixed-context relative-time proposal at the expected offset instant',async()=>{
 const relativeRequest={...request,requestId:'create-relative',requestText:'Remind me to submit report in 24 hours.'};
 const relativeOutput={...output,proposal:{...output.proposal,dueAt:'2026-11-15T10:00:00+05:30'},evidence:{...output.evidence,timePhrase:'in 24 hours'}};
 const result=await runAgent(relativeRequest,config,async()=>JSON.stringify(relativeOutput));
 assert.equal(Date.parse(result.proposal.dueAt),Date.parse('2026-11-15T10:00:00+05:30'));
});
