// Optional AI enrichment. The passport is fully valid WITHOUT this — detection
// is deterministic. When an ANTHROPIC_API_KEY is set, Claude writes a richer
// technical narrative and suggests significant properties to seed the contract.
//
// Important: the AI never produces the artwork or its files. It only writes
// prose and suggestions that a human reviews. Everything sealed in the manifest
// is deterministic and inspectable.

const MODEL = process.env.REVENANT_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function callClaude({ system, user, maxTokens = 700 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// Returns an enriched narrative string, or null on any failure (caller falls back).
export async function enrichNarrative({ title, artist, detection }) {
  if (!aiEnabled()) return null;
  try {
    const system =
      'You are a conservator of born-digital art and software-based art games. ' +
      'You write precise, unsentimental technical narratives for a preservation ' +
      'passport. 2 short paragraphs. Name concrete obsolescence risks. Never invent ' +
      'facts beyond the detection report you are given.';
    const user =
      `Work: ${title || 'Untitled'} by ${artist || 'Unknown'}.\n` +
      `Detection report (ground truth, do not contradict):\n` +
      JSON.stringify(
        {
          engine: detection.engine,
          libraries: detection.libraries,
          browserApis: detection.browserApis,
          deadTech: detection.deadTech,
          externalDependencies: detection.externalDependencies,
          riskLevel: detection.riskLevel,
          counts: detection.counts,
        },
        null,
        2
      );
    return await callClaude({ system, user, maxTokens: 600 });
  } catch (err) {
    console.warn('[revenant] AI enrichment skipped:', err.message);
    return null;
  }
}
