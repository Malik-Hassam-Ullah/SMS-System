require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

(async () => {
  try {
    const targetBranchName = 'Main Campus';

    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id,name,code,school_id')
      .ilike('name', `%${targetBranchName}%`)
      .limit(1)
      .single();

    if (branchError || !branchData) {
      console.error('Branch lookup failed:', branchError ? branchError.message : 'No branch found');
      process.exit(1);
    }

    const branch = branchData;
    console.log('Branch found:', branch);

    const { data: accountants, error: accError } = await supabaseAdmin
      .from('user_profiles')
      .select('id,full_name,role,branch_id,is_active')
      .eq('branch_id', branch.id)
      .eq('role', 'accountant');

    if (accError) {
      console.error('Accountant lookup failed:', accError.message);
      process.exit(1);
    }

    if (accountants && accountants.length > 0) {
      console.log(`Deleting ${accountants.length} existing accountant(s) in branch ${branch.name}...`);
      for (const acct of accountants) {
        console.log(`- Deleting user profile ${acct.id} (${acct.full_name})`);
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(acct.id);
        if (deleteAuthError) {
          console.error('  Auth delete error for user', acct.id, deleteAuthError.message);
        }
        const { error: deleteProfileError } = await supabaseAdmin.from('user_profiles').delete().eq('id', acct.id);
        if (deleteProfileError) {
          console.error('  User profile delete error for user', acct.id, deleteProfileError.message);
        }
      }
    } else {
      console.log('No existing accountant record found for this branch.');
    }

    const timestamp = Date.now();
    const email = `maincampus.accountant+${timestamp}@gmail.com`;
    const password = '12345678';
    const full_name = 'Main Campus Accountant';

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createAuthError) {
      console.error('Failed to create new auth user:', createAuthError.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    const { data: profileData, error: createProfileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([{
        id: userId,
        school_id: branch.school_id,
        branch_id: branch.id,
        role: 'accountant',
        full_name
      }])
      .select()
      .single();

    if (createProfileError) {
      console.error('Failed to create user profile:', createProfileError.message);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      process.exit(1);
    }

    console.log('Successfully created new accountant.');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Branch:', branch.name);
    console.log('User profile:', profileData);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
