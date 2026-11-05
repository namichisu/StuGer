const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const isCloudHost = process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST);
const useSSL = process.env.DB_SSL === 'true' || (isCloudHost && process.env.DB_SSL !== 'false');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: (process.env.DB_NAME && process.env.DB_NAME !== 'sys') ? process.env.DB_NAME : 'student_management_db',
  port: Number(process.env.DB_PORT) || 4000,
  waitForConnections: true,
  // Serverless needs a small pool — each function instance is short-lived
  connectionLimit: isProduction ? 2 : 10,
  queueLimit: 0,
  dateStrings: true,
  connectTimeout: 15000,
  // TiDB Cloud & modern cloud databases mandate TLS/SSL transport
  ...(useSSL && {
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  })
};

const pool = mysql.createPool(poolConfig);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    if (!isProduction) {
      console.log(' Successfully connected to MySQL:', process.env.DB_NAME || 'student_management_db');
    }
    connection.release();
    return true;
  } catch (error) {
    console.error(' Database connection error:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
