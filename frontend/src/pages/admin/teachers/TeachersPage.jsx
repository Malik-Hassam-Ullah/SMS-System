import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Edit, Eye, Trash2 } from 'lucide-react';
import api from '@/api';
import { useAuthStore } from '@/store/auth.store';
import TeacherModal from './components/TeacherModal';

const TeachersPage = () => {
 const { user } = useAuthStore();
 const isCeo = user?.role === 'ceo';
 const [teachers, setTeachers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [teacherToEdit, setTeacherToEdit] = useState(null);

 const fetchTeachers = async () => {
 try {
 const response = await api.get('/teachers');
 setTeachers(response.data || []);
 } catch (error) {
 console.error('Failed to fetch teachers:', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchTeachers();
 }, []);

 const filteredTeachers = teachers.filter(teacher => {
 const name = teacher.user_profiles?.full_name || '';
 const email = teacher.user_profiles?.email || '';
 return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
 email.toLowerCase().includes(searchTerm.toLowerCase());
 });

 return (
 <div className="p-6">
 <div className="page-header mb-6 flex justify-between items-center">
 <div>
 <h1 className="text-2xl font-bold ">Teachers</h1>
 <p className="text-slate-500">View all assigned teachers</p>
 </div>
 {isCeo && (
 <button onClick={() => { setTeacherToEdit(null); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
 <Plus size={18} /> Add Teacher
 </button>
 )}
 </div>

 <div className="card bg-white border border-slate-200 rounded-lg shadow-sm">
 <div className="p-4 border-b border-slate-200 flex justify-between items-center">
 <div className="relative w-72">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
 <input 
 type="text" 
 placeholder="Search by name or email..." 
 className="input w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="table w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-500 text-sm">
 <th className="p-4 font-medium">Name</th>
 <th className="p-4 font-medium">Employee ID</th>
 <th className="p-4 font-medium">Email</th>
 <th className="p-4 font-medium">Department</th>
 <th className="p-4 font-medium">Status</th>
 <th className="p-4 font-medium text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr>
 <td colSpan="6" className="p-4 text-center text-slate-500">Loading teachers...</td>
 </tr>
 ) : filteredTeachers.length === 0 ? (
 <tr>
 <td colSpan="6" className="p-4 text-center text-slate-500">No teachers found.</td>
 </tr>
 ) : (
 filteredTeachers.map((teacher) => (
 <tr key={teacher.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
 <td className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-purple-300 font-bold text-xs">
 {(teacher.user_profiles?.full_name || 'T').charAt(0)}
 </div>
 <span className="font-medium">{teacher.user_profiles?.full_name || 'N/A'}</span>
 </div>
 </td>
 <td className="p-4 text-slate-600">{teacher.employee_code || 'N/A'}</td>
 <td className="p-4 text-slate-600">{teacher.user_profiles?.email || 'N/A'}</td>
 <td className="p-4 text-slate-600">{teacher.qualification || 'General'}</td>
 <td className="p-4">
 <span className={`badge px-2 py-1 rounded-full text-xs font-medium ${teacher.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
 {teacher.is_active ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="p-4 flex justify-end gap-2">
 <Link to={isCeo ? `/ceo/teachers/${teacher.id}` : `/admin/teachers/${teacher.id}`} className="p-2 text-slate-500 hover:text-blue-400 rounded-md hover:bg-white">
 <Eye size={18} />
 </Link>
 {isCeo && (
 <>
 <button onClick={() => { setTeacherToEdit(teacher); setIsModalOpen(true); }} className="p-2 text-slate-500 hover:text-green-400 rounded-md hover:bg-white">
 <Edit size={18} />
 </button>
 <button className="p-2 text-slate-500 hover:text-red-400 rounded-md hover:bg-white">
 <Trash2 size={18} />
 </button>
 </>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 <TeacherModal 
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 teacherToEdit={teacherToEdit}
 onSuccess={() => {
 setIsModalOpen(false);
 fetchTeachers();
 }}
 />
 </div>
 );
};

export default TeachersPage;
