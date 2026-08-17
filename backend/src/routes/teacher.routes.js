const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// GET /api/teachers
router.get('/', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  let query = supabaseAdmin
    .from('teachers')
    .select(`*, user_profiles ( id, full_name, phone, cnic, gender, profile_image_url )`)
    .order('created_at', { ascending: false });

  if (req.role === 'admin') {
    query = query.eq('branch_id', req.branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch emails from auth.users
  const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
  if (!authErr && authUsers?.users) {
    data.forEach(teacher => {
      const authUser = authUsers.users.find(u => u.id === teacher.id);
      if (authUser && teacher.user_profiles) {
        teacher.user_profiles.email = authUser.email;
      }
    });
  }

  res.json({ success: true, data });
}));

// GET /api/teachers/:id
router.get('/:id', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  let query = supabaseAdmin
    .from('teachers')
    .select(`
      *,
      user_profiles ( id, full_name, phone, cnic, gender, profile_image_url, date_of_birth, address ),
      teacher_assignments (
        id,
        sections ( id, name, classes ( id, name ) ),
        subjects ( id, name ),
        academic_sessions ( id, name )
      )
    `)
    .eq('id', req.params.id);

  if (req.role === 'admin') {
    query = query.eq('branch_id', req.branchId);
  }

  const { data, error } = await query.single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Teacher not found' });

  // Fetch email from auth
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(req.params.id);
  if (!authErr && authUser?.user && data.user_profiles) {
    data.user_profiles.email = authUser.user.email;
  }

  res.json({ success: true, data });
}));

// POST /api/teachers — CEO only (creates auth user + profile + teacher record + assignments)
router.post('/', authenticate, requireRole('ceo'), asyncHandler(async (req, res) => {
  const { email, password, full_name, phone, cnic, gender, date_of_birth, address, employee_code, qualification, joining_date, branch_id, assignments } = req.body;

  if (!branch_id) {
    return res.status(400).json({ success: false, message: 'Branch ID is required when creating a teacher.' });
  }

  // Mandatory Assignments check
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one class/subject assignment is mandatory.' });
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
    school_id:  req.schoolId,
    branch_id:  branch_id,
    role:       'teacher',
    full_name,
    phone,
    cnic,
    gender,
    date_of_birth,
    address,
    employee_code,
  });
  if (profileErr) throw profileErr;

  // Create teacher record
  const { data: teacher, error: teacherErr } = await supabaseAdmin.from('teachers').insert({
    branch_id:       branch_id,
    user_profile_id: authUser.user.id,
    employee_code,
    qualification,
    joining_date,
  }).select().single();
  if (teacherErr) throw teacherErr;

  // Create Assignments
  const assignmentPayload = assignments.map(a => ({
    ...a,
    teacher_id: teacher.id,
    branch_id: branch_id
  }));
  const { error: assignErr } = await supabaseAdmin.from('teacher_assignments').insert(assignmentPayload);
  if (assignErr) throw assignErr;

  await logAudit(req, 'CREATE_TEACHER', 'teachers', teacher.id, null, { full_name, email, branch_id });
  res.status(201).json({ success: true, data: teacher });
}));

// POST /api/teachers/:id/assignments — CEO only
router.post('/:id/assignments', authenticate, requireRole('ceo'), asyncHandler(async (req, res) => {
  const { assignments, branch_id } = req.body; // [{ section_id, subject_id, session_id }]
  if (!branch_id) {
    return res.status(400).json({ success: false, message: 'Branch ID is required.' });
  }

  const payload = assignments.map(a => ({
    ...a,
    teacher_id: req.params.id,
    branch_id:  branch_id,
  }));

  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .upsert(payload, { onConflict: 'teacher_id,section_id,subject_id,session_id' })
    .select();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));

// DELETE /api/teachers/:id/assignments/:assignment_id — CEO only
router.delete('/:id/assignments/:assignment_id', authenticate, requireRole('ceo'), asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('teacher_assignments')
    .delete()
    .eq('id', req.params.assignment_id)
    .eq('teacher_id', req.params.id);

  if (error) throw error;
  res.json({ success: true, message: 'Assignment deleted successfully' });
}));

// PUT /api/teachers/:id — CEO only
router.put('/:id', authenticate, requireRole('ceo'), asyncHandler(async (req, res) => {
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
