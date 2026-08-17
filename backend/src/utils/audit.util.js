const { supabaseAdmin } = require('../config/supabase');

/**
 * Write an entry to the audit_logs table
 */
const logAudit = async (req, action, module, recordId, previousValue = null, newValue = null) => {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      branch_id:       req.branchId,
      performed_by:    req.profile?.id,
      action,
      module,
      record_id:       recordId,
      previous_value:  previousValue,
      new_value:       newValue,
      ip_address:      req.ip || req.headers['x-forwarded-for'],
    });
  } catch (err) {
    // Non-fatal — log to console but don't crash request
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAudit };
