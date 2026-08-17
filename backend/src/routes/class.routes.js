const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/classes
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .select(`*, sections ( id, name )`)
    .eq('branch_id', req.branchId)
    .order('display_order');
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/classes — Admin only
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .insert({ ...req.body, branch_id: req.branchId })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Class name already exists' });
    throw error;
  }
  res.status(201).json({ success: true, data });
}));

// PUT /api/classes/:id
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();
  if (error) throw error;
  res.json({ success: true, data });
}));

// DELETE /api/classes/:id
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('classes')
    .delete()
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);
  if (error) throw error;
  res.json({ success: true, message: 'Class deleted' });
}));

// ─── SECTIONS ─────────────────────────────────────────────────
// GET /api/classes/sections/all
router.get('/sections/all', authenticate, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('sections')
    .select(`id, name, class_id, classes(name)`)
    .eq('branch_id', req.branchId)
    .order('name');
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/classes/sections
router.post('/sections', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('sections')
    .insert({ ...req.body, branch_id: req.branchId })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Section already exists in this class' });
    throw error;
  }
  res.status(201).json({ success: true, data });
}));

// DELETE /api/classes/sections/:id
router.delete('/sections/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('sections')
    .delete()
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);
  if (error) throw error;
  res.json({ success: true, message: 'Section deleted' });
}));

module.exports = router;
