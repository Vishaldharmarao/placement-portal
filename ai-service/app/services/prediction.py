from pathlib import Path
import joblib, numpy as np
import pandas as pd

class PredictionUnavailableError(RuntimeError):
    pass

FEATURE_SCHEMA_VERSION = 'placement-signal-v2'
FEATURES = (
    'cgpa',
    'skills_count',
    'projects_count',
    'certifications_count',
    'internship',
    'assessment_score',
    'coding_score',
    'ats_score',
)
PROFILE_FEATURES = FEATURES
ROOT=Path(__file__).resolve().parents[2]; MODEL=ROOT/'trained_models'/'model.pkl'; DATA=ROOT/'data'/'student_training_data.csv'

def load_model():
    if not MODEL.exists():
        raise PredictionUnavailableError(
            'No trained model artifact is available. Placement Signal will not auto-train on the bundled fictional dataset.'
        )
    return joblib.load(MODEL)


def classify_probability(probability):
    try:
        value = float(probability)
    except (TypeError, ValueError) as exc:
        raise PredictionUnavailableError('The model returned an invalid probability.') from exc
    if not np.isfinite(value) or not 0 <= value <= 1:
        raise PredictionUnavailableError('The model returned an invalid probability.')
    if value < 0.40:
        return 'LOW', 'Low Probability'
    if value < 0.70:
        return 'MEDIUM', 'Medium Probability'
    return 'HIGH', 'High Probability'


def model_compatibility(model):
    if not isinstance(model, dict):
        feature_names = getattr(model, 'feature_names_in_', None)
        legacy_features = sorted(set(feature_names.tolist()) - set(FEATURES)) if feature_names is not None else []
        details = f" Legacy columns: {', '.join(legacy_features)}." if legacy_features else ''
        return False, (
            f'The saved model is incompatible with {FEATURE_SCHEMA_VERSION}: it is a legacy estimator without a versioned schema and '
            f'validation metadata.{details} Train and validate a new pipeline on approved labeled placement outcomes.'
        )

    metadata = model.get('metadata')
    pipeline = model.get('pipeline')
    if model.get('schema_version') != FEATURE_SCHEMA_VERSION or model.get('feature_names') != list(FEATURES):
        return False, 'The saved model feature schema does not match Placement Signal schema v2.'
    if pipeline is None or not callable(getattr(pipeline, 'predict_proba', None)):
        return False, 'The saved model artifact does not contain a complete preprocessing and prediction pipeline.'
    if not isinstance(metadata, dict):
        return False, 'The saved model artifact is missing provenance and validation metadata.'
    if metadata.get('schema_version') != FEATURE_SCHEMA_VERSION or metadata.get('feature_names') != list(FEATURES):
        return False, 'The saved model metadata does not match Placement Signal schema v2.'

    provenance = metadata.get('training_data_provenance')
    evaluation = metadata.get('evaluation_metrics')
    if (
        not isinstance(provenance, dict)
        or provenance.get('approved_for_modeling') is not True
        or not provenance.get('source')
        or not provenance.get('label_source')
    ):
        return False, 'Model training data is not documented as approved labeled placement-outcome data.'
    if not metadata.get('target_definition'):
        return False, 'The model artifact is missing its placement target definition.'
    if (
        not isinstance(evaluation, dict)
        or metadata.get('validation_status') != 'passed'
        or not all(
            isinstance(evaluation.get(key), dict) and evaluation[key]
            for key in ('baseline', 'validation', 'test', 'probability_calibration')
        )
    ):
        return False, 'The model artifact is missing baseline, held-out evaluation, or calibration metrics.'
    pipeline_features = getattr(pipeline, 'feature_names_in_', None)
    if pipeline_features is not None and list(pipeline_features) != list(FEATURES):
        return False, 'The model pipeline feature order does not match Placement Signal schema v2.'
    return True, ''


def predict_placement(payload):
    missing_profile_features = [
        feature for feature in PROFILE_FEATURES
        if feature not in payload or payload[feature] is None
    ]
    if missing_profile_features:
        raise PredictionUnavailableError(
            'Prediction unavailable. Missing supported profile inputs: '
            + ', '.join(missing_profile_features)
        )

    try:
        model = load_model()
    except Exception as exc:
        raise PredictionUnavailableError('The trained placement model is unavailable.') from exc
    compatible, reason = model_compatibility(model)
    if not compatible:
        raise PredictionUnavailableError(reason)

    missing = [feature for feature in FEATURES if feature not in payload or payload[feature] is None]
    if missing:
        raise PredictionUnavailableError(
            'Prediction unavailable. Missing measured inputs: ' + ', '.join(missing)
        )

    try:
        values = {feature: float(payload[feature]) for feature in FEATURES}
    except (TypeError, ValueError) as exc:
        raise PredictionUnavailableError('Prediction unavailable. A required input is not numeric.') from exc
    if any(not np.isfinite(value) for value in values.values()):
        raise PredictionUnavailableError('Prediction unavailable. A required input is not finite.')
    if not 0 <= values['cgpa'] <= 10 or any(
        not 0 <= values[feature] <= 100
        for feature in FEATURES
        if feature.endswith('_score') or feature == 'ats_score'
    ):
        raise PredictionUnavailableError('Prediction unavailable. An input is outside its valid range.')
    if any(values[feature] < 0 for feature in ('skills_count', 'projects_count', 'certifications_count')):
        raise PredictionUnavailableError('Prediction unavailable. Profile counts cannot be negative.')
    if values['internship'] not in (0, 1):
        raise PredictionUnavailableError('Prediction unavailable. Internship input must be 0 or 1.')

    try:
        pipeline = model['pipeline']
        classes = list(pipeline.classes_)
        positive_class = classes.index(1)
        row = pd.DataFrame([[values[feature] for feature in FEATURES]], columns=FEATURES)
        probability = float(pipeline.predict_proba(row)[0][positive_class])
    except Exception as exc:
        raise PredictionUnavailableError('Prediction unavailable. The trained model could not generate a result.') from exc

    status, label = classify_probability(probability)

    return {
        'prediction_available': True,
        'probability': probability,
        'percentage': round(probability * 100, 1),
        'status': status,
        'label': label,
        'explanation': 'Status is classified from the trained model probability: Low < 40%, Medium 40% to < 70%, High >= 70%.',
        'disclaimer': 'Predictions require a compatible pipeline and approved, validated placement outcomes.',
    }
