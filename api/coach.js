/**
 * POST /api/coach
 * Body: { mode: 'music-explain' | 'master-explain', messages: [{ role, content }] }
 * The page sends only numbers it measured; the model explains them and returns
 * { explanation, lesson[] }. Needs OPENROUTER_API_KEY. Model: MUSIC_COACH_MODEL
 * (default anthropic/claude-haiku-4.5; try anthropic/claude-sonnet-4.5 for richer text).
 */

const MODEL = process.env.MUSIC_COACH_MODEL || 'anthropic/claude-haiku-4.5';

const PROMPTS = {
  'music-explain': `You are a warm, precise music-production teacher. You receive JSON measured
from a MIDI humanizer run: per-track stats (timing offsets in ms, velocity
spread before/after, length change, ghost notes, chord spread) and the
settings used. Explain what the humanizer did and why it makes the music feel
played by a person, using ONLY the numbers given — never invent values.

Return JSON: { "explanation": "...", "lesson": ["...", "..."] }

EXPLANATION: 3-6 short sentences, plain language, naming specific numbers.
LESSON: 3-5 ordered steps the user can follow in any DAW to recreate this by
hand (e.g. nudging snare late, velocity accents, shortening notes, swing %).
Each step is one sentence with a concrete amount.`,
  'master-explain': `You are a warm, precise mastering engineer teaching a producer. You receive JSON
measured from an automated genre mastering pass: "before" and "after" analysis
(LUFS, peak dBFS, PLR, loudness range, stereo width = side/mid RMS, low-end
L/R correlation, band levels in dB relative to the mids in the order given by
bandsOrder), the style targets, and the chain settings used. Explain what was
wrong, what each processing stage fixed, and what changed — using ONLY the
numbers given. Never invent values.

Return JSON: { "explanation": "...", "lesson": ["...", "..."] }

EXPLANATION: 4-7 short sentences, plain language, citing specific numbers.
LESSON: 4-6 ordered steps to reproduce this by hand in any DAW with stock
plugins, each one sentence with a concrete amount (frequencies, dB, ratio,
attack/release, target LUFS, ceiling).`,
};

function parseLoose(raw) {
  const cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}');
    if (a === -1 || b <= a) throw new Error('Model did not return JSON');
    return JSON.parse(cleaned.slice(a, b + 1));
  }
}

async function ask(system, user, json) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Music Studio' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], ...(json ? { response_format: { type: 'json_object' } } : {}) }),
  });
  if (!res.ok) throw new Error(`LLM ${MODEL} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mode, messages } = req.body || {};
  const system = PROMPTS[mode];
  if (!system) return res.status(400).json({ error: "mode must be 'music-explain' or 'master-explain'" });
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages array is required' });
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured' });
  const user = messages.filter((m) => m && typeof m.content === 'string').map((m) => m.content).join('\n\n').slice(-6000);
  try {
    let raw;
    try { raw = await ask(system, user, true); } catch { raw = await ask(system, user, false); }
    const out = parseLoose(raw);
    return res.status(200).json({
      explanation: typeof out?.explanation === 'string' ? out.explanation : '',
      lesson: Array.isArray(out?.lesson) ? out.lesson.filter((l) => typeof l === 'string').slice(0, 6) : [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
