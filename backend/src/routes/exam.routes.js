const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/exams
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { session_id } = req.query;
  let query = supabaseAdmin
    .from('exams')
    .select('*, academic_sessions(id, name)')
    .order('exam_date', { ascending: false });
  if (req.role !== 'ceo') query = query.eq('branch_id', req.branchId);
  if (session_id) query = query.eq('session_id', session_id);
  const { data, error } = await query;
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/exams
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .insert({ ...req.body, branch_id: req.branchId })
    .select()
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));

// PUT /api/exams/:id
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();
  if (error) throw error;
  res.json({ success: true, data });
}));

// DELETE /api/exams/:id
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('exams')
    .delete()
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);
  if (error) throw error;
  res.json({ success: true, message: 'Exam deleted' });
}));

module.exports = router;
