const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const FILE_PATH = path.join(__dirname, '../../staff_attendance.json');

// Helper functions to read/write JSON file
function readRecords() {
    if (!fs.existsSync(FILE_PATH)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        console.error('Failed to read staff attendance JSON:', e);
        return [];
    }
}

function writeRecords(records) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to write staff attendance JSON:', e);
    }
}

// GET /api/staff-attendance — get staff attendance records for a date
router.get('/', authenticate, requireRole('admin', 'accountant', 'ceo'), asyncHandler(async (req, res) => {
    const { date, from_date, to_date, staff_id } = req.query;
    const branchId = req.branchId || req.query.branch_id;

    let records = readRecords();

    // Filter by branch
    if (branchId) {
        records = records.filter(r => r.branch_id === branchId);
    }

    // Filter by query params
    if (date) records = records.filter(r => r.date === date);
    if (from_date) records = records.filter(r => r.date >= from_date);
    if (to_date) records = records.filter(r => r.date <= to_date);
    if (staff_id) records = records.filter(r => r.staff_id === staff_id);

    // Fetch user profiles to attach
    const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, employee_code, phone');

    if (error) throw error;

    const profileMap = {};
    profiles?.forEach(p => {
        profileMap[p.id] = p;
    });

    const enrichedRecords = records.map(r => ({
        ...r,
        user_profiles: profileMap[r.staff_id] || null
    }));

    res.json({ success: true, data: enrichedRecords });
}));

// GET /api/staff-attendance/staff — get all staff (teachers + admin) for this branch
router.get('/staff', authenticate, requireRole('admin', 'accountant', 'ceo'), asyncHandler(async (req, res) => {
    const branchId = req.branchId || req.query.branch_id;

    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, employee_code, phone, gender')
        .eq('branch_id', branchId)
        .in('role', ['teacher', 'admin', 'accountant'])
        .eq('is_active', true)
        .order('full_name');

    if (error) throw error;
    res.json({ success: true, data });
}));

// POST /api/staff-attendance/bulk — mark attendance for multiple staff
router.post('/bulk', authenticate, requireRole('admin', 'ceo'), asyncHandler(async (req, res) => {
    const { records, date } = req.body; // records: [{ staff_id, status, check_in, check_out, remarks }]
    const branchId = req.branchId || req.body.branch_id;

    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: 'Attendance records array required' });
    }
    if (!date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
    }
    if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }

    let allRecords = readRecords();

    const updatedRecords = [];

    records.forEach(r => {
        const existingIdx = allRecords.findIndex(rec => rec.staff_id === r.staff_id && rec.date === date);

        const payload = {
            id: existingIdx >= 0 ? allRecords[existingIdx].id : uuidv4(),
            branch_id: branchId,
            staff_id: r.staff_id,
            date: date,
            status: r.status,
            check_in: r.check_in || null,
            check_out: r.check_out || null,
            remarks: r.remarks || null,
            marked_by: req.profile.id,
            created_at: existingIdx >= 0 ? allRecords[existingIdx].created_at : new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (existingIdx >= 0) {
            allRecords[existingIdx] = payload;
        } else {
            allRecords.push(payload);
        }
        updatedRecords.push(payload);
    });

    writeRecords(allRecords);

    res.status(201).json({ success: true, data: updatedRecords, count: updatedRecords.length });
}));

// GET /api/staff-attendance/report — monthly summary per staff member
router.get('/report', authenticate, requireRole('admin', 'accountant', 'ceo'), asyncHandler(async (req, res) => {
    const { from_date, to_date } = req.query;
    const branchId = req.branchId || req.query.branch_id;

    if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }

    let records = readRecords();

    // Filter by branch and date range
    records = records.filter(r => r.branch_id === branchId);
    if (from_date) records = records.filter(r => r.date >= from_date);
    if (to_date) records = records.filter(r => r.date <= to_date);

    // Fetch user profiles
    const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, employee_code, phone')
        .eq('branch_id', branchId);

    if (error) throw error;

    const profileMap = {};
    profiles?.forEach(p => {
        profileMap[p.id] = p;
    });

    // Aggregate by staff member
    const staffMap = {};
    records.forEach(a => {
        const sid = a.staff_id;
        if (!profileMap[sid]) return; // Skip if profile not found or not in this branch

        if (!staffMap[sid]) {
            staffMap[sid] = {
                staff: profileMap[sid],
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
