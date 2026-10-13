import io
import unittest

from PyPDF2 import PdfWriter
from PyPDF2.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.services.resume import analyze_pdf, score_resume_text


def make_text_pdf(text):
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    page = writer.pages[0]
    font = DictionaryObject({
        NameObject('/Type'): NameObject('/Font'),
        NameObject('/Subtype'): NameObject('/Type1'),
        NameObject('/BaseFont'): NameObject('/Helvetica'),
    })
    font_reference = writer._add_object(font)
    page[NameObject('/Resources')] = DictionaryObject({
        NameObject('/Font'): DictionaryObject({NameObject('/F1'): font_reference}),
    })
    escaped = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)').encode('latin-1')
    stream = DecodedStreamObject()
    stream.set_data(b'BT /F1 10 Tf 40 750 Td (' + escaped + b') Tj ET')
    page[NameObject('/Contents')] = writer._add_object(stream)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


class ResumeScoringTests(unittest.TestCase):
    def test_empty_extracted_text_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'No selectable text'):
            score_resume_text('  ')

    def test_blank_pdf_is_rejected_instead_of_scored(self):
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        buffer = io.BytesIO()
        writer.write(buffer)
        with self.assertRaisesRegex(ValueError, 'No selectable text'):
            analyze_pdf(buffer.getvalue())

    def test_corrupt_pdf_is_reported_as_unreadable(self):
        with self.assertRaisesRegex(ValueError, 'corrupted or unreadable'):
            analyze_pdf(b'%PDF-1.4\nnot a valid PDF')

    def test_pdf_extraction_returns_content_based_general_score(self):
        content = 'Alex alex@example.com +1 555 555 0199. Skills: Python and SQL. Developed a project.'
        result = analyze_pdf(make_text_pdf(content))
        self.assertIn('Python', result['skills'])
        self.assertEqual(result['assessment_type'], 'GENERAL_RESUME_QUALITY')
        self.assertLess(result['ats_score'], 100)

    def test_weak_resume_does_not_receive_a_perfect_score(self):
        result = score_resume_text('Seeking an opportunity to learn and grow.')
        self.assertEqual(result['assessment_type'], 'GENERAL_RESUME_QUALITY')
        self.assertLess(result['ats_score'], 100)
        self.assertIn('General resume-quality assessment; no job description was selected.', result['warnings'])

    def test_partial_job_match_reports_missing_skills(self):
        text = '''
        Alex Candidate alex@example.com +1 555 555 0199
        Education: Bachelor of Science, Computer Science, CGPA 8.2
        Skills: Python, SQL
        Projects: Developed a data analysis project using Python and SQL.
        '''
        result = score_resume_text(
            text,
            job_description='Python, SQL and Docker skills required for analytics and deployment.',
            required_skills=['Python', 'SQL', 'Docker'],
            job_title='Data Analyst',
            qualification={'minimum_cgpa': 7, 'student_cgpa': 8.2},
        )
        self.assertEqual(result['assessment_type'], 'JOB_MATCHED')
        self.assertEqual(result['matched_skills'], ['Python', 'SQL'])
        self.assertEqual(result['missing_skills'], ['Docker'])
        self.assertLess(result['ats_score'], 100)

    def test_strong_job_match_scores_above_partial_without_exceeding_100(self):
        text = '''
        Alex Candidate alex@example.com +1 555 555 0199 https://github.com/alex
        Education: Bachelor of Science in Computer Science, CGPA 8.5
        Skills: Python, SQL, Docker, Git, Data Structures
        Projects: Developed and deployed a Python analytics application; improved throughput by 30%.
        Experience: Software Engineer Intern, tested SQL services and collaborated on deployment.
        Certification: AWS Certified Cloud Practitioner.
        ''' + ('Built reliable analytics and deployment tools. ' * 8)
        result = score_resume_text(
            text,
            job_description='Python SQL Docker analytics deployment testing collaboration software engineering.',
            required_skills=['Python', 'SQL', 'Docker'],
            job_title='Data Analyst',
            qualification={'minimum_cgpa': 7, 'student_cgpa': 8.5},
        )
        self.assertGreater(result['ats_score'], 60)
        self.assertLessEqual(result['ats_score'], 100)
        self.assertEqual(result['missing_skills'], [])
        self.assertEqual(sum(item['maximum'] for item in result['score_breakdown']['components'].values()), 100)


if __name__ == '__main__':
    unittest.main()