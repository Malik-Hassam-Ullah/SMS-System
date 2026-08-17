import React, { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { getDashboardData } from '../../api/dashboard.api';
import { getExams } from '../../api/exams.api';
import { getStudents } from '../../api/students.api';
import { getMarks, bulkSaveMarks } from '../../api/marks.api';

export default function MarksEntryPage() {
  const { user } = useAuthStore();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState('');

  // Data lists
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);

  // Selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  // Student & Marks Data
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [currentSubjectObj, setCurrentSubjectObj] = useState(null);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Derived filters based on assignments
  const availableClasses = Array.from(new Map(
    assignments.map(a => [a.sections?.classes?.id, { id: a.sections?.classes?.id, name: a.sections?.classes?.name }])
  ).values()).filter(c => c.id);

  const availableSections = Array.from(new Map(
    assignments
      .filter(a => a.sections?.classes?.id === selectedClass)
      .map(a => [a.sections?.id, { id: a.sections?.id, name: a.sections?.name }])
  ).values()).filter(s => s.id);

  const availableSubjects = Array.from(new Map(
    assignments
      .filter(a => a.sections?.id === selectedSection)
      .map(a => [a.subjects?.id, { id: a.subjects?.id, name: a.subjects?.name, total_marks: a.subjects?.total_marks }])
  ).values()).filter(s => s.id);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [dashRes, examsRes] = await Promise.all([
          getDashboardData(),
          getExams()
        ]);

        if (dashRes.data?.teacherAssignments) {
          setAssignments(dashRes.data.teacherAssignments);
        }
        if (examsRes.data) {
          setExams(examsRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
        setError('Failed to load classes and exams.');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialData();
  }, []);

  // Reset dependent dropdowns when parent changes
  useEffect(() => { setSelectedSection(''); setSelectedSubject(''); }, [selectedClass]);
  useEffect(() => { setSelectedSubject(''); }, [selectedSection]);

  const canShowStudents = selectedClass && selectedSection && selectedSubject && selectedExam;

  useEffect(() => {
    if (canShowStudents) {
      const subj = availableSubjects.find(s => s.id === selectedSubject);
      setCurrentSubjectObj(subj);
      fetchStudentsAndMarks(subj);
    } else {
      setStudents([]);
      setMarksData({});
    }
  }, [selectedClass, selectedSection, selectedSubject, selectedExam]);

  const fetchStudentsAndMarks = async (subj) => {
    setFetchingData(true);
    setError('');
    try {
      const [studentsRes, marksRes] = await Promise.all([
        getStudents({ section_id: selectedSection, limit: 1000 }),
        getMarks({ section_id: selectedSection, subject_id: selectedSubject, exam_id: selectedExam })
      ]);

      const stList = studentsRes.data || [];
      const mList = marksRes.data || [];

      setStudents(stList);

      const newMarksData = {};
      stList.forEach(st => {
        const existingMark = mList.find(m => m.student_id === st.id);
        newMarksData[st.id] = {
          obtained: existingMark && existingMark.marks_obtained !== null ? existingMark.marks_obtained : '',
          absent: existingMark ? existingMark.is_absent : false,
          remarks: existingMark?.remarks || ''
        };
      });
      setMarksData(newMarksData);
    } catch (err) {
      console.error(err);
      setError('Failed to load students and marks data.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleMarkChange = (studentId, field, value) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
    setSaveSuccess(false);
  };

  const handleSaveMarks = async () => {
    setIsSaving(true);
    setError('');

    // Prepare payload
    const payload = students.map(st => {
      const data = marksData[st.id];
      return {
        student_id: st.id,
        subject_id: selectedSubject,
        exam_id: selectedExam,
        section_id: selectedSection,
        marks_obtained: data.absent || data.obtained === '' ? null : Number(data.obtained),
        is_absent: data.absent,
        remarks: data.remarks
      };
    });

    try {
      await bulkSaveMarks(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          <p className="text-sm text-slate-500 font-medium">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enter Marks</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Select criteria to enter student marks.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Class</label>
            <select className="input bg-slate-50" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Section</label>
            <select className="input bg-slate-50" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass}>
              <option value="">Select Section</option>
              {availableSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
            <select className="input bg-slate-50" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedSection}>
              <option value="">Select Subject</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Exam</label>
            <select className="input bg-slate-50" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              <option value="">Select Exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {fetchingData ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
          <p className="text-sm text-slate-500 font-medium">Loading student list and previous marks...</p>
        </div>
      ) : canShowStudents ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Student List</h2>
              <p className="text-sm text-slate-500 font-medium">Entering marks for {currentSubjectObj?.name}</p>
            </div>
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" /> Marks Saved Successfully
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No active students found in this section.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Roll No.</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4 w-32">Obtained</th>
                    <th className="px-6 py-4 w-24 text-center">Absent</th>
                    <th className="px-6 py-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(student => {
                    const sData = marksData[student.id] || { obtained: '', absent: false, remarks: '' };
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{student.roll_number || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{student.full_name}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            value={sData.obtained}
                            onChange={(e) => handleMarkChange(student.id, 'obtained', e.target.value)}
                            disabled={sData.absent}
                            className="input px-3 py-2 w-full text-center disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={sData.absent}
                            onChange={(e) => {
                              handleMarkChange(student.id, 'absent', e.target.checked);
                              if (e.target.checked) handleMarkChange(student.id, 'obtained', '');
                            }}
                            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer mx-auto"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={sData.remarks}
                            onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                            className="input px-3 py-2 w-full"
                            placeholder="Optional remarks..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {students.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={handleSaveMarks}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Selection</h3>
          <p className="text-slate-500 mt-1 max-w-sm">Please select a class, section, subject, and exam from the filters above to enter marks.</p>
        </div>
      )}
    </div>
  );
}
