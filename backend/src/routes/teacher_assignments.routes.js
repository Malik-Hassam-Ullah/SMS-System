const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole, enforceBranchIsolation } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Helper: validate foreign keys belong to same branch
const validateEntities = async (branchId, teacherId, sectionId, subjectId, examId) => {
  // teacher
  const { data: teacher, error: tErr } = await supabaseAdmin
    .from('teachers')
    .select('id, branch_id')
    .eq('id', teacherId)
    .single();
  if (tErr || !teacher) throw new Error('Invalid teacher');
  if (teacher.branch_id !== branchId) throw new Error('Teacher belongs to another branch');

  // section
  const { data: section, error: sErr } = await supabaseAdmin
    .from('sections')
    .select('id, branch_id')
    .eq('id', sectionId)
    .single();
  if (sErr || !section) throw new Error('Invalid section');
  if (section.branch_id !== branchId) throw new Error('Section belongs to another branch');

  // subject
  const { data: subject, error: subErr } = await supabaseAdmin
    .from('subjects')
    .select('id, branch_id')
    .eq('id', subjectId)
    .single();
  if (subErr || !subject) throw new Error('Invalid subject');
  if (subject.branch_id !== branchId) throw new Error('Subject belongs to another branch');

  // optional exam
  if (examId) {
    const { data: exam, error: eErr } = await supabaseAdmin
      .from('exams')
      .select('id, branch_id')
      .eq('id', examId)
      .single();
    if (eErr || !exam) throw new Error('Invalid exam');
    if (exam.branch_id !== branchId) throw new Error('Exam belongs to another branch');
  }
};

// CREATE assignment
router.post(
  '/',
  authenticate,
  requireRole('ceo', 'admin'),
  enforceBranchIsolation,
  asyncHandler(async (req, res) => {
    const { teacher_id, section_id, subject_id, exam_id } = req.body;
    const branchId = req.branchId;
    if (!teacher_id || !section_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'teacher_id, section_id and subject_id are required' });
    }
    await validateEntities(branchId, teacher_id, section_id, subject_id, exam_id);

    const payload = { teacher_id, section_id, subject_id, exam_id: exam_id || null, branch_id: branchId };
    const { data, error } = await supabaseAdmin
      .from('teacher_assignments')
      .upsert(payload, { onConflict: 'teacher_id,section_id,subject_id,exam_id' })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  })
);

// LIST assignments for a specific teacher
router.get(
  '/:teacherId',
  authenticate,
  requireRole('ceo', 'admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const { teacherId } = req.params;
    const branchId = req.branchId;
    let query = supabaseAdmin
      .from('teacher_assignments')
      .select(`*, sections (id, name, classes (id, name)), subjects (id, name, total_marks), exams (id, name, exam_type, is_locked)`)
      .eq('teacher_id', teacherId);
    if (req.role !== 'ceo') query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  })
);

// UPDATE assignment (e.g., change section/subject/exam)
router.put(
  '/:id',
  authenticate,
  requireRole('ceo', 'admin'),
  enforceBranchIsolation,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { section_id, subject_id, exam_id } = req.body;
    const branchId = req.branchId;
    // fetch existing to get teacher_id for validation
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('teacher_assignments')
      .select('teacher_id')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;
    await validateEntities(branchId, existing.teacher_id, section_id, subject_id, exam_id);
    const payload = {
      section_id,
      subject_id,
      exam_id: exam_id || null,
    };
    const { data, error } = await supabaseAdmin
      .from('teacher_assignments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  })
);

// DELETE assignment
router.delete(
  '/:id',
  authenticate,
  requireRole('ceo', 'admin'),
  enforceBranchIsolation,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('teacher_assignments').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Assignment deleted' });
  })
);

module.exports = router;
