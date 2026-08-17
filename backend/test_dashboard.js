require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDashboard() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@demoschool.edu.pk',
    password: 'Admin@1234'
  });

  if (authError) {
    console.error('❌ AUTH ERROR:', authError.message);
    return;
  }
  
  const token = authData.session.access_token;
  console.log('✅ Logged in! Fetching dashboard data...');

  try {
    const res = await fetch('http://localhost:5000/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('✅ Dashboard Data:', data.data.overview);
  } catch (err) {
    console.error('❌ DASHBOARD ERROR:', err.message);
  }
}

testDashboard();
