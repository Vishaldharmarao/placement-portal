import mysql from 'mysql2/promise';
import { env } from './env.js';
export const pool = mysql.createPool({ host: env.dbHost, user: env.dbUser, password: env.dbPassword, database: env.dbName, port: env.dbPort, waitForConnections: true, connectionLimit: 10, namedPlaceholders: true });
export const query = async (sql, values = {}) => { const [rows] = await pool.execute(sql, values); return rows; };
export async function withTransaction(work, acquireConnection = () => pool.getConnection()) {
	const connection = await acquireConnection();
	let transactionStarted = false;

	try {
		await connection.beginTransaction();
		transactionStarted = true;
		const result = await work(connection);
		await connection.commit();
		transactionStarted = false;
		return result;
	} catch (error) {
		if (transactionStarted) {
			try {
				await connection.rollback();
			} catch {}
		}
		throw error;
	} finally {
		connection.release();
	}
}
