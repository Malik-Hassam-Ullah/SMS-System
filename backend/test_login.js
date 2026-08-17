require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLogin() {
  console.log('Testing connection to Supabase...');
  
  // 1. Try to login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@demoschool.edu.pk',
    password: 'Admin@1234'
  });

  if (authError) {
    console.error('❌ AUTH ERROR:', authError.message);
    return;
  }
  
  console.log('✅ Auth success for:', authData.user.email);
  console.log('User ID:', authData.user.id);

  // 2. Fetch profile
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error('❌ PROFILE FETCH ERROR:', profileError.message);
    return;
  }
  
  if (!profileData) {
    console.error('❌ PROFILE FETCH ERROR: Profile not found for this user.');
    return;
  }

  console.log('✅ Profile found:', profileData);
}

testLogin();
