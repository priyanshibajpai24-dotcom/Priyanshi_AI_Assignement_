import test from 'node:test'; import assert from 'node:assert/strict'; import { parseRfc3339, classifyLocalDateTime, offsetForTimeZone } from '../../src/time/zone-time.mjs';
test('requires explicit RFC3339 offset',()=>{assert.equal(parseRfc3339('2026-11-14T10:00:00+05:30').toISOString(),'2026-11-14T04:30:00.000Z');assert.throws(()=>parseRfc3339('2026-11-14T10:00:00'));});
test('detects unique, gap, and overlap',()=>{assert.equal(classifyLocalDateTime('2026-11-14T10:00','Asia/Kolkata').kind,'unique');assert.equal(classifyLocalDateTime('2026-03-08T02:30','America/New_York').kind,'gap');assert.equal(classifyLocalDateTime('2026-11-01T01:30','America/New_York').kind,'overlap');});
test('returns zone offset',()=>assert.equal(offsetForTimeZone('2026-11-14T10:00:00+05:30','Asia/Kolkata'),330));
