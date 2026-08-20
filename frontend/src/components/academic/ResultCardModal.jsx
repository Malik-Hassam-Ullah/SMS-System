import React from 'react';
import { X, Printer, Trophy, Award, CheckCircle2, XCircle, Calendar, User, School, BookOpen } from 'lucide-react';

export default function ResultCardModal({ isOpen, onClose, student, school, examResult }) {
  if (!isOpen || !student || !examResult) return null;

  const handlePrint = () => {
    window.print();
  };

  const marksList = examResult.marks || [];
  const totalMax = examResult.total_max || 0;
  const totalObtained = examResult.total_obtained || 0;
  const percentage = examResult.percentage || (totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0);
  const isPassed = examResult.result_status === 'PASS';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6">
        {/* Modal Action Header (Hidden during print) */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wide">Student Official Report Card</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
            >
              <Printer size={14} /> Print Result Card
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Report Card Document Area */}
        <div className="p-8 print:p-6 bg-white space-y-6 print:space-y-4" id="printable-result-card">
          {/* School Header */}
          <div className="text-center border-b-2 border-slate-800 pb-5">
            <div className="inline-flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center p-1">
                <img src="/tss-logo.png" alt="Logo" className="max-h-full max-w-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {school?.name || 'THE SMART SCHOOL'}
                </h1>
                <p className="text-xs text-slate-500 font-medium tracking-wider">
                  {school?.address || 'Kahuta Campus'} | Ph: {school?.phone || '+92 300 0000000'}
                </p>
              </div>
            </div>
            <div className="inline-block bg-slate-900 text-white px-5 py-1 rounded-full text-xs font-bold uppercase tracking-widest mt-1">
              {examResult.exam_name} — Result Card
            </div>
          </div>

          {/* Student Profile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Student Name</span>
              <span className="font-bold text-slate-900 text-sm">{student.full_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Father's Name</span>
              <span className="font-semibold text-slate-800 text-sm">{student.father_name || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Class & Section</span>
              <span className="font-bold text-blue-700 text-sm">
                {student.classes?.name || student.admission_class || 'Class'} {student.sections?.name ? `(${student.sections.name})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">Roll No / Reg No</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {student.roll_number || '-'} <span className="text-slate-400 text-xs font-normal">/ {student.registration_number || '-'}</span>
              </span>
            </div>
          </div>

          {/* Subject-wise Marks Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3">#</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3 text-center">Total Marks</th>
                  <th className="p-3 text-center">Pass Marks</th>
                  <th className="p-3 text-center">Marks Obtained</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {marksList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400 italic">
                      No subject marks recorded for this examination yet.
                    </td>
                  </tr>
                ) : (
                  marksList.map((m, idx) => {
                    const subjectPassed = !m.is_absent && (m.marks_obtained >= (m.pass_marks || 40));
                    return (
                      <tr key={m.subject_id || idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{m.subject_name}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{m.total_marks}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{m.pass_marks || 40}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {m.is_absent ? (
                            <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">ABSENT</span>
                          ) : (
                            m.marks_obtained
                          )}
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            m.grade === 'A+' ? 'bg-emerald-100 text-emerald-800' :
                            m.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                            m.grade === 'B' ? 'bg-indigo-100 text-indigo-800' :
                            m.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {m.grade || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold">
                          {subjectPassed ? (
                            <span className="text-emerald-600">PASS</span>
                          ) : (
                            <span className="text-rose-600">FAIL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Result Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900 text-white">
            <div className="text-center border-r border-slate-700">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Total Marks</span>
              <span className="text-xl font-black">{totalObtained} <span className="text-slate-400 text-xs font-normal">/ {totalMax}</span></span>
            </div>

            <div className="text-center border-r border-slate-700">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Percentage</span>
              <span className="text-xl font-black text-amber-400">{percentage}%</span>
            </div>

            <div className="text-center border-r border-slate-700">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Position in Class</span>
              <span className="text-xl font-black text-blue-400">
                {examResult.position ? `${examResult.position}${examResult.position === 1 ? 'st' : examResult.position === 2 ? 'nd' : examResult.position === 3 ? 'rd' : 'th'}` : '-'}
              </span>
            </div>

            <div className="text-center flex flex-col items-center justify-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Final Status</span>
              <span className={`inline-flex items-center gap-1 text-sm font-black uppercase px-2.5 py-0.5 rounded-full mt-0.5 ${
                isPassed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {isPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {examResult.result_status || 'PENDING'}
              </span>
            </div>
          </div>

          {/* Signatures & Remarks */}
          <div className="grid grid-cols-3 gap-8 pt-10 text-center text-xs font-semibold text-slate-700">
            <div className="border-t border-slate-400 pt-1">
              Class Teacher Signature
            </div>
            <div className="border-t border-slate-400 pt-1">
              Exam Controller
            </div>
            <div className="border-t border-slate-400 pt-1">
              Principal Signature & Stamp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
