import { AppError } from '../utils/http.js';
export const notFound = (req,res,next) => next(new AppError(`Route ${req.method} ${req.path} was not found`,404));
export function errorHandler(error,req,res,next) { const status = error.status || 500; if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({success:false,message:'A record with this value already exists'}); console.error(error); res.status(status).json({ success:false, message: status === 500 ? 'Something went wrong' : error.message }); }
