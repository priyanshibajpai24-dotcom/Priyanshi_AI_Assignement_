import test from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const cli=fileURLToPath(new URL('../../src/cli.mjs',import.meta.url));
const req={requestId:'r1',requestText:'remind me tomorrow at 9',context:{referenceNow:'2026-11-14T10:00:00+05:30',timeZone:'Asia/Kolkata',reminders:[]}};
function run(input,env={}){return spawnSync(process.execPath,[cli],{input:JSON.stringify(input),encoding:'utf8',env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,...env}});}
test('invalid input exits 2 before provider config and prints typed JSON without stack',()=>{const r=run({...req,extra:1});assert.equal(r.status,2);assert.equal(JSON.parse(r.stderr).error.code,'INPUT_INVALID');assert.doesNotMatch(r.stderr,/at .*\\.mjs/);});
test('valid request with missing provider config exits 3 safely',()=>{const r=run(req);assert.equal(r.status,3);assert.equal(JSON.parse(r.stderr).error.code,'CONFIG_INVALID');assert.doesNotMatch(r.stderr,/secret|Bearer|at .*\\.mjs/);});
