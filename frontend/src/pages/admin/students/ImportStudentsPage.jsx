import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, File, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import api from '@/api';

const ImportStudentsPage = () => {
 const [file, setFile] = useState(null);
 const [importing, setImporting] = useState(false);
 const [result, setResult] = useState(null);
 const navigate = useNavigate();

 const handleFileChange = (e) => {
 if (e.target.files && e.target.files.length > 0) {
 setFile(e.target.files[0]);
 setResult(null);
 }
 };

  const handleDownloadTemplate = (e) => {
    e.preventDefault();
    const csvLines = [
      'Grade: PlayGroup/A',
      'V.No,Roll No.,Name,Fee,Annual Charges,Reg; Charges,Previous Balance,Total Fee,Reg:NO,Father Name,Father CNIC,Contact No. 1,Gander,Date of Birth,Date of admission,Admission in Class,Address',
      '1001,2301,Zainab Fatima,3000,,,0,3000,892,Abdul Rehman,37402-7679242-7,03408476686,F,29/11/2021,14/02/2026,Play Group,Kahuta',
      '1002,2302,Muhammad Zayyan Ali,2700,,,0,2700,896,Muhammad Mubashir,37402-9563094-1,03468923765,M,18/02/2022,24/02/2026,Play Group,Kahuta',
      ',, Total,5700,0,0,0,5700,,,,,,,,,,,,',
      '',
      'Grade: Nursery/A',
      'V.No,Roll No.,Name,Fee,Annual Charges,Reg; Charges,Previous Balance,Total Fee,Reg:NO,Father Name,Father CNIC,Contact No. 1,Gander,Date of Birth,Date of admission,Admission in Class,Address',
      '2001,2201,Malik Aban Sohail,2700,,,5200,7900,734,Sohail Tariq,37402-7070925-3,03434680400,M,01/11/2021,13/03/2025,Nursery,Kahuta',
    ];
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvLines.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "fee_challan_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 const handleImport = async () => {
 if (!file) return;

 setImporting(true);
 setResult(null);
 const formData = new FormData();
 formData.append('file', file);

 try {
 const response = await api.post('/import/students?action=import', formData, { timeout: 120000 });
 setResult({
 success: true,
 message: `Imported ${response.data.imported?.length ?? response.data.summary?.imported ?? 0} students successfully!`,
 count: response.data.imported?.length ?? response.data.summary?.imported ?? 0,
 });
 } catch (error) {
 const message = error?.response?.data?.detail
 || error?.response?.data?.message
 || error?.response?.data?.error
 || error?.message
 || 'Import failed. Please check your file format and try again.';
 setResult({ success: false, message });
 } finally {
 setImporting(false);
 }
 };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL student data for this branch? This action cannot be undone!')) return;
    try {
      setImporting(true);
      const res = await api.delete('/students/bulk/clear-all');
      setResult({
        success: true,
        message: res.data?.message || 'All student records deleted successfully!',
        count: 0,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error?.response?.data?.message || 'Failed to clear student records.',
      });
    } finally {
      setImporting(false);
    }
  };

 return (
 <div className="p-6">
 <div className="page-header mb-6 flex items-center gap-4">
 <Link to="/admin/students" className="p-2 text-slate-500 hover: rounded-md hover:bg-white transition-colors">
 <ArrowLeft size={20} />
 </Link>
 <div>
 <h1 className="text-2xl font-bold ">Import Students</h1>
 <p className="text-slate-500">Upload a CSV or Excel file to bulk add students</p>
 </div>
 </div>

 <div className="card bg-white border border-slate-200 rounded-lg shadow-sm max-w-3xl">
 <div className="p-6">
 
 {result && (
 <div className={`mb-6 p-4 rounded-md flex items-start gap-3 ${result.success ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
 {result.success ? <CheckCircle className="text-green-500 mt-0.5" size={20} /> : <AlertTriangle className="text-red-500 mt-0.5" size={20} />}
 <div>
 <h3 className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
 {result.success ? 'Action Successful' : 'Action Failed'}
 </h3>
 <p className="text-sm text-slate-600 mt-1">{result.message}</p>
 {result.success && result.count > 0 && (
 <p className="text-sm text-green-300 mt-2">Successfully imported {result.count} students.</p>
 )}
 </div>
 </div>
 )}

 <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50/50 transition-colors relative">
 <input 
 type="file" 
 accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 onChange={handleFileChange}
 disabled={importing}
 />
 
 {file ? (
 <>
 <File size={48} className="text-blue-500 mb-4" />
 <h3 className="text-lg font-medium mb-2">{file.name}</h3>
 <p className="text-sm text-slate-500">
 {(file.size / 1024).toFixed(2)} KB
 </p>
 <button 
 onClick={(e) => { e.preventDefault(); setFile(null); }}
 className="mt-4 text-sm text-red-400 hover:text-red-300 z-10 relative"
 >
 Remove file
 </button>
 </>
 ) : (
 <>
 <UploadCloud size={48} className="text-slate-400 mb-4" />
 <h3 className="text-lg font-medium mb-2">Click or drag file to this area to upload</h3>
 <p className="text-sm text-slate-500 max-w-md">
 Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.
 </p>
 <p className="text-xs text-slate-400 mt-4">Supported formats: .csv, .xlsx, .xls</p>
 </>
 )}
 </div>

 <div className="mt-6">
 <h4 className="text-sm font-medium mb-2">Instructions:</h4>
            <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
              <li>Supports standard flat CSV/Excel files and multi-section Fee Challan sheets (with <code className="bg-slate-100 px-1 py-0.5 rounded">Grade: Class/Section</code> headers).</li>
              <li>Expected columns: <code className="bg-slate-100 px-1 py-0.5 rounded">V.No, Roll No., Name, Fee, Reg:NO, Father Name, Father CNIC, Contact No. 1, Gander, Date of Birth, Date of admission, Admission in Class, Address</code>.</li>
              <li>If <code className="bg-slate-100 px-1 py-0.5 rounded">Reg:NO</code> is missing for a student, a registration number is automatically generated from <code className="bg-slate-100 px-1 py-0.5 rounded">Roll No.</code> or <code className="bg-slate-100 px-1 py-0.5 rounded">V.No</code>.</li>
              <li>Supports standard date formats (<code className="bg-slate-100 px-1 py-0.5 rounded">DD/MM/YYYY</code> or <code className="bg-slate-100 px-1 py-0.5 rounded">YYYY-MM-DD</code>).</li>
            </ul>
 <a href="#" onClick={handleDownloadTemplate} className="text-sm text-blue-400 hover:underline mt-2 inline-block">Download Template file</a>
 </div>

 <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
 <button
              onClick={handleClearAll}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
              title="Delete all student records for this branch"
            >
              <Trash2 size={18} />
              Clear Existing Data
            </button>
            <div className="flex gap-3">
 <Link to="/admin/students" className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md hover:bg-white transition-colors">
 Cancel
 </Link>
 <button 
 onClick={handleImport}
 disabled={!file || importing}
 className="btn-primary flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
 >
 {importing ? 'Importing...' : 'Start Import'}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default ImportStudentsPage;
