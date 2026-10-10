from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from .services.resume import analyze_pdf
from .services.matching import match_job, skill_gap, interview_recommendations
from .services.prediction import predict_placement

app = FastAPI(title='Placement Portal AI Service', version='1.0.0')

class PredictionInput(BaseModel):
    cgpa: float = Field(ge=0, le=10); skills_count: int = Field(ge=0); projects_count: int = Field(ge=0)
    certifications_count: int = Field(ge=0); internship: int = Field(ge=0, le=1); assessment_score: float = Field(ge=0, le=100)
    coding_score: float = Field(ge=0, le=100); communication_score: float = Field(ge=0, le=100)
    ats_score: float = Field(ge=0, le=100); interview_score: float = Field(ge=0, le=100)

class JobMatchInput(BaseModel):
    student: dict; job: dict
class SkillGapInput(BaseModel):
    current_skills: list[str] = []; required_skills: list[str] = []; role: str = 'Target role'
class InterviewInput(BaseModel):
    role: str; skills: list[str] = []; missing_skills: list[str] = []

@app.get('/health')
def health(): return {'success': True, 'data': {'service': 'ai-service', 'status': 'healthy'}}

@app.post('/analyze-resume')
async def analyze_resume(file: UploadFile = File(...)):
    if file.content_type != 'application/pdf': raise HTTPException(400, 'Only PDF files are supported')
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024: raise HTTPException(400, 'Resume exceeds 5 MB limit')
    try: return analyze_pdf(contents)
    except Exception as exc: raise HTTPException(422, f'Unable to analyze resume: {exc}')

@app.post('/predict-placement')
def placement_prediction(payload: PredictionInput): return predict_placement(payload.model_dump())
@app.post('/job-match')
def job_match(payload: JobMatchInput): return match_job(payload.student, payload.job)
@app.post('/skill-gap')
def get_skill_gap(payload: SkillGapInput): return skill_gap(payload.current_skills, payload.required_skills, payload.role)
@app.post('/interview-recommendation')
def interview_recommendation(payload: InterviewInput): return interview_recommendations(payload.role, payload.skills, payload.missing_skills)
