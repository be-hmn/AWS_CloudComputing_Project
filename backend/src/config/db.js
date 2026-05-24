/**
 * mysql2 connection pool — V2 (RDS/MySQL) 연동을 위한 자산.
 * V1 인메모리 모드에서는 import 되지 않으며, scripts/migrate.js 와
 * 추후 repositories 가 DB 로 전환될 때 사용된다.
 */
import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_POOL_LIMIT,
  waitForConnections: true,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: false,
  timezone: 'Z',
});
