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

module.exports = router;
