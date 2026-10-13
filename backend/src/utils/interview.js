export function evaluateInterviewAnswer(answer, concepts) {
  const normalizedAnswer = String(answer || '').toLowerCase();
  const keyConcepts = [...new Set((concepts || []).map((item) => String(item).trim()).filter(Boolean))];
  const matchedConcepts = keyConcepts.filter((concept) => normalizedAnswer.includes(concept.toLowerCase()));
  const missingConcepts = keyConcepts.filter((concept) => !matchedConcepts.includes(concept));
  const score = keyConcepts.length
    ? Math.round((matchedConcepts.length / keyConcepts.length) * 100)
    : null;

  return {
    score,
    matched_concepts: matchedConcepts,
    missing_concepts: missingConcepts,
    feedback: keyConcepts.length
      ? `Rubric coverage: ${matchedConcepts.length} of ${keyConcepts.length} key concepts. ${missingConcepts.length ? `Consider addressing: ${missingConcepts.join(', ')}.` : 'Your answer covered the listed concepts.'}`
      : 'No evaluation rubric is available for this question.',
  };
}