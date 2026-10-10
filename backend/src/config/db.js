import mysql from 'mysql2/promise';
import { env } from './env.js';
export const pool = mysql.createPool({ host: env.dbHost, user: env.dbUser, password: env.dbPassword, database: env.dbName, port: env.dbPort, waitForConnections: true, connectionLimit: 10, namedPlaceholders: true });
export const query = async (sql, values = {}) => { const [rows] = await pool.execute(sql, values); return rows; };
