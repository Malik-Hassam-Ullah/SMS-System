const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');
const { sendMessage, getStatus } = require('../utils/whatsapp.util');

// GET /api/fees/structures
router.get('/structures', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('fee_structures')
    .select('*, classes(id, name)')
    .eq('branch_id', req.branchId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/fees/structures — admin or accountant can create
router.post('/structures', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('fee_structures')
    .insert({ ...req.body, branch_id: req.branchId })
    .select('*, classes(id, name)')
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));

// PUT /api/fees/structures/:id — update class fee amount
router.put('/structures/:id', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { name, amount, frequency, is_active, class_id } = req.body;
  const { data, error } = await supabaseAdmin
    .from('fee_structures')
    .update({ name, amount, frequency, is_active, class_id })
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select('*, classes(id, name)')
    .single();
  if (error) throw error;
  res.json({ success: true, data });
}));

// DELETE /api/fees/structures/:id
router.delete('/structures/:id', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('fee_structures')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);
  if (error) throw error;
  res.json({ success: true, message: 'Fee structure deactivated' });
}));

// ─── VOUCHERS ─────────────────────────────────────────────────────────────────

// GET /api/fees/vouchers
router.get('/vouchers', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, month, class_id, section_id, search } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('fee_vouchers')
    .select(`
      *,
      students ( id, full_name, registration_number, roll_number, father_name,
        classes ( id, name ), sections ( id, name )
      )
    `, { count: 'exact' })
    .eq('branch_id', req.branchId)
    .eq('is_deleted', false)
    .order('voucher_number', { ascending: true });

  // Only apply pagination when NOT searching (search needs ALL records to filter correctly)
  if (!search) {
    query = query.range(from, to);
  }

  if (status) query = query.eq('status', status);
  if (month) query = query.eq('fee_month', month);
  if (req.query.student_id) query = query.eq('student_id', req.query.student_id);

  const { data, error, count } = await query;
  if (error) throw error;

  // Filter by class/section/search at app level (student FK)
  let filtered = data || [];
  if (class_id) filtered = filtered.filter(v => v.students?.classes?.id === class_id);
  if (section_id) filtered = filtered.filter(v => v.students?.sections?.id === section_id);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(v =>
      v.students?.full_name?.toLowerCase().includes(s) ||
      v.voucher_number?.toLowerCase().includes(s) ||
      v.students?.registration_number?.toLowerCase().includes(s) ||
      v.students?.roll_number?.toString().toLowerCase().includes(s)
    );
  }

  res.json({
    success: true,
    data: filtered,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
  });
}));

// GET /api/fees/vouchers/:id
router.get('/vouchers/:id', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('fee_vouchers')
    .select(`
      *,
      students (
        id, full_name, registration_number, roll_number, voucher_number,
        father_name, contact_number, address,
        classes ( id, name ),
        sections ( id, name )
      ),
      academic_sessions ( id, name ),
      fee_payments ( id, amount, payment_date, payment_method, reference_number, remarks )
    `)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'Voucher not found' });
  }
  res.json({ success: true, data });
}));

// POST /api/fees/vouchers — single voucher
router.post('/vouchers', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { student_id, fee_month, due_date, current_fee, other_charges = 0, discount = 0, notes, session_id } = req.body;

  // Get student's current outstanding balance and concession
  const [{ data: balance }, { data: studentData }] = await Promise.all([
    supabaseAdmin
      .from('student_outstanding_balance')
      .select('total_outstanding')
      .eq('student_id', student_id)
      .single(),
    supabaseAdmin
      .from('students')
      .select('concession_percentage')
      .eq('id', student_id)
      .single()
  ]);

  const previous_balance = balance?.total_outstanding || 0;

  let finalDiscount = discount || 0;
  if (studentData?.concession_percentage && Number(studentData.concession_percentage) > 0) {
    finalDiscount = (current_fee * Number(studentData.concession_percentage)) / 100;
  }

  // Generate voucher number
  const { count } = await supabaseAdmin
    .from('fee_vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', req.branchId);

  const voucherNumber = `VCH-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabaseAdmin
    .from('fee_vouchers')
    .insert({
      branch_id: req.branchId,
      student_id,
      session_id,
      voucher_number: voucherNumber,
      fee_month,
      due_date,
      current_fee,
      previous_balance,
      other_charges,
      discount: finalDiscount,
      amount_paid: 0,
      status: 'unpaid',
      notes,
      created_by: req.profile.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Update outstanding balance to include new voucher
  await supabaseAdmin
    .from('student_outstanding_balance')
    .upsert({
      branch_id: req.branchId,
      student_id,
      total_outstanding: previous_balance + current_fee + other_charges - finalDiscount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' });

  await logAudit(req, 'CREATE_VOUCHER', 'fees', data.id, null, data);
  res.status(201).json({ success: true, data });
}));

// POST /api/fees/vouchers/bulk — bulk generation
router.post('/vouchers/bulk', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { class_id, section_id, fee_month, due_date, current_fee, other_charges = 0, discount = 0, session_id } = req.body;

  // Get all active students in this class/section
  let studentsQuery = supabaseAdmin
    .from('students')
    .select('id, full_name, registration_number, current_class_id, concession_percentage')
    .eq('branch_id', req.branchId)
    .eq('is_active', true);

  if (class_id) studentsQuery = studentsQuery.eq('current_class_id', class_id);
  if (section_id) studentsQuery = studentsQuery.eq('current_section_id', section_id);

  const { data: students, error: studentsError } = await studentsQuery;
  if (studentsError) throw studentsError;

  if (!students || students.length === 0) {
    return res.status(400).json({ success: false, message: 'No students found in the selected class/section' });
  }

  // Fetch fee structures to auto-resolve class fees if current_fee is not specified
  const { data: structures } = await supabaseAdmin
    .from('fee_structures')
    .select('class_id, amount')
    .eq('branch_id', req.branchId)
    .eq('is_active', true)
    .eq('frequency', 'monthly');

  const feeMap = {};
  structures?.forEach(s => {
    if (s.class_id) feeMap[s.class_id] = s.amount;
  });

  const getStudentFee = (student) => {
    if (current_fee && Number(current_fee) > 0) {
      return Number(current_fee);
    }
    return feeMap[student.current_class_id] || 0;
  };

  // Check for existing vouchers this month
  const studentIds = students.map(s => s.id);
  const { data: existing } = await supabaseAdmin
    .from('fee_vouchers')
    .select('student_id')
    .eq('branch_id', req.branchId)
    .eq('fee_month', fee_month)
    .eq('is_deleted', false)
    .in('student_id', studentIds);

  const existingIds = new Set(existing?.map(v => v.student_id) || []);
  const newStudents = students.filter(s => !existingIds.has(s.id));

  if (newStudents.length === 0) {
    return res.status(409).json({
      success: false,
      message: `All ${students.length} students already have vouchers for ${fee_month}`,
    });
  }

  // Get current voucher count for numbering
  const { count: currentCount } = await supabaseAdmin
    .from('fee_vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', req.branchId);

  // Get outstanding balances
  const { data: balances } = await supabaseAdmin
    .from('student_outstanding_balance')
    .select('student_id, total_outstanding')
    .eq('branch_id', req.branchId)
    .in('student_id', newStudents.map(s => s.id));

  const balanceMap = {};
  balances?.forEach(b => { balanceMap[b.student_id] = b.total_outstanding; });

  const year = new Date().getFullYear();
  const vouchers = newStudents.map((student, index) => {
    const fee = getStudentFee(student);

    let studentDiscount = discount || 0;
    if (student.concession_percentage && Number(student.concession_percentage) > 0) {
      studentDiscount = (fee * Number(student.concession_percentage)) / 100;
    }

    return {
      branch_id: req.branchId,
      student_id: student.id,
      session_id,
      voucher_number: `VCH-${year}-${String((currentCount || 0) + index + 1).padStart(4, '0')}`,
      fee_month,
      due_date,
      current_fee: fee,
      previous_balance: balanceMap[student.id] || 0,
      other_charges,
      discount: studentDiscount,
      amount_paid: 0,
      status: 'unpaid',
      created_by: req.profile.id,
    };
  });

  const { data: created, error } = await supabaseAdmin
    .from('fee_vouchers')
    .insert(vouchers)
    .select(`
      *,
      students ( id, full_name, registration_number, roll_number, father_name,
        classes ( id, name ), sections ( id, name )
      )
    `);

  if (error) throw error;

  // Update outstanding balances
  const balanceUpdates = created.map(v => ({
    branch_id: req.branchId,
    student_id: v.student_id,
    total_outstanding: (balanceMap[v.student_id] || 0) + v.current_fee + v.other_charges - v.discount,
    updated_at: new Date().toISOString(),
  }));
  await supabaseAdmin.from('student_outstanding_balance').upsert(balanceUpdates, { onConflict: 'student_id' });

  await logAudit(req, 'BULK_CREATE_VOUCHERS', 'fees', null, null, {
    count: created.length,
    fee_month,
    class_id,
    section_id,
  });

  res.status(201).json({
    success: true,
    data: created,
    summary: {
      requested: students.length,
      created: created.length,
      skipped: existingIds.size,
      skippedNames: existing?.map(v => students.find(s => s.id === v.student_id)?.full_name).filter(Boolean),
    },
  });
}));

// PUT /api/fees/vouchers/bulk/update — Bulk edit vouchers
router.put('/vouchers/bulk/update', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { fee_month, class_id, due_date, notes } = req.body;

  if (!fee_month) {
    return res.status(400).json({ success: false, message: 'Fee month is required' });
  }

  const updates = {};
  if (due_date) updates.due_date = due_date;
  if (notes !== undefined) updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update provided' });
  }

  let updateQuery = supabaseAdmin
    .from('fee_vouchers')
    .update(updates)
    .eq('branch_id', req.branchId)
    .eq('fee_month', fee_month)
    .eq('is_deleted', false)
    .neq('status', 'paid');

  if (class_id) {
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('current_class_id', class_id);

    const studentIds = students?.map(s => s.id) || [];
    if (studentIds.length > 0) {
      updateQuery = updateQuery.in('student_id', studentIds);
    } else {
      return res.json({ success: true, message: 'No students found for this class', updatedCount: 0 });
    }
  }

  const { data: updatedVouchers, error: updateError } = await updateQuery.select();

  if (updateError) throw updateError;

  if (!updatedVouchers || updatedVouchers.length === 0) {
    return res.json({ success: true, message: 'No unpaid vouchers found for the selected criteria', updatedCount: 0 });
  }

  await logAudit(req, 'BULK_UPDATE_VOUCHERS', 'fees', null, null, {
    count: updatedVouchers.length,
    fee_month,
    updates
  });

  res.json({ success: true, message: `Successfully updated ${updatedVouchers.length} vouchers`, updatedCount: updatedVouchers.length });
}));

// POST /api/fees/vouchers/bulk/send-whatsapp — Bulk send vouchers via WhatsApp
router.post('/vouchers/bulk/send-whatsapp', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { fee_month, class_id, section_id } = req.body;

  if (!fee_month) {
    return res.status(400).json({ success: false, message: 'Fee month is required.' });
  }

  const wsStatus = getStatus();
  if (wsStatus.status !== 'connected') {
    return res.status(400).json({
      success: false,
      message: 'WhatsApp is not connected. Please scan the QR code in WhatsApp Settings first.'
    });
  }

  // 1. Fetch vouchers matching criteria
  let query = supabaseAdmin
    .from('fee_vouchers')
    .select(`
      *,
      students (
        id, full_name, roll_number, contact_number, current_class_id, current_section_id
      )
    `)
    .eq('branch_id', req.branchId)
    .eq('fee_month', fee_month)
    .eq('is_deleted', false)
    .neq('status', 'paid'); // Only send unpaid/partial vouchers

  const { data: vouchers, error } = await query;
  if (error) throw error;

  // Filter by class/section at app level
  let filteredVouchers = vouchers || [];
  if (class_id) {
    filteredVouchers = filteredVouchers.filter(v => v.students?.current_class_id === class_id);
  }
  if (section_id) {
    filteredVouchers = filteredVouchers.filter(v => v.students?.current_section_id === section_id);
  }

  if (filteredVouchers.length === 0) {
    return res.json({ success: true, message: 'No unpaid/partial vouchers found for the selected criteria.', sentCount: 0 });
  }

  // Get school/branch details
  const { data: branch } = await supabaseAdmin
    .from('branches')
    .select('name, schools(name)')
    .eq('id', req.branchId)
    .single();
  const schoolName = branch?.schools?.name || 'The Smart School';
  const branchName = branch?.name || '';

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Send in background with delay
  (async () => {
    for (const voucher of filteredVouchers) {
      const parentPhone = voucher.students?.contact_number;
      if (!parentPhone) continue;

      const studentName = voucher.students?.full_name || 'Student';
      const rollNumber = voucher.students?.roll_number || 'N/A';
      const currentFee = Number(voucher.current_fee || 0);
      const balance = Number(voucher.previous_balance || 0);
      const total = Number(voucher.total_payable || 0);
      const dueDate = new Date(voucher.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      const publicLink = `${frontendUrl}/public/vouchers/${voucher.id}`;

      const messageText = `Dear Parent,
The fee voucher for *${studentName}* (Roll No: ${rollNumber}) for *${fee_month}* has been generated.

*Current Fee:* Rs. ${currentFee.toLocaleString()}
*Previous Balance:* Rs. ${balance.toLocaleString()}
*Total Payable:* Rs. ${total.toLocaleString()}
*Due Date:* ${dueDate}

Please view/download the 3-part fee challan here:
${publicLink}

Regards,
*${schoolName} (${branchName})*`;

      try {
        await sendMessage(parentPhone, messageText);
        // Wait 2000ms delay between messages to prevent spam detection
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Failed to send bulk voucher WhatsApp to ${parentPhone}:`, err);
      }
    }
  })();

  res.json({
    success: true,
    message: `Sending ${filteredVouchers.length} vouchers via WhatsApp in the background.`,
    sentCount: filteredVouchers.length
  });
}));

// PUT /api/fees/vouchers/:id — Edit voucher
router.put('/vouchers/:id', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { current_fee, other_charges, discount, due_date, notes } = req.body;

  const { data: voucher, error: fetchError } = await supabaseAdmin
    .from('fee_vouchers')
    .select('*')
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (fetchError || !voucher) {
    return res.status(404).json({ success: false, message: 'Voucher not found' });
  }

  const oldTotal = Number(voucher.current_fee || 0) + Number(voucher.other_charges || 0) - Number(voucher.discount || 0);
  const newTotal = Number(current_fee || 0) + Number(other_charges || 0) - Number(discount || 0);
  const difference = newTotal - oldTotal;

  const updatePayload = {
    current_fee: Number(current_fee || 0),
    other_charges: Number(other_charges || 0),
    discount: Number(discount || 0),
    due_date: due_date || voucher.due_date,
    updated_at: new Date().toISOString()
  };

  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const { data: updatedVoucher, error: updateError } = await supabaseAdmin
    .from('fee_vouchers')
    .update(updatePayload)
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .select()
    .single();

  if (updateError) throw updateError;

  if (difference !== 0) {
    const { data: balanceData } = await supabaseAdmin
      .from('student_outstanding_balance')
      .select('total_outstanding')
      .eq('student_id', voucher.student_id)
      .single();

    if (balanceData) {
      await supabaseAdmin
        .from('student_outstanding_balance')
        .update({
          total_outstanding: Number(balanceData.total_outstanding || 0) + difference,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', voucher.student_id);
    }
  }

  await logAudit(req, 'UPDATE_VOUCHER', 'fees', req.params.id, voucher, updatedVoucher);
  res.json({ success: true, data: updatedVoucher });
}));

// DELETE /api/fees/vouchers/:id — Admin only
router.delete('/vouchers/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data: voucher } = await supabaseAdmin
    .from('fee_vouchers')
    .select('*')
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (!voucher) {
    return res.status(404).json({ success: false, message: 'Voucher not found' });
  }

  if (voucher.is_deleted) {
    return res.status(400).json({ success: false, message: 'Voucher is already deleted' });
  }

  const { error } = await supabaseAdmin
    .from('fee_vouchers')
    .update({
      is_deleted: true,
      deleted_by: req.profile.id,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId);

  if (error) throw error;

  await logAudit(req, 'DELETE_VOUCHER', 'fees', req.params.id, voucher, { is_deleted: true });
  res.json({ success: true, message: 'Voucher deleted successfully' });
}));

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

// GET /api/fees/payments
router.get('/payments', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, from_date, to_date, student_id } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('fee_payments')
    .select(`
      *,
      students ( id, full_name, registration_number ),
      fee_vouchers ( id, voucher_number, fee_month, status, total_payable, amount_paid )
    `, { count: 'exact' })
    .eq('branch_id', req.branchId)
    .order('payment_date', { ascending: false })
    .range(from, to);

  if (from_date) query = query.gte('payment_date', from_date);
  if (to_date) query = query.lte('payment_date', to_date);
  if (student_id) query = query.eq('student_id', student_id);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({
    success: true,
    data,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
  });
}));


// POST /api/fees/payments — record a payment (full or partial)
router.post('/payments', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { voucher_id, amount, payment_date, payment_method = 'cash', reference_number, remarks } = req.body;

  if (!voucher_id || !amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Voucher ID and valid amount are required' });
  }

  // Validate voucher belongs to this branch
  const { data: voucher, error: vErr } = await supabaseAdmin
    .from('fee_vouchers')
    .select('*')
    .eq('id', voucher_id)
    .eq('branch_id', req.branchId)
    .eq('is_deleted', false)
    .single();

  if (vErr || !voucher) {
    return res.status(404).json({ success: false, message: 'Voucher not found' });
  }

  const maxPayable = voucher.total_payable - voucher.amount_paid;
  if (amount > maxPayable) {
    return res.status(400).json({
      success: false,
      message: `Payment amount (${amount}) exceeds remaining balance (${maxPayable})`,
    });
  }

  // Insert payment
  const { data: payment, error: payErr } = await supabaseAdmin
    .from('fee_payments')
    .insert({
      branch_id: req.branchId,
      voucher_id,
      student_id: voucher.student_id,
      amount,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method,
      received_by: req.profile.id,
      reference_number,
      remarks,
    })
    .select()
    .single();

  if (payErr) throw payErr;

  const newAmountPaid = voucher.amount_paid + amount;
  let status = voucher.status;
  if (newAmountPaid >= voucher.total_payable) {
    status = 'paid';
  } else if (newAmountPaid > 0) {
    status = 'partial';
  }

  // Update voucher amount_paid and status
  await supabaseAdmin
    .from('fee_vouchers')
    .update({
      amount_paid: newAmountPaid,
      status: status
    })
    .eq('id', voucher_id);

  await logAudit(req, 'RECORD_PAYMENT', 'fees', payment.id, null, payment);
  res.status(201).json({ success: true, data: payment });
}));

// GET /api/fees/outstanding/:studentId — single student balance
router.get('/outstanding/:studentId', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('student_outstanding_balance')
    .select('*')
    .eq('student_id', req.params.studentId)
    .eq('branch_id', req.branchId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  res.json({ success: true, data: { total_outstanding: data?.total_outstanding || 0 } });
}));

// GET /api/fees/outstanding
router.get('/outstanding', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, class_id, section_id } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('student_outstanding_balance')
    .select(`
      *,
      students (
        id, full_name, registration_number, contact_number,
        classes ( id, name ),
        sections ( id, name )
      )
    `, { count: 'exact' })
    .eq('branch_id', req.branchId)
    .gt('total_outstanding', 0)
    .order('total_outstanding', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  let filtered = data || [];
  if (class_id) filtered = filtered.filter(s => s.students?.classes?.id === class_id);
  if (section_id) filtered = filtered.filter(s => s.students?.sections?.id === section_id);

  res.json({
    success: true,
    data: filtered,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
  });
}));

// GET /api/fees/reports/daily
router.get('/reports/daily', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { date } = req.query;
  const reportDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('fee_payments')
    .select(`
      *,
      students ( id, full_name, father_name, roll_number, classes (name), sections (name) ),
      fee_vouchers ( voucher_number, fee_month, total_payable, amount_paid )
    `)
    .eq('branch_id', req.branchId)
    .eq('payment_date', reportDate)
    .order('created_at');

  if (error) throw error;

  const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
  res.json({ success: true, data: { date: reportDate, payments: data, totalCollection: total } });
}));


// GET /api/fees/reports/monthly-summary
router.get('/reports/monthly-summary', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  const { data, error } = await supabaseAdmin
    .from('fee_payments')
    .select('amount, payment_date')
    .eq('branch_id', req.branchId)
    .gte('payment_date', `${targetYear}-01-01`)
    .lte('payment_date', `${targetYear}-12-31`);

  if (error) throw error;

  const summary = {};
  data?.forEach(p => {
    const month = p.payment_date.slice(0, 7);
    summary[month] = (summary[month] || 0) + p.amount;
  });

  res.json({
    success: true,
    data: Object.entries(summary).map(([month, amount]) => ({ month, amount })),
  });
}));

module.exports = router;
