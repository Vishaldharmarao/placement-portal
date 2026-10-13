export const RULE_BASED_CRITERIA = Object.freeze({
  version: 'career-readiness-v1',
  minimumCoverage: 0.8,
  statusThresholds: Object.freeze({
    needsImprovementBelow: 40,
    careerReadyFrom: 70,
  }),
  components: Object.freeze({
    cgpa: Object.freeze({
      label: 'CGPA',
      weight: 25,
      levels: [
        { minimum: 8, points: 25 },
        { minimum: 7, points: 18 },
        { minimum: 6, points: 10 },
        { minimum: 0, points: 0 },
      ],
    }),
    technicalSkills: Object.freeze({
      label: 'Technical skills',
      weight: 25,
      levels: [
        { minimum: 5, points: 25 },
        { minimum: 3, points: 17 },
        { minimum: 1, points: 8 },
        { minimum: 0, points: 0 },
      ],
    }),
    projects: Object.freeze({
      label: 'Projects',
      weight: 20,
      levels: [
        { minimum: 2, points: 20 },
        { minimum: 1, points: 10 },
        { minimum: 0, points: 0 },
      ],
    }),
    internships: Object.freeze({
      label: 'Internships and relevant experience',
      weight: 15,
      levels: [
        { minimum: 1, points: 15 },
        { minimum: 0, points: 0 },
      ],
    }),
    certifications: Object.freeze({
      label: 'Certifications',
      weight: 5,
      levels: [
        { minimum: 2, points: 5 },
        { minimum: 1, points: 3 },
        { minimum: 0, points: 0 },
      ],
    }),
    resumeEvidence: Object.freeze({
      label: 'Resume evidence',
      weight: 10,
      pointsPerCategory: 2,
      maximumCategories: 5,
    }),
  }),
});

function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function pointsFor(value, levels) {
  return levels.find((level) => value >= level.minimum)?.points || 0;
}

export function evaluateCareerReadiness(profile, criteria = RULE_BASED_CRITERIA) {
  const factors = [];
  const missingInformation = [];
  const recommendations = new Set();
  let earnedPoints = 0;
  let availableWeight = 0;

  const addTierFactor = ({ key, value, available, evidence, missingLabel, recommendation }) => {
    const rule = criteria.components[key];
    if (!available) {
      missingInformation.push(missingLabel || rule.label);
      if (recommendation) recommendations.add(recommendation);
      return;
    }

    const points = pointsFor(value, rule.levels);
    earnedPoints += points;
    availableWeight += rule.weight;
    factors.push({
      key,
      label: rule.label,
      points,
      maximum: rule.weight,
      evidence,
    });
    if (points < rule.weight && recommendation) recommendations.add(recommendation);
  };

  const cgpa = profile.cgpa == null ? null : Number(profile.cgpa);
  addTierFactor({
    key: 'cgpa',
    value: cgpa,
    available: Number.isFinite(cgpa) && cgpa >= 0 && cgpa <= 10,
    evidence: Number.isFinite(cgpa) ? `${cgpa.toFixed(2)} / 10` : 'Not recorded',
    missingLabel: 'CGPA',
    recommendation: 'Add a current CGPA to your student profile.',
  });

  const skillsAvailable = Array.isArray(profile.skills);
  const skillCount = skillsAvailable ? profile.skills.length : null;
  addTierFactor({
    key: 'technicalSkills',
    value: skillCount,
    available: skillsAvailable,
    evidence: skillsAvailable ? `${skillCount} saved technical skills` : 'Not available',
    missingLabel: 'Technical skills',
    recommendation: 'Add technical skills you can demonstrate in projects or assessments.',
  });

  addTierFactor({
    key: 'projects',
    value: profile.projectCount,
    available: isCount(profile.projectCount),
    evidence: isCount(profile.projectCount) ? `${profile.projectCount} saved projects` : 'Not available',
    missingLabel: 'Project records',
    recommendation: 'Add projects that explain your contribution, technologies, and outcomes.',
  });

  addTierFactor({
    key: 'internships',
    value: profile.internshipCount,
    available: isCount(profile.internshipCount),
    evidence: isCount(profile.internshipCount) ? `${profile.internshipCount} saved internships` : 'Not available',
    missingLabel: 'Internship records',
    recommendation: 'Add relevant internship or work experience if applicable.',
  });

  addTierFactor({
    key: 'certifications',
    value: profile.certificationCount,
    available: isCount(profile.certificationCount),
    evidence: isCount(profile.certificationCount) ? `${profile.certificationCount} saved certifications` : 'Not available',
    missingLabel: 'Certification records',
    recommendation: 'Add relevant certifications if applicable.',
  });

  const resumeRule = criteria.components.resumeEvidence;
  if (!Array.isArray(profile.resumeEvidence)) {
    missingInformation.push(resumeRule.label);
    recommendations.add('Upload and analyze a text-based PDF resume to include resume evidence.');
  } else {
    const evidence = [...new Set(profile.resumeEvidence.filter(Boolean))];
    const points = Math.min(resumeRule.weight, evidence.length * resumeRule.pointsPerCategory);
    earnedPoints += points;
    availableWeight += resumeRule.weight;
    factors.push({
      key: 'resumeEvidence',
      label: resumeRule.label,
      points,
      maximum: resumeRule.weight,
      evidence: evidence.length ? evidence.join(', ') : 'Analysis contains no supported evidence sections',
    });
    if (points < resumeRule.weight) {
      recommendations.add('Strengthen resume evidence for skills, education, projects, experience, and certifications.');
    }
  }

  const totalWeight = Object.values(criteria.components).reduce((sum, component) => sum + component.weight, 0);
  const coverage = totalWeight ? availableWeight / totalWeight : 0;
  const explanation = coverage < criteria.minimumCoverage
    ? `Insufficient profile information to assign a readiness status. ${availableWeight} of ${totalWeight} rubric points are currently assessable.`
    : `Rule-based career readiness status using ${availableWeight} of ${totalWeight} available rubric points. This is not a placement probability.`;

  if (coverage < criteria.minimumCoverage) {
    return {
      method: 'RULE_BASED_READINESS',
      criteria_version: criteria.version,
      readiness_score: null,
      status: 'UNAVAILABLE',
      label: 'Readiness Unavailable',
      explanation,
      factors,
      missing_information: missingInformation,
      recommendations: [...recommendations],
    };
  }

  const readinessPoints = Math.round((earnedPoints / availableWeight) * 100);
  const status = readinessPoints < criteria.statusThresholds.needsImprovementBelow
    ? 'NEEDS_IMPROVEMENT'
    : readinessPoints < criteria.statusThresholds.careerReadyFrom
      ? 'DEVELOPING'
      : 'CAREER_READY';
  const label = status === 'NEEDS_IMPROVEMENT'
    ? 'Needs Improvement'
    : status === 'DEVELOPING'
      ? 'Developing'
      : 'Career Ready';

  return {
    method: 'RULE_BASED_READINESS',
    criteria_version: criteria.version,
    readiness_score: readinessPoints,
    earned_points: earnedPoints,
    assessable_points: availableWeight,
    status,
    label,
    explanation,
    factors,
    missing_information: missingInformation,
    recommendations: [...recommendations],
  };
}