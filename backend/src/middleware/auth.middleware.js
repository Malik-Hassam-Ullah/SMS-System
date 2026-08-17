const { supabaseAdmin } = require('../config/supabase');

/**
 * Middleware: verify Supabase JWT and attach user + profile to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT with Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }

    // Load user profile (role + branch)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*, branches(id, name, school_id), schools:school_id(id, name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User profile not found' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ success: false, message: 'Forbidden: Account is deactivated' });
    }

    req.user = user;
    req.profile = profile;
    req.branchId = profile.branch_id;
    req.schoolId = profile.school_id;
    req.role = profile.role;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
};

/**
 * Middleware factory: restrict to specific roles
 * Usage: requireRole('admin'), requireRole('admin', 'accountant')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires role ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

/**
 * Enforce branch isolation: ensures any branchId in params/body
 * matches the authenticated user's branch
 */
const enforceBranchIsolation = (req, res, next) => {
  if (req.role === 'ceo') {
    return next();
  }

  const requestedBranch = req.params.branchId || req.body.branch_id || req.query.branch_id;
  if (requestedBranch && requestedBranch !== req.branchId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Cross-branch access denied',
    });
  }
  next();
};

module.exports = { authenticate, requireRole, enforceBranchIsolation };
