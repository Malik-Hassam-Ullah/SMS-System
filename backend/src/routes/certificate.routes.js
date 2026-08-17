const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// POST /api/certificates/validate/:studentId — check eligibility
router.get('/validate/:studentId', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const studentId = req.params.studentId;

  // Check outstanding balance
  const { data: balance } = await supabaseAdmin
    .from('student_outstanding_balance')
    .select('total_outstanding')
    .eq('student_id', studentId)
    .single();

  const hasBalance = (balance?.total_outstanding || 0) > 0;

  // Check attendance
  const { data: attendanceData } = await supabaseAdmin
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .eq('branch_id', req.branchId);

  const total    = attendanceData?.length || 0;
  const present  = attendanceData?.filter(a => a.status === 'present').length || 0;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  const meetsAttendance = percentage >= 80;

  const eligible = !hasBalance && meetsAttendance;
  const reasons  = [];
  if (hasBalance)       reasons.push(`Outstanding fee balance of PKR ${balance?.total_outstanding?.toLocaleString()}`);
  if (!meetsAttendance) reasons.push(`Attendance ${percentage.toFixed(1)}% is below required 80%`);

  res.json({
    success: true,
    data: {
      eligible,
      reasons,
      checks: {
        balance:          { passed: !hasBalance, value: balance?.total_outstanding || 0 },
        attendance:       { passed: meetsAttendance, percentage: percentage.toFixed(1), total, present },
      },
    },
  });
}));

// POST /api/certificates/generate
router.post('/generate', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { student_id, certificate_type } = req.body;

  // For character certificate — validate eligibility
  if (certificate_type === 'character') {
    const { data: validation } = await supabaseAdmin
      .from('student_outstanding_balance')
      .select('total_outstanding')
      .eq('student_id', student_id)
      .single();

    if ((validation?.total_outstanding || 0) > 0) {
      return res.status(422).json({
        success: false,
        message: 'Cannot generate Character Certificate: Student has outstanding fee balance',
      });
    }
  }

  // Get student data
  const { data: student } = await supabaseAdmin
    .from('students')
    .select(`*, classes(name), sections(name)`)
    .eq('id', student_id)
    .eq('branch_id', req.branchId)
    .single();

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  // Get branch/school info
  const { data: branch } = await supabaseAdmin
    .from('branches')
    .select(`*, schools(name, address, phone, logo_url)`)
    .eq('id', req.branchId)
    .single();

  // Generate certificate number
  const { count } = await supabaseAdmin
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', req.branchId);

  const certNumber = `CERT-${certificate_type.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

  const contentSnapshot = {
    student_name:   student.full_name,
    father_name:    student.father_name,
    registration:   student.registration_number,
    class:          student.classes?.name,
    section:        student.sections?.name,
    date_of_birth:  student.date_of_birth,
    admission_date: student.date_of_admission,
    school_name:    branch?.schools?.name,
    branch_name:    branch?.name,
    issued_date:    new Date().toISOString().split('T')[0],
  };

  const { data: certificate, error } = await supabaseAdmin
    .from('certificates')
    .insert({
      branch_id:          req.branchId,
      student_id,
      certificate_type,
      generated_by:       req.profile.id,
      certificate_number: certNumber,
      issued_date:        new Date().toISOString().split('T')[0],
      content:            contentSnapshot,
    })
    .select()
    .single();

  if (error) throw error;

  await logAudit(req, 'GENERATE_CERTIFICATE', 'certificates', certificate.id, null, { certificate_type, student_id });

  res.status(201).json({
    success: true,
    data: {
      ...certificate,
      studentData:  student,
      branchData:   branch,
    },
  });
}));

// GET /api/certificates/student/:studentId
router.get('/student/:studentId', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('certificates')
    .select(`*, generated_by_user:user_profiles!certificates_generated_by_fkey(full_name)`)
    .eq('student_id', req.params.studentId)
    .eq('branch_id', req.branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ success: true, data });
}));

module.exports = router;
