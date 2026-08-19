const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// ── GET /api/settings ─────────────────────────────────────────────────────────
// Returns the branch-level settings saved in branches.settings JSONB column
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('branches')
        .select('settings')
        .eq('id', req.branchId)
        .single();

    if (error) {
        // If column doesn't exist yet, return defaults
        return res.json({ success: true, data: getDefaults() });
    }

    res.json({ success: true, data: data?.settings || getDefaults() });
}));

// ── PUT /api/settings ─────────────────────────────────────────────────────────
// Saves settings to branches.settings JSONB column with role-based restrictions
router.put('/', authenticate, requireRole('admin', 'ceo', 'accountant', 'teacher'), asyncHandler(async (req, res) => {
    const updates = req.body;
    const role = req.profile?.role;

    // Remove frontend-only UI preferences (these stay in localStorage)
    const {
        darkMode, fontSize, colorScheme, language, sidebarCollapsed,
        setDarkMode, setFontSize, setLanguage, setColorScheme, setSidebarCollapsed, updateSettings,
        ...backendSettings
    } = updates;

    // Define allowed keys per role
    const allowedKeysByRole = {
        ceo: null, // null means all keys allowed
        admin: null,
        accountant: [
            'lateFeeEnabled', 'lateFeeAmount', 'lateFeeAfterDays', 'gracePeriodDays', 'feeDueDay', 'autoWaiveLateFee',
            'printHeaderEnabled', 'printFooterEnabled', 'printWatermark', 'paperSize', 'printFooterText',
            'emailNotifications', 'smsNotifications', 'feeAlerts'
        ],
        teacher: [
            'attendanceTime', 'workingDays', 'minAttendancePercent', 'lateMarkMinutes',
            'passingMarks', 'maxMarks', 'gradingSystem',
            'emailNotifications', 'smsNotifications', 'attendanceAlerts', 'resultAlerts'
        ]
    };

    const allowedKeys = allowedKeysByRole[role];
    let filteredSettings = {};

    if (allowedKeys === null) {
        filteredSettings = backendSettings;
    } else if (Array.isArray(allowedKeys)) {
        // Only keep allowed keys
        allowedKeys.forEach(key => {
            if (backendSettings[key] !== undefined) {
                filteredSettings[key] = backendSettings[key];
            }
        });
    } else {
        return res.status(403).json({ success: false, message: 'Unauthorized to update settings' });
    }

    // Fetch current settings to merge
    const { data: current } = await supabaseAdmin
        .from('branches')
        .select('settings')
        .eq('id', req.branchId)
        .single();

    const merged = {
        ...(current?.settings || getDefaults()),
        ...filteredSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: req.profile?.full_name || role || 'System',
    };

    const { error } = await supabaseAdmin
        .from('branches')
        .update({ settings: merged })
        .eq('id', req.branchId);

    if (error) {
        // If column doesn't exist, return success with message
        console.warn('[Settings] Could not save to DB (column may not exist):', error.message);
        return res.json({ success: true, data: merged, warning: 'Settings saved locally only. Run DB migration to enable persistent storage.' });
    }

    await logAudit(req, 'UPDATE_SETTINGS', 'branches', req.branchId, current?.settings, merged).catch(() => { });
    res.json({ success: true, data: merged });
}));

// ── Default settings ──────────────────────────────────────────────────────────
function getDefaults() {
    return {
        // School Info
        schoolName: '',
        sessionYear: new Date().getFullYear().toString(),
        currency: 'PKR',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Asia/Karachi',

        // Fee Settings
        lateFeeEnabled: true,
        lateFeeAmount: 50,
        lateFeeAfterDays: 10,
        gracePeriodDays: 5,
        feeDueDay: '10',
        autoWaiveLateFee: true,

        // Attendance
        attendanceTime: '08:00',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        minAttendancePercent: 75,
        lateMarkMinutes: 15,

        // Academic
        passingMarks: 40,
        maxMarks: 100,
        gradingSystem: 'percentage',

        // Notifications
        emailNotifications: true,
        smsNotifications: false,
        feeAlerts: true,
        attendanceAlerts: true,
        resultAlerts: true,

        // Print
        printHeaderEnabled: true,
        printFooterEnabled: true,
        printWatermark: false,
        paperSize: 'A4',
        printFooterText: '',

        // Security
        sessionTimeout: '30',
        minPasswordLength: 8,
        autoLogout: true,
        activityLog: true,

        // Backup
        autoBackup: false,
    };
}

module.exports = router;
