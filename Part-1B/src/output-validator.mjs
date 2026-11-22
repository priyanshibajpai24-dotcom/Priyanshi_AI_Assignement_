import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AgentError } from './errors.mjs';
import { isRfc3339 } from './time/zone-time.mjs';
const p=fileURLToPath(new URL('../../specs/002-natural-language-reminder-agent/contracts/agent-output.schema.json',import.meta.url));
const schema=JSON.parse(fs.readFileSync(p,'utf8'));
let schemaCheck=null;
try { const {default:Ajv2020}=await import('ajv/dist/2020.js'); const {default:addFormats}=await import('ajv-formats'); const ajv=new Ajv2020({allErrors:true,strict:false}); addFormats(ajv); schemaCheck=ajv.compile(schema); }
catch(error){ if(error?.code!=='ERR_MODULE_NOT_FOUND')throw error; }
const exact=(x,required)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===required.length&&required.every(k=>Object.hasOwn(x,k));
function manualValid(o){
 if(!exact(o,['decision','intent','proposal','missingInformation','clarificationQuestion','unsupportedReason','evidence']))return false;
 if(!['propose_action','clarification_required','unsupported'].includes(o.decision))return false;
 if(!(o.intent===null||['create','reschedule','snooze'].includes(o.intent)))return false;
 if(!Array.isArray(o.missingInformation)||new Set(o.missingInformation).size!==o.missingInformation.length||o.missingInformation.some(x=>!['title','date','time','time_zone','target','ambiguous_time'].includes(x)))return false;
 if(!(o.clarificationQuestion===null||(typeof o.clarificationQuestion==='string'&&o.clarificationQuestion.length>0&&o.clarificationQuestion.length<=500)))return false;
 if(!(o.unsupportedReason===null||(typeof o.unsupportedReason==='string'&&o.unsupportedReason.length>0&&o.unsupportedReason.length<=500)))return false;
 if(!exact(o.evidence,['subjectPhrase','timePhrase','targetPhrase'])||Object.values(o.evidence).some(x=>!(x===null||(typeof x==='string'&&x.length<=300))))return false;
 if(o.proposal!==null){
  if(!o.proposal||typeof o.proposal!=='object'||!isRfc3339(o.proposal.dueAt))return false;
  if(o.proposal.kind==='create'){if(!exact(o.proposal,['kind','title','dueAt'])||typeof o.proposal.title!=='string'||!o.proposal.title.trim()||o.proposal.title.length>160)return false;}
  else if(['reschedule','snooze'].includes(o.proposal.kind)){if(!exact(o.proposal,['kind','targetReminderId','dueAt'])||typeof o.proposal.targetReminderId!=='string'||!o.proposal.targetReminderId||o.proposal.targetReminderId.length>64)return false;}
  else return false;
 }
 if(o.decision==='propose_action')return ['create','reschedule','snooze'].includes(o.intent)&&o.proposal!==null&&o.proposal.kind===o.intent&&o.missingInformation.length===0&&o.clarificationQuestion===null&&o.unsupportedReason===null;
 if(o.decision==='clarification_required')return o.intent===null&&o.proposal===null&&o.missingInformation.length>0&&typeof o.clarificationQuestion==='string'&&o.unsupportedReason===null;
 return o.intent===null&&o.proposal===null&&o.missingInformation.length===0&&o.clarificationQuestion===null&&typeof o.unsupportedReason==='string';
}
export function validateAgentOutput(value){
 const valid=value&&typeof value==='object'&&!Array.isArray(value)&&(schemaCheck?schemaCheck(value):manualValid(value));
 if(!valid)throw new AgentError('OUTPUT_SCHEMA_INVALID','Model output does not match the approved output contract.',5,{violations:schemaCheck?(schemaCheck.errors??[]).map(e=>e.instancePath||e.keyword):['contract']});
 if(value.proposal&&!isRfc3339(value.proposal.dueAt))throw new AgentError('OUTPUT_SCHEMA_INVALID','Proposed dueAt must be an RFC 3339 timestamp with an explicit UTC offset.',5);
 return value;
}
