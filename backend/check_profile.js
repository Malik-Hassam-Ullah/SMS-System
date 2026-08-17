require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function checkProfile() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        *,
        branches ( id, name, code, school_id ),
        schools:school_id ( id, name, code, logo_url )
      `)
      .eq('id', '012d7004-121b-413b-a20b-6d678b17099e')
      .single();

    if (error) {
      console.log('--- QUERY ERROR DETAILS ---');
      console.log('Error Code:', error.code);
      console.log('Error Message:', error.message);
      console.log('Error Details:', error.details);
      console.log('Error Hint:', error.hint);
    } else {
      console.log('--- QUERY SUCCESS ---');
      console.log(data);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkProfile();
