// Global error handling middleware

function errorHandler(err, req, res, next) {
  console.error('Error encountered:', err);

  // MySQL Duplicate Entry (e.g., student_id or email already exists)
  if (err.code === 'ER_DUP_ENTRY') {
    let field = 'Field';
    if (err.message.includes('student_id')) field = 'Student ID';
    else if (err.message.includes('email')) field = 'Email address';

    return res.status(409).json({
      success: false,
      message: `${field} already exists. Please choose a unique value.`,
      error: err.code
    });
  }

  // MySQL Bad field or query syntax
  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_PARSE_ERROR') {
    return res.status(400).json({
      success: false,
      message: 'Invalid query or data format.',
      error: err.code
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// 404 Not Found Handler for undefined routes
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

