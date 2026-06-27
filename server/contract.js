// The intention contract: the artist defines, at the moment of capture, what
// must feel the same and what is allowed to change. This is the Variable Media
// Questionnaire made executable — a contract that any future migration (and any
// AI reconstruction) must obey. It is the conceptual core of the product.

export const CONTRACT_QUESTIONS = [
  {
    id: 'essence',
    label: 'La esencia',
    prompt: '¿Qué es esta obra, en una frase? Lo que tiene que sobrevivir aunque cambie todo lo demás.',
  },
  {
    id: 'feel',
    label: 'El feel',
    prompt: '¿Qué se tiene que sentir igual? El control, el peso, la jank específica, la textura.',
  },
  {
    id: 'tempo',
    label: 'El tempo',
    prompt: '¿El ritmo es sagrado? Framerate, velocidad, latencia, la temporalidad de la máquina.',
  },
  {
    id: 'atmosphere',
    label: 'La atmósfera',
    prompt: 'La estética, el sonido, la luz, el grano. ¿Qué de la superficie es parte de la obra?',
  },
  {
    id: 'sacred',
    label: 'Lo sagrado',
    prompt: '¿Qué NO se puede tocar nunca, bajo ninguna migración futura?',
  },
  {
    id: 'mutable',
    label: 'Lo que puede cambiar',
    prompt: '¿Qué es accesorio? ¿Qué aceptás que se reemplace para que la obra siga viva?',
  },
  {
    id: 'ai_bounds',
    label: 'Límite de la IA',
    prompt:
      '¿Hasta dónde puede reconstruir la IA lo que se perdió (assets, jugadores muertos, datos)? ¿Dónde está la línea entre revivir y falsificar?',
  },
];

export function buildContract({ title, artist, answers = {}, capturedAt }) {
  const filled = CONTRACT_QUESTIONS.map((q) => ({
    id: q.id,
    label: q.label,
    prompt: q.prompt,
    answer: (answers[q.id] || '').trim(),
  }));
  const answered = filled.filter((f) => f.answer).length;
  return {
    spec: 'revenant-contract/1',
    title: title || 'Untitled',
    artist: artist || 'Unknown',
    capturedAt,
    status: answered === 0 ? 'unsigned' : answered < CONTRACT_QUESTIONS.length ? 'partial' : 'signed',
    answered,
    total: CONTRACT_QUESTIONS.length,
    clauses: filled,
  };
}

export function contractToMarkdown(c) {
  const L = [];
  L.push(`# Intention Contract — ${c.title}`);
  L.push('');
  L.push(`- **Artist:** ${c.artist}`);
  L.push(`- **Signed:** ${c.capturedAt}`);
  L.push(`- **Status:** ${c.status} (${c.answered}/${c.total} clauses)`);
  L.push('');
  L.push('> This contract governs every future migration of the work. Any');
  L.push('> reconstruction — human or AI — must operate inside its bounds.');
  L.push('');
  for (const clause of c.clauses) {
    L.push(`## ${clause.label}`);
    L.push('');
    L.push(`_${clause.prompt}_`);
    L.push('');
    L.push(clause.answer ? clause.answer : '— (sin responder) —');
    L.push('');
  }
  return L.join('\n');
}
