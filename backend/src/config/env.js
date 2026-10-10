import 'dotenv/config';
const required = ['DB_HOST','DB_USER','DB_NAME','JWT_SECRET'];
export const env = Object.freeze({ port: Number(process.env.PORT || 5000), dbHost: process.env.DB_HOST || 'localhost', dbUser: process.env.DB_USER || 'root', dbPassword: process.env.DB_PASSWORD || '', dbName: process.env.DB_NAME || 'placement_portal', dbPort: Number(process.env.DB_PORT || 3306), jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me', aiUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000', frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173', production: process.env.NODE_ENV === 'production' });
export const missingEnvironment = env.production ? required.filter((key) => !process.env[key]) : [];
