import { AppError } from '../utils/http.js';
export const notFound = (req,res,next) => next(new AppError(`Route ${req.method} ${req.path} was not found`,404));
export function errorHandler(error, req, res, next) {
	let status = error.statusCode || error.status || 500;
	let message = 'Internal server error';
	let errors;

	if (error.name === 'ZodError' && Array.isArray(error.issues)) {
		status = 400;
		message = 'Validation failed';
		errors = error.issues.map((issue) => ({
			field: issue.path.join('.'),
			message: issue.message,
		}));
	} else if (error.code === 'ER_DUP_ENTRY') {
		status = 409;
		message = 'A record with this value already exists';
	} else if (error.code === 'LIMIT_FILE_SIZE') {
		status = 413;
		message = 'File size exceeds the 5 MB limit';
	} else if (error instanceof AppError) {
		message = error.message;
	} else if (status >= 400 && status < 500) {
		message = error.message;
	} else {
		status = 500;
		console.error('Request failed', {
			method: req.method,
			path: req.path,
			errorType: error.name,
		});
	}

	const body = { success: false, message };
	if (errors) body.errors = errors;
	return res.status(status).json(body);
}
