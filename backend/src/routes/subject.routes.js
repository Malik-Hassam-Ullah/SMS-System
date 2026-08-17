const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/subjects
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .select('*')
    .eq('branch_id', req.branchId)
    .order('name');
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/subjects
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .insert({ ...req.body, branch_id: req.branchId })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Subject already exists' });
    throw error;
  }
  res.status(201).json({ success: true, data });
}));

// PUT /api/subjects/:id
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();
  if (error) throw error;
  res.json({ success: true, data });
}));

// DELETE /api/subjects/:id
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('subjects')
    .delete()
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);
  if (error) throw error;
  res.json({ success: true, message: 'Subject deleted' });
}));

module.exports = router;
