import pandas as pd

from app.services.prediction import DATA, FEATURES, FEATURE_SCHEMA_VERSION

TRAINING_FEATURES = FEATURES
TARGET_COLUMN = 'placed'


def inspect_training_data():
    frame = pd.read_csv(DATA)
    if TARGET_COLUMN not in frame.columns:
        raise ValueError(f'Missing required target column: {TARGET_COLUMN}')

    target_counts = {
        int(label): int(count)
        for label, count in frame[TARGET_COLUMN].value_counts(dropna=False).sort_index().items()
    }
    return {
        'dataset': DATA.name,
        'row_count': int(len(frame)),
        'unique_feature_target_rows': int(frame[list(TRAINING_FEATURES) + [TARGET_COLUMN]].drop_duplicates().shape[0]),
        'independent_student_count': None,
        'target_column': TARGET_COLUMN,
        'target_definition': None,
        'target_counts': target_counts,
        'provenance_available': False,
        'approval_available': False,
        'required_features': list(TRAINING_FEATURES),
    }


def main():
    report = inspect_training_data()
    raise SystemExit(
        f'Training refused for schema {FEATURE_SCHEMA_VERSION}. Dataset audit: {report}. '
        'The bundled CSV is fictional demonstration data, not approved evidence of placement outcomes. '
        'Provide institution-approved historical student records with verified placement labels, '
        'documented source/authorization, a target definition and observation window, pre-outcome '
        'feature timestamps, and a student identifier so independent records and leakage-safe splits '
        'can be established. Do not use this CSV for prediction training.'
    )


if __name__ == '__main__':
    main()
