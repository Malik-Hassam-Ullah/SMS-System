import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Layers, BookOpen, AlertCircle, Trash2, X, ExternalLink, Users, CheckSquare, Square, Search, ArrowRightLeft, Filter } from 'lucide-react';
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
  const [sourceSectionFilter, setSourceSectionFilter] = useState('ALL');
  const [assignSearch, setAssignSearch] = useState('');
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

  const openAssignModal = async (cls, preselectedTargetSectionId = '') => {
    setError('');
    setSelectedClass(cls);
    setTargetSectionId(preselectedTargetSectionId);
    setSelectedStudentIds([]);
    setSourceSectionFilter('ALL');
    setAssignSearch('');
    setShowAssignModal(true);
    setLoadingStudents(true);
    try {
      const res = await api.get('/students', { params: { class_id: cls.id, limit: 1000 } });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
      list.sort((a, b) => {
        const rollA = parseInt(a.roll_number, 10);
        const rollB = parseInt(b.roll_number, 10);
        if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
      setClassStudents(list);
    } catch (err) {
      toast.error('Failed to fetch students for this class.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredModalStudents = useMemo(() => {
    return classStudents.filter(s => {
      if (sourceSectionFilter === 'UNASSIGNED' && s.current_section_id) return false;
      if (sourceSectionFilter !== 'ALL' && sourceSectionFilter !== 'UNASSIGNED' && s.current_section_id !== sourceSectionFilter) return false;

      if (assignSearch) {
        const term = assignSearch.toLowerCase();
        const name = (s.full_name || '').toLowerCase();
        const roll = (s.roll_number || '').toLowerCase();
        const reg = (s.registration_number || '').toLowerCase();
        const father = (s.father_name || '').toLowerCase();
        if (!name.includes(term) && !roll.includes(term) && !reg.includes(term) && !father.includes(term)) return false;
      }
      return true;
    });
  }, [classStudents, sourceSectionFilter, assignSearch]);

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const toggleAllFilteredStudents = () => {
    const filteredIds = filteredModalStudents.map(s => s.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
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
      toast.success(res.data?.message || `Successfully shifted ${selectedStudentIds.length} students!`);
      setShowAssignModal(false);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign students.');
    } finally {
      setAssigning(false);
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
              <div>
                <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 mt-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <Users size={12} />
                  {cls.student_count || 0} Students Enrolled
                </span>
              </div>
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
              <h4 className="text-sm text-slate-500 mb-3 flex items-center justify-between font-medium">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Sections & Student Strength
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  {cls.sections?.length || 0} {cls.sections?.length === 1 ? 'Section' : 'Sections'}
                </span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {cls.sections && cls.sections.length > 0 ? (
                  cls.sections.map(sec => (
                    <div key={sec.id} className="inline-flex items-center group">
                      <button
                        onClick={() => navigate(`/admin/classes/${cls.id}/sections/${sec.id}`)}
                        className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-l-lg text-sm font-bold border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors shadow-sm"
                        title={`View Section ${sec.name} Students (${sec.student_count || 0} enrolled)`}
                      >
                        <span>Section {sec.name}</span>
                        <span className="ml-1 px-1.5 py-0.2 bg-white text-indigo-800 group-hover:bg-indigo-700 group-hover:text-white rounded-full text-xs font-semibold border border-indigo-300 group-hover:border-indigo-500">
                          {sec.student_count || 0}
                        </span>
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
          <div className="bg-white p-6 w-full max-w-4xl rounded-xl shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  Shift & Assign Students — {selectedClass.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select students from one section and move them to a new/different section.
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingStudents ? (
              <div className="flex-1 flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : classStudents.length === 0 ? (
              <div className="flex-1 py-16 text-center text-slate-500">
                No active students enrolled in {selectedClass.name}.
              </div>
            ) : (
              <form onSubmit={handleAssignStudents} className="flex flex-col flex-1 overflow-hidden space-y-4">
                {/* Top Controls: Filter Source + Search + Target Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  {/* 1. Filter by Current Section */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      1. From Section (Filter):
                    </label>
                    <select
                      className="input w-full text-xs font-medium bg-white py-1.5"
                      value={sourceSectionFilter}
                      onChange={e => setSourceSectionFilter(e.target.value)}
                    >
                      <option value="ALL">All Sections ({classStudents.length} Students)</option>
                      {selectedClass.sections?.map(sec => {
                        const count = classStudents.filter(s => s.current_section_id === sec.id).length;
                        return (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.name} ({count} Students)
                          </option>
                        );
                      })}
                      <option value="UNASSIGNED">
                        Unassigned ({classStudents.filter(s => !s.current_section_id).length} Students)
                      </option>
                    </select>
                  </div>

                  {/* 2. Search */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      2. Search Student:
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search name, roll no..."
                        className="input w-full text-xs pl-8 py-1.5 bg-white"
                        value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. Target Section */}
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">
                      3. Move Selected To (Target):
                    </label>
                    <select
                      className="input w-full text-xs font-bold border-blue-300 bg-blue-50/50 text-blue-900 py-1.5 focus:bg-white"
                      value={targetSectionId}
                      onChange={e => setTargetSectionId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Target Section...</option>
                      {selectedClass.sections?.map(sec => {
                        const count = classStudents.filter(s => s.current_section_id === sec.id).length;
                        return (
                          <option key={sec.id} value={sec.id}>
                            👉 Section {sec.name} (currently {count} students)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Selection Counter & Quick Select */}
                <div className="flex justify-between items-center text-xs px-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAllFilteredStudents}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-300 transition-colors"
                    >
                      {filteredModalStudents.length > 0 && filteredModalStudents.every(s => selectedStudentIds.includes(s.id))
                        ? 'Deselect All Filtered'
                        : `Select All Filtered (${filteredModalStudents.length})`}
                    </button>
                    <span className="text-slate-500">
                      Showing {filteredModalStudents.length} of {classStudents.length} students
                    </span>
                  </div>

                  <div className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {selectedStudentIds.length} Students Selected
                  </div>
                </div>

                {/* Table of Students */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <button type="button" onClick={toggleAllFilteredStudents} className="text-slate-400 hover:text-blue-600">
                            {filteredModalStudents.length > 0 && filteredModalStudents.every(s => selectedStudentIds.includes(s.id)) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="p-2.5 font-semibold text-slate-700">Roll No</th>
                        <th className="p-2.5 font-semibold text-slate-700">Reg No</th>
                        <th className="p-2.5 font-semibold text-slate-700">Student Name</th>
                        <th className="p-2.5 font-semibold text-slate-700">Father Name</th>
                        <th className="p-2.5 font-semibold text-slate-700">Current Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                            No students match the current filter/search.
                          </td>
                        </tr>
                      ) : (
                        filteredModalStudents.map(student => {
                          const isSelected = selectedStudentIds.includes(student.id);
                          return (
                            <tr
                              key={student.id}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/70 hover:bg-blue-100/60 font-medium' : 'hover:bg-slate-50'
                              }`}
                              onClick={() => toggleStudentSelection(student.id)}
                            >
                              <td className="p-2.5 text-center">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 inline-block" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 inline-block" />
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-800">{student.roll_number || '-'}</td>
                              <td className="p-2.5 text-slate-500 font-mono">{student.registration_number || '-'}</td>
                              <td className="p-2.5 text-slate-900 font-medium">{student.full_name}</td>
                              <td className="p-2.5 text-slate-600">{student.father_name || '-'}</td>
                              <td className="p-2.5">
                                {student.sections?.name ? (
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                    Section {student.sections.name}
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[11px] italic">
                                    Unassigned
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {targetSectionId && selectedStudentIds.length > 0 ? (
                      <span className="text-blue-700 font-medium">
                        Moving {selectedStudentIds.length} students to Section {selectedClass.sections?.find(s => s.id === targetSectionId)?.name}
                      </span>
                    ) : (
                      'Select students and a target section to move'
                    )}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                      onClick={() => setShowAssignModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={assigning || selectedStudentIds.length === 0 || !targetSectionId}
                      className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
                    >
                      <ArrowRightLeft size={16} />
                      {assigning
                        ? 'Moving Students...'
                        : `Move ${selectedStudentIds.length} Student${selectedStudentIds.length === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
