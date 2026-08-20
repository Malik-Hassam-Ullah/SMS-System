const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/attendance
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { section_id, date, from_date, to_date } = req.query;

  let query = supabaseAdmin
    .from('attendance')
    .select(`
      *,
      students ( id, full_name, roll_number, registration_number )
    `)
    .eq('branch_id', req.branchId)
    .order('date', { ascending: false });

  if (section_id) query = query.eq('section_id', section_id);
  if (date) query = query.eq('date', date);
  if (from_date) query = query.gte('date', from_date);
  if (to_date) query = query.lte('date', to_date);

  const { data, error } = await query;
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/attendance/bulk — mark attendance for a section
router.post('/bulk', authenticate, requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { records } = req.body; // [{ student_id, section_id, date, status, remarks }]

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'Attendance records array required' });
  }

  const payload = records.map(r => ({
    ...r,
    branch_id: req.branchId,
    marked_by: req.profile.id,
  }));

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .upsert(payload, { onConflict: 'student_id,date' })
    .select();

  if (error) throw error;
  res.status(201).json({ success: true, data, count: data.length });
}));

// GET /api/attendance/report — attendance percentage per student
router.get('/report', authenticate, asyncHandler(async (req, res) => {
  const { section_id, from_date, to_date } = req.query;

  let query = supabaseAdmin
    .from('attendance')
    .select('student_id, status, students(id, full_name, roll_number)')
    .eq('branch_id', req.branchId);

  if (section_id) query = query.eq('section_id', section_id);
  if (from_date) query = query.gte('date', from_date);
  if (to_date) query = query.lte('date', to_date);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by student
  const studentMap = {};
  data?.forEach(a => {
    const sid = a.student_id;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        student: a.students,
        total: 0, present: 0, absent: 0, late: 0, leave: 0,
      };
    }
    studentMap[sid].total++;
    studentMap[sid][a.status]++;
  });

  // Fetch branch settings for attendance certificate eligibility
  const { data: branchData } = await supabaseAdmin
    .from('branches')
    .select('settings')
    .eq('id', req.branchId)
    .single();
  const settings = branchData?.settings || {};
  const minAttendance = parseFloat(settings.minAttendancePercent || '75') / 100;

  const report = Object.values(studentMap).map(s => ({
    ...s,
    percentage: s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : '0.0',
    eligible_for_certificate: s.total > 0 && (s.present / s.total) >= minAttendance,
  }));

  res.json({ success: true, data: report });
}));

// POST /api/attendance/biometric/sync — Ingest hardware punch logs (ZKTeco / Hikvision)
router.post('/biometric/sync', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const { punches } = req.body; // [{ student_id, roll_number, date, check_in, check_out, status, remarks }]
  const branchId = req.branchId;

  if (!Array.isArray(punches) || punches.length === 0) {
    return res.status(400).json({ success: false, message: 'Punches array is required' });
  }

  // Resolve students by roll_number if student_id not passed
  const rollNumbers = punches.filter(p => !p.student_id && p.roll_number).map(p => String(p.roll_number));
  let studentMap = {};
  if (rollNumbers.length > 0) {
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id, roll_number, current_section_id')
      .eq('branch_id', branchId)
      .in('roll_number', rollNumbers);

    (students || []).forEach(s => {
      studentMap[s.roll_number] = s;
    });
  }

  const attendanceRecords = [];
  punches.forEach(p => {
    let sId = p.student_id;
    let secId = p.section_id;

    if (!sId && p.roll_number && studentMap[p.roll_number]) {
      sId = studentMap[p.roll_number].id;
      secId = studentMap[p.roll_number].current_section_id;
    }

    if (sId) {
      attendanceRecords.push({
        student_id: sId,
        section_id: secId || null,
        date: p.date || new Date().toISOString().split('T')[0],
        status: p.status || 'present',
        remarks: p.remarks || 'Biometric Punch Log',
        branch_id: branchId,
        marked_by: req.profile.id
      });
    }
  });

  if (attendanceRecords.length === 0) {
    return res.json({ success: true, message: 'No valid student attendance punches matched.', count: 0 });
  }

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .upsert(attendanceRecords, { onConflict: 'student_id,date' })
    .select();

  if (error) throw error;
  res.status(201).json({
    success: true,
    message: `Synchronized ${data.length} biometric attendance punch(es) successfully!`,
    count: data.length
  });
}));

module.exports = router;
