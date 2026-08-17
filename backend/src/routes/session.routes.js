const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/sessions
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('academic_sessions')
    .select('*')
    .eq('branch_id', req.branchId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/sessions
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  // If setting as current, unset others
  if (req.body.is_current) {
    await supabaseAdmin
      .from('academic_sessions')
      .update({ is_current: false })
      .eq('branch_id', req.branchId);
  }

  const { data, error } = await supabaseAdmin
    .from('academic_sessions')
    .insert({ ...req.body, branch_id: req.branchId })
    .select()
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));

// PUT /api/sessions/:id
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  if (req.body.is_current) {
    await supabaseAdmin
      .from('academic_sessions')
      .update({ is_current: false })
      .eq('branch_id', req.branchId)
      .neq('id', req.params.id);
  }

  const { data, error } = await supabaseAdmin
    .from('academic_sessions')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();
  if (error) throw error;
  res.json({ success: true, data });
}));

module.exports = router;
