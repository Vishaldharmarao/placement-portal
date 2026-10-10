from pathlib import Path
import joblib, numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pandas as pd

FEATURES=['cgpa','skills_count','projects_count','certifications_count','internship','assessment_score','coding_score','communication_score','ats_score','interview_score']
ROOT=Path(__file__).resolve().parents[2]; MODEL=ROOT/'trained_models'/'model.pkl'; DATA=ROOT/'data'/'student_training_data.csv'
def load_model():
    if MODEL.exists(): return joblib.load(MODEL)
    frame=pd.read_csv(DATA); x,y=frame[FEATURES],frame['placed']; candidates=[LogisticRegression(max_iter=2000,random_state=42),RandomForestClassifier(n_estimators=150,max_depth=6,random_state=42)]
    x_train,x_test,y_train,y_test=train_test_split(x,y,test_size=.25,random_state=42,stratify=y); model=max(candidates,key=lambda m:accuracy_score(y_test,m.fit(x_train,y_train).predict(x_test))); model.fit(x,y); MODEL.parent.mkdir(exist_ok=True); joblib.dump(model,MODEL); return model
def predict_placement(payload):
    model=load_model(); row=np.array([[payload[f] for f in FEATURES]],dtype=float); probability=float(model.predict_proba(row)[0][1]); percentage=round(probability*100)
    label='High Probability' if percentage>=70 else ('Medium Probability' if percentage>=40 else 'Low Probability'); factors=[]
    if payload['cgpa']>=8: factors.append('Strong CGPA')
    if payload['skills_count']>=8: factors.append('Good technical skills')
    if payload['projects_count']>=2: factors.append('Strong project experience')
    if payload['ats_score']>=70: factors.append('Well-structured resume')
    if not factors: factors.append('Build skills, projects, and assessment performance to improve this estimate')
    return {'probability':round(probability,4),'percentage':percentage,'label':label,'confidence':round(max(probability,1-probability)*100),'important_factors':factors,'disclaimer':'This is an estimated readiness signal based on available profile data, not a guaranteed placement outcome.'}
