const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// GET /api/marks — by section + exam + subject
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { section_id, exam_id, subject_id } = req.query;
  const branchId = req.branchId;
  const role = req.role;

  let query = supabaseAdmin
    .from('marks')
    .select(`
      *,
      students ( id, full_name, roll_number, registration_number ),
      subjects ( id, name, total_marks, pass_marks ),
      exams ( id, name, exam_date )
    `)
    .order('students(full_name)');

  // CEO can see all branches; admin/teacher are branch-scoped
  if (role !== 'ceo') {
    query = query.eq('branch_id', branchId);
  }

  if (section_id) query = query.eq('section_id', section_id);
  if (exam_id) query = query.eq('exam_id', exam_id);
  if (subject_id) query = query.eq('subject_id', subject_id);

  // Teachers can only see marks for their assigned sections
  if (role === 'teacher') {
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('user_profile_id', req.profile.id)
      .single();

    if (teacher && section_id) {
      const { data: assignment } = await supabaseAdmin
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('section_id', section_id)
        .eq('subject_id', subject_id)
        .single();

      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not your assigned section/subject' });
      }
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/marks/bulk — bulk marks entry
router.post('/bulk', authenticate, requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { marks } = req.body; // array of { student_id, subject_id, exam_id, section_id, marks_obtained, is_absent, remarks }

  if (!Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({ success: false, message: 'Marks array is required' });
  }

  // Teacher: verify assignment for each section/subject combo
  if (req.role === 'teacher') {
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('user_profile_id', req.profile.id)
      .single();

    const uniqueCombos = [...new Set(marks.map(m => `${m.section_id}:${m.subject_id}`))];
    for (const combo of uniqueCombos) {
      const [sectionId, subjectId] = combo.split(':');
      const { data: assignment } = await supabaseAdmin
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('section_id', sectionId)
        .eq('subject_id', subjectId)
        .single();

      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not your assigned section/subject' });
      }
    }
  }

  const payload = marks.map(m => ({
    ...m,
    branch_id: req.branchId,
    entered_by: req.profile.id,
    updated_by: req.profile.id,
  }));

  const { data, error } = await supabaseAdmin
    .from('marks')
    .upsert(payload, { onConflict: 'student_id,subject_id,exam_id' })
    .select();

  if (error) throw error;

  await logAudit(req, 'BULK_MARKS_ENTRY', 'marks', null, null, { count: data.length });
  res.status(201).json({ success: true, data, count: data.length });
}));

// PUT /api/marks/:id
router.put('/:id', authenticate, requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('marks')
    .select('*')
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Mark record not found' });
  }

  const { marks_obtained, is_absent, remarks } = req.body;
  const { data, error } = await supabaseAdmin
    .from('marks')
    .update({ marks_obtained, is_absent, remarks, updated_by: req.profile.id })
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();

  if (error) throw error;
  await logAudit(req, 'UPDATE_MARKS', 'marks', data.id, existing, data);
  res.json({ success: true, data });
}));

// GET /api/marks/report/student/:studentId — full result card
router.get('/report/student/:studentId', authenticate, asyncHandler(async (req, res) => {
  const { exam_id } = req.query;

  let query = supabaseAdmin
    .from('marks')
    .select(`
      *,
      subjects ( id, name, total_marks, pass_marks ),
      exams ( id, name, exam_date )
    `)
    .eq('student_id', req.params.studentId)
    .eq('branch_id', req.branchId);

  if (exam_id) query = query.eq('exam_id', exam_id);

  const { data: marksData, error } = await query;
  if (error) throw error;

  const totalObtained = marksData?.reduce((s, m) => s + (m.marks_obtained || 0), 0) || 0;
  const totalMarks = marksData?.reduce((s, m) => s + m.total_marks, 0) || 0;
  const percentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : 0;

  // Fetch branch settings for global passing marks percentage fallback
  const { data: branchData } = await supabaseAdmin
    .from('branches')
    .select('settings')
    .eq('id', req.branchId)
    .single();
  const settings = branchData?.settings || {};
  const globalPassingPercent = parseFloat(settings.passingMarks || '40');

  const passed = marksData?.every(m => {
    if (m.is_absent) return false;
    const passMarks = m.subjects?.pass_marks || (m.total_marks * globalPassingPercent / 100);
    return (m.marks_obtained || 0) >= passMarks;
  });

  res.json({
    success: true,
    data: {
      marks: marksData,
      summary: { totalObtained, totalMarks, percentage, passed },
    },
  });
}));

// GET /api/marks/report/section/:sectionId — section result sheet
router.get('/report/section/:sectionId', authenticate, asyncHandler(async (req, res) => {
  const { exam_id } = req.query;

  const { data, error } = await supabaseAdmin
    .from('marks')
    .select(`
      *,
      students ( id, full_name, roll_number, registration_number ),
      subjects ( id, name, total_marks, pass_marks ),
      exams ( id, name )
    `)
    .eq('section_id', req.params.sectionId)
    .eq('branch_id', req.branchId)
    .eq('exam_id', exam_id || '')
    .order('students(roll_number)');

  if (error) throw error;
  res.json({ success: true, data });
}));

module.exports = router;
