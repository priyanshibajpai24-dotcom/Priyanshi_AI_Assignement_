import test from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync, spawn } from 'node:child_process'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
const cli=fileURLToPath(new URL('../../src/cli.mjs',import.meta.url));
const req={requestId:'r1',requestText:'Remind me to submit report tomorrow at 10 AM',context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:'Asia/Kolkata',reminders:[]}};
function run(input,env={}){return spawnSync(process.execPath,[cli],{input:JSON.stringify(input),encoding:'utf8',env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,...env}});}
test('invalid input exits 2 before provider config and prints typed JSON without stack',()=>{const r=run({...req,extra:1});assert.equal(r.status,2);assert.equal(JSON.parse(r.stderr).error.code,'INPUT_INVALID');assert.doesNotMatch(r.stderr,/at .*\\.mjs/);});
test('valid request with missing provider config exits 3 safely',()=>{const r=run(req);assert.equal(r.status,3);assert.equal(JSON.parse(r.stderr).error.code,'CONFIG_INVALID');assert.doesNotMatch(r.stderr,/secret|Bearer|at .*\\.mjs/);});

const validOutput={decision:'propose_action',intent:'create',proposal:{kind:'create',title:'submit report',dueAt:'2026-11-15T10:00:00+05:30'},missingInformation:[],clarificationQuestion:null,unsupportedReason:null,evidence:{subjectPhrase:'submit report',timePhrase:'tomorrow at 10 AM',targetPhrase:null}};
async function mockProvider(content,t){
 const server=http.createServer((req,res)=>{req.resume();res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content}}]}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return 'http://127.0.0.1:'+server.address().port+'/v1';
}
function runAsync(input,url){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[cli],{windowsHide:true,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,AI_BASE_URL:url,AI_MODEL:'loopback-test',AI_API_KEY:'test-only-secret'}});
  let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',reject);child.on('close',status=>resolve({status,stdout,stderr}));child.stdin.end(JSON.stringify(input));
 });
}
test('valid provider response exits 0 with one structured JSON output',async t=>{
 const url=await mockProvider(JSON.stringify(validOutput),t);const result=await runAsync(req,url);
 assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),validOutput);assert.equal(result.stderr,'');
});
test('invalid model JSON exits 4 with a typed error and no stack',async t=>{
 const url=await mockProvider('not-json',t);const result=await runAsync(req,url);
 assert.equal(result.status,4);assert.equal(JSON.parse(result.stderr).error.code,'MODEL_JSON_INVALID');assert.doesNotMatch(result.stderr,/at .*\.mjs/);
});
test('schema-invalid model output exits 5 with a typed error and no stack',async t=>{
 const url=await mockProvider('{}',t);const result=await runAsync(req,url);
 assert.equal(result.status,5);assert.equal(JSON.parse(result.stderr).error.code,'OUTPUT_SCHEMA_INVALID');assert.doesNotMatch(result.stderr,/at .*\.mjs/);
});
