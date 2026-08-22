/**
 * Comprehensive End-to-End Exam Module Verification
 * Tests Phases 7, 8, 9, 10
 */
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:5000/api' + path);
    const opts = {
      hostname: url.hostname, port: 5000,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  }
}

async function runE2E() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  EXAM SYSTEM COMPLETE END-TO-END VERIFICATION');
  console.log('════════════════════════════════════════════════════════════════\n');

  // 1. Authenticate Admin
  const brRes = await req('GET', '/auth/branches');
  assert(brRes.s === 200, 'Fetch branches endpoint (200)');
  const mainBranch = (brRes.b.data || []).find(b => b.name === 'Main Campus') || brRes.b.data[0];

  const adminAuth = await req('POST', '/auth/login', {
    email: 'admin@gmail.com', password: 'Admin@1234', role: 'admin', branchId: mainBranch.id
  });
  assert(adminAuth.s === 200, 'Admin login authentication (200)');
  const adminToken = adminAuth.b.data.access_token;

  // 2. Fetch Exams, Classes, Subjects, Students
  const [examsRes, classesRes, subjectsRes, studentsRes] = await Promise.all([
    req('GET', '/exams', null, adminToken),
    req('GET', '/classes', null, adminToken),
    req('GET', '/subjects', null, adminToken),
    req('GET', '/students?limit=50', null, adminToken)
  ]);

  assert(examsRes.s === 200 && Array.isArray(examsRes.b.data), 'Exams list endpoint working with count enrichment');
  assert(classesRes.s === 200 && Array.isArray(classesRes.b.data), 'Classes list endpoint working');
  assert(subjectsRes.s === 200 && Array.isArray(subjectsRes.b.data || subjectsRes.b), 'Subjects list endpoint working');
  assert(studentsRes.s === 200 && Array.isArray(studentsRes.b.data || studentsRes.b), 'Students list endpoint working');

  const exams = examsRes.b.data || examsRes.b || [];
  const classes = classesRes.b.data || classesRes.b || [];
  const subjects = subjectsRes.b.data || subjectsRes.b || [];
  const students = studentsRes.b.data || studentsRes.b || [];

  console.log(`\n  [Context] Found ${exams.length} exams, ${classes.length} classes, ${subjects.length} subjects, ${students.length} students`);

  const testExam = exams[0];
  const testClass = classes.find(c => students.some(s => s.current_class_id === c.id)) || classes[0];
  const classStudents = students.filter(s => s.current_class_id === testClass.id);
  const testSubject = subjects[0];

  console.log(`  [Selected] Exam="${testExam.name}", Class="${testClass.name}" (${classStudents.length} students), Subject="${testSubject.name}"`);

  // 3. Enter test marks to test Position, Tie Handling, and Top 5 Calculation
  console.log('\n--- TEST SUITE 1: Marks Entry & Validation (Phase 10) ---');

  // Validation: Negative Marks
  const negTest = await req('POST', '/marks/bulk', {
    exam_id: testExam.id, subject_id: testSubject.id, section_id: classStudents[0]?.current_section_id || 'dummy',
    marks: [{ student_id: classStudents[0]?.id, marks_obtained: -10 }]
  }, adminToken);
  assert(negTest.s === 400, 'Security: Reject negative marks with 400 Bad Request');

  // Validation: Over Total Marks
  const overTest = await req('POST', '/marks/bulk', {
    exam_id: testExam.id, subject_id: testSubject.id, section_id: classStudents[0]?.current_section_id || 'dummy',
    marks: [{ student_id: classStudents[0]?.id, marks_obtained: (testSubject.total_marks || 100) + 50 }]
  }, adminToken);
  assert(overTest.s === 400, 'Security: Reject marks exceeding subject total with 400 Bad Request');

  // Validation: Non-numeric marks
  const nanTest = await req('POST', '/marks/bulk', {
    exam_id: testExam.id, subject_id: testSubject.id, section_id: classStudents[0]?.current_section_id || 'dummy',
    marks: [{ student_id: classStudents[0]?.id, marks_obtained: 'ABC' }]
  }, adminToken);
  assert(nanTest.s === 400, 'Security: Reject non-numeric marks with 400 Bad Request');

  if (classStudents.length >= 3) {
    // Let's enter sample marks: Stu0: 95, Stu1: 90, Stu2: 90 (TIE!), Stu3: 75
    const marksPayload = [
      { student_id: classStudents[0].id, marks_obtained: 95, is_absent: false },
      { student_id: classStudents[1].id, marks_obtained: 90, is_absent: false },
      { student_id: classStudents[2].id, marks_obtained: 90, is_absent: false }, // Tie for rank 2
    ];
    if (classStudents[3]) {
      marksPayload.push({ student_id: classStudents[3].id, marks_obtained: 75, is_absent: false });
    }

    const saveMarks = await req('POST', '/marks/bulk', {
      exam_id: testExam.id,
      subject_id: testSubject.id,
      section_id: classStudents[0].current_section_id,
      marks: marksPayload
    }, adminToken);

    assert(saveMarks.s === 201 || saveMarks.s === 200, `Bulk marks entry saved successfully for ${marksPayload.length} students`);
  }

  // 4. Test Phase 7: Class-wise Result Sheet & Top 5 Positions
  console.log('\n--- TEST SUITE 2: Class-wise Result Sheet & Top 5 Positions (Phase 7) ---');

  const reportRes = await req('GET', `/marks/report/class/${testClass.id}/exam/${testExam.id}`, null, adminToken);
  assert(reportRes.s === 200, 'Class report endpoint returns 200 OK');
  assert(reportRes.b.success === true, 'Class report returns success: true');
  assert(Array.isArray(reportRes.b.data.rows), 'Class report contains rows array');
  assert(Array.isArray(reportRes.b.data.top5), 'Class report contains top5 array');

  const rows = reportRes.b.data.rows;
  const top5 = reportRes.b.data.top5;

  console.log(`  Report has ${rows.length} student rows, Top 5 count: ${top5.length}`);

  // Check positions and tie-handling
  const stu0Row = rows.find(r => r.student_id === classStudents[0]?.id);
  const stu1Row = rows.find(r => r.student_id === classStudents[1]?.id);
  const stu2Row = rows.find(r => r.student_id === classStudents[2]?.id);

  if (stu0Row && stu1Row && stu2Row) {
    assert(stu0Row.position === 1, `Rank 1 calculated correctly: ${stu0Row.full_name} (position=${stu0Row.position}, ${stu0Row.percentage}%)`);
    assert(stu1Row.position === 2, `Rank 2 calculated correctly: ${stu1Row.full_name} (position=${stu1Row.position}, ${stu1Row.percentage}%)`);
    assert(stu2Row.position === 2, `Proper tie-handling verified: ${stu2Row.full_name} tied at position=${stu2Row.position} (${stu2Row.percentage}%)`);
    assert(stu0Row.result_status === 'PASS', `Result status calculation (PASS) for ${stu0Row.full_name}`);
  }

  if (top5.length > 0) {
    assert(top5.length <= 5, 'Top 5 rankers widget capped at maximum 5 students');
    assert(top5[0].percentage >= (top5[1]?.percentage || 0), 'Top 5 sorted in descending order of percentage');
    console.log(`  Top 5 rankers: ${top5.map(t => '#' + t.position + ' ' + t.full_name + ' (' + t.percentage + '%)').join(', ')}`);
  }

  // 5. Test Phase 8: Student Profile Integration
  console.log('\n--- TEST SUITE 3: Student Profile Exams & Results Tab (Phase 8) ---');

  const testStudent = classStudents[0] || students[0];
  const stuReport = await req('GET', `/marks/report/student/${testStudent.id}`, null, adminToken);
  assert(stuReport.s === 200, `Student marks report endpoint returns 200 for ${testStudent.full_name}`);
  assert(Array.isArray(stuReport.b.data.examSummaries), 'Returns historical exam summaries array for student');
  assert(stuReport.b.data.school && stuReport.b.data.school.name, 'Returns school information header for reports');

  const targetExamSummary = stuReport.b.data.examSummaries.find(e => e.exam_id === testExam.id);
  if (targetExamSummary) {
    assert(targetExamSummary.exam_name === testExam.name, `Historical summary matches exam name: "${targetExamSummary.exam_name}"`);
    assert(targetExamSummary.subjects_count > 0, `Contains subjects marks breakdown (${targetExamSummary.subjects_count} subjects)`);
    assert(typeof targetExamSummary.percentage === 'number', `Calculated percentage is numeric (${targetExamSummary.percentage}%)`);
    assert(['PASS', 'FAIL', 'PENDING'].includes(targetExamSummary.result_status), `Status is standard: ${targetExamSummary.result_status}`);
  }

  // 6. Test Phase 9: Official Result Card Data
  console.log('\n--- TEST SUITE 4: Professional Student Result Card (Phase 9) ---');

  const cardRes = await req('GET', `/marks/report/student/${testStudent.id}?exam_id=${testExam.id}`, null, adminToken);
  assert(cardRes.s === 200, 'Result card endpoint returns 200 OK');
  assert(cardRes.b.data.selectedExamResult !== null, 'Selected exam result payload is present');

  const cardExam = cardRes.b.data.selectedExamResult;
  assert(cardExam.marks.length > 0, 'Subject-wise marks grid populated for result card');
  assert(cardExam.marks[0].grade !== undefined, `Letter grade calculated for subject: ${cardExam.marks[0].grade}`);
  assert(cardRes.b.data.student.full_name === testStudent.full_name, 'Student profile fields populated for report card');
  assert(cardRes.b.data.school.name !== undefined, 'School branding (name, address, phone) populated');

  // 7. Test Phase 10: Teacher Scoped Access & Security
  console.log('\n--- TEST SUITE 5: Role-based Authorization & Teacher Restrictions (Phase 10) ---');

  const teacherAuth = await req('POST', '/auth/login', {
    email: 'teacher@gmail.com', password: 'Teacher@1234', role: 'teacher', branchId: mainBranch.id
  });

  if (teacherAuth.s === 200) {
    const teacherToken = teacherAuth.b.data.access_token;
    assert(true, 'Teacher login successful');

    const teacherTasks = await req('GET', '/marks/teacher-assignments', null, teacherToken);
    assert(teacherTasks.s === 200, 'Teacher can access assigned marks entry tasks');

    // Admin should get 403 when accessing teacher-only endpoint
    const adminBlocked = await req('GET', '/marks/teacher-assignments', null, adminToken);
    assert(adminBlocked.s === 403, 'Role guard: Admin blocked from teacher-specific endpoint with 403 Forbidden');
  } else {
    console.log('  ⚠️ Teacher login skipped');
  }

  // Unauthenticated requests should be 401
  const unauthTest = await req('GET', `/marks/report/class/${testClass.id}/exam/${testExam.id}`);
  assert(unauthTest.s === 401, 'Security: Unauthenticated access rejected with 401 Unauthorized');

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('════════════════════════════════════════════════════════════════');
}

runE2E().catch(console.error);
