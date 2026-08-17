const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/audit — Admin only
router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, module, action, from_date, to_date } = req.query;
  const from = (page - 1) * limit;
  const to   = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('audit_logs')
    .select(`
      *,
      performed_by_user:user_profiles!audit_logs_performed_by_fkey ( full_name, role )
    `, { count: 'exact' })
    .eq('branch_id', req.branchId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (module)    query = query.eq('module', module);
  if (action)    query = query.eq('action', action);
  if (from_date) query = query.gte('created_at', from_date);
  if (to_date)   query = query.lte('created_at', to_date);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({
    success: true,
    data,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
  });
}));

module.exports = router;
