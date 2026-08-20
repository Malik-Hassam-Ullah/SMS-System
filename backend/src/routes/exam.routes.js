const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// GET /api/exams — List all exams with statistics
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { session_id, status } = req.query;
  const branchId = req.branchId;

  let query = supabaseAdmin
    .from('exams')
    .select('*, academic_sessions(id, name)')
    .order('created_at', { ascending: false });

  if (req.role !== 'ceo' && branchId) {
    query = query.eq('branch_id', branchId);
  }
  if (session_id) query = query.eq('session_id', session_id);
  if (status) query = query.eq('status', status);

  const { data: exams, error } = await query;
  if (error) throw error;

  // Enrich exams with counts
  const examIds = (exams || []).map(e => e.id);
  let assignmentsByExam = {};
  let marksByExam = {};

  if (examIds.length > 0) {
    let assignments = [], marks = [];
    try {
      const [aRes, mRes] = await Promise.all([
        supabaseAdmin.from('teacher_assignments').select('id, exam_id').in('exam_id', examIds),
        supabaseAdmin.from('marks').select('id, exam_id').in('exam_id', examIds)
      ]);
      assignments = aRes.data || [];
      marks = mRes.data || [];
    } catch (e) {
      console.error('[exams] count enrichment error:', e.message);
    }

    (assignments || []).forEach(a => {
      if (a.exam_id) assignmentsByExam[a.exam_id] = (assignmentsByExam[a.exam_id] || 0) + 1;
    });
    (marks || []).forEach(m => {
      if (m.exam_id) marksByExam[m.exam_id] = (marksByExam[m.exam_id] || 0) + 1;
    });
  }

  const enriched = (exams || []).map(e => ({
    ...e,
    exam_type: e.exam_type || 'Term',
    start_date: e.start_date || e.exam_date || null,
    end_date: e.end_date || e.exam_date || null,
    is_locked: !!e.is_locked,
    status: e.status || 'upcoming',
    assignments_count: assignmentsByExam[e.id] || 0,
    marks_count: marksByExam[e.id] || 0
  }));

  res.json({ success: true, data: enriched });
}));

// GET /api/exams/:id/overview — CEO / Admin Review Panel overview
router.get('/:id/overview', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const examId = req.params.id;
  const branchId = req.branchId;

  // 1. Fetch exam
  const { data: exam, error: exErr } = await supabaseAdmin
    .from('exams')
    .select('*, academic_sessions(id, name)')
    .eq('id', examId)
    .single();

  if (exErr || !exam) {
    return res.status(404).json({ success: false, message: 'Exam not found' });
  }

  // 2. Fetch classes, sections, subjects, assignments, students, and marks
  const [
    { data: classes },
    { data: sections },
    { data: subjects },
    { data: assignments },
    { data: students },
    { data: marks }
  ] = await Promise.all([
    supabaseAdmin.from('classes').select('id, name, display_order').eq('branch_id', branchId).order('display_order'),
    supabaseAdmin.from('sections').select('id, name, class_id').eq('branch_id', branchId),
    supabaseAdmin.from('subjects').select('id, name, code, total_marks, pass_marks').eq('branch_id', branchId),
    supabaseAdmin.from('teacher_assignments').select('*, teachers(id, employee_code, user_profiles(full_name))').eq('branch_id', branchId),
    supabaseAdmin.from('students').select('id, current_class_id, current_section_id').eq('branch_id', branchId).eq('is_active', true),
    supabaseAdmin.from('marks').select('id, student_id, subject_id, section_id, exam_id, is_locked').eq('exam_id', examId)
  ]);

  // Build overview tree: Class -> Section -> Subject
  const overview = (classes || []).map(cls => {
    const classSections = (sections || []).filter(s => s.class_id === cls.id);
    const classStudents = (students || []).filter(s => s.current_class_id === cls.id);

    const sectionOverviews = classSections.map(sec => {
      const secStudents = (students || []).filter(s => s.current_section_id === sec.id);
      const studentCount = secStudents.length;

      const subjectBreakdowns = (subjects || []).map(sub => {
        // Find teacher assignment for this exam + section + subject
        const assignment = (assignments || []).find(a =>
          a.section_id === sec.id &&
          a.subject_id === sub.id &&
          (!a.exam_id || a.exam_id === examId)
        );

        // Find entered marks for this section + subject + exam
        const enteredMarks = (marks || []).filter(m =>
          m.section_id === sec.id &&
          m.subject_id === sub.id
        );

        const enteredCount = enteredMarks.length;
        const isSubjectLocked = enteredMarks.length > 0 && enteredMarks.every(m => m.is_locked);

        let status = 'pending';
        if (studentCount > 0 && enteredCount >= studentCount) {
          status = 'completed';
        } else if (enteredCount > 0) {
          status = 'in_progress';
        }

        return {
          subject_id: sub.id,
          subject_name: sub.name,
          total_marks: sub.total_marks || 100,
          teacher: assignment?.teachers?.user_profiles?.full_name || 'Not Assigned',
          teacher_id: assignment?.teacher_id || null,
          assignment_id: assignment?.id || null,
          total_students: studentCount,
          marks_entered: enteredCount,
          status,
          is_locked: isSubjectLocked || !!exam.is_locked
        };
      });

      return {
        section_id: sec.id,
        section_name: sec.name,
        student_count: studentCount,
        subjects: subjectBreakdowns
      };
    });

    return {
      class_id: cls.id,
      class_name: cls.name,
      student_count: classStudents.length,
      sections: sectionOverviews
    };
  });

  res.json({
    success: true,
    data: {
      exam: {
        ...exam,
        exam_type: exam.exam_type || 'Term',
        start_date: exam.start_date || exam.exam_date,
        end_date: exam.end_date || exam.exam_date,
        is_locked: !!exam.is_locked
      },
      overview
    }
  });
}));

// POST /api/exams — Create new Exam / Term
router.post('/', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const { name, exam_type, start_date, end_date, session_id, status } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Exam name is required' });
  }

  let activeSessionId = session_id;
  if (!activeSessionId) {
    const { data: activeSession } = await supabaseAdmin
      .from('academic_sessions')
      .select('id')
      .eq('branch_id', req.branchId)
      .eq('is_current', true)
      .limit(1)
      .single()
      .catch(() => ({ data: null }));

    if (activeSession) {
      activeSessionId = activeSession.id;
    } else {
      const { data: anySession } = await supabaseAdmin
        .from('academic_sessions')
        .select('id')
        .eq('branch_id', req.branchId)
        .limit(1)
        .single()
        .catch(() => ({ data: null }));

      if (anySession) {
        activeSessionId = anySession.id;
      } else {
        const { data: sessView } = await supabaseAdmin
          .from('sessions')
          .select('id')
          .limit(1)
          .single()
          .catch(() => ({ data: null }));
        activeSessionId = sessView?.id;
      }
    }
  }

  const payload = {
    branch_id: req.branchId,
    name: name.trim(),
    exam_date: start_date || new Date().toISOString().split('T')[0],
    session_id: activeSessionId
  };

  // Optional new columns with safe fallback
  if (exam_type) payload.exam_type = exam_type;
  if (start_date) payload.start_date = start_date;
  if (end_date) payload.end_date = end_date;
  if (status) payload.status = status;

  let insertQuery = supabaseAdmin.from('exams').insert(payload).select().single();
  let { data, error } = await insertQuery;

  // Graceful fallback if new schema columns are not yet in db cache
  if (error && error.message && error.message.includes('column')) {
    delete payload.exam_type;
    delete payload.start_date;
    delete payload.end_date;
    delete payload.status;
    const retry = await supabaseAdmin.from('exams').insert(payload).select().single();
    if (retry.error) throw retry.error;
    data = retry.data;
  } else if (error) {
    throw error;
  }

  await logAudit(req, 'CREATE_EXAM', 'exams', data.id, null, data);
  res.status(201).json({ success: true, data });
}));

// PUT /api/exams/:id — Update Exam / Term
router.put('/:id', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, exam_type, start_date, end_date, session_id, status, is_locked } = req.body;

  const payload = {};
  if (name !== undefined) payload.name = name.trim();
  if (start_date !== undefined) {
    payload.start_date = start_date;
    payload.exam_date = start_date;
  }
  if (end_date !== undefined) payload.end_date = end_date;
  if (exam_type !== undefined) payload.exam_type = exam_type;
  if (session_id !== undefined) payload.session_id = session_id;
  if (status !== undefined) payload.status = status;
  if (is_locked !== undefined) {
    payload.is_locked = is_locked;
    if (is_locked) {
      payload.locked_at = new Date().toISOString();
      payload.locked_by = req.profile.id;
    }
  }

  let { data, error } = await supabaseAdmin
    .from('exams')
    .update(payload)
    .eq('id', id)
    .eq('branch_id', req.branchId)
    .select()
    .single();

  if (error && error.message && error.message.includes('column')) {
    delete payload.exam_type;
    delete payload.start_date;
    delete payload.end_date;
    delete payload.status;
    delete payload.is_locked;
    delete payload.locked_at;
    delete payload.locked_by;
    const retry = await supabaseAdmin.from('exams').update(payload).eq('id', id).eq('branch_id', req.branchId).select().single();
    if (retry.error) throw retry.error;
    data = retry.data;
  } else if (error) {
    throw error;
  }

  // If locking or unlocking exam, update all associated marks
  if (is_locked !== undefined) {
    await supabaseAdmin
      .from('marks')
      .update({ is_locked, locked_at: is_locked ? new Date().toISOString() : null, locked_by: is_locked ? req.profile.id : null })
      .eq('exam_id', id)
      .catch(() => {});
  }

  await logAudit(req, is_locked ? 'LOCK_EXAM' : 'UPDATE_EXAM', 'exams', id, null, data);
  res.json({ success: true, data });
}));

// PUT /api/exams/:id/lock — Toggle Lock Status for Exam
router.put('/:id/lock', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_locked } = req.body;

  const lockStatus = is_locked !== undefined ? !!is_locked : true;

  // 1. Update exam is_locked
  await supabaseAdmin
    .from('exams')
    .update({
      is_locked: lockStatus,
      locked_at: lockStatus ? new Date().toISOString() : null,
      locked_by: lockStatus ? req.profile.id : null
    })
    .eq('id', id)
    .eq('branch_id', req.branchId)
    .catch(() => {});

  // 2. Update marks is_locked
  await supabaseAdmin
    .from('marks')
    .update({
      is_locked: lockStatus,
      locked_at: lockStatus ? new Date().toISOString() : null,
      locked_by: lockStatus ? req.profile.id : null
    })
    .eq('exam_id', id)
    .catch(() => {});

  await logAudit(req, lockStatus ? 'LOCK_EXAM' : 'UNLOCK_EXAM', 'exams', id, null, { is_locked: lockStatus });
  res.json({ success: true, message: `Exam marks ${lockStatus ? 'locked' : 'unlocked'} successfully!` });
}));

// DELETE /api/exams/:id
router.delete('/:id', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if exam has existing marks
  const { data: marks } = await supabaseAdmin
    .from('marks')
    .select('id')
    .eq('exam_id', id)
    .limit(1);

  if (marks && marks.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete this exam because student marks have already been recorded. Please remove marks first or lock the exam.'
    });
  }

  // Delete associated teacher assignments
  await supabaseAdmin.from('teacher_assignments').delete().eq('exam_id', id).catch(() => {});

  const { error } = await supabaseAdmin
    .from('exams')
    .delete()
    .eq('id', id)
    .eq('branch_id', req.branchId);

  if (error) throw error;
  await logAudit(req, 'DELETE_EXAM', 'exams', id, null, null);
  res.json({ success: true, message: 'Exam deleted successfully' });
}));

module.exports = router;
