require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

const usersToReset = [
  { id: '709d1bac-8988-4fc9-baa7-dce8e5787681', email: 'ceo@gmail.com', password: 'Ceo@1234' },
  { id: '012d7004-121b-413b-a20b-6d678b17099e', email: 'admin@demoschool.edu.pk', password: 'Admin@1234' },
  { id: '1d42e6cd-b5fa-4927-b3ab-a5217e2e3d1a', email: 'accountant@demoschool.edu.pk', password: 'Acct@1234' },
  { id: 'b302f229-7bd6-40ea-946f-b834622e65e4', email: 'teacher@demoschool.edu.pk', password: 'Teacher@1234' }
];

async function resetPasswords() {
  try {
    console.log('Starting password reset for demo accounts...');
    for (const u of usersToReset) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
        password: u.password
      });
      if (error) {
        console.error(`Failed to reset password for ${u.email}:`, error.message);
      } else {
        console.log(`✅ Successfully reset password for ${u.email} to: ${u.password}`);
      }
    }
    console.log('Password reset operation completed.');
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

resetPasswords();
