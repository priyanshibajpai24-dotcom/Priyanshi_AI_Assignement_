import test from 'node:test'; import assert from 'node:assert/strict'; import { readConfig, providerMetadata } from '../../src/config.mjs';
const base={AI_BASE_URL:'https://api.example.test/v1?api-version=2026-01',AI_MODEL:'model-x',AI_API_KEY:'fake-test-key'};
test('requires settings',()=>{for(const k of Object.keys(base)){const e={...base};delete e[k];assert.throws(()=>readConfig(e),{code:'CONFIG_INVALID'});}});
test('bounds timeout and redacts endpoint secrets',()=>{assert.throws(()=>readConfig({...base,AI_TIMEOUT_MS:'5'}),{code:'CONFIG_INVALID'});const s=JSON.stringify(providerMetadata(readConfig(base)));assert.match(s,/api\.example\.test/);assert.doesNotMatch(s,/fake-test-key|token=/);});
