const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');

// Helper: Check if teacher is assigned to section + subject
async function verifyTeacherAssignment(profileId, sectionId, subjectId) {
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('user_profile_id', profileId)
    .single();

  if (!teacher) return false;

  const { data: assignments } = await supabaseAdmin
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', teacher.id)
    .eq('section_id', sectionId)
    .eq('subject_id', subjectId);

  return !!(assignments && assignments.length > 0);
}

// GET /api/marks/teacher-assignments — Get only assigned tasks for logged-in teacher
router.get('/teacher-assignments', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('user_profile_id', req.profile.id)
    .single();

  if (!teacher) {
    return res.json({ success: true, data: [] });
  }

  // Fetch teacher assignments
  const { data: assignments, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select(`
      id,
      section_id,
      subject_id,
      session_id,
      sections ( id, name, class_id, classes ( id, name ) ),
      subjects ( id, name, code, total_marks, pass_marks )
    `)
    .eq('teacher_id', teacher.id);

  if (error) throw error;

  // Also fetch exams if some assignments don't have exam_id pinned
  const { data: allExams } = await supabaseAdmin
    .from('exams')
    .select('id, name, exam_date, created_at')
    .eq('branch_id', req.branchId)
    .order('created_at', { ascending: false });

  // Get marks entered count per assignment
  const { data: teacherMarks } = await supabaseAdmin
    .from('marks')
    .select('id, section_id, subject_id, exam_id, is_locked')
    .eq('branch_id', req.branchId);

  // Expand assignments across active exams if assignment is generic
  const resultCards = [];
  (assignments || []).forEach(a => {
    if (a.exam_id && a.exams) {
      const enteredCount = (teacherMarks || []).filter(m =>
        m.section_id === a.section_id &&
        m.subject_id === a.subject_id &&
        m.exam_id === a.exam_id
      ).length;

      resultCards.push({
        assignment_id: a.id,
        exam_id: a.exam_id,
        exam_name: a.exams.name,
        exam_type: a.exams.exam_type || 'Term',
        is_locked: !!a.exams.is_locked || !!a.is_locked,
        class_id: a.sections?.classes?.id,
        class_name: a.sections?.classes?.name || 'Class',
        section_id: a.section_id,
        section_name: a.sections?.name || '',
        subject_id: a.subject_id,
        subject_name: a.subjects?.name || '',
        total_marks: a.subjects?.total_marks || 100,
        marks_entered: enteredCount,
        status: enteredCount > 0 ? 'Submitted' : 'Pending'
      });
    } else {
      // Show for each active exam
      (allExams || []).forEach(ex => {
        const enteredCount = (teacherMarks || []).filter(m =>
          m.section_id === a.section_id &&
          m.subject_id === a.subject_id &&
          m.exam_id === ex.id
        ).length;

        resultCards.push({
          assignment_id: a.id,
          exam_id: ex.id,
          exam_name: ex.name,
          exam_type: ex.exam_type || 'Term',
          is_locked: !!ex.is_locked || !!a.is_locked,
          class_id: a.sections?.classes?.id,
          class_name: a.sections?.classes?.name || 'Class',
          section_id: a.section_id,
          section_name: a.sections?.name || '',
          subject_id: a.subject_id,
          subject_name: a.subjects?.name || '',
          total_marks: a.subjects?.total_marks || 100,
          marks_entered: enteredCount,
          status: enteredCount > 0 ? 'Submitted' : 'Pending'
        });
      });
    }
  });

  res.json({ success: true, data: resultCards });
}));

// GET /api/marks/roster — Load class students + existing marks for Marks Entry screen
router.get('/roster', authenticate, requireRole('teacher', 'admin', 'ceo'), asyncHandler(async (req, res) => {
  const { section_id, subject_id, exam_id } = req.query;

  if (!section_id || !subject_id || !exam_id) {
    return res.status(400).json({ success: false, message: 'section_id, subject_id, and exam_id are required' });
  }

  // Teacher security authorization check
  if (req.role === 'teacher') {
    const isAssigned = await verifyTeacherAssignment(req.profile.id, section_id, subject_id);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized for this class/subject' });
    }
  }

  // Fetch Exam, Subject, Section, and Enrolled Students
  const [
    { data: exam },
    { data: subject },
    { data: section },
    { data: students },
    { data: marks }
  ] = await Promise.all([
    supabaseAdmin.from('exams').select('*').eq('id', exam_id).single(),
    supabaseAdmin.from('subjects').select('*').eq('id', subject_id).single(),
    supabaseAdmin.from('sections').select('*, classes(id, name)').eq('id', section_id).single(),
    supabaseAdmin.from('students').select('id, full_name, father_name, roll_number, registration_number').eq('current_section_id', section_id).eq('is_active', true),
    supabaseAdmin.from('marks').select('*').eq('section_id', section_id).eq('subject_id', subject_id).eq('exam_id', exam_id)
  ]);

  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }

  const isLocked = !!exam?.is_locked;
  const totalSubjectMarks = Number(subject.total_marks || 100);

  // Map existing marks to students
  const marksMap = {};
  (marks || []).forEach(m => {
    marksMap[m.student_id] = m;
  });

  // Sort students by roll number ascending
  (students || []).sort((a, b) => {
    const rollA = parseInt(a.roll_number, 10);
    const rollB = parseInt(b.roll_number, 10);
    if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  const roster = (students || []).map(stu => {
    const markRec = marksMap[stu.id];
    return {
      student_id: stu.id,
      roll_number: stu.roll_number || '-',
      registration_number: stu.registration_number || '-',
      full_name: stu.full_name,
      father_name: stu.father_name || '-',
      total_marks: totalSubjectMarks,
      marks_obtained: markRec ? (markRec.marks_obtained !== null ? Number(markRec.marks_obtained) : '') : '',
      is_absent: markRec ? !!markRec.is_absent : false,
      remarks: markRec ? (markRec.remarks || '') : '',
      is_locked: isLocked || !!markRec?.is_locked
    };
  });

  res.json({
    success: true,
    data: {
      exam: { id: exam?.id, name: exam?.name, exam_type: exam?.exam_type, is_locked: isLocked },
      subject: { id: subject.id, name: subject.name, total_marks: totalSubjectMarks, pass_marks: subject.pass_marks },
      class_name: section?.classes?.name || '',
      section_name: section?.name || '',
      is_locked: isLocked,
      roster
    }
  });
}));

// POST /api/marks/bulk — Save / Update Marks
router.post('/bulk', authenticate, requireRole('admin', 'teacher', 'ceo'), asyncHandler(async (req, res) => {
  const { exam_id, subject_id, section_id, marks } = req.body;

  if (!Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({ success: false, message: 'Marks array is required' });
  }

  // 1. Check if exam is locked
  if (exam_id) {
    const { data: exam } = await supabaseAdmin.from('exams').select('is_locked').eq('id', exam_id).single();
    if (exam?.is_locked && req.role === 'teacher') {
      return res.status(403).json({ success: false, message: 'Cannot save marks: This exam is locked by the CEO/Administrator.' });
    }
  }

  // 2. Teacher Authorization verification
  if (req.role === 'teacher') {
    const isAssigned = await verifyTeacherAssignment(req.profile.id, section_id, subject_id);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to enter marks for this section/subject.' });
    }
  }

  // 3. Fetch Subject to validate max marks
  const { data: subject } = await supabaseAdmin
    .from('subjects')
    .select('total_marks, pass_marks')
    .eq('id', subject_id)
    .single();

  const maxAllowedMarks = Number(subject?.total_marks || 100);

  // 4. Validate all entered marks
  for (const m of marks) {
    if (m.is_absent) {
      m.marks_obtained = 0;
      continue;
    }

    if (m.marks_obtained !== '' && m.marks_obtained !== null && m.marks_obtained !== undefined) {
      const num = Number(m.marks_obtained);
      if (isNaN(num)) {
        return res.status(400).json({ success: false, message: `Invalid numeric value for marks: ${m.marks_obtained}` });
      }
      if (num < 0) {
        return res.status(400).json({ success: false, message: 'Negative marks are not allowed.' });
      }
      if (num > maxAllowedMarks) {
        return res.status(400).json({
          success: false,
          message: `Obtained marks (${num}) cannot be greater than total marks (${maxAllowedMarks}).`
        });
      }
      m.marks_obtained = num;
    } else {
      m.marks_obtained = null;
    }
  }

  // Filter only records that have obtained marks or are marked absent
  const recordsToUpsert = marks
    .filter(m => m.marks_obtained !== null || m.is_absent)
    .map(m => ({
      student_id: m.student_id,
      subject_id: subject_id,
      exam_id: exam_id,
      section_id: section_id,
      branch_id: req.branchId,
      marks_obtained: m.marks_obtained,
      total_marks: maxAllowedMarks,
      is_absent: !!m.is_absent,
      remarks: m.remarks || null,
      entered_by: req.profile.id,
      updated_by: req.profile.id
    }));

  if (recordsToUpsert.length === 0) {
    return res.json({ success: true, message: 'No marks to save.' });
  }

  const { data, error } = await supabaseAdmin
    .from('marks')
    .upsert(recordsToUpsert, { onConflict: 'student_id,subject_id,exam_id' })
    .select();

  if (error) throw error;

  await logAudit(req, 'BULK_MARKS_ENTRY', 'marks', null, null, { exam_id, subject_id, section_id, count: data.length });
  res.status(201).json({ success: true, message: `Saved marks for ${data.length} students!`, count: data.length });
}));

// GET /api/marks/report/class/:classId/exam/:examId — Consolidated Class Result Sheet with Ranks & Top 5
router.get('/report/class/:classId/exam/:examId', authenticate, asyncHandler(async (req, res) => {
  const { classId, examId } = req.params;
  const branchId = req.branchId;

  // 1. Fetch Class, Exam, Subjects, Students, and Marks
  const [
    { data: cls },
    { data: exam },
    { data: subjects },
    { data: students },
    { data: marks }
  ] = await Promise.all([
    supabaseAdmin.from('classes').select('id, name').eq('id', classId).single(),
    supabaseAdmin.from('exams').select('*').eq('id', examId).single(),
    supabaseAdmin.from('subjects').select('id, name, code, total_marks, pass_marks').eq('branch_id', branchId),
    supabaseAdmin.from('students').select('id, full_name, father_name, roll_number, registration_number, current_section_id, sections(name)').eq('current_class_id', classId).eq('is_active', true),
    supabaseAdmin.from('marks').select('*').eq('exam_id', examId)
  ]);

  if (!cls || !exam) {
    return res.status(404).json({ success: false, message: 'Class or Exam not found' });
  }

  // 2. Fetch global passing threshold (default 40%)
  let passingPercent = 40;
  try {
    const { data: branch } = await supabaseAdmin.from('branches').select('settings').eq('id', branchId).single();
    if (branch?.settings?.passingMarks) {
      passingPercent = parseFloat(branch.settings.passingMarks);
    }
  } catch (e) {
    // Default 40%
  }

  // 3. Map marks per student
  const studentMap = {};
  (students || []).forEach(s => {
    studentMap[s.id] = {
      student_id: s.id,
      roll_number: s.roll_number || '-',
      registration_number: s.registration_number || '-',
      full_name: s.full_name,
      father_name: s.father_name || '-',
      section_name: s.sections?.name || 'A',
      marks: {},
      total_obtained: 0,
      total_max: 0,
      percentage: 0,
      has_failed_subject: false,
      position: null
    };
  });

  // Calculate subjects present in this class
  const presentSubjectSet = new Set();

  (marks || []).forEach(m => {
    if (studentMap[m.student_id]) {
      const sub = (subjects || []).find(s => s.id === m.subject_id);
      const subName = sub ? sub.name : 'Unknown';
      presentSubjectSet.add(subName);

      const maxM = Number(m.total_marks || sub?.total_marks || 100);
      const obtM = m.is_absent ? 0 : Number(m.marks_obtained || 0);
      const passM = Number(sub?.pass_marks || (maxM * passingPercent / 100));

      const isSubjectFailed = m.is_absent || (obtM < passM);

      studentMap[m.student_id].marks[subName] = {
        obtained: obtM,
        max: maxM,
        is_absent: !!m.is_absent,
        is_failed: isSubjectFailed
      };

      studentMap[m.student_id].total_obtained += obtM;
      studentMap[m.student_id].total_max += maxM;
      if (isSubjectFailed) {
        studentMap[m.student_id].has_failed_subject = true;
      }
    }
  });

  // Calculate percentage and status
  const subjectList = Array.from(presentSubjectSet).sort();
  const rows = Object.values(studentMap).map(row => {
    const pct = row.total_max > 0 ? (row.total_obtained / row.total_max) * 100 : 0;
    const isPassed = !row.has_failed_subject && pct >= passingPercent;
    return {
      ...row,
      percentage: parseFloat(pct.toFixed(2)),
      result_status: row.total_max > 0 ? (isPassed ? 'PASS' : 'FAIL') : 'NO DATA'
    };
  });

  // Sort descending by percentage for ranking
  rows.sort((a, b) => b.percentage - a.percentage);

  // Assign True Dense Ranking (1st, 2nd, 2nd, 3rd — handles ties without skipping rank numbers)
  let currentRank = 0;
  let lastPercentage = null;
  rows.forEach((row) => {
    if (row.total_max === 0) {
      row.position = '-';
      return;
    }
    if (row.percentage !== lastPercentage) {
      currentRank++;
      lastPercentage = row.percentage;
    }
    row.position = currentRank;
  });

  // Calculate Top 5 Students
  const top5 = rows
    .filter(r => r.total_max > 0 && r.result_status === 'PASS')
    .slice(0, 5)
    .map(r => ({
      position: r.position,
      student_id: r.student_id,
      full_name: r.full_name,
      roll_number: r.roll_number,
      father_name: r.father_name,
      section_name: r.section_name,
      total_obtained: r.total_obtained,
      total_max: r.total_max,
      percentage: r.percentage
    }));

  res.json({
    success: true,
    data: {
      class: cls,
      exam: { id: exam.id, name: exam.name, exam_type: exam.exam_type, is_locked: !!exam.is_locked },
      subjects: subjectList,
      total_students: students.length,
      top5,
      rows
    }
  });
}));

// GET /api/marks/report/student/:studentId — Student Result Card and All Terms History
router.get('/report/student/:studentId', authenticate, asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { exam_id } = req.query;
  const branchId = req.branchId;

  // 1. Fetch Student & Branch Info
  const [
    { data: student },
    { data: branch },
    { data: allExams },
    { data: allMarks }
  ] = await Promise.all([
    supabaseAdmin.from('students').select('*, classes(id, name), sections(id, name)').eq('id', studentId).single(),
    supabaseAdmin.from('branches').select('name, code, address, phone, email, settings').eq('id', branchId).single(),
    supabaseAdmin.from('exams').select('*').eq('branch_id', branchId).order('exam_date', { ascending: false }),
    supabaseAdmin.from('marks').select('*, subjects(id, name, code, total_marks, pass_marks), exams(id, name, exam_date, created_at)').eq('student_id', studentId)
  ]);

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const passingThreshold = parseFloat(branch?.settings?.passingMarks || '40');

  // Build Term-by-Term summary cards for student profile
  const examSummaries = (allExams || []).map(ex => {
    const termMarks = (allMarks || []).filter(m => m.exam_id === ex.id);
    const totalObtained = termMarks.reduce((sum, m) => sum + (m.is_absent ? 0 : Number(m.marks_obtained || 0)), 0);
    const totalMax = termMarks.reduce((sum, m) => sum + Number(m.total_marks || m.subjects?.total_marks || 100), 0);
    const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const passed = termMarks.length > 0 && termMarks.every(m => !m.is_absent && (m.marks_obtained >= (m.subjects?.pass_marks || (m.total_marks * passingThreshold / 100))));

    return {
      exam_id: ex.id,
      exam_name: ex.name,
      exam_type: ex.exam_type || 'Term',
      start_date: ex.start_date || ex.exam_date,
      end_date: ex.end_date || ex.exam_date,
      is_locked: !!ex.is_locked,
      total_obtained: totalObtained,
      total_max: totalMax,
      percentage,
      result_status: totalMax > 0 ? (passed ? 'PASS' : 'FAIL') : 'PENDING',
      subjects_count: termMarks.length,
      marks: termMarks.map(m => ({
        subject_id: m.subject_id,
        subject_name: m.subjects?.name || 'Subject',
        total_marks: Number(m.total_marks || m.subjects?.total_marks || 100),
        pass_marks: Number(m.subjects?.pass_marks || 40),
        marks_obtained: m.is_absent ? 0 : Number(m.marks_obtained || 0),
        is_absent: !!m.is_absent,
        grade: (m.marks_obtained / (m.total_marks || 100)) >= 0.8 ? 'A+' : (m.marks_obtained / (m.total_marks || 100)) >= 0.7 ? 'A' : (m.marks_obtained / (m.total_marks || 100)) >= 0.6 ? 'B' : (m.marks_obtained / (m.total_marks || 100)) >= 0.5 ? 'C' : 'F'
      }))
    };
  });

  // Selected Exam Result Card
  let selectedExamResult = null;
  if (exam_id) {
    selectedExamResult = examSummaries.find(e => e.exam_id === exam_id) || null;
  } else if (examSummaries.length > 0) {
    selectedExamResult = examSummaries[0];
  }

  res.json({
    success: true,
    data: {
      student,
      school: {
        name: branch?.name || 'The Smart School',
        address: branch?.address || '',
        phone: branch?.phone || '',
        email: branch?.email || ''
      },
      examSummaries,
      selectedExamResult
    }
  });
}));

module.exports = router;
