require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function test() {
  try {
    const branchId = 'bbbbbbbb-0000-0000-0000-000000000001';

    // 1. Add Session
    const sessionPayload = {
      name: 'Test Session ' + Date.now(),
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      is_current: true,
      branch_id: branchId
    };
    
    console.log("Inserting session...");
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('academic_sessions')
      .insert(sessionPayload)
      .select()
      .single();
      
    if (sessionError) {
      console.error("Session Error:", sessionError);
      return;
    }
    
    console.log("Session inserted:", sessionData);
    
    // 2. Add Exam
    const examPayload = {
      name: 'Test Exam',
      exam_date: '2024-06-01',
      session_id: sessionData.id,
      branch_id: branchId
    };
    
    console.log("Inserting exam...");
    const { data: examData, error: examError } = await supabaseAdmin
      .from('exams')
      .insert(examPayload)
      .select()
      .single();
      
    if (examError) {
      console.error("Exam Error:", examError);
      return;
    }
    
    console.log("Exam inserted:", examData);

  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();
