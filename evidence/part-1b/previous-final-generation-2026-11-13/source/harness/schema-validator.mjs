import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isRfc3339 } from './time-checks.mjs';
const schemaPath=fileURLToPath(new URL('../../specs/002-natural-language-reminder-agent/contracts/agent-output.schema.json',import.meta.url));
const schema=JSON.parse(fs.readFileSync(schemaPath,'utf8'));
let check=null;
try { const {default:Ajv2020}=await import('ajv/dist/2020.js'); const {default:addFormats}=await import('ajv-formats'); const ajv=new Ajv2020({allErrors:true,strict:false}); addFormats(ajv); check=ajv.compile(schema); }
catch(error){ if(error?.code!=='ERR_MODULE_NOT_FOUND')throw error; }
const exact=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
function manual(o){
 if(!exact(o,['decision','intent','proposal','missingInformation','clarificationQuestion','unsupportedReason','evidence']))return false;
 if(!['propose_action','clarification_required','unsupported'].includes(o.decision)||!(o.intent===null||['create','reschedule','snooze'].includes(o.intent)))return false;
 if(!Array.isArray(o.missingInformation)||new Set(o.missingInformation).size!==o.missingInformation.length||o.missingInformation.some(x=>!['title','date','time','time_zone','target','ambiguous_time'].includes(x)))return false;
 if(!(o.clarificationQuestion===null||(typeof o.clarificationQuestion==='string'&&o.clarificationQuestion.length>0&&o.clarificationQuestion.length<=500))||!(o.unsupportedReason===null||(typeof o.unsupportedReason==='string'&&o.unsupportedReason.length>0&&o.unsupportedReason.length<=500)))return false;
 if(!exact(o.evidence,['subjectPhrase','timePhrase','targetPhrase'])||Object.values(o.evidence).some(x=>!(x===null||(typeof x==='string'&&x.length<=300))))return false;
 if(o.proposal!==null){
  if(!o.proposal||typeof o.proposal!=='object'||!isRfc3339(o.proposal.dueAt))return false;
  if(o.proposal.kind==='create'){if(!exact(o.proposal,['kind','title','dueAt'])||typeof o.proposal.title!=='string'||!o.proposal.title.trim()||o.proposal.title.length>160)return false;}
  else if(['reschedule','snooze'].includes(o.proposal.kind)){if(!exact(o.proposal,['kind','targetReminderId','dueAt'])||typeof o.proposal.targetReminderId!=='string'||!o.proposal.targetReminderId||o.proposal.targetReminderId.length>64)return false;}else return false;
 }
 if(o.decision==='propose_action')return ['create','reschedule','snooze'].includes(o.intent)&&o.proposal!==null&&o.proposal.kind===o.intent&&o.missingInformation.length===0&&o.clarificationQuestion===null&&o.unsupportedReason===null;
 if(o.decision==='clarification_required')return o.intent===null&&o.proposal===null&&o.missingInformation.length>0&&typeof o.clarificationQuestion==='string'&&o.unsupportedReason===null;
 return o.intent===null&&o.proposal===null&&o.missingInformation.length===0&&o.clarificationQuestion===null&&typeof o.unsupportedReason==='string';
}
export function validateOutput(output){
 if(!output||typeof output!=='object'||Array.isArray(output))return {valid:false,failures:['output must be an object']};
 const valid=check?check(output):manual(output),failures=check?(check.errors??[]).map(e=>`${e.instancePath||'/'} ${e.keyword}`):[];
 if(output.proposal?.dueAt&&!isRfc3339(output.proposal.dueAt))failures.push('/proposal/dueAt must have RFC3339 offset');
 if(!check&&!valid)failures.push('output does not match approved contract');
 return {valid:valid&&failures.length===0,failures};
}
