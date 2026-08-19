const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/dashboard
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const branchId = req.branchId;
  const role = req.role;
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Run ALL database queries simultaneously in parallel for instant execution
  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalClasses },
    { count: totalVouchers },
    { count: assignedStudents },
    { count: unassignedStudents },
    { count: droppedStudents },
    { data: branchData },
    { data: todayPayments },
    { data: monthPayments },
    { data: voucherStats },
    { data: outstandingData },
    { data: recentPayments },
    { data: monthlyData },
    { data: attendanceToday },
    { data: siblingData },
  ] = await Promise.all([
    supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', true),
    supabaseAdmin.from('teachers').select('*', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', true),
    supabaseAdmin.from('classes').select('*', { count: 'exact', head: true }).eq('branch_id', branchId),
    supabaseAdmin.from('fee_vouchers').select('*', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_deleted', false),
    supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', true).not('current_section_id', 'is', null),
    supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', true).is('current_section_id', null),
    supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', false),
    supabaseAdmin.from('branches').select('name, code, address, phone, email').eq('id', branchId).single(),
    supabaseAdmin.from('fee_payments').select('amount').eq('branch_id', branchId).eq('payment_date', today),
    supabaseAdmin.from('fee_payments').select('amount').eq('branch_id', branchId).gte('payment_date', `${thisMonth}-01`),
    supabaseAdmin.from('fee_vouchers').select('status').eq('branch_id', branchId).eq('is_deleted', false),
    supabaseAdmin.from('student_outstanding_balance').select('total_outstanding').eq('branch_id', branchId),
    supabaseAdmin.from('fee_payments').select(`
      id, amount, payment_date, payment_method,
      students ( full_name, registration_number ),
      fee_vouchers ( voucher_number, fee_month )
    `).eq('branch_id', branchId).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('fee_payments').select('amount, payment_date').eq('branch_id', branchId).gte('payment_date', sixMonthsAgo),
    supabaseAdmin.from('attendance').select('status').eq('branch_id', branchId).eq('date', today),
    supabaseAdmin.from('students').select('father_cnic').eq('branch_id', branchId).eq('is_active', true).not('father_cnic', 'is', null),
  ]);

  const todayCollection = todayPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const monthCollection = monthPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const feeStats = {
    paid: voucherStats?.filter(v => v.status === 'paid').length || 0,
    unpaid: voucherStats?.filter(v => v.status === 'unpaid').length || 0,
    partial: voucherStats?.filter(v => v.status === 'partial').length || 0,
    overdue: voucherStats?.filter(v => v.status === 'overdue').length || 0,
  };

  const totalOutstanding = outstandingData?.reduce((sum, s) => sum + s.total_outstanding, 0) || 0;

  const monthlyChart = {};
  monthlyData?.forEach(p => {
    const month = p.payment_date.slice(0, 7);
    monthlyChart[month] = (monthlyChart[month] || 0) + p.amount;
  });

  const attendanceStats = {
    present: attendanceToday?.filter(a => a.status === 'present').length || 0,
    absent: attendanceToday?.filter(a => a.status === 'absent').length || 0,
    late: attendanceToday?.filter(a => a.status === 'late').length || 0,
    leave: attendanceToday?.filter(a => a.status === 'leave').length || 0,
  };

  let siblingsCount = 0;
  if (siblingData) {
    const cnicCounts = {};
    siblingData.forEach(s => {
      if (s.father_cnic) {
        cnicCounts[s.father_cnic] = (cnicCounts[s.father_cnic] || 0) + 1;
      }
    });
    siblingsCount = Object.values(cnicCounts).filter(c => c > 1).reduce((sum, c) => sum + c, 0);
  }

  // Teacher-specific: assigned sections
  let teacherAssignments = null;
  let teacherStudentsCount = 0;
  let teacherClassesCount = 0;
  if (role === 'teacher') {
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('user_profile_id', req.profile.id)
      .single();

    if (teacher) {
      const { data: assignments } = await supabaseAdmin
        .from('teacher_assignments')
        .select(`
          id,
          sections ( id, name, classes ( id, name ) ),
          subjects ( id, name )
        `)
        .eq('teacher_id', teacher.id);
      teacherAssignments = assignments || [];

      const sectionIds = teacherAssignments.map(a => a.sections?.id).filter(Boolean);
      const uniqueSectionIds = [...new Set(sectionIds)];

      const classIds = teacherAssignments.map(a => a.sections?.classes?.id).filter(Boolean);
      teacherClassesCount = new Set(classIds).size;

      if (uniqueSectionIds.length > 0) {
        const { count: studentCount } = await supabaseAdmin
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('current_section_id', uniqueSectionIds)
          .eq('is_active', true);
        teacherStudentsCount = studentCount || 0;
      }
    }
  }

  res.json({
    success: true,
    data: {
      branchInfo: branchData || {},
      overview: {
        totalStudents: role === 'teacher' ? teacherStudentsCount : totalStudents,
        totalTeachers,
        totalClasses: role === 'teacher' ? teacherClassesCount : totalClasses,
        totalVouchers,
        todayCollection,
        monthCollection,
        totalOutstanding,
        assignedStudents: assignedStudents || 0,
        unassignedStudents: unassignedStudents || 0,
        droppedStudents: droppedStudents || 0,
        pendingRegistrations: 0,
        siblings: siblingsCount,
        absentStudents: attendanceStats.absent || 0,
        transferStudents: 0,
      },
      feeStats,
      attendanceStats,
      recentPayments,
      monthlyChart: Object.entries(monthlyChart).map(([month, amount]) => ({ month, amount })),
      teacherAssignments,
    },
  });
}));

module.exports = router;
