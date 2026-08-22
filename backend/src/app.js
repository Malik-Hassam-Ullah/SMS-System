const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const classRoutes = require('./routes/class.routes');
const subjectRoutes = require('./routes/subject.routes');
const sessionRoutes = require('./routes/session.routes');
const examRoutes = require('./routes/exam.routes');
const marksRoutes = require('./routes/marks.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const feeRoutes = require('./routes/fee.routes');
const messageRoutes = require('./routes/message.routes');
const certificateRoutes = require('./routes/certificate.routes');
const auditRoutes = require('./routes/audit.routes');
const importRoutes = require('./routes/import.routes');
const ceoRoutes = require('./routes/ceo.routes');
const staffAttendanceRoutes = require('./routes/staff.attendance.routes');
const publicRoutes = require('./routes/public.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const settingsRoutes = require('./routes/settings.routes');
const expenseRoutes = require('./routes/expense.routes');
const teacherAssignmentsRoutes = require('./routes/teacher_assignments.routes');

const { apiCacheMiddleware } = require('./middleware/cache.middleware');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ─── Security ───────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed =
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000' ||
      origin === 'http://127.0.0.1:5173' ||
      origin === process.env.FRONTEND_URL ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// ─── Rate limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost / LAN in development
    const ip = req.ip || req.connection?.remoteAddress || '';
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip.includes('192.168.') ||
      ip.includes('10.') ||
      process.env.NODE_ENV !== 'production'
    );
  },
});
app.use(limiter);


// ─── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Server In-Memory Cache (0ms Instant Read) ───────────────
app.use('/api', apiCacheMiddleware());

// ─── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/import', importRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/teacher-assignments', teacherAssignmentsRoutes);

// ─── 404 ─────────────────────────────────────────────────────
app.use('/{*path}', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
