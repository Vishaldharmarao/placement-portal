import io, re
from PyPDF2 import PdfReader

SKILL_DICTIONARY = {
 'Programming':['python','java','javascript','typescript','c++','c#','go','ruby','php','kotlin'],
 'Web':['react','angular','vue','node.js','nodejs','express','html','css','tailwind','rest api','graphql'],
 'Data':['sql','mysql','postgresql','mongodb','redis','tableau','power bi','excel'],
 'AI/ML':['machine learning','deep learning','scikit-learn','tensorflow','pytorch','nlp','pandas','numpy'],
 'Cloud/DevOps':['aws','azure','gcp','docker','kubernetes','jenkins','git','github actions','linux'],
 'Fundamentals':['data structures','algorithms','dbms','operating systems','computer networks','oop']
}
CANONICAL = {'nodejs':'Node.js','node.js':'Node.js','c++':'C++','c#':'C#','rest api':'REST APIs','scikit-learn':'Scikit-learn','power bi':'Power BI','aws':'AWS','gcp':'GCP','nlp':'NLP','sql':'SQL','dbms':'DBMS','oop':'OOP'}
def extract_skills(text):
    normalized = re.sub(r'\s+',' ',text.lower()); found=[]
    for _, terms in SKILL_DICTIONARY.items():
        for term in terms:
            if re.search(r'(?<!\w)'+re.escape(term)+r'(?!\w)',normalized):
                formatted=CANONICAL.get(term,term.title())
                if formatted not in found: found.append(formatted)
    return found
def section(text, keys):
    lines=[x.strip() for x in text.splitlines() if x.strip()]
    return [x for x in lines if any(k in x.lower() for k in keys)][:5]
def analyze_pdf(contents):
    reader=PdfReader(io.BytesIO(contents)); text='\n'.join(page.extract_text() or '' for page in reader.pages)
    if not text.strip(): raise ValueError('No selectable text found; upload a text-based PDF')
    skills=extract_skills(text); lower=text.lower(); contact=bool(re.search(r'[\w.+-]+@[\w.-]+\.[a-z]{2,}',lower)); links=bool(re.search(r'(github|linkedin|https?://)',lower))
    education=section(text,['b.tech','bachelor','master','university','college','cgpa','gpa'])
    projects=section(text,['project','developed','built','implemented','application'])
    experience=section(text,['intern','experience','worked','software engineer'])
    certifications=section(text,['certif','coursera','udemy','aws certified'])
    breakdown={'skills':min(35,round(len(skills)/10*35)),'education':15 if education else 5,'projects':min(20,5*len(projects)),'experience':15 if experience else 3,'certifications':10 if certifications else 2,'resume_quality':10 if contact and links else (7 if contact else 3)}
    score=sum(breakdown.values()); recommended=['Docker','AWS','Data Structures','Algorithms']; missing=[x for x in recommended if x not in skills]
    suggestions=[]
    if not contact: suggestions.append('Add a professional email address to your contact section.')
    if not projects: suggestions.append('Add a projects section with measurable outcomes.')
    if missing: suggestions.append('Strengthen high-demand skills: '+', '.join(missing[:3])+'.')
    if not any(re.search(r'\d+[%+x]?',line) for line in text.splitlines()): suggestions.append('Use numbers to quantify project or internship impact.')
    return {'extracted_text':text[:50000],'skills':skills,'education':education,'experience':experience,'projects':projects,'certifications':certifications,'ats_score':min(100,score),'score_breakdown':breakdown,'missing_skills':missing,'recommendations':suggestions}
