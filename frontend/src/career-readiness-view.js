const STATUS_LABELS = {
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  DEVELOPING: 'Developing',
  CAREER_READY: 'Career Ready',
};

export function getCareerReadinessDisplay(readiness, requestError = '') {
  if (requestError) {
    return {
      available: false,
      scoreText: 'Unavailable',
      statusLabel: 'Unavailable',
      explanation: requestError,
      factors: [],
      missingInformation: [],
      recommendations: [],
    };
  }

  if (readiness?.status === 'UNAVAILABLE' || !readiness) {
    return {
      available: false,
      scoreText: 'Unavailable',
      statusLabel: readiness ? 'Complete your profile' : 'Unavailable',
      explanation: readiness?.explanation || 'Career readiness could not be loaded.',
      factors: readiness?.factors || [],
      missingInformation: readiness?.missing_information || [],
      recommendations: readiness?.recommendations || [],
    };
  }

  const statusLabel = STATUS_LABELS[readiness.status];
  const score = readiness.readiness_score;
  if (
    readiness.method !== 'RULE_BASED_READINESS'
    || !statusLabel
    || !Number.isFinite(score)
    || score < 0
    || score > 100
  ) {
    return {
      available: false,
      scoreText: 'Unavailable',
      statusLabel: 'Unavailable',
      explanation: 'The dashboard received an invalid career readiness response.',
      factors: [],
      missingInformation: [],
      recommendations: [],
    };
  }

  return {
    available: true,
    scoreText: `${score}%`,
    statusLabel,
    explanation: readiness.explanation,
    factors: readiness.factors || [],
    missingInformation: readiness.missing_information || [],
    recommendations: readiness.recommendations || [],
  };
}