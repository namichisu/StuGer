const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Dashboard statistics
router.get('/stats', studentController.getStudentStats);

// List and search students
router.get('/', studentController.getAllStudents);

// Get student details by ID
router.get('/:id', studentController.getStudentById);

// Create new student
router.post('/', studentController.createStudent);

// Update existing student
router.put('/:id', studentController.updateStudent);

// Delete student
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

