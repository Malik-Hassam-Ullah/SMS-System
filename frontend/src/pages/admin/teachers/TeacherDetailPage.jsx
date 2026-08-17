import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, BookOpen, ChevronDown, ChevronRight, Loader2, Award } from 'lucide-react';
import api from '@/api';

const TeacherDetailPage = () => {
 const { id } = useParams();
 const [teacher, setTeacher] = useState(null);
 const [activeTab, setActiveTab] = useState('profile');
 const [loading, setLoading] = useState(true);

 // Marks View States
 const [expandedAssignment, setExpandedAssignment] = useState(null);
 const [exams, setExams] = useState([]);
 const [selectedExamId, setSelectedExamId] = useState('');
 const [marksData, setMarksData] = useState([]);
 const [loadingMarks, setLoadingMarks] = useState(false);

 useEffect(() => {
  const fetchTeacher = async () => {
    try {
      const response = await api.get(`/teachers/${id}`);
      setTeacher(response.data || null);
    } catch (error) {
      console.error('Failed to fetch teacher:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchTeacher();
 }, [id]);

 useEffect(() => {
   const fetchExams = async () => {
     try {
       const res = await api.get('/exams');
       setExams(res.data || []);
       if (res.data?.length > 0) {
         setSelectedExamId(res.data[0].id);
       }
     } catch (err) {
       console.error("Failed to fetch exams:", err);
     }
   };
   if (activeTab === 'classes') {
     fetchExams();
   }
 }, [activeTab]);

 const handleExpandAssignment = async (assignment) => {
   if (expandedAssignment === assignment.id) {
     setExpandedAssignment(null);
     return;
   }
   setExpandedAssignment(assignment.id);
   fetchMarks(assignment.sections.id, assignment.subjects.id, selectedExamId);
 };

 const fetchMarks = async (sectionId, subjectId, examId) => {
   if (!sectionId || !subjectId || !examId) return;
   setLoadingMarks(true);
   try {
     const res = await api.get('/marks', { params: { section_id: sectionId, subject_id: subjectId, exam_id: examId } });
     setMarksData(res.data || []);
   } catch (err) {
     console.error("Failed to fetch marks", err);
   } finally {
     setLoadingMarks(false);
   }
 };

 // Refetch marks if exam changes
 useEffect(() => {
   if (expandedAssignment && selectedExamId) {
     const assignment = teacher.teacher_assignments.find(a => a.id === expandedAssignment);
     if (assignment) {
       fetchMarks(assignment.sections.id, assignment.subjects.id, selectedExamId);
     }
   }
 }, [selectedExamId]);


 if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
 if (!teacher) return <div className="p-6 text-red-400">Teacher not found</div>;

 return (
 <div className="p-6">
 <div className="page-header mb-6 flex items-center gap-4">
 <Link to="/admin/teachers" className="p-2 text-slate-500 hover:text-blue-500 rounded-md hover:bg-white transition-colors">
 <ArrowLeft size={20} />
 </Link>
 <div>
 <h1 className="text-2xl font-bold ">Teacher Details</h1>
 <p className="text-slate-500">{teacher.employee_code} - {teacher.user_profiles?.full_name}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 {/* Sidebar/Profile Summary */}
 <div className="md:col-span-1">
 <div className="card bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center text-center">
 <div className="w-24 h-24 rounded-full bg-purple-900 flex items-center justify-center text-purple-300 font-bold text-3xl mb-4 uppercase shadow-inner">
 {(teacher.user_profiles?.full_name || 'T').charAt(0)}
 </div>
 <h2 className="text-xl font-bold ">{teacher.user_profiles?.full_name}</h2>
 <p className="text-slate-500 mb-4">{teacher.qualification || 'General'} Department</p>
 
 <span className={`badge px-4 py-1.5 rounded-full text-xs font-bold ${teacher.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
 {teacher.is_active ? 'Active' : 'Inactive'}
 </span>

 <div className="w-full mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4 text-left">
 <div>
 <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Employee ID</p>
 <p className="text-slate-700 font-medium">{teacher.employee_code || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Email</p>
 <p className="text-slate-700 font-medium break-all">{teacher.user_profiles?.email || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Join Date</p>
 <p className="text-slate-700 font-medium">{teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content Tabs */}
 <div className="md:col-span-3">
 <div className="card bg-white border border-slate-200 rounded-lg overflow-hidden min-h-[500px]">
 <div className="flex border-b border-slate-200 bg-slate-50/50">
 <button 
 onClick={() => setActiveTab('profile')}
 className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
 >
 <User size={18} /> Profile
 </button>
 <button 
 onClick={() => setActiveTab('classes')}
 className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'classes' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
 >
 <BookOpen size={18} /> Assigned Classes & Marks
 </button>
 </div>

 <div className="p-6">
 {activeTab === 'profile' && (
 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
 <h3 className="text-lg font-bold text-slate-800 mb-6">Contact Information</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
 <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Phone Number</p>
 <p className="font-semibold text-slate-800 text-lg">{teacher.user_profiles?.phone || 'N/A'}</p>
 </div>
 <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
 <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Gender</p>
 <p className="font-semibold text-slate-800 text-lg">{teacher.user_profiles?.gender || 'N/A'}</p>
 </div>
 <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
 <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">CNIC</p>
 <p className="font-semibold text-slate-800 text-lg">{teacher.user_profiles?.cnic || 'N/A'}</p>
 </div>
 <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
 <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Address</p>
 <p className="font-semibold text-slate-800">{teacher.user_profiles?.address || 'N/A'}</p>
 </div>
 </div>
 </div>
 )}
 
 {activeTab === 'classes' && (
 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
 <div className="flex justify-between items-center mb-6">
   <h3 className="text-lg font-bold text-slate-800">Assigned Classes & Subjects</h3>
   
   <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
     <label className="text-sm font-medium text-slate-600 pl-2">Filter Marks By Exam:</label>
     <select 
       className="input py-1.5 text-sm w-48 border-slate-300 shadow-sm"
       value={selectedExamId}
       onChange={(e) => setSelectedExamId(e.target.value)}
     >
       {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
       {exams.length === 0 && <option value="">No exams available</option>}
     </select>
   </div>
 </div>

 {teacher.teacher_assignments && teacher.teacher_assignments.length > 0 ? (
 <div className="space-y-4">
 {teacher.teacher_assignments.map((assignment, idx) => {
   const isExpanded = expandedAssignment === assignment.id;
   return (
   <div key={idx} className={`bg-white border ${isExpanded ? 'border-blue-300 shadow-md ring-4 ring-blue-50' : 'border-slate-200 shadow-sm'} rounded-xl transition-all duration-200 overflow-hidden`}>
     <button 
       onClick={() => handleExpandAssignment(assignment)}
       className={`w-full p-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
     >
       <div className="flex items-center gap-4">
         <div className={`p-3 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
           <BookOpen size={20} />
         </div>
         <div className="text-left">
           <p className="font-bold text-slate-800 text-lg">{assignment.sections?.classes?.name} - {assignment.sections?.name}</p>
           <p className="text-sm font-medium text-blue-600">{assignment.subjects?.name}</p>
         </div>
       </div>
       <div className={`p-2 rounded-full ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
         {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
       </div>
     </button>

     {isExpanded && (
       <div className="border-t border-slate-200 bg-slate-50 p-6 animate-in slide-in-from-top-2 duration-200">
         <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
           <Award size={18} className="text-yellow-500" />
           Student Marks for {exams.find(e => e.id === selectedExamId)?.name || 'Selected Exam'}
         </h4>
         
         {loadingMarks ? (
           <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500 w-6 h-6" /></div>
         ) : marksData.length === 0 ? (
           <div className="text-center p-8 border border-dashed border-slate-300 rounded-lg bg-white">
             <p className="text-slate-500 font-medium">No marks have been recorded by this teacher for this exam yet.</p>
           </div>
         ) : (
           <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-100 border-b border-slate-200">
                 <tr>
                   <th className="p-3 font-semibold text-slate-700">Roll No</th>
                   <th className="p-3 font-semibold text-slate-700">Student Name</th>
                   <th className="p-3 font-semibold text-slate-700 text-center">Marks Obtained</th>
                   <th className="p-3 font-semibold text-slate-700 text-center">Total Marks</th>
                   <th className="p-3 font-semibold text-slate-700">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {marksData.map(mark => (
                   <tr key={mark.id} className="hover:bg-slate-50">
                     <td className="p-3 font-medium text-slate-600">{mark.students?.roll_number || '-'}</td>
                     <td className="p-3 font-bold text-slate-800">{mark.students?.full_name}</td>
                     <td className="p-3 text-center font-bold text-blue-600">{mark.is_absent ? '-' : mark.marks_obtained}</td>
                     <td className="p-3 text-center font-medium text-slate-500">{mark.subjects?.total_marks || '-'}</td>
                     <td className="p-3">
                       {mark.is_absent ? (
                         <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">ABSENT</span>
                       ) : (
                         <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PRESENT</span>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>
     )}
   </div>
   );
 })}
 </div>
 ) : (
 <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
 <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
 <p className="font-medium text-lg">No classes assigned to this teacher.</p>
 <p className="text-sm">Assignments can be managed by the CEO.</p>
 </div>
 )}
 </div>
 )}
 
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default TeacherDetailPage;
