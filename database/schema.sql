-- Student Management System Database Schema
CREATE DATABASE IF NOT EXISTS student_management_db;
USE student_management_db;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  dob DATE,
  gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
  course VARCHAR(100) NOT NULL,
  enrollment_date DATE NOT NULL,
  status ENUM('Active', 'Inactive', 'Graduated', 'Suspended') DEFAULT 'Active',
  gpa DECIMAL(3, 2) DEFAULT 0.00,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  student_id VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Seed sample students (Pawan Basent, Anup Adhikari, Mandeep Lamichaney, Nikhil Rai)
INSERT INTO students (student_id, first_name, last_name, email, phone, dob, gender, course, enrollment_date, status, gpa, address)
VALUES
  ('STU001', 'Pawan', 'Basent', 'pawan.basent@example.com', '+977-9800000001', '2002-05-15', 'Male', 'Computer Science', '2022-09-01', 'Active', 3.85, 'Kathmandu, Nepal'),
  ('STU002', 'Anup', 'Adhikari', 'anup.adhikari@example.com', '+977-9800000002', '2001-11-20', 'Male', 'Data Science', '2021-09-01', 'Active', 3.92, 'Pokhara, Nepal'),
  ('STU003', 'Mandeep', 'Lamichaney', 'mandeep.l@example.com', '+977-9800000003', '2003-02-18', 'Male', 'Information Technology', '2023-09-01', 'Active', 3.65, 'Lalitpur, Nepal'),
  ('STU004', 'Nikhil', 'Rai', 'nikhil.rai@example.com', '+977-9800000004', '2002-08-25', 'Male', 'Cybersecurity', '2022-09-01', 'Active', 3.78, 'Dharan, Nepal')
ON DUPLICATE KEY UPDATE
  first_name=VALUES(first_name),
  last_name=VALUES(last_name),
  email=VALUES(email),
  phone=VALUES(phone),
  dob=VALUES(dob),
  gender=VALUES(gender),
  course=VALUES(course),
  enrollment_date=VALUES(enrollment_date),
  status=VALUES(status),
  gpa=VALUES(gpa),
  address=VALUES(address);

-- Seed default user accounts (Admin terobau & Students)
INSERT INTO users (username, password, role, student_id)
VALUES
  ('terobau', 'teriama@123', 'admin', NULL),
  ('STU001', 'student123', 'student', 'STU001'),
  ('STU002', 'student123', 'student', 'STU002'),
  ('STU003', 'student123', 'student', 'STU003'),
  ('STU004', 'student123', 'student', 'STU004')
ON DUPLICATE KEY UPDATE password=VALUES(password), role=VALUES(role), student_id=VALUES(student_id);
