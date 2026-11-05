const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from project root .env
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'student_management_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Return date as 'YYYY-MM-DD' strings rather than JS Date objects
});

// Test and initialize database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(' Successfully connected to MySQL database:', process.env.DB_NAME || 'student_management_db');
    connection.release();
    return true;
  } catch (error) {
    console.error(' Database connection error:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
