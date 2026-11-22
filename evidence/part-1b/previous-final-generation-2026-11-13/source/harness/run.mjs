import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateOutput } from './schema-validator.mjs';
import { checkInvariants } from './invariant-checks.mjs';
import { scoreSemantics } from './semantic-evaluator.mjs';
import { aggregateResults } from './aggregate.mjs';
import { writeRunEvidence } from './evidence-writer.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const defaultDataset=path.resolve(here,'../evals/dataset.json');
const cliPath=path.resolve(here,'../src/cli.mjs');
const safeConfig=env=>Boolean(env.AI_BASE_URL&&env.AI_MODEL&&env.AI_API_KEY);
function runCli(input,env,timeoutMs=125000){
 return new Promise(resolve=>{
  const safeEnv={PATH:env.PATH??'',SystemRoot:env.SystemRoot??'',WINDIR:env.WINDIR??'',AI_BASE_URL:env.AI_BASE_URL??'',AI_MODEL:env.AI_MODEL??'',AI_API_KEY:env.AI_API_KEY??'',AI_TIMEOUT_MS:env.AI_TIMEOUT_MS??'30000'};
  const child=spawn(process.execPath,[cliPath],{env:safeEnv,stdio:['pipe','pipe','pipe'],windowsHide:true});
  let stdout='',stderr='',timed=false;child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
  const timer=setTimeout(()=>{timed=true;child.kill();},timeoutMs);
  child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr,timed});});
  child.on('error',()=>{clearTimeout(timer);resolve({code:null,stdout,stderr:'child process could not start',timed:false});});
  child.stdin.end(JSON.stringify(input));
 });
}
function errorFrom(stderr){try{return JSON.parse(stderr)?.error??null;}catch{return null;}}
async function hashAppTree(){
 const root=path.resolve(here,'..'),files=[];
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(entry.isDirectory()&&['node_modules','.git','.pnpm-store'].includes(entry.name))continue;if(entry.name.startsWith('.env'))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(entry.isFile())files.push(full);}}
 await walk(root);files.sort();const hash=crypto.createHash('sha256');for(const file of files){hash.update(path.relative(root,file).replaceAll('\\','/'));hash.update('\0');hash.update(await fs.readFile(file));hash.update('\0');}return hash.digest('hex');
}
export async function runHarness({datasetPath=defaultDataset,dataset=null,env=process.env,evidenceRoot=null,writeEvidence=true}={}){
 const data=dataset??JSON.parse(await fs.readFile(datasetPath,'utf8'));
 const results=[];const modelCases=data.cases.filter(c=>c.expectedPath==='model');
 const hasConfig=safeConfig(env);
 for(const item of data.cases){
  if(item.expectedPath==='model'&&!hasConfig){results.push({caseId:item.id,modelEvaluated:false,skipped:'provider configuration unavailable',semanticApplicable:item.semanticApplicable});continue;}
  const processResult=await runCli(item.input,env);
  const err=errorFrom(processResult.stderr);
  if(item.expectedPath==='input_error'){
   results.push({caseId:item.id,modelEvaluated:false,validationValid:processResult.code===2&&err?.code===item.expectedErrorCode,observedErrorCode:err?.code??null,semanticApplicable:false,providerError:false});
   continue;
  }
  if(processResult.timed||[3,null].includes(processResult.code)){
   results.push({caseId:item.id,modelEvaluated:true,providerError:true,providerErrorCode:err?.code??(processResult.timed?'PROCESS_TIMEOUT':'PROCESS_START_ERROR'),schemaValid:false,invariantsValid:false,guardrailViolations:0,semanticApplicable:false});
   continue;
  }
  let output=null;if(processResult.code===0){try{output=JSON.parse(processResult.stdout);}catch{output=null;}}
  const schema=validateOutput(output);
  const invariant=output&&schema.valid?checkInvariants(item.input,output,item):{failures:err?.code==='OUTPUT_INVARIANT_FAILED'?[err.message]:['no valid structured output'],guardrailViolations:item.guardrailRequired?1:0};
  const semantic=scoreSemantics(item,output);
  results.push({caseId:item.id,modelEvaluated:true,providerError:false,modelErrorCode:err?.code??null,schemaValid:schema.valid,schemaFailures:schema.failures,invariantsValid:invariant.failures.length===0,invariantFailures:invariant.failures,guardrailViolations:invariant.guardrailViolations??0,semanticApplicable:semantic.applicable,semanticScore:semantic.score,semanticCriteria:semantic.criteria,generatedOutput:output});
 }
 const aggregate=aggregateResults(results,{expectedModelCases:modelCases.length});
 const runId=new Date().toISOString().replace(/[:.]/g,'-');
 const source=await fs.readFile(datasetPath).catch(()=>Buffer.from(JSON.stringify(data)));
 const run={runId,createdAt:new Date().toISOString(),datasetSha256:crypto.createHash('sha256').update(source).digest('hex'),appGenerationSha256:await hashAppTree(),promptVersion:'reminder-agent-v1',provider:{configured:hasConfig,baseUrlOrigin:(()=>{try{return new URL(env.AI_BASE_URL).origin}catch{return null}})(),model:env.AI_MODEL??null},results,aggregate};
 if(writeEvidence&&evidenceRoot)await writeRunEvidence(evidenceRoot,run);
 return run;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const evidenceRoot=path.resolve(here,'../../evidence/part-1b/raw');
 try{const run=await runHarness({evidenceRoot});console.log(JSON.stringify({runId:run.runId,aggregate:run.aggregate,caseCount:run.results.length},null,2));process.exitCode=run.aggregate.status==='PASS'?0:run.aggregate.status==='FAIL'?1:2;}
 catch{console.error(JSON.stringify({error:'HARNESS_FAILED',message:'Evaluation harness failed safely.'}));process.exitCode=1;}
}
