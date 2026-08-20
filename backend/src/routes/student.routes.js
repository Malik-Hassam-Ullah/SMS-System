const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// GET /api/students — paginated, filterable
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const branchId = req.branchId;
  const { page = 1, limit = 20, search, class_id, section_id, is_active } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('students')
    .select(`
      *,
      classes ( id, name ),
      sections ( id, name ),
      student_outstanding_balance ( total_outstanding, last_payment_date )
    `, { count: 'exact' })
    .eq('branch_id', branchId)
    .order('created_at', { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,registration_number.ilike.%${search}%,father_name.ilike.%${search}%,father_cnic.ilike.%${search}%`);
  }
  if (class_id) query = query.eq('current_class_id', class_id);
  if (section_id) query = query.eq('current_section_id', section_id);
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({
    success: true,
    data,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
  });
}));

// GET /api/students/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      classes ( id, name ),
      sections ( id, name ),
      student_outstanding_balance ( total_outstanding, last_payment_date ),
      student_sessions (
        id, is_current,
        academic_sessions ( id, name ),
        classes ( id, name ),
        sections ( id, name )
      )
    `)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  res.json({ success: true, data });
}));

const sanitizeStudentInput = (body) => {
  const payload = { ...body };
  delete payload.branch_id;
  delete payload.id;
  delete payload.classes;
  delete payload.sections;
  delete payload.student_outstanding_balance;
  delete payload.student_sessions;

  const dateFields = ['date_of_birth', 'date_of_admission'];
  const uuidFields = ['current_class_id', 'current_section_id'];
  const numericFields = ['concession_percentage'];
  const enumFields = ['gender', 'father_status', 'primary_contact_person', 'concession_type'];

  Object.keys(payload).forEach(key => {
    if (payload[key] === '' || payload[key] === undefined) {
      if (dateFields.includes(key) || uuidFields.includes(key) || numericFields.includes(key) || enumFields.includes(key)) {
        payload[key] = null;
      }
    }
  });

  return payload;
};

// POST /api/students — Admin only
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const sanitized = sanitizeStudentInput(req.body);
  const payload = { ...sanitized, branch_id: req.branchId };

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Registration number already exists in this branch' });
    }
    throw error;
  }

  // Auto-sync guardian details to all siblings with the same father_cnic
  if (payload.father_cnic) {
    const siblingUpdatePayload = {
      father_name: payload.father_name,
      father_occupation: payload.father_occupation,
      father_status: payload.father_status,
      primary_contact_person: payload.primary_contact_person,
      contact_number: payload.contact_number,
      parent_email: payload.parent_email,
      address: payload.address,
    };

    // Remove undefined values
    Object.keys(siblingUpdatePayload).forEach(key => {
      if (siblingUpdatePayload[key] === undefined) {
        delete siblingUpdatePayload[key];
      }
    });

    if (Object.keys(siblingUpdatePayload).length > 0) {
      await supabaseAdmin
        .from('students')
        .update(siblingUpdatePayload)
        .eq('father_cnic', payload.father_cnic)
        .eq('branch_id', req.branchId)
        .neq('id', data.id);
    }
  }

  await logAudit(req, 'CREATE_STUDENT', 'students', data.id, null, data);
  res.status(201).json({ success: true, data });
}));

// PUT /api/students/:id — Admin only
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  // Fetch previous value for audit
  const { data: previous } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (!previous) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const payload = sanitizeStudentInput(req.body);

  const totalOutstanding = payload.total_outstanding;
  delete payload.total_outstanding;

  const { data, error } = await supabaseAdmin
    .from('students')
    .update(payload)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();

  if (error) throw error;

  if (totalOutstanding !== undefined) {
    await supabaseAdmin
      .from('student_outstanding_balance')
      .upsert({
        branch_id: req.branchId,
        student_id: req.params.id,
        total_outstanding: Number(totalOutstanding) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });
  }

  await logAudit(req, 'UPDATE_STUDENT', 'students', data.id, previous, data);
  res.json({ success: true, data });
}));

// PUT /api/students/bulk/assign-section — Admin only
router.put('/bulk/assign-section', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { student_ids, section_id } = req.body;
  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No students selected' });
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update({ current_section_id: section_id })
    .in('id', student_ids)
    .eq('branch_id', req.branchId)
    .select();

  if (error) throw error;

  await logAudit(req, 'BULK_ASSIGN_SECTION', 'students', null, null, { student_count: student_ids.length, section_id });
  res.json({ success: true, data, message: `Successfully assigned ${student_ids.length} students to section.` });
}));

// DELETE /api/students/bulk/clear-all — Admin/CEO only (soft delete to avoid FK constraint errors)
router.delete('/bulk/clear-all', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
  const branchId = req.branchId;

  // First get the count of active students
  const { data: activeStudents, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (fetchError) throw fetchError;

  const studentCount = activeStudents?.length || 0;

  if (studentCount === 0) {
    return res.json({
      success: true,
      message: 'No active students found to deactivate.',
      data: { deletedCount: 0 },
    });
  }

  // Soft delete: mark all as inactive (avoids FK constraint errors from fee_vouchers, attendance, marks, etc.)
  const { error } = await supabaseAdmin
    .from('students')
    .update({ is_active: false })
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (error) throw error;

  await logAudit(req, 'CLEAR_ALL_STUDENTS', 'students', null, null, { deactivatedCount: studentCount });

  res.json({
    success: true,
    message: `All ${studentCount} student records for this branch have been deactivated successfully.`,
    data: { deletedCount: studentCount },
  });
}));

// DELETE /api/students/:id — Admin only (soft delete)
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data: previous } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (!previous) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);

  if (error) throw error;

  await logAudit(req, 'DEACTIVATE_STUDENT', 'students', req.params.id, previous, { is_active: false });
  res.json({ success: true, message: 'Student deactivated successfully' });
}));

// GET /api/students/:id/marks
router.get('/:id/marks', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('marks')
    .select(`
      *,
      subjects ( id, name, total_marks, pass_marks ),
      exams ( id, name, exam_date )
    `)
    .eq('student_id', req.params.id)
    .eq('branch_id', req.branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ success: true, data });
}));

// GET /api/students/:id/fees
router.get('/:id/fees', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const [vouchersResult, paymentsResult, balanceResult] = await Promise.all([
    supabaseAdmin
      .from('fee_vouchers')
      .select('*')
      .eq('student_id', req.params.id)
      .eq('branch_id', req.branchId)
      .eq('is_deleted', false)
      .order('fee_month', { ascending: false }),
    supabaseAdmin
      .from('fee_payments')
      .select('*')
      .eq('student_id', req.params.id)
      .eq('branch_id', req.branchId)
      .order('payment_date', { ascending: false }),
    supabaseAdmin
      .from('student_outstanding_balance')
      .select('*')
      .eq('student_id', req.params.id)
      .single(),
  ]);

  res.json({
    success: true,
    data: {
      vouchers: vouchersResult.data || [],
      payments: paymentsResult.data || [],
      outstanding: balanceResult.data || { total_outstanding: 0 },
    },
  });
}));

// GET /api/students/:id/attendance
router.get('/:id/attendance', authenticate, asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;

  let query = supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('student_id', req.params.id)
    .eq('branch_id', req.branchId)
    .order('date', { ascending: false });

  if (from_date) query = query.gte('date', from_date);
  if (to_date) query = query.lte('date', to_date);

  const { data, error } = await query;
  if (error) throw error;

  const total = data?.length || 0;
  const present = data?.filter(a => a.status === 'present').length || 0;
  const absent = data?.filter(a => a.status === 'absent').length || 0;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: { records: data, summary: { total, present, absent, percentage } },
  });
}));

module.exports = router;
