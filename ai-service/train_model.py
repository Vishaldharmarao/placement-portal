from app.services.prediction import load_model
if __name__ == '__main__':
    load_model(); print('Model trained and saved to trained_models/model.pkl')
