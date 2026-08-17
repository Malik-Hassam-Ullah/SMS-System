import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/api';

const AddTeacherPage = () => {
 const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
 const navigate = useNavigate();

 const onSubmit = async (data) => {
 try {
 await api.post('/admin/teachers', data);
 navigate('/admin/teachers');
 } catch (error) {
 console.error('Failed to add teacher:', error);
 }
 };

 return (
 <div className="p-6">
 <div className="page-header mb-6 flex items-center gap-4">
 <Link to="/admin/teachers" className="p-2 text-slate-500 hover: rounded-md hover:bg-white transition-colors">
 <ArrowLeft size={20} />
 </Link>
 <div>
 <h1 className="text-2xl font-bold ">Add New Teacher</h1>
 <p className="text-slate-500">Register a new teacher and create their account</p>
 </div>
 </div>

 <div className="card bg-white border border-slate-200 rounded-lg shadow-sm max-w-3xl">
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
 <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
 <input 
 type="text" 
 className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
 {...register('phone')}
 />
 </div>
 </div>

 <h2 className="text-lg font-semibold mb-4 border-b border-slate-200 pb-2">Employment & Account</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
 <div>
 <label className="block text-sm font-medium text-slate-600 mb-1">Email (used for login)</label>
 <input 
 type="email" 
 className={`input w-full px-4 py-2 bg-white border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-md focus:outline-none focus:border-blue-500`}
 {...register('email', { required: 'Email is required' })}
 />
 {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
 <input 
 type="password" 
 className={`input w-full px-4 py-2 bg-white border ${errors.password ? 'border-red-500' : 'border-slate-200'} rounded-md focus:outline-none focus:border-blue-500`}
 {...register('password', { required: 'Password is required' })}
 />
 {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-600 mb-1">Employee ID</label>
 <input 
 type="text" 
 className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
 {...register('employeeId')}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-600 mb-1">Department</label>
 <select 
 className="input w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
 {...register('department')}
 >
 <option value="">Select Department</option>
 <option value="Mathematics">Mathematics</option>
 <option value="Science">Science</option>
 <option value="Languages">Languages</option>
 <option value="Arts">Arts</option>
 <option value="Physical Education">Physical Education</option>
 </select>
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
 <Link to="/admin/teachers" className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md hover:bg-white transition-colors">
 Cancel
 </Link>
 <button 
 type="submit" 
 disabled={isSubmitting}
 className="btn-primary flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
 >
 <Save size={18} />
 {isSubmitting ? 'Creating...' : 'Create Teacher'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

export default AddTeacherPage;
