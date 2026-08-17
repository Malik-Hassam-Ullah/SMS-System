const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/public/vouchers/:id — Get voucher details without authentication
router.get('/vouchers/:id', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('fee_vouchers')
        .select(`
      *,
      students (
        id, full_name, registration_number, roll_number, father_name, contact_number, address,
        classes ( id, name ),
        sections ( id, name )
      ),
      academic_sessions ( id, name ),
      branches (
        id, name, code, address, phone, email,
        schools ( id, name, logo_url )
      )
    `)
        .eq('id', req.params.id)
        .eq('is_deleted', false)
        .single();

    if (error || !data) {
        return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    res.json({ success: true, data });
}));

module.exports = router;
