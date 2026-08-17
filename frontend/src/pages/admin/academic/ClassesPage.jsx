import React, { useState, useEffect } from 'react';
import { Plus, Layers, BookOpen, AlertCircle, Trash2, X, ExternalLink, Users, CheckSquare, Square } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/api';
import toast from 'react-hot-toast';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const navigate = useNavigate();

  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');

  // Assign Students State
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/classes');
      setClasses(data || []);
    } catch (err) {
      setError('Failed to fetch classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await api.post('/classes', { name: className, display_order: classes.length + 1 });
      setClassName('');
      setShowClassModal(false);
      fetchClasses();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add class.');
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/classes/sections`, { class_id: selectedClassId, name: sectionName });
      setSectionName('');
      setShowSectionModal(false);
      fetchClasses();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add section.');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class? This will also delete all its sections and students.")) return;
    try {
      await api.delete(`/classes/${id}`);
      fetchClasses();
    } catch (err) {
      setError('Failed to delete class.');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm("Are you sure you want to delete this section?")) return;
    try {
      await api.delete(`/classes/sections/${id}`);
      fetchClasses();
    } catch (err) {
      setError('Failed to delete section.');
    }
  };

  const openSectionModal = (classId) => {
    setError('');
    setSelectedClassId(classId);
    setSectionName('');
    setShowSectionModal(true);
  };

  const openAssignModal = async (cls) => {
    setError('');
    setSelectedClass(cls);
    setTargetSectionId('');
    setSelectedStudentIds([]);
    setShowAssignModal(true);
    setLoadingStudents(true);
    try {
      const { data } = await api.get('/students', { params: { class_id: cls.id, limit: 1000 } });
      setClassStudents(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      toast.error('Failed to fetch students for this class.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAssignStudents = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      return toast.error('Please select at least one student.');
    }
    if (!targetSectionId) {
      return toast.error('Please select a target section.');
    }
    try {
      setAssigning(true);
      const res = await api.put('/students/bulk/assign-section', {
        student_ids: selectedStudentIds,
        section_id: targetSectionId
      });
      toast.success(res.data?.message || 'Students assigned successfully!');
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign students.');
    } finally {
      setAssigning(false);
    }
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.length === classStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(classStudents.map(s => s.id));
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading classes...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="page-header flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-500" /> Classes & Sections
        </h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowClassModal(true)}>
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2 border border-red-500/20">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="card p-5 flex flex-col space-y-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAssignModal(cls)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded font-medium"
                  title="Assign Students to Sections"
                >
                  <Users className="w-3 h-3" /> Assign
                </button>
                <button
                  onClick={() => openSectionModal(cls.id)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 bg-blue-50 px-2 py-1 rounded font-medium"
                >
                  <Plus className="w-3 h-3" /> Section
                </button>
                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Delete Class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-slate-500 mb-3 flex items-center gap-2 font-medium">
                <Layers className="w-4 h-4" /> Assigned Sections
              </h4>
              <div className="flex flex-wrap gap-2">
                {cls.sections && cls.sections.length > 1 ? (
                  cls.sections.map(sec => (
                    <div key={sec.id} className="inline-flex items-center group">
                      <button
                        onClick={() => navigate(`/admin/classes/${cls.id}/sections/${sec.id}`)}
                        className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-l-lg text-sm font-bold border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors shadow-sm"
                        title="View Section Details"
                      >
                        {sec.name}
                        <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="bg-indigo-50 border border-l-0 border-indigo-200 px-2 py-1.5 rounded-r-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm"
                        title="Delete Section"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                ) : cls.sections && cls.sections.length === 1 ? (
                  <div className="inline-flex items-center group">
                    <button
                      onClick={() => navigate(`/admin/classes/${cls.id}/sections/${cls.sections[0].id}`)}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-l-lg text-sm font-bold border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-sm"
                      title="View Section Details"
                    >
                      {cls.sections[0].name} (Standard)
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(cls.sections[0].id)}
                      className="bg-emerald-50 border border-l-0 border-emerald-200 px-2 py-1.5 rounded-r-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm"
                      title="Delete Section"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm italic">No sections added yet.</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {classes.length === 0 && !loading && (
          <div className="col-span-full card p-8 text-center text-slate-500 border-dashed border-2 border-slate-200 bg-slate-50 rounded-xl">
            No classes found. Add your first class to get started.
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Add New Class</h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                <input
                  type="text"
                  className="input w-full"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  required
                  placeholder="e.g. Grade 10"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium" onClick={() => setShowClassModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Add New Section</h2>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section Name</label>
                <input
                  type="text"
                  className="input w-full"
                  value={sectionName}
                  onChange={e => setSectionName(e.target.value)}
                  required
                  placeholder="e.g. A, B, Blue, Red"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium" onClick={() => setShowSectionModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Section</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {showAssignModal && selectedClass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-3xl rounded-xl shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Assign Students to Section — {selectedClass.name}</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingStudents ? (
              <div className="flex-1 flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : classStudents.length === 0 ? (
              <div className="flex-1 py-12 text-center text-slate-500">
                No active students found in this class.
              </div>
            ) : (
              <form onSubmit={handleAssignStudents} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex gap-4 mb-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Section</label>
                    <select
                      className="input w-full"
                      value={targetSectionId}
                      onChange={e => setTargetSectionId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select a section</option>
                      {selectedClass.sections?.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pb-1 text-sm font-medium text-slate-600">
                    {selectedStudentIds.length} students selected
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3 w-12 text-center">
                          <button type="button" onClick={toggleAllStudents} className="text-slate-400 hover:text-blue-600">
                            {selectedStudentIds.length === classStudents.length ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                          </button>
                        </th>
                        <th className="p-3 font-semibold text-slate-700">Reg No</th>
                        <th className="p-3 font-semibold text-slate-700">Student Name</th>
                        <th className="p-3 font-semibold text-slate-700">Current Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleStudentSelection(student.id)}>
                          <td className="p-3 text-center">
                            {selectedStudentIds.includes(student.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600 inline-block" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 inline-block" />
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-xs">{student.registration_number || '-'}</td>
                          <td className="p-3 font-medium text-slate-900">{student.full_name}</td>
                          <td className="p-3 text-slate-500">
                            {student.sections?.name ? (
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{student.sections.name}</span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                  <button type="button" className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium" onClick={() => setShowAssignModal(false)}>Cancel</button>
                  <button type="submit" disabled={assigning || selectedStudentIds.length === 0 || !targetSectionId} className="btn-primary disabled:opacity-50">
                    {assigning ? 'Assigning...' : 'Assign Selected Students'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
