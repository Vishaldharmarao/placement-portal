import { AppError } from './http.js';

export async function deleteOwnedResumeAnalysis({ analysisId, studentId, executeDelete }) {
  const idText = String(analysisId ?? '');
  if (!/^[1-9]\d*$/.test(idText) || !Number.isSafeInteger(Number(idText))) {
    throw new AppError('Invalid analysis record ID', 400);
  }

  const result = await executeDelete(
    `DELETE FROM resume_analysis
     WHERE id = :analysisId
     AND resume_id IN (
       SELECT id FROM resumes WHERE student_id = :studentId
     )`,
    { analysisId: Number(idText), studentId }
  );

  if (result.affectedRows !== 1) {
    throw new AppError('ATS analysis not found', 404);
  }

  return { analysisId: Number(idText) };
}