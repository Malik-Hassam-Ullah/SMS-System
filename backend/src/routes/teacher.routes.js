const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// GET /api/teachers — List all teachers for branch
router.get('/', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  let query = supabaseAdmin
    .from('teachers')
    .select(`*, user_profiles ( id, full_name, phone, cnic, gender, profile_image_url )`)
    .order('created_at', { ascending: false });

  if (req.role === 'admin' && req.branchId) {
    query = query.eq('branch_id', req.branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch emails from auth.users safely
  const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers().catch(() => ({ data: null }));
  if (!authErr && authUsers?.users) {
    data.forEach(teacher => {
      const authUser = authUsers.users.find(u => u.id === teacher.user_profile_id || u.id === teacher.id);
      if (authUser && teacher.user_profiles) {
        teacher.user_profiles.email = authUser.email;
      }
    });
  }

  res.json({ success: true, data });
}));

// GET /api/teachers/all-assignments — List all teacher assignments for the branch / exam
router.get('/all-assignments', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const { exam_id, teacher_id, class_id, section_id } = req.query;
  const branchId = req.branchId;

  let query = supabaseAdmin
    .from('teacher_assignments')
    .select(`
      *,
      teachers ( id, employee_code, user_profiles ( id, full_name, phone ) ),
      sections ( id, name, class_id, classes ( id, name ) ),
      subjects ( id, name, code, total_marks ),
      exams ( id, name, exam_type, is_locked )
    `);

  if (req.role !== 'ceo' && branchId) {
    query = query.eq('branch_id', branchId);
  }
  if (teacher_id) query = query.eq('teacher_id', teacher_id);
  if (section_id) query = query.eq('section_id', section_id);
  if (exam_id) query = query.eq('exam_id', exam_id);

  const { data, error } = await query;
  if (error) throw error;

  // Check completion status for each assignment
  const { data: marks } = await supabaseAdmin
    .from('marks')
    .select('id, section_id, subject_id, exam_id')
    .eq('branch_id', branchId)
    .catch(() => ({ data: [] }));

  const enriched = (data || []).map(a => {
    const entered = (marks || []).filter(m =>
      m.section_id === a.section_id &&
      m.subject_id === a.subject_id &&
      (!a.exam_id || m.exam_id === a.exam_id)
    ).length;

    return {
      ...a,
      marks_entered_count: entered,
      status: entered > 0 ? 'Completed' : 'Pending'
    };
  });

  res.json({ success: true, data: enriched });
}));

// GET /api/teachers/:id — Teacher Profile & Specific Assignments
router.get('/:id', authenticate, requireRole('ceo', 'admin', 'teacher'), asyncHandler(async (req, res) => {
  let query = supabaseAdmin
    .from('teachers')
    .select(`
      *,
      user_profiles ( id, full_name, phone, cnic, gender, profile_image_url, date_of_birth, address ),
      teacher_assignments (
        id,
        section_id,
        subject_id,
        exam_id,
        created_at,
        sections ( id, name, classes ( id, name ) ),
        subjects ( id, name, total_marks ),
        exams ( id, name, exam_type, is_locked )
      )
    `)
    .eq('id', req.params.id);

  if (req.role === 'admin' && req.branchId) {
    query = query.eq('branch_id', req.branchId);
  }

  const { data, error } = await query.single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Teacher not found' });

  // Fetch email from auth
  const userId = data.user_profile_id || data.id;
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId).catch(() => ({ data: null }));
  if (authUser?.user && data.user_profiles) {
    data.user_profiles.email = authUser.user.email;
  }

  // Calculate marks status for each assignment
  const { data: allMarks } = await supabaseAdmin
    .from('marks')
    .select('id, section_id, subject_id, exam_id')
    .eq('branch_id', data.branch_id)
    .catch(() => ({ data: [] }));

  if (data.teacher_assignments) {
    data.teacher_assignments = data.teacher_assignments.map(a => {
      const count = (allMarks || []).filter(m =>
        m.section_id === a.section_id &&
        m.subject_id === a.subject_id &&
        (!a.exam_id || m.exam_id === a.exam_id)
      ).length;

      return {
        ...a,
        marks_entered: count,
        status: count > 0 ? 'Completed' : 'Pending'
      };
    });
  }

  res.json({ success: true, data });
}));

// POST /api/teachers — CEO / Admin creates teacher account
router.post('/', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const { email, password, full_name, phone, cnic, gender, date_of_birth, address, employee_code, qualification, joining_date, branch_id, assignments } = req.body;

  const targetBranchId = branch_id || req.branchId;
  if (!targetBranchId) {
    return res.status(400).json({ success: false, message: 'Branch ID is required when creating a teacher.' });
  }

  // Create Supabase auth user
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password || 'Teacher@1234',
    email_confirm: true,
  });
  if (authErr) {
    if (authErr.message.includes('already registered')) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    throw authErr;
  }

  // Create user profile
  const { error: profileErr } = await supabaseAdmin.from('user_profiles').insert({
    id:         authUser.user.id,
    school_id:  req.schoolId || '00000000-0000-0000-0000-000000000001',
    branch_id:  targetBranchId,
    role:       'teacher',
    full_name,
    phone,
    cnic,
    gender,
    date_of_birth: date_of_birth || null,
    address,
    employee_code,
  });
  if (profileErr) throw profileErr;

  // Create teacher record
  const { data: teacher, error: teacherErr } = await supabaseAdmin.from('teachers').insert({
    branch_id:       targetBranchId,
    user_profile_id: authUser.user.id,
    employee_code,
    qualification,
    joining_date: joining_date || null,
  }).select().single();
  if (teacherErr) throw teacherErr;

  // Create Assignments if provided
  if (assignments && Array.isArray(assignments) && assignments.length > 0) {
    const assignmentPayload = assignments.map(a => ({
      teacher_id: teacher.id,
      branch_id: targetBranchId,
      section_id: a.section_id,
      subject_id: a.subject_id,
      exam_id: a.exam_id || null,
      class_id: a.class_id || null,
      session_id: a.session_id || null
    }));
    await supabaseAdmin.from('teacher_assignments').insert(assignmentPayload).catch(() => {});
  }

  await logAudit(req, 'CREATE_TEACHER', 'teachers', teacher.id, null, { full_name, email, branch_id: targetBranchId });
  res.status(201).json({ success: true, data: teacher });
}));

// POST /api/teachers/:id/assignments — CEO / Admin assign subject + class + exam to teacher
router.post('/:id/assignments', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const teacherId = req.params.id;
  const { assignments, branch_id, exam_id, class_id, section_id, subject_id } = req.body;

  const targetBranchId = branch_id || req.branchId;

  // Support both bulk array of assignments or single assignment object
  let list = [];
  if (Array.isArray(assignments) && assignments.length > 0) {
    list = assignments;
  } else if (section_id && subject_id) {
    list = [{ section_id, subject_id, exam_id, class_id }];
  } else {
    return res.status(400).json({ success: false, message: 'Section and Subject are required for assignment.' });
  }

  const payload = list.map(a => ({
    teacher_id: teacherId,
    branch_id:  targetBranchId,
    section_id: a.section_id,
    subject_id: a.subject_id,
    exam_id:    a.exam_id || null,
    class_id:   a.class_id || null,
    session_id: a.session_id || null
  }));

  // Prevent duplicates by checking existing assignments
  const createdAssignments = [];
  for (const item of payload) {
    let checkQuery = supabaseAdmin
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('section_id', item.section_id)
      .eq('subject_id', item.subject_id);

    if (item.exam_id) {
      checkQuery = checkQuery.eq('exam_id', item.exam_id);
    }

    const { data: existing } = await checkQuery;
    if (existing && existing.length > 0) {
      continue; // Skip duplicate
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('teacher_assignments')
      .insert(item)
      .select()
      .single();

    if (!error && inserted) {
      createdAssignments.push(inserted);
    }
  }

  await logAudit(req, 'ASSIGN_TEACHER_SUBJECTS', 'teacher_assignments', teacherId, null, { count: createdAssignments.length });
  res.status(201).json({
    success: true,
    message: `${createdAssignments.length} assignment(s) saved successfully!`,
    data: createdAssignments
  });
}));

// DELETE /api/teachers/:id/assignments/:assignment_id — CEO / Admin remove assignment
router.delete('/:id/assignments/:assignment_id', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const { id: teacherId, assignment_id } = req.params;

  // Check if assignment exists
  const { data: assign } = await supabaseAdmin
    .from('teacher_assignments')
    .select('*, exams(is_locked)')
    .eq('id', assignment_id)
    .single();

  if (assign?.exams?.is_locked) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete assignment because this exam marks are locked.'
    });
  }

  const { error } = await supabaseAdmin
    .from('teacher_assignments')
    .delete()
    .eq('id', assignment_id)
    .eq('teacher_id', teacherId);

  if (error) throw error;
  await logAudit(req, 'DELETE_TEACHER_ASSIGNMENT', 'teacher_assignments', assignment_id, null, null);
  res.json({ success: true, message: 'Assignment removed successfully' });
}));

// PUT /api/teachers/:id — CEO / Admin update teacher
router.put('/:id', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const { qualification, joining_date, is_active } = req.body;
  const { data, error } = await supabaseAdmin
    .from('teachers')
    .update({ qualification, joining_date, is_active })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw error;
  res.json({ success: true, data });
}));

module.exports = router;
