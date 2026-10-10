export class AppError extends Error { constructor(message, status = 500) { super(message); this.status = status; } }
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
export const asyncRoute = (handler) => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);
