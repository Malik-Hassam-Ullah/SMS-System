import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '@/api';
import toast from 'react-hot-toast';

const EditStudentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loadingStudent, setLoadingStudent] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm();

    const selectedClassId = watch('current_class_id');
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const sections = selectedClass?.sections || [];

    // Load student + classes on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const [classRes, studentRes] = await Promise.all([
                    api.get('/classes'),
                    api.get(`/students/${id}`),
                ]);

                const classList = classRes?.data || classRes || [];
                setClasses(classList);

                const student = studentRes?.data || studentRes || null;
                if (student) {
                    // Pre-fill the form with existing data
                    reset({
                        full_name: student.full_name || '',
                        father_name: student.father_name || '',
                        father_cnic: student.father_cnic || '',
                        contact_number: student.contact_number || '',
                        gender: student.gender || '',
                        date_of_birth: student.date_of_birth
                            ? student.date_of_birth.substring(0, 10)
                            : '',
                        date_of_admission: student.date_of_admission
                            ? student.date_of_admission.substring(0, 10)
                            : '',
                        address: student.address || '',
                        registration_number: student.registration_number || '',
                        roll_number: student.roll_number || '',
                        voucher_number: student.voucher_number || '',
                        admission_class: student.admission_class || '',
                        current_class_id: student.current_class_id || '',
                        current_section_id: student.current_section_id || '',
                        concession_type: student.concession_type || '',
                        concession_percentage: student.concession_percentage || '',
                        total_outstanding: student.student_outstanding_balance?.length > 0
                            ? student.student_outstanding_balance[0].total_outstanding
                            : (student.student_outstanding_balance?.total_outstanding || 0),
                        nationality: student.nationality || '',
                        place_of_birth: student.place_of_birth || '',
                        age_relaxation: student.age_relaxation === 'Allowed',
                        father_occupation: student.father_occupation || '',
                        father_status: student.father_status || 'Alive',
                        primary_contact_person: student.primary_contact_person || 'Father',
                        parent_email: student.parent_email || '',
                        is_active: student.is_active !== false,
                    });
                }
            } catch (err) {
                console.error('Failed to load data:', err);
                toast.error('Failed to load student data');
            } finally {
                setLoadingStudent(false);
            }
        };
        loadData();
    }, [id, reset]);

    const onSubmit = async (formData) => {
        try {
            const payload = { ...formData };
            if (!payload.date_of_birth) payload.date_of_birth = null;
            if (!payload.date_of_admission) payload.date_of_admission = null;
            if (!payload.current_class_id) payload.current_class_id = null;
            if (!payload.current_section_id) payload.current_section_id = null;

            if (payload.concession_percentage) {
                payload.concession_percentage = Number(payload.concession_percentage);
            } else {
                payload.concession_percentage = null;
            }
            payload.age_relaxation = payload.age_relaxation ? 'Allowed' : null;

            await api.put(`/students/${id}`, payload);
            toast.success('Student updated successfully!');
            navigate(`/admin/students/${id}`);
        } catch (error) {
            console.error('Failed to update student:', error);
            toast.error(error?.response?.data?.message || 'Failed to update student');
        }
    };

    if (loadingStudent) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    const inputClass = (hasError) =>
        `w-full px-4 py-2 bg-white border ${hasError ? 'border-red-400' : 'border-slate-200'
        } rounded-md focus:outline-none focus:border-blue-500 text-sm`;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <Link
                    to={`/admin/students/${id}`}
                    className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Edit Student</h1>
                    <p className="text-slate-500 text-sm">Update student information — fill in any N/A fields</p>
                </div>
            </div>

            <div className="card bg-white border border-slate-200 rounded-lg shadow-sm max-w-3xl">
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">

                    {/* ── Personal Information ── */}
                    <section>
                        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-slate-200 text-slate-700">
                            👤 Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(errors.full_name)}
                                    placeholder="e.g. Ali Hassan"
                                    {...register('full_name', { required: 'Full name is required' })}
                                />
                                {errors.full_name && (
                                    <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Gender
                                </label>
                                <select
                                    className={inputClass(errors.gender)}
                                    {...register('gender')}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    className={inputClass(false)}
                                    {...register('date_of_birth')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Nationality
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. Pakistani"
                                    {...register('nationality')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Place of Birth
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. Islamabad"
                                    {...register('place_of_birth')}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-6">
                                <input
                                    type="checkbox"
                                    id="age_relaxation"
                                    className="w-4 h-4 accent-blue-600"
                                    {...register('age_relaxation')}
                                />
                                <label htmlFor="age_relaxation" className="text-sm font-medium text-slate-600">
                                    Age Relaxation Allowed
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* ── Parent / Guardian Information ── */}
                    <section>
                        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-slate-200 text-slate-700">
                            👨‍👩‍👦 Parent / Guardian Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Father's Name
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. Muhammad Hassan"
                                    {...register('father_name')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Father CNIC
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. 35202-1234567-9"
                                    {...register('father_cnic')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Contact Number
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. 03001234567"
                                    {...register('contact_number')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Parent Email
                                </label>
                                <input
                                    type="email"
                                    className={inputClass(false)}
                                    placeholder="e.g. parent@example.com"
                                    {...register('parent_email')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Father's Occupation
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. Engineer"
                                    {...register('father_occupation')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Father's Status
                                </label>
                                <select
                                    className={inputClass(false)}
                                    {...register('father_status')}
                                >
                                    <option value="Alive">Alive</option>
                                    <option value="Deceased">Deceased</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Primary Contact Person
                                </label>
                                <select
                                    className={inputClass(false)}
                                    {...register('primary_contact_person')}
                                >
                                    <option value="Father">Father</option>
                                    <option value="Mother">Mother</option>
                                    <option value="Guardian">Guardian</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Home Mailing Address
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="Street, City"
                                    {...register('address')}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Academic Information ── */}
                    <section>
                        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-slate-200 text-slate-700">
                            📚 Academic Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Registration Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(errors.registration_number)}
                                    placeholder="e.g. REG-2024-001"
                                    {...register('registration_number', {
                                        required: 'Registration number is required',
                                    })}
                                />
                                {errors.registration_number && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.registration_number.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Roll Number
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. 15"
                                    {...register('roll_number')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Voucher Number (V.No)
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. 1001"
                                    {...register('voucher_number')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Class
                                </label>
                                <select
                                    className={inputClass(false)}
                                    {...register('current_class_id')}
                                >
                                    <option value="">Select Class</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Section
                                </label>
                                <select
                                    className={inputClass(false)}
                                    {...register('current_section_id')}
                                    disabled={!selectedClassId || sections.length === 0}
                                >
                                    <option value="">Select Section</option>
                                    {sections.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Admission Class (label)
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder="e.g. Class 5"
                                    {...register('admission_class')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Date of Admission
                                </label>
                                <input
                                    type="date"
                                    className={inputClass(false)}
                                    {...register('date_of_admission')}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-6">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    className="w-4 h-4 accent-blue-600"
                                    {...register('is_active')}
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-600">
                                    Student is Active
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* ── Concession Information ── */}
                    <section>
                        <h2 className="text-base font-semibold mb-4 pb-2 border-b border-slate-200 text-slate-700">
                            💰 Concession Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Concession Type
                                </label>
                                <select
                                    className={inputClass(false)}
                                    {...register('concession_type')}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Staff Child">Staff Child</option>
                                    <option value="Deserving">Deserving</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Discount Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className={inputClass(false)}
                                    {...register('concession_percentage')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Total Fee / Dues (Rs.)
                                </label>
                                <input
                                    type="number"
                                    className={inputClass(false)}
                                    {...register('total_outstanding')}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Action Buttons ── */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <Link
                            to={`/admin/students/${id}`}
                            className="px-5 py-2 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors text-sm"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditStudentPage;
