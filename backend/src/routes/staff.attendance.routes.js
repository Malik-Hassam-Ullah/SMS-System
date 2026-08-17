const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/staff-attendance — get staff attendance records for a date
router.get('/', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    const { date, from_date, to_date, staff_id } = req.query;

    let query = supabaseAdmin
        .from('staff_attendance')
        .select(`
      *,
      user_profiles ( id, full_name, role, employee_code, phone )
    `)
        .eq('branch_id', req.branchId)
        .order('date', { ascending: false });

    if (date) query = query.eq('date', date);
    if (from_date) query = query.gte('date', from_date);
    if (to_date) query = query.lte('date', to_date);
    if (staff_id) query = query.eq('staff_id', staff_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
}));

// GET /api/staff-attendance/staff — get all staff (teachers + admin) for this branch
router.get('/staff', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, employee_code, phone, gender')
        .eq('branch_id', req.branchId)
        .in('role', ['teacher', 'admin', 'accountant'])
        .eq('is_active', true)
        .order('full_name');

    if (error) throw error;
    res.json({ success: true, data });
}));

// POST /api/staff-attendance/bulk — mark attendance for multiple staff
router.post('/bulk', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
    const { records, date } = req.body; // records: [{ staff_id, status, check_in, check_out, remarks }]

    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: 'Attendance records array required' });
    }
    if (!date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const payload = records.map(r => ({
        branch_id: req.branchId,
        staff_id: r.staff_id,
        date: date,
        status: r.status,
        check_in: r.check_in || null,
        check_out: r.check_out || null,
        remarks: r.remarks || null,
        marked_by: req.profile.id,
    }));

    const { data, error } = await supabaseAdmin
        .from('staff_attendance')
        .upsert(payload, { onConflict: 'staff_id,date' })
        .select();

    if (error) throw error;
    res.status(201).json({ success: true, data, count: data.length });
}));

// GET /api/staff-attendance/report — monthly summary per staff member
router.get('/report', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    const { from_date, to_date } = req.query;

    let query = supabaseAdmin
        .from('staff_attendance')
        .select('staff_id, status, date, user_profiles(id, full_name, role, employee_code)')
        .eq('branch_id', req.branchId);

    if (from_date) query = query.gte('date', from_date);
    if (to_date) query = query.lte('date', to_date);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by staff member
    const staffMap = {};
    data?.forEach(a => {
        const sid = a.staff_id;
        if (!staffMap[sid]) {
            staffMap[sid] = {
                staff: a.user_profiles,
                total: 0, present: 0, absent: 0, late: 0, leave: 0,
            };
        }
        staffMap[sid].total++;
        const s = a.status?.toLowerCase();
        if (staffMap[sid][s] !== undefined) staffMap[sid][s]++;
    });

    const report = Object.values(staffMap).map(s => ({
        ...s,
        percentage: s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : '0.0',
    }));

    res.json({ success: true, data: report });
}));

module.exports = router;
