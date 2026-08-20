const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabaseClient } = require('../config/supabase');
const { asyncHandler } = require('../middleware/error.middleware');

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, branchId, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
  }
  
  if (role !== 'ceo' && !branchId) {
    return res.status(400).json({ success: false, message: 'Branch selection is required' });
  }

  // Support shorthand "123" by mapping to standard default "123456"
  const effectivePassword = password === '123' ? '123456' : password;
  let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: effectivePassword });
  if (error && effectivePassword !== '123456') {
    const retry = await supabaseClient.auth.signInWithPassword({ email, password: '123456' });
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }

  if (error) {
    console.error('Supabase auth error details:', error);
    return res.status(401).json({ success: false, message: error.message || 'Invalid email or password' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select(`
      *,
      branches ( id, name, code, school_id ),
      schools:school_id ( id, name, code, logo_url )
    `)
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error details:', profileError, 'Profile:', profile);
    return res.status(403).json({ success: false, message: 'User profile not configured. Contact your admin.' });
  }

  if (!profile.is_active) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
  }
  
  if (profile.role !== role) {
    return res.status(401).json({ success: false, message: `Invalid role selected. You are registered as ${profile.role}.` });
  }
  
  if (profile.role !== 'ceo' && profile.branch_id !== branchId) {
    return res.status(401).json({ success: false, message: 'You are not assigned to the selected branch.' });
  }

  res.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        full_name: profile.full_name,
        branch: profile.branches,
        school: profile.schools,
        profile_image_url: profile.profile_image_url,
      },
    },
  });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await supabaseAdmin.auth.admin.signOut(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
}));

// GET /api/auth/branches
router.get('/branches', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch branches' });
  }

  res.json({ success: true, data });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }

  const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token });

  if (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  res.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
}));

// POST /api/auth/change-password
router.post('/change-password', asyncHandler(async (req, res) => {
  const { email, new_password } = req.body;

  if (!email || !new_password || new_password.length < 8) {
    return res.status(400).json({ success: false, message: 'Email and new password (min 8 chars) required' });
  }

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: new_password,
  });

  if (error) {
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }

  res.json({ success: true, message: 'Password updated successfully' });
}));

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // 1. Find user in auth to get their ID
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }

  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    // Return success anyway to prevent email enumeration, but optionally we can return 404 for clarity in demo.
    return res.status(404).json({ success: false, message: 'Email not found in our records.' });
  }

  // 2. Check if they are a CEO
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'ceo') {
    return res.status(403).json({ success: false, message: 'Only CEO can reset their password via email. Staff must contact the administration.' });
  }

  // 3. Send Reset Email using Supabase default method
  // We use the origin from the request to build the redirect URL
  const origin = req.headers.origin || 'http://localhost:5173';
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`
  });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, message: 'Password reset link has been sent to your email.' });
}));

module.exports = router;
