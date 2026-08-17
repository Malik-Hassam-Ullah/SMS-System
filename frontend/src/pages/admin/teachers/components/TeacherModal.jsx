import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/api';
import { getBranches, getBranchClasses, getBranchSubjects, getBranchSessions } from '@/api/ceo.api';

export default function TeacherModal({ isOpen, onClose, onSuccess, teacherToEdit = null }) {
  const { user } = useAuthStore();
  const isCeo = user?.role === 'ceo';
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [gender, setGender] = useState('Male');
  const [employeeCode, setEmployeeCode] = useState('');
  const [qualification, setQualification] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // CEO Specific
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Dynamic Options per branch
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Assignments
  const [assignments, setAssignments] = useState([{ class_id: '', section_id: '', subject_id: '', session_id: '' }]);

  useEffect(() => {
    if (!isOpen) return;

    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        if (isCeo) {
          const branchesData = await getBranches();
          setBranches(branchesData);
        }

        if (teacherToEdit) {
          setFullName(teacherToEdit.user_profiles?.full_name || '');
          setEmail(teacherToEdit.user_profiles?.email || '');
          setPhone(teacherToEdit.user_profiles?.phone || '');
          setCnic(teacherToEdit.user_profiles?.cnic || '');
          setGender(teacherToEdit.user_profiles?.gender || 'Male');
          setEmployeeCode(teacherToEdit.employee_code || '');
          setQualification(teacherToEdit.qualification || '');
          setJoiningDate(teacherToEdit.joining_date ? new Date(teacherToEdit.joining_date).toISOString().split('T')[0] : '');
          setIsActive(teacherToEdit.is_active !== false);
          
          let branchIdToLoad = teacherToEdit.branch_id;
          if (isCeo) setSelectedBranchId(branchIdToLoad);

          if (branchIdToLoad || !isCeo) {
             await loadBranchData(branchIdToLoad);
          }

          if (teacherToEdit.teacher_assignments && teacherToEdit.teacher_assignments.length > 0) {
            setAssignments(teacherToEdit.teacher_assignments.map(a => ({
              id: a.id,
              class_id: a.sections?.classes?.id || '',
              section_id: a.sections?.id || '',
              subject_id: a.subjects?.id || '',
              session_id: a.academic_sessions?.id || ''
            })));
          }
        } else {
          // Reset
          setFullName(''); setEmail(''); setPassword(''); setPhone(''); setCnic(''); setGender('Male');
          setEmployeeCode(''); setQualification(''); setJoiningDate(''); setIsActive(true);
          setAssignments([{ class_id: '', section_id: '', subject_id: '', session_id: '' }]);
          if (isCeo) setSelectedBranchId('');
          else await loadBranchData(); // Admin loads for their own branch
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
        setError("Failed to load required data.");
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [isOpen, teacherToEdit]);

  const loadBranchData = async (branchId = null) => {
    try {
      if (isCeo && !branchId) return;
      
      let classesRes, subjectsRes, sessionsRes;

      if (isCeo) {
        classesRes = await getBranchClasses(branchId);
        subjectsRes = await getBranchSubjects(branchId);
        sessionsRes = await getBranchSessions(branchId);
      } else {
        classesRes = (await api.get('/classes')).data;
        subjectsRes = (await api.get('/subjects')).data;
        sessionsRes = (await api.get('/academic/sessions')).data;
      }
      
      setClasses(classesRes || []);
      setSubjects(subjectsRes || []);
      setSessions(sessionsRes || []);
      
      // Auto-select session if only one exists and we are adding new
      if (!teacherToEdit && sessionsRes?.length > 0) {
        const activeSession = sessionsRes.find(s => s.status === 'active') || sessionsRes[0];
        setAssignments([{ class_id: '', section_id: '', subject_id: '', session_id: activeSession.id }]);
      }
    } catch (err) {
      console.error("Failed to load branch data", err);
    }
  };

  const handleBranchChange = async (e) => {
    const branchId = e.target.value;
    setSelectedBranchId(branchId);
    setAssignments([{ class_id: '', section_id: '', subject_id: '', session_id: '' }]);
    if (branchId) {
      await loadBranchData(branchId);
    } else {
      setClasses([]); setSubjects([]); setSessions([]);
    }
  };

  const updateAssignment = (index, field, value) => {
    const newAss = [...assignments];
    newAss[index][field] = value;
    if (field === 'class_id') {
      newAss[index].section_id = ''; // reset section when class changes
    }
    setAssignments(newAss);
  };

  const addAssignment = () => {
    const activeSession = sessions.find(s => s.status === 'active') || sessions[0];
    setAssignments([...assignments, { class_id: '', section_id: '', subject_id: '', session_id: activeSession?.id || '' }]);
  };

  const removeAssignment = async (index) => {
    const ass = assignments[index];
    if (ass.id && teacherToEdit) {
      if (!window.confirm("Are you sure you want to remove this assignment from the database?")) return;
      try {
        await api.delete(`/teachers/${teacherToEdit.id}/assignments/${ass.id}`);
      } catch (err) {
        alert("Failed to delete assignment");
        return;
      }
    }
    const newAss = [...assignments];
    newAss.splice(index, 1);
    setAssignments(newAss);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isCeo && !selectedBranchId && !teacherToEdit) {
      return setError("Please select a branch.");
    }

    // Validate assignments
    const validAssignments = assignments.filter(a => a.section_id && a.subject_id && a.session_id);
    if (validAssignments.length === 0) {
      return setError("At least one complete class/subject assignment is required.");
    }

    setLoading(true);
    try {
      const payload = {
        full_name: fullName,
        email,
        phone,
        cnic,
        gender,
        employee_code: employeeCode,
        qualification,
        joining_date: joiningDate,
        is_active: isActive,
        branch_id: selectedBranchId,
        assignments: validAssignments
      };

      if (!teacherToEdit) {
        payload.password = password;
        await api.post('/teachers', payload);
      } else {
        await api.put(`/teachers/${teacherToEdit.id}`, payload);
        // also upsert assignments
        await api.post(`/teachers/${teacherToEdit.id}/assignments`, { assignments: validAssignments, branch_id: teacherToEdit.branch_id || selectedBranchId });
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl flex flex-col my-8">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{teacherToEdit ? 'Edit Teacher' : 'Add New Teacher'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {initialLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8 custom-scrollbar">
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Basic Information</h3>
                
                {isCeo && !teacherToEdit && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Branch <span className="text-red-500">*</span></label>
                    <select className="input w-full" value={selectedBranchId} onChange={handleBranchChange} required>
                      <option value="">-- Select Branch --</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" className="input w-full" value={fullName} onChange={e => setFullName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" className="input w-full" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!teacherToEdit} />
                  </div>
                  {!teacherToEdit && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                      <input type="text" className="input w-full" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank for Teacher@1234" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="text" className="input w-full" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CNIC</label>
                    <input type="text" className="input w-full" value={cnic} onChange={e => setCnic(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                    <select className="input w-full" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code</label>
                    <input type="text" className="input w-full" value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
                    <input type="text" className="input w-full" value={qualification} onChange={e => setQualification(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date</label>
                    <input type="date" className="input w-full" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
                  </div>
                  {teacherToEdit && (
                    <div className="flex items-center gap-2 mt-7">
                      <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                      <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Account is Active</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignments */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span>Class & Subject Assignments <span className="text-red-500">*</span></span>
                  <button type="button" onClick={addAssignment} className="text-sm btn-primary py-1.5 px-3 flex items-center gap-1">
                    <Plus size={16} /> Add Class
                  </button>
                </h3>
                
                {assignments.length === 0 && (
                  <div className="text-center p-6 bg-slate-50 text-slate-500 rounded-lg border border-slate-200">
                    No assignments added. You must add at least one class and subject.
                  </div>
                )}

                <div className="space-y-4">
                  {assignments.map((ass, index) => {
                    const selectedClass = classes.find(c => c.id === ass.class_id);
                    const sectionsForClass = selectedClass?.sections || [];

                    return (
                      <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg relative">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
                          <select className="input w-full" value={ass.class_id} onChange={e => updateAssignment(index, 'class_id', e.target.value)} required>
                            <option value="">-- Select Class --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Section</label>
                          <select className="input w-full" value={ass.section_id} onChange={e => updateAssignment(index, 'section_id', e.target.value)} required disabled={!ass.class_id}>
                            <option value="">-- Select Section --</option>
                            {sectionsForClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                          <select className="input w-full" value={ass.subject_id} onChange={e => updateAssignment(index, 'subject_id', e.target.value)} required>
                            <option value="">-- Select Subject --</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Session</label>
                          <select className="input w-full" value={ass.session_id} onChange={e => updateAssignment(index, 'session_id', e.target.value)} required>
                            <option value="">-- Select Session --</option>
                            {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
                          </select>
                        </div>
                        <button type="button" onClick={() => removeAssignment(index)} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-6 py-2.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save size={18} /> {teacherToEdit ? 'Save Changes' : 'Create Teacher'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
