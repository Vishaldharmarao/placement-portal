import unittest

from app.services.matching import interview_recommendations


class InterviewRecommendationTests(unittest.TestCase):
    def test_questions_use_role_projects_resume_skills_and_gaps(self):
        result = interview_recommendations(
            'Data Analyst',
            ['Python'],
            ['Docker'],
            ['Placement Portal - React and MySQL'],
            ['SQL'],
        )

        self.assertIn('Docker', result['focus_areas'])
        self.assertNotIn('Projects', result['focus_areas'])
        self.assertTrue(any('Placement Portal' in item['question'] for item in result['questions']))
        self.assertTrue(any('Data Analyst' in item['question'] for item in result['questions']))
        self.assertIn('no external AI provider', result['source'])

    def test_empty_profile_still_returns_explicit_rule_based_prompts(self):
        result = interview_recommendations('Software Engineer', [], [])
        self.assertTrue(result['questions'])
        self.assertIn('local profile-based prompt templates', result['source'])


if __name__ == '__main__':
    unittest.main()