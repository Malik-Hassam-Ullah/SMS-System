/**
 * Global Express error handler
 */
const fs = require('fs');
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  fs.appendFileSync('error.log', JSON.stringify(err, null, 2) + '\n');

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // PostgreSQL / Supabase specific error codes
  if (err.code) {
    // Foreign key violation — e.g. deleting a student that has vouchers/attendance
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this record because it is referenced by other data (e.g. fee vouchers, attendance, or marks). Please remove related records first.',
        detail: err.message,
      });
    }

    // Unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A record with this value already exists.',
        detail: err.message,
      });
    }

    // Table/relation does not exist (missing migration)
    if (err.code === '42P01') {
      return res.status(500).json({
        success: false,
        message: 'A required database table is missing. Please contact your administrator.',
        detail: err.message,
      });
    }

    // PostgREST errors (Supabase REST layer)
    if (err.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        detail: err.message,
      });
    }

    // Other PostgreSQL errors (codes starting with digits like 22xxx, 23xxx, etc.)
    if (/^\d{5}$/.test(err.code) || err.code.startsWith('PGRST')) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Database error',
        detail: err.hint || err.details || null,
      });
    }
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ success: false, message });
};

/**
 * Async wrapper to avoid try-catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
