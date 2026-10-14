#!/usr/bin/env node
/** /api/coach: validation paths and a mocked OpenRouter round-trip. */
import assert from 'node:assert/strict';
const { default: handler } = await import('../api/coach.js');
const run = async (req) => { let code = 200, body; const res = { status(c) { code = c; return this; }, json(b) { body = b; return this; } }; await handler(req, res); return { code, body }; };

assert.equal((await run({ method: 'GET' })).code, 405);
assert.equal((await run({ method: 'POST', body: { mode: 'nope', messages: [] } })).code, 400);
assert.equal((await run({ method: 'POST', body: { mode: 'music-explain', messages: [] } })).code, 400);
delete process.env.OPENROUTER_API_KEY;
assert.equal((await run({ method: 'POST', body: { mode: 'music-explain', messages: [{ role: 'user', content: '{}' }] } })).code, 503);

process.env.OPENROUTER_API_KEY = 'test';
globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '```json\n{"explanation":"ok","lesson":["a","b"]}\n```' } }] }) });
const r = await run({ method: 'POST', body: { mode: 'master-explain', messages: [{ role: 'user', content: '{}' }] } });
assert.equal(r.code, 200); assert.deepEqual(r.body, { explanation: 'ok', lesson: ['a', 'b'] });
console.log('check-coach: ok');
