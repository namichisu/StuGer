const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/student/:studentId
router.get('/student/:studentId', authController.getStudentProfile);

module.exports = router;

