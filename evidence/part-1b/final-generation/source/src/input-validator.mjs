import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AgentError } from './errors.mjs';
import { isRfc3339, isValidTimeZone } from './time/zone-time.mjs';
const schemaPath=fileURLToPath(new URL('../../specs/002-natural-language-reminder-agent/contracts/request.schema.json',import.meta.url));
const schema=JSON.parse(fs.readFileSync(schemaPath,'utf8'));
let schemaCheck=null;
try { const {default:Ajv2020}=await import('ajv/dist/2020.js'); const {default:addFormats}=await import('ajv-formats'); const ajv=new Ajv2020({allErrors:true,strict:false}); addFormats(ajv); schemaCheck=ajv.compile(schema); }
catch(error){ if(error?.code!=='ERR_MODULE_NOT_FOUND')throw error; }
const keys=(x,required)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===required.length&&required.every(k=>Object.hasOwn(x,k));
function manualShape(x){
 if(!keys(x,['requestId','requestText','context']))return false;
 if(typeof x.requestId!=='string'||x.requestId.length<1||x.requestId.length>64)return false;
 if(typeof x.requestText!=='string'||x.requestText.length<1||x.requestText.length>4000)return false;
 const c=x.context;if(!keys(c,['referenceNow','timeZone','reminders']))return false;
 if(typeof c.referenceNow!=='string'||!(c.timeZone===null||(typeof c.timeZone==='string'&&c.timeZone.length>=1&&c.timeZone.length<=128)))return false;
 if(!Array.isArray(c.reminders)||c.reminders.length>50)return false;
 return c.reminders.every(r=>keys(r,['id','title','dueAt'])&&typeof r.id==='string'&&r.id.length>=1&&r.id.length<=64&&typeof r.title==='string'&&r.title.length>=1&&r.title.length<=160&&typeof r.dueAt==='string');
}
export function validateRequest(request){
 if(request===null||typeof request!=='object'||Array.isArray(request))throw new AgentError('INPUT_INVALID','Request must be a JSON object.',2);
 if(Buffer.byteLength(JSON.stringify(request),'utf8')>16384)throw new AgentError('INPUT_INVALID','Request JSON exceeds 16384 UTF-8 bytes.',2);
 const valid=schemaCheck?schemaCheck(request):manualShape(request);
 if(!valid)throw new AgentError('INPUT_INVALID','Request does not match the approved input contract.',2,{violations:schemaCheck?(schemaCheck.errors??[]).map(e=>e.instancePath||e.keyword):['shape']});
 const timestamps=[request.context.referenceNow,...request.context.reminders.map(r=>r.dueAt)];
 if(timestamps.some(x=>!isRfc3339(x)))throw new AgentError('INPUT_INVALID','Every timestamp must be RFC 3339 with an explicit valid UTC offset.',2);
 if(request.context.timeZone!==null&&!isValidTimeZone(request.context.timeZone))throw new AgentError('INPUT_INVALID','context.timeZone must be a valid IANA time zone or null.',2);
 const ids=request.context.reminders.map(r=>r.id);
 if(new Set(ids).size!==ids.length)throw new AgentError('INPUT_INVALID','Reminder IDs must be unique within a request.',2);
 return request;
}
