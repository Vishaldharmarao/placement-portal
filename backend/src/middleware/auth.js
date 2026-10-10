import jwt from 'jsonwebtoken'; import { env } from '../config/env.js'; import { AppError } from '../utils/http.js';
export function requireAuth(req,res,next) { const token = req.headers.authorization?.replace(/^Bearer\s+/i,''); if (!token) return next(new AppError('Authentication required',401)); try { req.user = jwt.verify(token,env.jwtSecret); next(); } catch { next(new AppError('Invalid or expired token',401)); } }
export const requireRole = (...roles) => (req,res,next) => roles.includes(req.user?.role) ? next() : next(new AppError('You are not authorized for this action',403));
