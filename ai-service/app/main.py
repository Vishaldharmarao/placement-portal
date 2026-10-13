import json

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from .services.resume import analyze_pdf
from .services.matching import match_job, skill_gap, interview_recommendations
from .services.prediction import PredictionUnavailableError, predict_placement

app = FastAPI(title='Placement Portal AI Service', version='1.0.0')

class PredictionInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    cgpa: float | None = Field(default=None, ge=0, le=10)
    skills_count: int | None = Field(default=None, ge=0)
    projects_count: int | None = Field(default=None, ge=0)
    certifications_count: int | None = Field(default=None, ge=0)
    internship: int | None = Field(default=None, ge=0, le=1)
    assessment_score: float | None = Field(default=None, ge=0, le=100)
    coding_score: float | None = Field(default=None, ge=0, le=100)
    ats_score: float | None = Field(default=None, ge=0, le=100)

class JobMatchInput(BaseModel):
    student: dict; job: dict
class SkillGapInput(BaseModel):
    current_skills: list[str] = []; required_skills: list[str] = []; role: str = 'Target role'
class InterviewInput(BaseModel):
    role: str = Field(min_length=2, max_length=120)
    skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    resume_skills: list[str] = Field(default_factory=list)

@app.get('/health')
def health(): return {'success': True, 'data': {'service': 'ai-service', 'status': 'healthy'}}

@app.post('/analyze-resume')
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(''),
    required_skills_json: str = Form('[]'),
    job_title: str = Form(''),
    qualification_json: str = Form('{}'),
):
    if file.content_type != 'application/pdf': raise HTTPException(400, 'Only PDF files are supported')
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024: raise HTTPException(400, 'Resume exceeds 5 MB limit')
    if not contents.startswith(b'%PDF-'): raise HTTPException(400, 'The uploaded file is not a valid PDF')
    try:
        required_skills = json.loads(required_skills_json)
        qualification = json.loads(qualification_json)
        if not isinstance(required_skills, list) or not isinstance(qualification, dict):
            raise ValueError('Invalid job analysis details')
        return analyze_pdf(contents, job_description, required_skills, job_title or None, qualification)
    except Exception as exc: raise HTTPException(422, f'Unable to analyze resume: {exc}')

@app.post('/predict-placement')
def placement_prediction(payload: PredictionInput):
    try:
        return predict_placement(payload.model_dump(exclude_none=True))
    except PredictionUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
@app.post('/job-match')
def job_match(payload: JobMatchInput): return match_job(payload.student, payload.job)
@app.post('/skill-gap')
def get_skill_gap(payload: SkillGapInput): return skill_gap(payload.current_skills, payload.required_skills, payload.role)
@app.post('/interview-recommendation')
def interview_recommendation(payload: InterviewInput):
    return interview_recommendations(
        payload.role,
        payload.skills,
        payload.missing_skills,
        payload.projects,
        payload.resume_skills,
    )
