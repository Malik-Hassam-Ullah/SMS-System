const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { sendMessage, getStatus } = require('../utils/whatsapp.util');

// GET /api/messages
router.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(`*, sent_by_user:user_profiles!messages_sent_by_fkey(full_name)`)
    .eq('branch_id', req.branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/messages — compose message
router.post('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { subject, body, message_type, recipient_type, recipient_filter } = req.body;

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      branch_id: req.branchId,
      sent_by: req.profile.id,
      subject,
      body,
      message_type,
      recipient_type,
      recipient_filter,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ success: true, data: message });
}));

// POST /api/messages/:id/send — send message
router.post('/:id/send', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data: message } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('id', req.params.id)
    .eq('branch_id', req.branchId)
    .single();

  if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

  // Resolve recipients based on filter
  let studentsQuery = supabaseAdmin
    .from('students')
    .select('id, full_name, contact_number, father_name')
    .eq('branch_id', req.branchId)
    .eq('is_active', true);

  const filter = message.recipient_filter || {};

  if (message.recipient_type === 'class' && filter.class_id) {
    studentsQuery = studentsQuery.eq('current_class_id', filter.class_id);
  } else if (message.recipient_type === 'section' && filter.section_id) {
    studentsQuery = studentsQuery.eq('current_section_id', filter.section_id);
  } else if (message.recipient_type === 'specific' && filter.student_ids?.length) {
    studentsQuery = studentsQuery.in('id', filter.student_ids);
  }

  const { data: students } = await studentsQuery;

  // Create recipient records
  if (students?.length) {
    const recipientRows = students.map(s => ({
      message_id: message.id,
      student_id: s.id,
      delivery_status: 'pending',
    }));
    await supabaseAdmin.from('message_recipients').insert(recipientRows);
  }

  // ─── MESSAGING PROVIDER HOOK ─────────────────────────────────────────────
  if (message.message_type === 'whatsapp' || message.message_type === 'sms') {
    const wsStatus = getStatus();
    if (wsStatus.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp is not connected. Please scan the QR code in WhatsApp Settings first.'
      });
    }

    if (students?.length) {
      // Send in background with delay
      (async () => {
        for (const student of students) {
          if (!student.contact_number) continue;
          try {
            await sendMessage(student.contact_number, message.body);
            await supabaseAdmin
              .from('message_recipients')
              .update({ delivery_status: 'delivered' })
              .eq('message_id', message.id)
              .eq('student_id', student.id);

            // Wait 2000ms delay between messages to prevent spam detection
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (err) {
            console.error(`Failed to send WhatsApp to ${student.contact_number}:`, err);
            await supabaseAdmin
              .from('message_recipients')
              .update({ delivery_status: 'failed' })
              .eq('message_id', message.id)
              .eq('student_id', student.id);
          }
        }
      })();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  await supabaseAdmin
    .from('messages')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', message.id);

  res.json({
    success: true,
    message: `Message sent to ${students?.length || 0} recipients`,
    data: { recipientCount: students?.length || 0 },
  });
}));

// GET /api/messages/:id/recipients
router.get('/:id/recipients', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('message_recipients')
    .select(`*, students(id, full_name, registration_number, contact_number)`)
    .eq('message_id', req.params.id);
  if (error) throw error;
  res.json({ success: true, data });
}));

module.exports = router;
