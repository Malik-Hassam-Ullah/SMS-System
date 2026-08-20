import React, { useState, useEffect } from 'react';
import { Plus, BookMarked, Calendar, Lock, Unlock, Users, Award, Eye, Trash2, Edit3, CheckCircle2, Clock, AlertCircle, Search, Layers, School } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/api';
import toast from 'react-hot-toast';

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Form State for Create / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState('Monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/exams');
      setExams(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load exams list.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditId(null);
    setExamName('');
    setExamType('Monthly');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setStatus('upcoming');
    setShowModal(true);
  };

  const openEditModal = (exam) => {
    setIsEditing(true);
    setEditId(exam.id);
    setExamName(exam.name || '');
    setExamType(exam.exam_type || 'Monthly');
    setStartDate(exam.start_date || exam.exam_date || '');
    setEndDate(exam.end_date || exam.exam_date || '');
    setStatus(exam.status || 'upcoming');
    setShowModal(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examName.trim()) {
      return toast.error('Exam name is required');
    }
    try {
      setSaving(true);
      const payload = {
        name: examName.trim(),
        exam_type: examType,
        start_date: startDate,
        end_date: endDate,
        status: status
      };

      if (isEditing) {
        await api.put(`/exams/${editId}`, payload);
        toast.success('Exam updated successfully!');
      } else {
        await api.post('/exams', payload);
        toast.success('New Exam created successfully!');
      }

      setShowModal(false);
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (exam) => {
    const newLockState = !exam.is_locked;
    const confirmMsg = newLockState
      ? `Are you sure you want to LOCK "${exam.name}"? Teachers will no longer be able to edit marks.`
      : `Unlock "${exam.name}"? Teachers will be able to enter/update marks again.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/exams/${exam.id}/lock`, { is_locked: newLockState });
      toast.success(newLockState ? 'Exam locked successfully!' : 'Exam unlocked successfully!');
      fetchExams();
      if (showReviewModal && selectedExam?.id === exam.id) {
        openReviewModal(exam);
      }
    } catch (err) {
      toast.error('Failed to update lock status.');
    }
  };

  const handleDeleteExam = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam deleted successfully.');
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete exam.');
    }
  };

  const openReviewModal = async (exam) => {
    setSelectedExam(exam);
    setShowReviewModal(true);
    setLoadingReview(true);
    try {
      const res = await api.get(`/exams/${exam.id}/overview`);
      setReviewData(res.data?.data || null);
    } catch (err) {
      toast.error('Failed to load exam review overview.');
    } finally {
      setLoadingReview(false);
    }
  };

  const filteredExams = exams.filter(e =>
    (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.exam_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <BookMarked className="w-7 h-7 text-blue-600" />
            Exams & Terms Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create examination terms, assign subjects to teachers, review marks, and publish results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/marks"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
          >
            <Award size={16} /> View Class Results
          </Link>

          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus size={16} /> Create New Exam / Term
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Exams</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{exams.length}</span>
        </div>
        <div className="card p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Ongoing / Active</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {exams.filter(e => e.status === 'ongoing' || (!e.status && !e.is_locked)).length}
          </span>
        </div>
        <div className="card p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">Locked Terms</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {exams.filter(e => e.is_locked).length}
          </span>
        </div>
        <div className="card p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">Upcoming</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {exams.filter(e => e.status === 'upcoming').length}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card bg-white p-3.5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search exam by name or type..."
            className="input pl-9 pr-4 py-1.5 w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs font-medium text-slate-500">
          Showing {filteredExams.length} of {exams.length} Exams
        </span>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <div
              key={exam.id}
              className={`card p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                exam.is_locked ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                    {exam.exam_type || 'Exam Term'}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    exam.is_locked
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {exam.is_locked ? <Lock size={12} /> : <Unlock size={12} />}
                    {exam.is_locked ? 'Locked' : 'Open for Marks'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1">{exam.name}</h3>

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 font-medium">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span>
                    {exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'}
                    {exam.end_date && exam.end_date !== exam.start_date && (
                      <> — {new Date(exam.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openReviewModal(exam)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Eye size={14} /> Review & Lock
                  </button>

                  <button
                    onClick={() => navigate(`/admin/marks?exam_id=${exam.id}`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Award size={14} /> Results
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleToggleLock(exam)}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors ${
                      exam.is_locked
                        ? 'text-amber-700 hover:bg-amber-100'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {exam.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                    {exam.is_locked ? 'Unlock Exam' : 'Lock Marks'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(exam)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                      title="Edit Exam"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Delete Exam"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50 rounded-2xl">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No exams or terms found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-4">
            Create your first examination (e.g. 1st Monthly, Mid Term, or Final Exam) to begin teacher marks entry.
          </p>
          <button onClick={openAddModal} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} /> Create Exam / Term
          </button>
        </div>
      )}

      {/* ── MODAL: Create / Edit Exam ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {isEditing ? 'Edit Exam / Term' : 'Create New Exam / Term'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter the examination details and timeline for teacher assignments.
            </p>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Exam Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1st Monthly, 2nd Monthly, Mid Term, Final Term"
                  className="input w-full text-sm"
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Exam Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly, Term, Annual"
                    className="input w-full text-sm"
                    value={examType}
                    onChange={e => setExamType(e.target.value)}
                    list="exam-type-suggestions"
                  />
                  <datalist id="exam-type-suggestions">
                    <option value="Monthly" />
                    <option value="Term" />
                    <option value="Mid Term" />
                    <option value="Final Term" />
                    <option value="Annual" />
                    <option value="Weekly Test" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    className="input w-full text-sm"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing (Active)</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input w-full text-sm"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="input w-full text-sm"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isEditing ? 'Update Exam' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CEO / Admin Review & Lock Panel ── */}
      {showReviewModal && selectedExam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  Exam Review Panel — {selectedExam.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review class & subject marks completion status, inspect entries, and toggle lock.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleLock(selectedExam)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    selectedExam.is_locked
                      ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {selectedExam.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                  {selectedExam.is_locked ? 'Unlock Exam' : 'Lock All Marks'}
                </button>

                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingReview ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : reviewData?.overview ? (
                <div className="space-y-6">
                  {reviewData.overview.map(cls => (
                    <div key={cls.class_id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 px-4 py-2.5 flex justify-between items-center border-b border-slate-200">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <School size={16} className="text-blue-600" />
                          {cls.class_name} ({cls.student_count} Enrolled Students)
                        </span>

                        <Link
                          to={`/admin/marks?class_id=${cls.class_id}&exam_id=${selectedExam.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Award size={13} /> View Class Result Sheet
                        </Link>
                      </div>

                      <div className="p-4 space-y-4">
                        {cls.sections.map(sec => (
                          <div key={sec.section_id} className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Section {sec.section_name} ({sec.student_count} Students)
                            </h4>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                                    <th className="p-2">Subject</th>
                                    <th className="p-2">Assigned Teacher</th>
                                    <th className="p-2 text-center">Marks Entered</th>
                                    <th className="p-2 text-center">Status</th>
                                    <th className="p-2 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sec.subjects.map(sub => (
                                    <tr key={sub.subject_id} className="hover:bg-slate-50/70">
                                      <td className="p-2 font-bold text-slate-800">{sub.subject_name}</td>
                                      <td className="p-2 text-slate-600">{sub.teacher}</td>
                                      <td className="p-2 text-center font-mono">
                                        <span className="font-semibold text-slate-900">{sub.marks_entered}</span> / {sub.total_students}
                                      </td>
                                      <td className="p-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                          sub.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : sub.status === 'in_progress'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {sub.status === 'completed' ? 'Completed' : sub.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                        </span>
                                      </td>
                                      <td className="p-2 text-right">
                                        <Link
                                          to={`/admin/marks?section_id=${sec.section_id}&subject_id=${sub.subject_id}&exam_id=${selectedExam.id}`}
                                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                                        >
                                          <Eye size={12} /> Inspect Marks
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No classes or sections found for review.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
