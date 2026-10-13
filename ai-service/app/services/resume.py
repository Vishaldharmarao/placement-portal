import io
import re

from PyPDF2 import PdfReader

SKILL_DICTIONARY = {
    'Programming': ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'ruby', 'php', 'kotlin'],
    'Web': ['react', 'angular', 'vue', 'node.js', 'nodejs', 'express', 'html', 'css', 'tailwind', 'rest api', 'graphql'],
    'Data': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'tableau', 'power bi', 'excel'],
    'AI/ML': ['machine learning', 'deep learning', 'scikit-learn', 'tensorflow', 'pytorch', 'nlp', 'pandas', 'numpy'],
    'Cloud/DevOps': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github actions', 'linux'],
    'Fundamentals': ['data structures', 'algorithms', 'dbms', 'operating systems', 'computer networks', 'oop'],
}
CANONICAL = {
    'nodejs': 'Node.js', 'node.js': 'Node.js', 'c++': 'C++', 'c#': 'C#',
    'rest api': 'REST APIs', 'scikit-learn': 'Scikit-learn', 'power bi': 'Power BI',
    'aws': 'AWS', 'gcp': 'GCP', 'nlp': 'NLP', 'sql': 'SQL', 'dbms': 'DBMS', 'oop': 'OOP',
}
STOP_WORDS = {
    'about', 'above', 'after', 'again', 'against', 'also', 'and', 'are', 'because', 'been',
    'being', 'below', 'between', 'both', 'could', 'does', 'from', 'have', 'into', 'more',
    'most', 'other', 'over', 'same', 'should', 'some', 'such', 'than', 'that', 'their',
    'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'until',
    'very', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'will', 'would',
    'years', 'year', 'work', 'working', 'experience', 'candidate', 'required', 'preferred',
}
GENERAL_KEYWORDS = ['built', 'developed', 'designed', 'implemented', 'analyzed', 'led', 'collaborated', 'tested', 'deployed', 'improved']


def normalize(value):
    return re.sub(r'\s+', ' ', str(value or '').strip().lower().replace('nodejs', 'node.js'))


def extract_skills(text):
    normalized = re.sub(r'\s+', ' ', text.lower())
    found = []
    for terms in SKILL_DICTIONARY.values():
        for term in terms:
            if re.search(r'(?<!\w)' + re.escape(term) + r'(?!\w)', normalized):
                formatted = CANONICAL.get(term, term.title())
                if formatted not in found:
                    found.append(formatted)
    return found


def section(text, keys):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return [line for line in lines if any(key in line.lower() for key in keys)][:5]


def score_resume_text(text, job_description='', required_skills=None, job_title=None, qualification=None):
    text = str(text or '').strip()
    if not text:
        raise ValueError('No selectable text found; scanned PDFs require OCR before analysis')

    lower = text.lower()
    skills = extract_skills(text)
    skill_lookup = {normalize(skill): skill for skill in skills}
    required = list(dict.fromkeys(str(skill).strip() for skill in (required_skills or []) if str(skill).strip()))
    matched_skills = [skill for skill in required if normalize(skill) in skill_lookup]
    missing_skills = [skill for skill in required if normalize(skill) not in skill_lookup]
    is_job_matched = bool(str(job_description or '').strip() or required)

    if is_job_matched:
        skill_score = round(35 * len(matched_skills) / len(required)) if required else 0
        job_terms = {
            token for token in re.findall(r'[a-z][a-z0-9+#.-]{3,}', normalize(job_description))
            if token not in STOP_WORDS and token not in {normalize(skill) for skill in skills}
        }
        matched_keywords = sorted(term for term in job_terms if re.search(r'(?<!\w)' + re.escape(term) + r'(?!\w)', lower))
        keyword_limit = min(15, len(job_terms))
        keyword_score = round(20 * len(matched_keywords) / keyword_limit) if keyword_limit else 0
    else:
        skill_score = min(35, round(3.5 * len(skills)))
        matched_keywords = sorted(term for term in GENERAL_KEYWORDS if re.search(r'(?<!\w)' + term + r'(?!\w)', lower))
        keyword_score = round(20 * len(matched_keywords) / len(GENERAL_KEYWORDS))

    education = section(text, ['b.tech', 'bachelor', 'master', 'university', 'college', 'cgpa', 'gpa', 'degree'])
    projects = section(text, ['project', 'developed', 'built', 'implemented'])
    experience = section(text, ['intern', 'experience', 'worked', 'employment', 'software engineer'])
    certifications = section(text, ['certif', 'coursera', 'udemy', 'aws certified'])

    qualification = qualification or {}
    warnings = []
    if is_job_matched:
        criteria = []
        if qualification.get('minimum_cgpa') not in (None, 0, '0', '0.00'):
            student_cgpa = qualification.get('student_cgpa')
            if student_cgpa is None:
                warnings.append('Student CGPA is not available to compare with this job.')
                criteria.append(False)
            else:
                criteria.append(float(student_cgpa) >= float(qualification['minimum_cgpa']))
        branches = qualification.get('eligible_branches') or []
        if branches:
            student_branch = normalize(qualification.get('student_branch'))
            if not student_branch:
                warnings.append('Student branch is not available to compare with this job.')
                criteria.append(False)
            else:
                criteria.append(student_branch in {normalize(branch) for branch in branches})
        job_year = qualification.get('graduation_year')
        if job_year:
            student_year = qualification.get('student_graduation_year')
            if not student_year:
                warnings.append('Student graduation year is not available to compare with this job.')
                criteria.append(False)
            else:
                criteria.append(int(student_year) == int(job_year))
        qualification_score = round(15 * sum(criteria) / len(criteria)) if criteria else (15 if education else 0)
    else:
        qualification_score = 15 if education else 0

    project_score = min(10, 5 * len(projects))
    experience_score = min(10, 5 * len(experience))
    has_email = bool(re.search(r'[\w.+-]+@[\w.-]+\.[a-z]{2,}', lower))
    has_phone = bool(re.search(r'(?<!\w)(?:\+?\d[\d ()-]{7,}\d)(?!\w)', text))
    has_link = bool(re.search(r'(github|linkedin|https?://)', lower))
    completeness_score = min(7, 2 * has_email + has_phone + has_link + bool(skills) + bool(education) + bool(projects or experience))
    text_length = len(text)
    parse_score = 3 if text_length >= 500 else (2 if text_length >= 200 else (1 if text_length >= 50 else 0))
    if text_length < 200:
        warnings.append('Very little selectable text was extracted; this may be a scanned or incomplete PDF.')
    if not skills:
        warnings.append('No skills from the supported skill dictionary were detected.')
    if not is_job_matched:
        warnings.append('General resume-quality assessment; no job description was selected.')

    components = {
        'required_skill_coverage': {'score': skill_score, 'maximum': 35},
        'relevant_keywords': {'score': keyword_score, 'maximum': 20},
        'qualification_alignment': {'score': qualification_score, 'maximum': 15},
        'project_evidence': {'score': project_score, 'maximum': 10},
        'experience_evidence': {'score': experience_score, 'maximum': 10},
        'resume_completeness': {'score': completeness_score, 'maximum': 7},
        'parsing_quality': {'score': parse_score, 'maximum': 3},
    }
    score = sum(component['score'] for component in components.values())
    recommendations = []
    if missing_skills:
        recommendations.append('Add evidence for required skills: ' + ', '.join(missing_skills) + '.')
    if not has_email or not has_phone:
        recommendations.append('Include clear email and phone contact details.')
    if not projects:
        recommendations.append('Add a projects section with your role, technologies, and measurable outcomes.')
    if not experience:
        recommendations.append('Add internship or work experience evidence, if applicable.')
    if not any(re.search(r'\d+[%+x]?', line) for line in text.splitlines()):
        recommendations.append('Quantify results with numbers where you can support them.')
    if warnings and text_length < 200:
        recommendations.append('Upload a text-based PDF with selectable text; scanned documents need OCR.')

    return {
        'ats_score': score,
        'assessment_type': 'JOB_MATCHED' if is_job_matched else 'GENERAL_RESUME_QUALITY',
        'job_title': job_title if is_job_matched else None,
        'extracted_text': text[:50000],
        'skills': skills,
        'matched_skills': matched_skills,
        'missing_skills': missing_skills,
        'matched_keywords': matched_keywords,
        'education': education,
        'experience': experience,
        'projects': projects,
        'certifications': certifications,
        'score_breakdown': {
            'components': components,
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'matched_keywords': matched_keywords,
            'warnings': warnings,
            'assessment_type': 'JOB_MATCHED' if is_job_matched else 'GENERAL_RESUME_QUALITY',
            'job_title': job_title if is_job_matched else None,
        },
        'warnings': warnings,
        'recommendations': recommendations,
    }


def analyze_pdf(contents, job_description='', required_skills=None, job_title=None, qualification=None):
    try:
        reader = PdfReader(io.BytesIO(contents))
        if reader.is_encrypted:
            raise ValueError('Password-protected PDFs cannot be analyzed')
        text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError('The uploaded PDF is corrupted or unreadable') from exc
    return score_resume_text(text, job_description, required_skills, job_title, qualification)
