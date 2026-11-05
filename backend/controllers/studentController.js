const { pool } = require('../config/database');

// Helper to auto-generate student ID if not provided
async function generateStudentId() {
  const [rows] = await pool.query('SELECT MAX(id) as maxId FROM students');
  const nextId = (rows[0].maxId || 0) + 1;
  return `STU${String(nextId).padStart(4, '0')}`;
}

// Get all students with search, filter, and sorting
exports.getAllStudents = async (req, res, next) => {
  try {
    const { search, course, status, sortBy = 'id', sortOrder = 'DESC' } = req.query;

    const allowedSortColumns = ['id', 'student_id', 'first_name', 'last_name', 'email', 'course', 'enrollment_date', 'gpa', 'status'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'id';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (student_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR course LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    if (course && course.trim() !== '') {
      query += ` AND course = ?`;
      params.push(course.trim());
    }

    if (status && status.trim() !== '') {
      query += ` AND status = ?`;
      params.push(status.trim());
    }

    query += ` ORDER BY ${validSortBy} ${validSortOrder}`;

    const [students] = await pool.query(query, params);

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// Get single student by ID
exports.getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Student with ID ${id} not found.`
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Create a new student
exports.createStudent = async (req, res, next) => {
  try {
    let {
      student_id,
      first_name,
      last_name,
      email,
      phone,
      dob,
      gender = 'Male',
      course,
      enrollment_date,
      status = 'Active',
      gpa = 0.00,
      address
    } = req.body;

    // Field validations
    if (!first_name || !last_name || !email || !course || !enrollment_date) {
      return res.status(400).json({
        success: false,
        message: 'First Name, Last Name, Email, Course, and Enrollment Date are required.'
      });
    }

    // Auto-generate student_id if missing
    if (!student_id || student_id.trim() === '') {
      student_id = await generateStudentId();
    } else {
      student_id = student_id.trim();
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Validate GPA
    const numGpa = parseFloat(gpa);
    if (isNaN(numGpa) || numGpa < 0 || numGpa > 4.0) {
      return res.status(400).json({
        success: false,
        message: 'GPA must be a number between 0.00 and 4.00.'
      });
    }

    const insertSql = `
      INSERT INTO students 
      (student_id, first_name, last_name, email, phone, dob, gender, course, enrollment_date, status, gpa, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      student_id,
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      phone || null,
      dob || null,
      gender,
      course.trim(),
      enrollment_date,
      status,
      numGpa,
      address || null
    ];

    const [result] = await pool.query(insertSql, values);
    const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      data: newStudent[0]
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing student
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      student_id,
      first_name,
      last_name,
      email,
      phone,
      dob,
      gender,
      course,
      enrollment_date,
      status,
      gpa,
      address
    } = req.body;

    // Check if student exists
    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Student with ID ${id} not found.`
      });
    }

    // Field validations
    if (!first_name || !last_name || !email || !course || !enrollment_date) {
      return res.status(400).json({
        success: false,
        message: 'First Name, Last Name, Email, Course, and Enrollment Date are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const numGpa = parseFloat(gpa !== undefined ? gpa : existing[0].gpa);
    if (isNaN(numGpa) || numGpa < 0 || numGpa > 4.0) {
      return res.status(400).json({
        success: false,
        message: 'GPA must be a number between 0.00 and 4.00.'
      });
    }

    const updateSql = `
      UPDATE students 
      SET student_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, 
          dob = ?, gender = ?, course = ?, enrollment_date = ?, status = ?, 
          gpa = ?, address = ?
      WHERE id = ?
    `;

    const values = [
      student_id ? student_id.trim() : existing[0].student_id,
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      phone || null,
      dob || null,
      gender || existing[0].gender,
      course.trim(),
      enrollment_date,
      status || existing[0].status,
      numGpa,
      address || null,
      id
    ];

    await pool.query(updateSql, values);
    const [updated] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Student updated successfully.',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete a student
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Student with ID ${id} not found.`
      });
    }

    await pool.query('DELETE FROM students WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Student "${existing[0].first_name} ${existing[0].last_name}" (ID: ${existing[0].student_id}) deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// Get Dashboard Statistics
exports.getStudentStats = async (req, res, next) => {
  try {
    // Total & Active counts
    const [totalRows] = await pool.query('SELECT COUNT(*) as total FROM students');
    const [activeRows] = await pool.query('SELECT COUNT(*) as active FROM students WHERE status = "Active"');
    const [avgGpaRows] = await pool.query('SELECT ROUND(AVG(gpa), 2) as avgGpa FROM students');
    const [coursesRows] = await pool.query('SELECT COUNT(DISTINCT course) as coursesCount FROM students');

    // Courses list
    const [courses] = await pool.query('SELECT DISTINCT course FROM students ORDER BY course ASC');

    // Status breakdown
    const [statusBreakdown] = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM students 
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        totalStudents: totalRows[0].total || 0,
        activeStudents: activeRows[0].active || 0,
        averageGpa: avgGpaRows[0].avgGpa || '0.00',
        totalCourses: coursesRows[0].coursesCount || 0,
        courses: courses.map(c => c.course),
        statusBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

