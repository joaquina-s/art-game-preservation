// The preservation passport: the structured record that travels with the work.
// It is generated, not hand-written. A human narrative is rendered from the
// deterministic detection; if an ANTHROPIC_API_KEY is present the pipeline can
// enrich that narrative, but the passport stands on its own without AI.

export function buildPassport({ title, artist, sourceUrl, detection, capturedAt, narrative }) {
  return {
    spec: 'revenant-passport/1',
    title: title || 'Untitled',
    artist: artist || 'Unknown',
    sourceUrl,
    capturedAt,
    stack: {
      engine: detection.engine,
      engines: detection.engines,
      libraries: detection.libraries,
      browserApis: detection.browserApis,
      deadTech: detection.deadTech,
    },
    externalDependencies: detection.externalDependencies,
    resources: detection.counts,
    riskLevel: detection.riskLevel,
    narrative: narrative || deterministicNarrative({ title, artist, detection }),
  };
}

export function deterministicNarrative({ title, artist, detection }) {
  const t = title || 'This work';
  const lines = [];
  lines.push(
    `${t}${artist ? `, by ${artist},` : ''} is a web-based work running on ${detection.engine}.`
  );
  if (detection.libraries.length) {
    lines.push(`It leans on ${detection.libraries.join(', ')}.`);
  }
  if (detection.browserApis.length) {
    lines.push(
      `It speaks to the browser through ${detection.browserApis.map((a) => a.name).join(', ')}.`
    );
  }
  const dead = detection.externalDependencies.filter((d) => !d.ok);
  if (dead.length) {
    lines.push(
      `${dead.length} dependenc${dead.length === 1 ? 'y is' : 'ies are'} already unreachable: ` +
        `${dead.map((d) => d.host).join(', ')}. These were the first to rot.`
    );
  }
  const ext = detection.externalDependencies.filter((d) => d.ok);
  if (ext.length) {
    lines.push(
      `${ext.length} external resource${ext.length === 1 ? '' : 's'} ` +
        `(from ${[...new Set(ext.map((d) => d.host))].join(', ')}) ` +
        `have been pulled local so the work no longer depends on them being alive.`
    );
  }
  if (detection.deadTech.length) {
    lines.push(
      `Warning: this work uses dead technology (${detection.deadTech.join(', ')}). ` +
        `It cannot run unaided in a modern browser and needs emulation.`
    );
  }
  lines.push(
    `Overall conservation state: ${detection.riskLevel}. ` +
      `${detection.counts.captured} of ${detection.counts.total} resources were captured and sealed.`
  );
  return lines.join(' ');
}

export function passportToMarkdown(p) {
  const L = [];
  L.push(`# Preservation Passport — ${p.title}`);
  L.push('');
  L.push(`- **Artist:** ${p.artist}`);
  L.push(`- **Source:** ${p.sourceUrl}`);
  L.push(`- **Captured:** ${p.capturedAt}`);
  L.push(`- **Conservation state:** ${p.riskLevel}`);
  L.push('');
  L.push('## Narrative');
  L.push('');
  L.push(p.narrative);
  L.push('');
  L.push('## Stack');
  L.push('');
  L.push(`- **Engine / runtime:** ${p.stack.engine}`);
  if (p.stack.libraries.length) L.push(`- **Libraries:** ${p.stack.libraries.join(', ')}`);
  if (p.stack.browserApis.length)
    L.push(`- **Browser APIs:** ${p.stack.browserApis.map((a) => `${a.name} (${a.risk})`).join(', ')}`);
  if (p.stack.deadTech.length) L.push(`- **Dead technology:** ${p.stack.deadTech.join(', ')}`);
  L.push('');
  L.push('## External dependencies');
  L.push('');
  if (!p.externalDependencies.length) {
    L.push('_None — the work was already self-contained._');
  } else {
    for (const d of p.externalDependencies) {
      L.push(`- [${d.ok ? 'captured' : 'AT RISK'}] \`${d.host}\` — ${d.risk} — ${d.note}`);
    }
  }
  L.push('');
  L.push(
    `## Resources\n\n${p.resources.captured} captured · ${p.resources.atRisk} at risk · ${p.resources.total} total`
  );
  L.push('');
  return L.join('\n');
}
