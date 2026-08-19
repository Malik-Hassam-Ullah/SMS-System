const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabaseClient } = require('../config/supabase');
const { asyncHandler } = require('../middleware/error.middleware');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(requireRole('ceo'));

// POST /api/ceo/verify-password - Verify CEO password for sensitive actions
router.post('/verify-password', asyncHandler(async (req, res) => {
  const { password } = req.body;
  const userId = req.profile.id;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  // Get CEO email from Supabase Auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    return res.status(400).json({ success: false, message: 'Could not verify identity.' });
  }

  // Re-authenticate with provided password
  const { error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: userData.user.email,
    password
  });

  if (signInError) {
    return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
  }

  res.json({ success: true, message: 'Password verified.' });
}));

// GET /api/ceo/dashboard-stats - Get overall stats for CEO
router.get('/dashboard-stats', asyncHandler(async (req, res) => {
  const school_id = req.profile.school_id;

  // 1. Get total students across all branches
  const { data: branches } = await supabaseAdmin.from('branches').select('id, name').eq('school_id', school_id);
  const branchIds = branches ? branches.map(b => b.id) : [];

  let totalStudents = 0;
  let totalRevenue = 0;
  let branchStats = [];

  if (branchIds.length > 0) {
    const thisMonth = new Date().toISOString().slice(0, 7);

    // Parallel fetch for lightning speed
    const [
      { count: allStudentCount },
      { data: payments },
      ...branchCounts
    ] = await Promise.all([
      supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).in('branch_id', branchIds).eq('is_active', true),
      supabaseAdmin.from('fee_payments').select('amount, branch_id').in('branch_id', branchIds).gte('payment_date', `${thisMonth}-01`),
      ...branches.map(branch =>
        supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('branch_id', branch.id).eq('is_active', true)
      )
    ]);

    totalStudents = allStudentCount || 0;
    totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    branchStats = branches.map((branch, index) => {
      const branchStudentCount = branchCounts[index]?.count || 0;
      const branchRevenue = payments
        ?.filter(p => p.branch_id === branch.id)
        ?.reduce((sum, p) => sum + p.amount, 0) || 0;

      return {
        id: branch.id,
        name: branch.name,
        studentCount: branchStudentCount,
        revenue: branchRevenue
      };
    });
  }

  res.json({ success: true, data: { totalStudents, totalRevenue, branchStats } });
}));

// ─── SCHOOL CONFIGURATION ────────────────────────────────────

// GET /api/ceo/school - Get details of CEO's school
router.get('/school', asyncHandler(async (req, res) => {
  const school_id = req.profile.school_id;

  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('id', school_id)
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}));

// PUT /api/ceo/school - Update CEO's school
router.put('/school', asyncHandler(async (req, res) => {
  const school_id = req.profile.school_id;
  const { name, code, address, phone, email, logo_url } = req.body;

  const { data, error } = await supabaseAdmin
    .from('schools')
    .update({ name, code, address, phone, email, logo_url })
    .eq('id', school_id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}));

// ─── BRANCHES ────────────────────────────────────────────────

// GET /api/ceo/branches - List all branches for the CEO's school
router.get('/branches', asyncHandler(async (req, res) => {
  const school_id = req.profile.school_id;
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('school_id', school_id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}));

// GET /api/ceo/branches/:id/classes
router.get('/branches/:id/classes', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .select(`*, sections (*)`)
    .eq('branch_id', req.params.id)
    .order('display_order');
  if (error) throw error;
  res.json({ success: true, data });
}));

// GET /api/ceo/branches/:id/subjects
router.get('/branches/:id/subjects', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .select('*')
    .eq('branch_id', req.params.id)
    .order('name');
  if (error) throw error;
  res.json({ success: true, data });
}));

// GET /api/ceo/branches/:id/sessions
router.get('/branches/:id/sessions', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('academic_sessions')
    .select('*')
    .eq('branch_id', req.params.id)
    .order('start_date', { ascending: false });
  if (error) throw error;
  res.json({ success: true, data });
}));

// POST /api/ceo/branches - Create a new branch
router.post('/branches', asyncHandler(async (req, res) => {
  const { name, code, address, phone, email } = req.body;
  const school_id = req.profile.school_id;

  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert([{ school_id, name, code, address, phone, email }])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  res.status(201).json({ success: true, data });
}));

// PUT /api/ceo/branches/:id - Update a branch
router.put('/branches/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, address, phone, email, is_active } = req.body;

  const { data, error } = await supabaseAdmin
    .from('branches')
    .update({ name, code, address, phone, email, is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}));



// DELETE /api/ceo/branches/:id - Delete a branch (cascade: delete all branch users first)
router.delete('/branches/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Step 1: Get all users in this branch so we can delete their auth accounts
  const { data: branchUsers, error: usersError } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name, role')
    .eq('branch_id', id);

  if (usersError) {
    return res.status(500).json({ success: false, message: 'Failed to fetch branch users: ' + usersError.message });
  }

  // Step 2: Delete each user's Supabase Auth account (cascades to user_profiles)
  const failedUsers = [];
  for (const user of (branchUsers || [])) {
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      failedUsers.push(user.full_name);
    }
  }

  if (failedUsers.length > 0) {
    return res.status(500).json({
      success: false,
      message: `Failed to delete some user accounts: ${failedUsers.join(', ')}. Branch not deleted.`
    });
  }

  // Step 3: Now delete the branch itself
  const { error } = await supabaseAdmin
    .from('branches')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ success: false, message: 'Branch delete failed: ' + error.message });
  }

  res.json({
    success: true,
    message: `Branch deleted successfully along with ${(branchUsers || []).length} associated user(s).`
  });
}));


// ─── USER DIRECTORY & MANAGEMENT ─────────────────────────────

// GET /api/ceo/users - List all users (admins, accountants, teachers) in the school
router.get('/users', asyncHandler(async (req, res) => {
  const school_id = req.profile.school_id;

  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*, branches(name, code), teachers(qualification, joining_date)')
    .eq('school_id', school_id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  // Fetch emails from auth.users (since email is stored in Auth and not user_profiles)
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    return res.status(500).json({ success: false, message: authError.message });
  }

  const usersList = profiles.map(profile => {
    const authUser = authUsers.users.find(u => u.id === profile.id);
    const teacherData = profile.teachers && profile.teachers.length > 0 ? profile.teachers[0] : {};
    return {
      ...profile,
      email: authUser ? authUser.email : '',
      qualification: teacherData.qualification || '',
      joining_date: teacherData.joining_date || ''
    };
  });

  res.json({ success: true, data: usersList });
}));

// POST /api/ceo/users - Create a new user (admin, accountant, teacher)
router.post('/users', asyncHandler(async (req, res) => {
  const { email, password, role, full_name, branch_id, phone, employee_code, qualification, joining_date } = req.body;
  const school_id = req.profile.school_id;

  // --- Basic Validation ---
  if (!email || !password || !role || !full_name || !branch_id) {
    return res.status(400).json({ success: false, message: 'Required fields missing: email, password, role, full_name, branch_id' });
  }

  if (!['admin', 'accountant', 'teacher'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, accountant, or teacher.' });
  }

  // --- Branch Uniqueness Validation for admin & accountant ---
  if (role === 'admin' || role === 'accountant') {
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('branch_id', branch_id)
      .eq('role', role)
      .eq('is_active', true);

    if (checkError) {
      return res.status(500).json({ success: false, message: 'Failed to validate branch staff. ' + checkError.message });
    }

    if (existing && existing.length > 0) {
      const existingName = existing[0].full_name;
      const roleLabel = role === 'admin' ? 'Administrator' : 'Accountant';
      return res.status(409).json({
        success: false,
        message: `This branch already has an ${roleLabel} (${existingName}). Each branch can only have one ${roleLabel}.`
      });
    }
  }

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    return res.status(400).json({ success: false, message: authError.message });
  }

  const userId = authData.user.id;

  // 2. Create entry in user_profiles
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert([{
      id: userId,
      school_id,
      branch_id,
      role,
      full_name,
      phone,
      employee_code
    }])
    .select()
    .single();

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(400).json({ success: false, message: profileError.message });
  }

  // 3. If role is teacher, also insert in teachers table
  if (role === 'teacher') {
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert([{
        branch_id,
        user_profile_id: userId,
        employee_code,
        qualification,
        joining_date: joining_date || new Date().toISOString().split('T')[0]
      }]);

    if (teacherError) {
      // Rollback profile and auth user
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ success: false, message: teacherError.message });
    }
  }

  res.status(201).json({ success: true, data: profileData });
}));


// PUT /api/ceo/users/:id - Update an existing user (email, password, profile, teacher config)
router.put('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, password, full_name, branch_id, phone, employee_code, qualification, joining_date, is_active } = req.body;

  // 1. Update Auth details if provided
  const updateData = {};
  if (email) updateData.email = email;
  if (password) updateData.password = password;

  if (Object.keys(updateData).length > 0) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
    if (authError) {
      return res.status(400).json({ success: false, message: authError.message });
    }
  }

  // 2. Update user_profiles details
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      full_name,
      branch_id,
      phone,
      employee_code,
      is_active: is_active !== undefined ? is_active : true
    })
    .eq('id', id)
    .select()
    .single();

  if (profileError) {
    return res.status(400).json({ success: false, message: profileError.message });
  }

  // 3. Update teacher details if teacher
  if (profileData.role === 'teacher') {
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .update({
        branch_id,
        employee_code,
        qualification,
        joining_date
      })
      .eq('user_profile_id', id);

    if (teacherError) {
      return res.status(400).json({ success: false, message: teacherError.message });
    }
  }

  res.json({ success: true, data: profileData });
}));

// DELETE /api/ceo/users/:id - Delete a user from Auth (cascades to profile)
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  res.json({ success: true, message: 'User deleted successfully' });
}));

module.exports = router;
