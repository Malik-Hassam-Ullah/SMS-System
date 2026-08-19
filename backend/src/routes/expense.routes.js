const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// ─── GET /api/expenses — List expenses with filters and summary ──
router.get('/', authenticate, requireRole('ceo', 'admin', 'accountant'), asyncHandler(async (req, res) => {
  const isCeo = req.profile.role === 'ceo';
  const { 
    page = 1, 
    limit = 50, 
    branch_id, 
    status, 
    category, 
    from_date, 
    to_date, 
    search 
  } = req.query;

  const from = (parseInt(page) - 1) * parseInt(limit);
  const to = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('expenses')
    .select(`
      *,
      branches ( id, name, code ),
      created_user:user_profiles!expenses_created_by_fkey ( id, full_name, role ),
      approved_user:user_profiles!expenses_approved_by_fkey ( id, full_name, role )
    `, { count: 'exact' })
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  // Scoping: Non-CEO users can only view expenses for their own branch
  if (!isCeo) {
    query = query.eq('branch_id', req.branchId);
  } else if (branch_id && branch_id !== 'all') {
    query = query.eq('branch_id', branch_id);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (from_date) {
    query = query.gte('expense_date', from_date);
  }
  if (to_date) {
    query = query.lte('expense_date', to_date);
  }

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    if (error.code === 'PGRST205') {
      return res.json({
        success: true,
        data: [],
        summary: {
          totalApproved: 0,
          totalPending: 0,
          totalRejected: 0,
          pendingCount: 0,
          approvedCount: 0,
          thisMonthApproved: 0,
          categoryBreakdown: {}
        },
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 },
        tableMissing: true,
        message: "The 'expenses' table has not been created in Supabase yet. Please run the SQL in Supabase SQL Editor."
      });
    }

    // If foreign key naming mismatch, fallback to simpler select
    const fallbackQuery = supabaseAdmin
      .from('expenses')
      .select('*, branches ( id, name, code )', { count: 'exact' })
      .order('expense_date', { ascending: false })
      .range(from, to);

    if (!isCeo) fallbackQuery.eq('branch_id', req.branchId);
    else if (branch_id && branch_id !== 'all') fallbackQuery.eq('branch_id', branch_id);
    if (status && status !== 'all') fallbackQuery.eq('status', status);
    if (category && category !== 'all') fallbackQuery.eq('category', category);
    if (from_date) fallbackQuery.gte('expense_date', from_date);
    if (to_date) fallbackQuery.lte('expense_date', to_date);

    const fallbackRes = await fallbackQuery;
    if (fallbackRes.error) {
      if (fallbackRes.error.code === 'PGRST205') {
        return res.json({
          success: true,
          data: [],
          summary: { totalApproved: 0, totalPending: 0, totalRejected: 0, pendingCount: 0, approvedCount: 0, thisMonthApproved: 0, categoryBreakdown: {} },
          pagination: { page: 1, limit: 50, total: 0 },
          tableMissing: true
        });
      }
      throw fallbackRes.error;
    }
    
    return res.json({
      success: true,
      data: fallbackRes.data || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: fallbackRes.count || 0 }
    });
  }

  // Filter in-memory for search query if provided
  let filteredData = data || [];
  if (search && search.trim()) {
    const s = search.toLowerCase();
    filteredData = filteredData.filter(e => 
      e.title?.toLowerCase().includes(s) ||
      e.category?.toLowerCase().includes(s) ||
      e.reference_number?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s) ||
      e.created_user?.full_name?.toLowerCase().includes(s)
    );
  }

  // Fetch summary totals (non-paginated)
  let statsQuery = supabaseAdmin
    .from('expenses')
    .select('amount, status, category, expense_date');

  if (!isCeo) {
    statsQuery = statsQuery.eq('branch_id', req.branchId);
  } else if (branch_id && branch_id !== 'all') {
    statsQuery = statsQuery.eq('branch_id', branch_id);
  }

  const { data: allExpenses } = await statsQuery;
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalApproved = 0;
  let totalPending = 0;
  let totalRejected = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let thisMonthApproved = 0;
  const categoryBreakdown = {};

  (allExpenses || []).forEach(e => {
    const amt = Number(e.amount || 0);
    if (e.status === 'approved') {
      totalApproved += amt;
      approvedCount += 1;
      if (e.expense_date && e.expense_date.startsWith(currentMonthPrefix)) {
        thisMonthApproved += amt;
      }
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + amt;
    } else if (e.status === 'pending') {
      totalPending += amt;
      pendingCount += 1;
    } else if (e.status === 'rejected') {
      totalRejected += amt;
    }
  });

  res.json({
    success: true,
    data: filteredData,
    summary: {
      totalApproved,
      totalPending,
      totalRejected,
      pendingCount,
      approvedCount,
      thisMonthApproved,
      categoryBreakdown
    },
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count || filteredData.length }
  });
}));

// ─── POST /api/expenses — Create an expense ─────────────────────
router.post('/', authenticate, requireRole('ceo', 'admin', 'accountant'), asyncHandler(async (req, res) => {
  const isCeo = req.profile.role === 'ceo';
  const {
    title,
    category = 'General',
    amount,
    expense_date,
    payment_method = 'cash',
    reference_number,
    receipt_url,
    description,
    branch_id
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Expense title is required' });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid expense amount is required' });
  }

  // Branch assignment
  let targetBranchId = req.branchId;
  if (isCeo) {
    if (branch_id) {
      targetBranchId = branch_id;
    } else {
      // Pick first available branch
      const { data: firstBranch } = await supabaseAdmin.from('branches').select('id').limit(1).single();
      targetBranchId = firstBranch?.id || req.branchId;
    }
  }

  if (!targetBranchId) {
    return res.status(400).json({ success: false, message: 'Branch ID is required for recording an expense' });
  }

  // If CEO creates it, it is automatically approved
  const payload = {
    branch_id: targetBranchId,
    title: title.trim(),
    category,
    amount: Number(amount),
    expense_date: expense_date || new Date().toISOString().split('T')[0],
    payment_method,
    reference_number: reference_number?.trim() || null,
    receipt_url: receipt_url?.trim() || null,
    description: description?.trim() || null,
    created_by: req.profile.id,
    status: isCeo ? 'approved' : 'pending',
    approved_by: isCeo ? req.profile.id : null,
    approved_at: isCeo ? new Date().toISOString() : null,
    rejection_reason: null
  };

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert(payload)
    .select('*, branches(id, name, code)')
    .single();

  if (error) {
    if (error.code === 'PGRST205') {
      return res.status(400).json({
        success: false,
        message: "Database table 'expenses' has not been created yet in Supabase. Please run the SQL script in Supabase SQL Editor."
      });
    }
    throw error;
  }

  await logAudit({
    user_id: req.profile.id,
    branch_id: targetBranchId,
    action: isCeo ? 'CEO_CREATE_EXPENSE' : 'ACCOUNTANT_CREATE_EXPENSE',
    details: { expense_id: data.id, title, amount, status: data.status }
  });

  res.status(201).json({
    success: true,
    message: isCeo ? 'Expense recorded and approved successfully' : 'Expense submitted for CEO approval',
    data
  });
}));

// ─── PUT /api/expenses/:id/approve — CEO Approves expense ───────
router.put('/:id/approve', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (findErr || !existing) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: req.profile.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*, branches(id, name, code)')
    .single();

  if (error) throw error;

  await logAudit({
    user_id: req.profile.id,
    branch_id: existing.branch_id,
    action: 'APPROVE_EXPENSE',
    details: { expense_id: id, amount: existing.amount, title: existing.title }
  });

  res.json({
    success: true,
    message: 'Expense approved successfully',
    data
  });
}));

// ─── PUT /api/expenses/:id/reject — CEO Rejects expense ─────────
router.put('/:id/reject', authenticate, requireRole('ceo', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (findErr || !existing) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update({
      status: 'rejected',
      approved_by: req.profile.id,
      approved_at: new Date().toISOString(),
      rejection_reason: rejection_reason?.trim() || 'Not approved by CEO',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*, branches(id, name, code)')
    .single();

  if (error) throw error;

  await logAudit({
    user_id: req.profile.id,
    branch_id: existing.branch_id,
    action: 'REJECT_EXPENSE',
    details: { expense_id: id, reason: rejection_reason }
  });

  res.json({
    success: true,
    message: 'Expense rejected',
    data
  });
}));

// ─── PUT /api/expenses/:id — Update expense ─────────────────────
router.put('/:id', authenticate, requireRole('ceo', 'admin', 'accountant'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isCeo = req.profile.role === 'ceo';
  const {
    title,
    category,
    amount,
    expense_date,
    payment_method,
    reference_number,
    receipt_url,
    description,
    branch_id
  } = req.body;

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (findErr || !existing) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  // If accountant, can only edit their own pending expense
  if (!isCeo && existing.status !== 'pending') {
    return res.status(403).json({ success: false, message: 'Approved or rejected expenses cannot be edited' });
  }

  const updates = {
    title: title ? title.trim() : existing.title,
    category: category || existing.category,
    amount: amount ? Number(amount) : existing.amount,
    expense_date: expense_date || existing.expense_date,
    payment_method: payment_method || existing.payment_method,
    reference_number: reference_number !== undefined ? reference_number : existing.reference_number,
    receipt_url: receipt_url !== undefined ? receipt_url : existing.receipt_url,
    description: description !== undefined ? description : existing.description,
    updated_at: new Date().toISOString()
  };

  if (isCeo && branch_id) {
    updates.branch_id = branch_id;
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select('*, branches(id, name, code)')
    .single();

  if (error) throw error;

  res.json({
    success: true,
    message: 'Expense updated successfully',
    data
  });
}));

// ─── DELETE /api/expenses/:id — Delete expense ──────────────────
router.delete('/:id', authenticate, requireRole('ceo', 'admin', 'accountant'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isCeo = req.profile.role === 'ceo';

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (findErr || !existing) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  if (!isCeo && existing.status !== 'pending') {
    return res.status(403).json({ success: false, message: 'Cannot delete an already approved or rejected expense' });
  }

  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await logAudit({
    user_id: req.profile.id,
    branch_id: existing.branch_id,
    action: 'DELETE_EXPENSE',
    details: { expense_id: id, title: existing.title, amount: existing.amount }
  });

  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
}));

module.exports = router;
