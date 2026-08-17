import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '@/api';

const AddStudentPage = () => {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting }, watch } = useForm();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [cnicSearch, setCnicSearch] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const formatCNIC = (value) => {
    if (!value) return value;
    const cnic = value.replace(/[^\d]/g, '');
    const cnicLength = cnic.length;
    if (cnicLength < 6) return cnic;
    if (cnicLength < 13) return `${cnic.slice(0, 5)}-${cnic.slice(5)}`;
    return `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12, 13)}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesRes, feesRes] = await Promise.all([
          api.get('/classes'),
          api.get('/fees/structures')
        ]);
        setClasses(classesRes.data || []);
        setFeeStructures(feesRes.data || []);
      } catch (err) {
        console.error('Failed to load data', err);
      }
    };
    loadData();
  }, []);



  const selectedClassId = watch('classId');
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  const concessionType = watch('concessionType');
  const concessionPercent = watch('concessionPercent') || 0;

  // Calculate Fee
  const classFeeStructure = feeStructures.find(f => f.class_id === selectedClassId);
  const originalFee = classFeeStructure ? classFeeStructure.amount : 0;
  const discountAmount = (originalFee * concessionPercent) / 100;
  const totalFee = originalFee - discountAmount;

  // Update handleCnicSearch to use setValue
  const handleCnicSearch = async () => {
    if (!cnicSearch) return;
    setIsSearching(true);
    try {
      const { data } = await api.get(`/students?search=${cnicSearch}`);
      const filtered = (data || []).filter(s => s.father_cnic === cnicSearch);
      setEnrolledStudents(filtered);

      if (filtered.length > 0) {
        const parent = filtered[0];
        setValue('fatherName', parent.father_name || '');
        setValue('parentPhone', parent.contact_number || '');
        setValue('address', parent.address || '');
        setValue('fatherOccupation', parent.father_occupation || '');
        setValue('fatherStatus', parent.father_status || 'Alive');
        setValue('primaryContactPerson', parent.primary_contact_person || 'Father');
        setValue('parentEmail', parent.parent_email || '');
        setValue('nationality', parent.nationality || '');
        setValue('placeOfBirth', parent.place_of_birth || '');
        setValue('concessionType', parent.concession_type || '');
        setValue('concessionPercent', parent.concession_percentage || '');
        setValue('ageRelaxation', parent.age_relaxation === 'Allowed');
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        full_name: `${data.firstName} ${data.lastName}`.trim(),
        gender: data.gender,
        date_of_birth: data.dateOfBirth || null,
        registration_number: data.admissionNumber,
        current_class_id: data.classId || null,
        current_section_id: data.sectionId || null,
        father_name: data.fatherName || null,
        father_cnic: cnicSearch || null,
        father_occupation: data.fatherOccupation || null,
        father_status: data.fatherStatus || null,
        primary_contact_person: data.primaryContactPerson || null,
        contact_number: data.parentPhone || null,
        parent_email: data.parentEmail || null,
        address: data.address || null,
        nationality: data.nationality || null,
        place_of_birth: data.placeOfBirth || null,
        age_relaxation: data.ageRelaxation ? 'Allowed' : null,
        concession_type: data.concessionType || null,
        concession_percentage: data.concessionPercent ? Number(data.concessionPercent) : null,
        is_active: true
      };
      await api.post('/students', payload);
      navigate('/admin/students');
    } catch (error) {
      console.error('Failed to add student:', error);
      alert(error?.response?.data?.message || 'Failed to add student');
    }
  };

  return (
    <div className="p-6">
      <div className="page-header mb-6 flex items-center gap-4">
        <Link to="/admin/students" className="p-2 text-slate-500 hover: rounded-md hover:bg-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold ">Add New Student</h1>
          <p className="text-slate-500">Register a new student in the system</p>
        </div>
      </div>

      <div className="card bg-white border border-slate-200 rounded-lg shadow-sm max-w-4xl mx-auto">

        {/* CNIC Search Section */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 rounded-t-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Admission Inquiry</h2>
          <div className="flex gap-4 max-w-md">
            <input
              type="text"
              placeholder="Enter Father's CNIC (e.g. 37402-1748145-5)"
              className="input flex-1 px-4 py-2 bg-white border border-slate-300 rounded-full focus:outline-none focus:border-blue-500 shadow-sm"
              value={cnicSearch}
              onChange={(e) => setCnicSearch(formatCNIC(e.target.value))}
              maxLength={15}
            />
            <button
              onClick={handleCnicSearch}
              disabled={isSearching}
              className="bg-blue-500 text-white p-2 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        {/* Enrolled Students Table */}
        {enrolledStudents.length > 0 && (
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Enrolled Students of this CNIC</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm">
                    <th className="p-3 font-semibold rounded-tl-lg">No.</th>
                    <th className="p-3 font-semibold">Roll No.</th>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Class</th>
                    <th className="p-3 font-semibold rounded-tr-lg">Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map((student, idx) => (
                    <tr key={student.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3">{student.roll_number || '-'}</td>
                      <td className="p-3 text-blue-600">{student.full_name}</td>
                      <td className="p-3">{student.classes?.name || '-'}</td>
                      <td className="p-3">{new Date(student.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <h2 className="text-lg font-semibold mb-4 border-b border-slate-200 pb-2">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">First Name</label>
              <input
                type="text"
                className={`input w-full px-4 py-2 bg-white border ${errors.firstName ? 'border-red-500' : 'border-slate-200'} rounded-md focus:outline-none focus:border-blue-500`}
                {...register('firstName', { required: 'First name is required' })}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Last Name</label>
              <input
                type="text"
                className={`input w-full px-4 py-2 bg-white border ${errors.lastName ? 'border-red-500' : 'border-slate-200'} rounded-md focus:outline-none focus:border-blue-500`}
                {...register('lastName', { required: 'Last name is required' })}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Gender</label>
              <select
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('gender', { required: 'Gender is required' })}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Date of Birth</label>
              <input
                type="date"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('dateOfBirth', { required: 'Date of birth is required' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nationality</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('nationality')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Place of Birth</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('placeOfBirth')}
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="ageRelaxation"
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                {...register('ageRelaxation')}
              />
              <label htmlFor="ageRelaxation" className="text-sm font-medium text-slate-600">Age Relaxation Allowed</label>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4 border-b border-slate-200 pb-2">Academic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Admission Number</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('admissionNumber', { required: 'Admission number is required' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Class</label>
              <select
                className={`input w-full px-4 py-2 bg-white border ${errors.classId ? 'border-red-500' : 'border-slate-200'} rounded-md focus:outline-none focus:border-blue-500`}
                {...register('classId', { required: 'Class is required' })}
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.classId && <p className="mt-1 text-sm text-red-500">{errors.classId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Section</label>
              <select
                className={`input w-full px-4 py-2 bg-white border ${errors.sectionId ? 'border-red-500' : 'border-slate-200'} rounded-md focus:outline-none focus:border-blue-500`}
                {...register('sectionId', { required: 'Section is required' })}
                disabled={!selectedClassId || sections.length === 0}
              >
                <option value="">Select Section</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.sectionId && <p className="mt-1 text-sm text-red-500">{errors.sectionId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Parent Email</label>
              <input
                type="email"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('parentEmail', { required: 'Parent email is required' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Parent Phone</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('parentPhone')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold">Guardian Information</h2>
            {enrolledStudents.length > 0 && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                Updates here will automatically apply to all {enrolledStudents.length} enrolled siblings.
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Father's Name</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('fatherName')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Father's Occupation</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('fatherOccupation')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Father's Status</label>
              <select
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('fatherStatus')}
              >
                <option value="Alive">Alive</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Primary Contact Person</label>
              <select
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('primaryContactPerson')}
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Home Mailing Address</label>
              <input
                type="text"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('address')}
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4 border-b border-slate-200 pb-2 bg-slate-100 p-2 rounded-t-md">Concession</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-4 rounded-b-md border border-t-0 border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Concession Type</label>
              <select
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('concessionType')}
              >
                <option value="">Select Type</option>
                <option value="Staff Child">Staff Child</option>
                <option value="Deserving">Deserving</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Discount Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                {...register('concessionPercent')}
              />
            </div>
            <div className="flex flex-col justify-center bg-white p-3 rounded-md border border-slate-200 shadow-sm">
              <div className="flex justify-between text-sm text-slate-500 mb-1">
                <span>Original Fee:</span>
                <span>PKR {originalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-red-500 mb-1">
                <span>Discount:</span>
                <span>- PKR {discountAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-1 mt-1">
                <span>Total Fee:</span>
                <span>PKR {totalFee.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link to="/admin/students" className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md hover:bg-white transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentPage;
