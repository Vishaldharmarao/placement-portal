import unittest
from unittest.mock import patch

import numpy as np
from app.main import PredictionInput

from app.services.prediction import (
    FEATURES,
    PROFILE_FEATURES,
    PredictionUnavailableError,
    classify_probability,
    load_model,
    model_compatibility,
    predict_placement,
)
from train_model import TRAINING_FEATURES, inspect_training_data, main as train_model_main


def complete_profile_payload():
    return {
        'cgpa': 8.1,
        'skills_count': 6,
        'projects_count': 2,
        'certifications_count': 1,
        'internship': 1,
        'assessment_score': 75,
        'coding_score': 70,
        'ats_score': 72,
    }


class LegacyModelContract:
    feature_names_in_ = np.array(FEATURES)
    n_features_in_ = len(FEATURES)


class PlacementPredictionTests(unittest.TestCase):
    def test_status_thresholds_use_returned_probability(self):
        self.assertEqual(classify_probability(0.3999), ('LOW', 'Low Probability'))
        self.assertEqual(classify_probability(0.40), ('MEDIUM', 'Medium Probability'))
        self.assertEqual(classify_probability(0.6999), ('MEDIUM', 'Medium Probability'))
        self.assertEqual(classify_probability(0.70), ('HIGH', 'High Probability'))

    def test_communication_and_interview_are_not_required_by_profile_request(self):
        fields = {
            'cgpa': 8.1,
            'skills_count': 6,
            'projects_count': 2,
            'certifications_count': 1,
            'internship': 1,
            'assessment_score': 75,
            'coding_score': 70,
            'ats_score': 72,
        }
        request = PredictionInput(**fields)
        payload = request.model_dump(exclude_none=True)
        self.assertNotIn('communication_score', payload)
        self.assertNotIn('interview_score', payload)
        self.assertNotIn('communication_score', PROFILE_FEATURES)
        self.assertNotIn('interview_score', PROFILE_FEATURES)

    def test_saved_model_contract_reports_excluded_features(self):
        model = load_model()
        compatible, reason = model_compatibility(model)
        self.assertFalse(compatible)
        self.assertIn('communication_score', reason)
        self.assertIn('interview_score', reason)
        self.assertEqual(len(FEATURES), 8)

    def test_schema_v2_artifact_requires_provenance_and_validation_metadata(self):
        class PipelineStub:
            feature_names_in_ = np.array(FEATURES)

            def predict_proba(self, _frame):
                return np.array([[0.5, 0.5]])

        compatible, reason = model_compatibility({
            'schema_version': 'placement-signal-v2',
            'feature_names': list(FEATURES),
            'pipeline': PipelineStub(),
            'metadata': {
                'schema_version': 'placement-signal-v2',
                'feature_names': list(FEATURES),
            },
        })
        self.assertFalse(compatible)
        self.assertIn('approved labeled placement-outcome data', reason)

    def test_training_and_inference_use_the_same_excluded_score_free_schema(self):
        self.assertEqual(tuple(TRAINING_FEATURES), tuple(FEATURES))
        self.assertNotIn('communication_score', TRAINING_FEATURES)
        self.assertNotIn('interview_score', TRAINING_FEATURES)
        self.assertEqual(set(PredictionInput.model_fields), set(FEATURES))

    def test_training_refuses_unapproved_fictional_dataset(self):
        with self.assertRaisesRegex(SystemExit, 'fictional demonstration'):
            train_model_main()

    def test_training_data_audit_does_not_claim_independent_records_or_provenance(self):
        audit = inspect_training_data()
        self.assertEqual(audit['row_count'], 24)
        self.assertEqual(audit['unique_feature_target_rows'], 24)
        self.assertIsNone(audit['independent_student_count'])
        self.assertIsNone(audit['target_definition'])
        self.assertFalse(audit['provenance_available'])
        self.assertFalse(audit['approval_available'])
        self.assertEqual(audit['target_counts'], {0: 11, 1: 13})

    def test_current_saved_model_refuses_profile_only_prediction(self):
        with self.assertRaisesRegex(PredictionUnavailableError, 'incompatible'):
            predict_placement(complete_profile_payload())

    def test_prediction_with_profile_features_does_not_call_incompatible_model(self):
        with patch('app.services.prediction.load_model', return_value=LegacyModelContract()):
            with self.assertRaisesRegex(PredictionUnavailableError, 'incompatible'):
                predict_placement(complete_profile_payload())

    def test_missing_input_is_unavailable(self):
        payload = complete_profile_payload()
        payload.pop('ats_score')
        with self.assertRaisesRegex(PredictionUnavailableError, 'ats_score'):
            predict_placement(payload)

    def test_model_failure_is_unavailable(self):
        with patch('app.services.prediction.load_model', side_effect=OSError('model missing')):
            with self.assertRaisesRegex(PredictionUnavailableError, 'model is unavailable'):
                predict_placement(complete_profile_payload())

    def test_missing_artifact_does_not_train_on_fictional_data(self):
        with patch('app.services.prediction.MODEL') as model_path:
            model_path.exists.return_value = False
            with patch('app.services.prediction.pd.read_csv', side_effect=AssertionError('unexpected auto-training')):
                with self.assertRaisesRegex(PredictionUnavailableError, 'will not auto-train'):
                    load_model()

    def test_invalid_probability_is_unavailable(self):
        with self.assertRaises(PredictionUnavailableError):
            classify_probability(float('nan'))


if __name__ == '__main__':
    unittest.main()