require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');

async function main() {
  console.log('🔍 Checking Phase 1 Database Schema for Exam & Result Management...\n');

  let allGood = true;

  // 1. Check exams table
  try {
    const { data: exData, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('id, name, exam_type, start_date, end_date, status, is_locked')
      .limit(1);

    if (exErr) {
      console.log('❌ Exams table missing new columns:', exErr.message);
      allGood = false;
    } else {
      console.log('✅ Exams table has all required columns (exam_type, start_date, end_date, status, is_locked)!');
    }
  } catch (e) {
    console.log('❌ Exams check failed:', e.message);
    allGood = false;
  }

  // 2. Check teacher_assignments table
  try {
    const { data: taData, error: taErr } = await supabaseAdmin
      .from('teacher_assignments')
      .select('id, teacher_id, section_id, subject_id, class_id, exam_id, is_locked')
      .limit(1);

    if (taErr) {
      console.log('❌ Teacher assignments table missing new columns:', taErr.message);
      allGood = false;
    } else {
      console.log('✅ Teacher assignments table has all required columns (class_id, exam_id, is_locked)!');
    }
  } catch (e) {
    console.log('❌ Teacher assignments check failed:', e.message);
    allGood = false;
  }

  // 3. Check marks table
  try {
    const { data: mkData, error: mkErr } = await supabaseAdmin
      .from('marks')
      .select('id, student_id, subject_id, exam_id, marks_obtained, total_marks, is_locked')
      .limit(1);

    if (mkErr) {
      console.log('❌ Marks table missing new columns:', mkErr.message);
      allGood = false;
    } else {
      console.log('✅ Marks table has all required columns (is_locked, total_marks)!');
    }
  } catch (e) {
    console.log('❌ Marks check failed:', e.message);
    allGood = false;
  }

  console.log('\n━'.repeat(60));
  if (allGood) {
    console.log('🎉 PHASE 1 SCHEMA IS FULLY VERIFIED AND READY!');
  } else {
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
    console.log('⚠️  Please run the SQL migration in Supabase SQL Editor:');
    console.log(`   Link: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('   File: backend/migrations/002_exam_module_enhancements.sql');
  }
  console.log('━'.repeat(60));
}

main().catch(console.error);
