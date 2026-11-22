import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
function redact(value,secrets=[]){
 if(typeof value==='string'){let s=value;for(const secret of secrets.filter(x=>typeof x==='string'&&x.length>=4))s=s.split(secret).join('[REDACTED]');return s.replace(/(bearer\s+)[^\s"']+/ig,'$1[REDACTED]').replace(/(api[_-]?key|authorization|token)\s*[:=]\s*["']?[^\s,"'}]+/ig,'$1=[REDACTED]');}
 if(Array.isArray(value))return value.map(x=>redact(x,secrets));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/apiKey|authorization|secret/i.test(k)?'[REDACTED]':redact(v,secrets)]));
 return value;
}
export async function writeRunEvidence(root,run){
 const dir=path.join(root,run.runId);await fs.mkdir(dir,{recursive:true});
 const safe=redact(run,[run.providerKey].filter(Boolean));delete safe.providerKey;
 const json=JSON.stringify(safe,null,2)+'\n';
 await fs.writeFile(path.join(dir,'results.json'),json,{encoding:'utf8',flag:'wx'});
 await fs.writeFile(path.join(dir,'results.sha256'),crypto.createHash('sha256').update(json).digest('hex')+'  results.json\n',{encoding:'ascii',flag:'wx'});
 return dir;
}
