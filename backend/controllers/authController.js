const { pool } = require('../config/database');

// Default fallback accounts for offline or initial testing
const FALLBACK_ACCOUNTS = [
  {
    username: 'terobau',
    password: 'teriama@123',
    role: 'admin',
    student: null
  },
  {
    username: 'STU001',
    password: 'student123',
    role: 'student',
    student_id: 'STU001',
    student: {
      student_id: 'STU001',
      first_name: 'Pawan',
      last_name: 'Basent',
      email: 'pawan.basent@example.com',
      phone: '+977-9800000001',
      dob: '2002-05-15',
      gender: 'Male',
      course: 'Computer Science',
      enrollment_date: '2022-09-01',
      status: 'Active',
      gpa: 3.85,
      address: 'Kathmandu, Nepal'
    }
  },
  {
    username: 'STU002',
    password: 'student123',
    role: 'student',
    student_id: 'STU002',
    student: {
      student_id: 'STU002',
      first_name: 'Anup',
      last_name: 'Adhikari',
      email: 'anup.adhikari@example.com',
      phone: '+977-9800000002',
      dob: '2001-11-20',
      gender: 'Male',
      course: 'Data Science',
      enrollment_date: '2021-09-01',
      status: 'Active',
      gpa: 3.92,
      address: 'Pokhara, Nepal'
    }
  },
  {
    username: 'STU003',
    password: 'student123',
    role: 'student',
    student_id: 'STU003',
    student: {
      student_id: 'STU003',
      first_name: 'Mandeep',
      last_name: 'Lamichaney',
      email: 'mandeep.l@example.com',
      phone: '+977-9800000003',
      dob: '2003-02-18',
      gender: 'Male',
      course: 'Information Technology',
      enrollment_date: '2023-09-01',
      status: 'Active',
      gpa: 3.65,
      address: 'Lalitpur, Nepal'
    }
  },
  {
    username: 'STU004',
    password: 'student123',
    role: 'student',
    student_id: 'STU004',
    student: {
      student_id: 'STU004',
      first_name: 'Nikhil',
      last_name: 'Rai',
      email: 'nikhil.rai@example.com',
      phone: '+977-9800000004',
      dob: '2002-08-25',
      gender: 'Male',
      course: 'Cybersecurity',
      enrollment_date: '2022-09-01',
      status: 'Active',
      gpa: 3.78,
      address: 'Dharan, Nepal'
    }
  }
];

// Ensure users table exists in MySQL when database is available
async function ensureUsersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
        student_id VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed or update default admin
    const [adminCheck] = await pool.query('SELECT id FROM users WHERE username = "terobau"');
    if (adminCheck.length === 0) {
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES ("terobau", "teriama@123", "admin")'
      );
    } else {
      await pool.query(
        'UPDATE users SET password = "teriama@123", role = "admin" WHERE username = "terobau"'
      );
    }

    // Seed students if present in students table
    const [students] = await pool.query('SELECT student_id FROM students');
    for (const s of students) {
      const [userCheck] = await pool.query('SELECT id FROM users WHERE username = ?', [s.student_id]);
      if (userCheck.length === 0) {
        await pool.query(
          'INSERT INTO users (username, password, role, student_id) VALUES (?, "student123", "student", ?)',
          [s.student_id, s.student_id]
        );
      }
    }
  } catch (err) {
    // Database may be offline during development; proceed gracefully
  }
}

// User & Admin Login
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email/Student ID and Password are required.'
      });
    }

    const trimmedIdentifier = identifier.trim();

    // 1. Try MySQL Database Authentication
    try {
      const [rows] = await pool.query(`
        SELECT u.id, u.username, u.password, u.role, u.student_id,
               s.id as student_pk_id, s.first_name, s.last_name, s.email, s.phone,
               s.dob, s.gender, s.course, s.enrollment_date, s.status, s.gpa, s.address
        FROM users u
        LEFT JOIN students s ON u.student_id = s.student_id
        WHERE u.username = ? OR u.student_id = ? OR s.email = ?
        LIMIT 1
      `, [trimmedIdentifier, trimmedIdentifier, trimmedIdentifier]);

      if (rows.length > 0) {
        const userRow = rows[0];

        if (userRow.password !== password) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials. Please verify your password.'
          });
        }

        let studentData = null;
        if (userRow.role === 'student') {
          studentData = {
            id: userRow.student_pk_id,
            student_id: userRow.student_id,
            first_name: userRow.first_name,
            last_name: userRow.last_name,
            email: userRow.email,
            phone: userRow.phone,
            dob: userRow.dob,
            gender: userRow.gender,
            course: userRow.course,
            enrollment_date: userRow.enrollment_date,
            status: userRow.status,
            gpa: userRow.gpa,
            address: userRow.address
          };
        }

        return res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: userRow.id,
            username: userRow.username,
            role: userRow.role,
            student_id: userRow.student_id,
            student: studentData
          }
        });
      }
    } catch (dbErr) {
      console.warn('Database lookup failed, checking fallback accounts:', dbErr.message);
    }

    // 2. Fallback in-memory accounts for testing or offline database
    const matchedAccount = FALLBACK_ACCOUNTS.find(
      acc => acc.username.toLowerCase() === trimmedIdentifier.toLowerCase() ||
             (acc.student && acc.student.email.toLowerCase() === trimmedIdentifier.toLowerCase()) ||
             (acc.student_id && acc.student_id.toLowerCase() === trimmedIdentifier.toLowerCase())
    );

    if (matchedAccount) {
      if (matchedAccount.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your password.'
        });
      }

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          username: matchedAccount.username,
          role: matchedAccount.role,
          student_id: matchedAccount.student_id || null,
          student: matchedAccount.student || null
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Account not found. Use "terobau" or student ID (e.g. "STU001").'
    });
  } catch (error) {
    next(error);
  }
};

// Fetch student profile for student role
exports.getStudentProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    try {
      const [rows] = await pool.query('SELECT * FROM students WHERE student_id = ?', [studentId]);
      if (rows.length > 0) {
        return res.json({
          success: true,
          data: rows[0]
        });
      }
    } catch (dbErr) {
      console.warn('DB student query failed, checking fallback:', dbErr.message);
    }

    const fallback = FALLBACK_ACCOUNTS.find(a => a.student_id === studentId);
    if (fallback && fallback.student) {
      return res.json({
        success: true,
        data: fallback.student
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Student record not found.'
    });
  } catch (error) {
    next(error);
  }
};

exports.ensureUsersTable = ensureUsersTable;

