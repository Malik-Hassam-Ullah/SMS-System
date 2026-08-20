import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Upload, Eye, Trash2, Filter, Pencil, MessageSquare } from 'lucide-react';
import api from '@/api';
import { useAuthStore } from '@/store/auth.store';

const StudentsPage = () => {
  const { user } = useAuthStore();
  const isAccountant = user?.role === 'accountant';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetchStudents();
  }, [showInactive]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Filter by is_active unless admin wants to see inactive
      const activeFilter = showInactive ? '' : '&is_active=true';
      const response = await api.get(`/students?limit=2000${activeFilter}`);
      // Backend returns: { success, data: [...], pagination }
      // axios wraps it as response.data = { success, data: [...], pagination }
      const payload = response?.data ?? response;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setStudents(list);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleSendSingleWhatsApp = async (student) => {
    const parentPhone = student.contact_number;
    if (!parentPhone) {
      alert('Parent contact number is missing for this student.');
      return;
    }

    const messageText = prompt(`Type your WhatsApp message for ${student.full_name}:`, `Dear Parent, `);
    if (!messageText) return;

    try {
      const statusRes = await api.get('/whatsapp/status');
      if (statusRes.data?.status === 'connected') {
        await api.post('/whatsapp/test', { phone: parentPhone, message: messageText });
        alert('Message sent successfully via WhatsApp!');
        return;
      }
    } catch (err) {
      console.error('Failed to send via gateway, falling back to manual link:', err);
    }

    // Fallback: Open manual WhatsApp Web link
    let formattedPhone = parentPhone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.substring(1);
    }
    const encodedText = encodeURIComponent(messageText);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');
  };

  const getClassRank = (c) => {
    if (!c || c === 'N/A') return 999;
    const lower = String(c).toLowerCase().trim();

    if (lower.includes('playgroup') || lower.includes('play group') || lower === 'pg') return 1;
    if (lower.includes('nursery')) return 2;
    if (lower === 'kg' || lower === 'k.g' || lower === 'k g' || lower.includes('kindergarten')) return 3;
    if (lower === 'prep') return 4;

    const wordMap = {
      'one': 1, 'first': 1, '1st': 1,
      'two': 2, 'second': 2, '2nd': 2,
      'three': 3, 'third': 3, '3rd': 3,
      'four': 4, 'fourth': 4, '4th': 4,
      'five': 5, 'fifth': 5, '5th': 5,
      'six': 6, 'sixth': 6, '6th': 6,
      'seven': 7, 'seventh': 7, '7th': 7,
      'eight': 8, 'eighth': 8, '8th': 8,
      'nine': 9, 'ninth': 9, '9th': 9,
      'ten': 10, 'tenth': 10, '10th': 10,
      'eleven': 11, '11th': 11,
      'twelve': 12, '12th': 12
    };

    for (const [w, num] of Object.entries(wordMap)) {
      if (lower.includes(w)) return 4 + num;
    }

    const match = lower.match(/\b(\d+)\b/) || lower.match(/(\d+)/);
    if (match) {
      return 4 + parseInt(match[1], 10);
    }

    const romanMap = {
      'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
      'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
      'xi': 11, 'xii': 12
    };
    const parts = lower.split(/[\s\-_]+/);
    for (const p of parts) {
      if (romanMap[p]) return 4 + romanMap[p];
    }

    return 100;
  };

  // Get list of unique classes for filter dropdown
  const uniqueClasses = Array.from(
    new Set(students.map(s => s.classes?.name || 'N/A'))
  ).sort((a, b) => getClassRank(a) - getClassRank(b));

  let filteredStudents = students.filter(student => {
    const name = (student.full_name || student.name || '').toLowerCase();
    const regNo = (student.registration_number || student.admissionNumber || '').toLowerCase();
    const rollNo = (student.roll_number || '').toLowerCase();
    const fatherName = (student.father_name || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = name.includes(term) || regNo.includes(term) || rollNo.includes(term) || fatherName.includes(term);
    const clsName = student.classes?.name || 'N/A';
    const matchesClass = !selectedClass || clsName === selectedClass;

    return matchesSearch && matchesClass;
  });

  // Sort by Class (PlayGroup to 10th) then Section (A to Z) then Roll/Reg No
  filteredStudents.sort((a, b) => {
    const classA = a.classes?.name || '';
    const classB = b.classes?.name || '';
    const rankA = getClassRank(classA);
    const rankB = getClassRank(classB);

    if (rankA !== rankB) return rankA - rankB;

    const secA = (a.sections?.name || '').trim().toUpperCase();
    const secB = (b.sections?.name || '').trim().toUpperCase();
    const secComp = secA.localeCompare(secB, undefined, { numeric: true });
    if (secComp !== 0) return secComp;

    const rollA = parseInt(a.roll_number, 10);
    const rollB = parseInt(b.roll_number, 10);
    if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;

    const regA = parseInt(a.registration_number, 10);
    const regB = parseInt(b.registration_number, 10);
    if (!isNaN(regA) && !isNaN(regB) && regA !== regB) return regA - regB;

    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleClearAllStudents = async () => {
    const confirmMessage = `WARNING: Are you sure you want to deactivate ALL ${students.length} active student records for this branch?\n\nStudents will be marked inactive and hidden from the list.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      const res = await api.delete('/students/bulk/clear-all');
      alert(res?.data?.message || 'All student records deactivated successfully!');
      fetchStudents();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to deactivate students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="page-header mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students Directory</h1>
          <p className="text-slate-500">
            {showInactive
              ? `Showing all ${students.length} students (including inactive)`
              : `Total ${students.length} active students enrolled in this branch`}
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {/* Toggle inactive students */}
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => { setShowInactive(e.target.checked); setPage(1); }}
              className="rounded border-slate-300"
            />
            Show Inactive
          </label>
          {!isAccountant && (
            <>
              {!showInactive && students.length > 0 && (
                <button
                  onClick={handleClearAllStudents}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
                  title="Deactivate all student records for this branch"
                >
                  <Trash2 size={18} />
                  Deactivate All
                </button>
              )}
              <Link to="/admin/students/import" className="btn-secondary flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
                <Upload size={18} />
                Import CSV
              </Link>
              <Link to="/admin/students/add" className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus size={18} />
                Add Student
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="card bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search name, Reg No, Roll No, Father..."
              className="input w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              className="input bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
            >
              <option value="">All Classes ({uniqueClasses.length})</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider bg-slate-50/80">
                <th className="p-3 font-semibold">Reg / Roll No</th>
                <th className="p-3 font-semibold">V.No</th>
                <th className="p-3 font-semibold">Student Name</th>
                <th className="p-3 font-semibold">Gender</th>
                <th className="p-3 font-semibold">Date of Birth</th>
                <th className="p-3 font-semibold">Father Name</th>
                <th className="p-3 font-semibold">Father CNIC</th>
                <th className="p-3 font-semibold">Contact No</th>
                <th className="p-3 font-semibold">Address</th>
                <th className="p-3 font-semibold">Admission Class</th>
                <th className="p-3 font-semibold">Current Class</th>
                <th className="p-3 font-semibold">Section</th>
                <th className="p-3 font-semibold">Admission Date</th>
                <th className="p-3 font-semibold text-right">Total Fee / Dues</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-500">Loading complete student directory & fees...</td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-500">No students found matching filters.</td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const regNo = student.registration_number || 'N/A';
                  const rollNo = student.roll_number ? ` (Roll #${student.roll_number})` : '';
                  const vNo = student.voucher_number || 'N/A';
                  const fullName = student.full_name || student.name || 'Unnamed';
                  const father = student.father_name || 'N/A';
                  const fatherCnic = student.father_cnic || 'N/A';
                  const fatherOccupation = student.father_occupation || 'N/A';
                  const fatherStatus = student.father_status || 'N/A';
                  const primaryContact = student.primary_contact_person || 'N/A';
                  const contact = student.contact_number || 'N/A';
                  const parentEmail = student.parent_email || 'N/A';
                  const address = student.address || 'N/A';
                  const nationality = student.nationality || 'N/A';
                  const placeOfBirth = student.place_of_birth || 'N/A';
                  const ageRelaxation = student.age_relaxation || 'N/A';
                  const concessionType = student.concession_type || 'N/A';
                  const concessionPercent = student.concession_percentage !== null ? `${student.concession_percentage}%` : 'N/A';
                  const admissionClass = student.admission_class || 'N/A';
                  const currentClass = student.classes?.name || 'N/A';
                  const sectionName = student.sections?.name || 'N/A';
                  const gender = student.gender ? student.gender.toUpperCase() : 'N/A';
                  const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A';
                  const doa = student.date_of_admission ? new Date(student.date_of_admission).toLocaleDateString() : 'N/A';

                  const outstandingObj = Array.isArray(student.student_outstanding_balance)
                    ? student.student_outstanding_balance[0]
                    : student.student_outstanding_balance;
                  const feeDues = Number(outstandingObj?.total_outstanding || 0);

                  const isActive = student.is_active !== false;

                  return (
                    <tr key={student.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-sm whitespace-nowrap">
                      <td className="p-3 font-medium text-blue-600 font-mono text-xs">
                        {regNo}{rollNo && <span className="text-slate-400 font-normal">{rollNo}</span>}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{vNo}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{fullName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 text-xs">{gender}</td>
                      <td className="p-3 text-slate-500 text-xs">{dob}</td>
                      <td className="p-3 text-slate-600">{father}</td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{fatherCnic}</td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{contact}</td>
                      <td className="p-3 text-slate-600 text-xs max-w-[200px] truncate" title={address}>{address}</td>
                      <td className="p-3 text-slate-600 text-xs">{admissionClass}</td>
                      <td className="p-3 text-slate-700 font-medium">{currentClass}</td>
                      <td className="p-3 text-slate-600 font-medium">{sectionName}</td>
                      <td className="p-3 text-slate-500 text-xs">{doa}</td>
                      <td className={`p-3 text-right font-bold font-mono ${feeDues > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                        Rs. {feeDues.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`badge px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleSendSingleWhatsApp(student)} className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-slate-100 transition-colors" title="Send WhatsApp">
                            <MessageSquare size={16} />
                          </button>
                          <Link to={isAccountant ? `/accountant/students/${student.id}` : `/admin/students/${student.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors" title="View Details">
                            <Eye size={16} />
                          </Link>
                          {!isAccountant && (
                            <>
                              <Link to={`/admin/students/${student.id}/edit`} className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-slate-100 transition-colors" title="Edit Student">
                                <Pencil size={16} />
                              </Link>
                              <button onClick={() => handleDelete(student.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors" title="Deactivate">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 flex-wrap gap-4">
          <div>
            Showing {totalFiltered > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered} entries
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-slate-700 font-medium">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;
