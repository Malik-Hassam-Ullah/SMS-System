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

const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ─── Security ───────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Rate limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});
app.use(limiter);


// ─── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// ─── 404 ─────────────────────────────────────────────────────
app.use('/{*path}', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
