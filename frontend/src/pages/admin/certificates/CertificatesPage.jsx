import React, { useState, useEffect } from 'react';
import { Search, FileText, Printer, CheckCircle, Award, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import api from '../../../lib/api';

const CertificatesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [student, setStudent] = useState(null);
  const [certificateType, setCertificateType] = useState('character');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formatDateWithHyphens = (dateVal) => {
    if (!dateVal || dateVal === 'N/A') return 'N/A';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return dateVal;
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/students', { params: { search: searchQuery, limit: 10 } });
        setSearchResults(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSelectStudent = (selected) => {
    setStudent({
      id: selected.id,
      name: selected.full_name,
      class: selected.classes?.name || 'N/A',
      section: selected.sections?.name || 'N/A',
      rollNo: selected.roll_number || 'N/A',
      admissionDate: selected.created_at ? new Date(selected.created_at).toLocaleDateString() : 'N/A',
      fatherName: selected.father_name || 'N/A',
      status: selected.is_active ? 'Active' : 'Inactive',
      registrationNumber: selected.registration_number,
      admissionClass: selected.admission_class || 'N/A',
      dob: selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A',
      admissionDateFormatted: selected.date_of_admission ? new Date(selected.date_of_admission).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A',
      admissionYear: selected.date_of_admission ? new Date(selected.date_of_admission).getFullYear() : 'N/A',
      gender: selected.gender || 'male',
      rawDob: selected.date_of_birth,
      rawAdmissionDate: selected.date_of_admission
    });
    setSearchQuery(selected.full_name);
    setSearchResults([]);
    setShowPreview(false);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowPreview(true);
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="page-header print:hidden">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="h-7 w-7 text-purple-600" /> Certificates Generation
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Generate and print official certificates for students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <div className="card p-6 bg-white rounded-xl shadow-sm border border-slate-200 relative z-20">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-500" /> Find Student
            </h2>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Student Name or Reg No.</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (student) setStudent(null);
                    setShowPreview(false);
                  }}
                  placeholder="e.g. John Doe or REG-123"
                  className="input w-full pr-10 bg-slate-50 border-slate-200"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{s.full_name}</p>
                        <p className="text-xs text-slate-500 font-medium">{s.registration_number} • {s.classes?.name} - {s.sections?.name}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {student && (
            <div className="card p-6 bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-2 relative z-10">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" /> Document Details
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Select Certificate</label>
                  <select
                    value={certificateType}
                    onChange={(e) => {
                      setCertificateType(e.target.value);
                      setShowPreview(false);
                    }}
                    className="input w-full bg-slate-50 border-slate-200"
                  >
                    <option value="character">Character Certificate</option>
                    <option value="leaving">School Leaving Certificate</option>
                    <option value="bonafide">Bonafide Certificate</option>
                    <option value="transfer">Transfer Certificate</option>
                  </select>
                </div>

                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Name:</span>
                    <span className="font-bold text-slate-800">{student.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Class/Sec:</span>
                    <span className="font-bold text-slate-800">{student.class} - {student.section}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Admission:</span>
                    <span className="font-bold text-slate-800">{student.admissionDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {student.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                  {isGenerating ? 'Generating Draft...' : 'Generate Certificate'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {showPreview ? (
            <div className="card p-0 bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden min-h-[700px] flex flex-col relative z-0 animate-in fade-in zoom-in-95">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  Print Preview <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 animate-pulse">💡 Click any text to edit/type</span>
                </span>
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2 px-6">
                  <Printer className="h-4 w-4" /> Print Document
                </button>
              </div>

              <div className="flex-1 p-12 print:p-8 print:m-0 bg-white print-section">
                {/* Certificate Design */}
                <div className="p-10 relative">
                  {/* Logo & Campus */}
                  <div className="flex flex-col items-center mb-8">
                    <img src="/tss-logo.png" alt="The Smart School" className="w-56 object-contain" />
                    <h2 className="text-3xl font-extrabold tracking-wide text-black uppercase font-sans -mt-4">
                      KAHUTA CAMPUS
                    </h2>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-10">
                    <h1 className="inline-block text-3xl font-extrabold uppercase tracking-wider text-[#0f294a] font-serif border-b-2 border-slate-300 pb-1" style={{ textShadow: '0.5px 0.5px 0px #d4af37, -0.5px -0.5px 0px #d4af37' }}>
                      {certificateType === 'character' && 'Character Certificate'}
                      {certificateType === 'leaving' && 'School Leaving Certificate'}
                      {certificateType === 'bonafide' && 'Bonafide Certificate'}
                      {certificateType === 'transfer' && 'Transfer Certificate'}
                    </h1>
                  </div>

                  {/* Form & Ref No */}
                  <div className="flex justify-between items-center font-medium text-slate-900 mb-10 px-4 text-lg">
                    <span>Form No: <span contentEditable suppressContentEditableWarning className="border-b border-slate-900 px-2 font-bold focus:outline-none">{student?.rawAdmissionDate ? new Date(student.rawAdmissionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: '2-digit' }).replace(/ /g, '') : 'N/A'}/{student?.id ? student.id.slice(0, 4) : '1732'}</span></span>
                    <span>Rf. No: <span contentEditable suppressContentEditableWarning className="border-b border-slate-900 px-2 font-bold focus:outline-none">{certificateType === 'leaving' ? 'SLC' : certificateType === 'character' ? 'CC' : certificateType === 'transfer' ? 'TC' : 'BC'}{student?.rollNo || '065'}</span></span>
                  </div>

                  {/* Certify Header */}
                  <div className="text-center mb-8">
                    <p className="text-lg font-bold tracking-wide text-slate-900 font-serif">THIS IS TO CERTIFY THAT;</p>
                  </div>

                  {/* Student & Father Name Line */}
                  <div className="flex justify-between items-end border-b border-slate-900 pb-1 mb-8 px-4 text-lg font-serif">
                    <div contentEditable suppressContentEditableWarning className="w-[45%] text-center font-bold text-xl text-slate-900 focus:outline-none">
                      {student?.name}
                    </div>
                    <div contentEditable suppressContentEditableWarning className="w-[10%] text-center text-slate-600 font-medium focus:outline-none">
                      {student?.gender === 'female' ? 'D/O' : 'S/O'}
                    </div>
                    <div contentEditable suppressContentEditableWarning className="w-[45%] text-center font-bold text-xl text-slate-900 focus:outline-none">
                      {student?.fatherName}
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="space-y-6 text-lg leading-loose text-slate-900 font-serif">
                    {certificateType === 'leaving' && (
                      <>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          was admitted to the school on <span className="font-bold border-b border-slate-900 px-2">{formatDateWithHyphens(student?.rawAdmissionDate)}</span> in <span className="font-bold border-b border-slate-900 px-2">{student?.admissionClass}</span> and left on <span className="font-bold border-b border-slate-900 px-2">{formatDateWithHyphens(new Date())}</span>.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          At the time of leaving, the student was studying in Grade <span className="font-bold border-b border-slate-900 px-8">{student?.class}</span>.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          All sums due to this school on {student?.gender === 'female' ? 'her' : 'his'} account have been paid. {student?.gender === 'female' ? 'Her' : 'His'} date of birth according to the admission register is <span className="font-bold border-b border-slate-900 px-2">{formatDateWithHyphens(student?.rawDob)}</span>.
                        </p>
                      </>
                    )}

                    {certificateType === 'character' && (
                      <>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          has studied in this Institution from <span className="font-bold border-b border-slate-900 px-2">{student?.admissionYear}</span> to <span className="font-bold border-b border-slate-900 px-2">{new Date().getFullYear()}</span> and Passed Grade <span className="font-bold border-b border-slate-900 px-2">{student?.class}</span>.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          During {student?.gender === 'female' ? 'her' : 'his'} stay at the school {student?.gender === 'female' ? 'her' : 'his'} conduct and behavior remained excellent.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          {student?.gender === 'female' ? 'She' : 'He'} bears good moral character. We wish {student?.gender === 'female' ? 'her' : 'him'} success in {student?.gender === 'female' ? 'her' : 'his'} future career.
                        </p>
                      </>
                    )}

                    {certificateType === 'bonafide' && (
                      <>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          is a bonafide student of this institution. {student?.gender === 'female' ? 'She' : 'He'} is studying in Grade <span className="font-bold border-b border-slate-900 px-2">{student?.class}</span> under Roll No <span className="font-bold border-b border-slate-900 px-2">{student?.rollNo}</span>.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          To the best of our knowledge, {student?.gender === 'female' ? 'she' : 'he'} bears a good moral character. We wish {student?.gender === 'female' ? 'her' : 'him'} success in {student?.gender === 'female' ? 'her' : 'his'} future studies.
                        </p>
                      </>
                    )}

                    {certificateType === 'transfer' && (
                      <>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          was a student of this institution in Grade <span className="font-bold border-b border-slate-900 px-8">{student?.class}</span> under Roll No <span className="font-bold border-b border-slate-900 px-2">{student?.rollNo}</span>.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          {student?.gender === 'female' ? 'She' : 'He'} is being transferred to <span className="font-bold border-b border-slate-900 px-4">________________________</span> Branch of The Smart School at the request of {student?.gender === 'female' ? 'her' : 'his'} parents/guardians.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          All dues of this school on {student?.gender === 'female' ? 'her' : 'his'} account have been cleared up to <span className="font-bold border-b border-slate-900 px-2">{formatDateWithHyphens(new Date())}</span>.
                        </p>
                        <p contentEditable suppressContentEditableWarning className="text-justify focus:outline-none">
                          During {student?.gender === 'female' ? 'her' : 'his'} stay at the school {student?.gender === 'female' ? 'her' : 'his'} conduct and behavior remained excellent. We wish {student?.gender === 'female' ? 'her' : 'him'} success in {student?.gender === 'female' ? 'her' : 'his'} future studies.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Footer Signatures & Stamp */}
                  <div className="flex justify-between items-end mt-28 px-4 font-serif">
                    <div className="space-y-6">
                      <div className="w-48 border-b border-slate-900"></div>
                      <p contentEditable suppressContentEditableWarning className="font-bold text-slate-900 focus:outline-none">School Head</p>
                      <p className="font-medium text-slate-900">Dated: <span contentEditable suppressContentEditableWarning className="border-b border-slate-900 px-2 focus:outline-none">{new Date().toLocaleDateString('en-GB')}</span></p>
                    </div>
                    <div className="w-36 h-36 border border-slate-300 rounded flex flex-col justify-end items-center pb-2 bg-slate-50/30">
                      <span className="text-xs text-slate-400 font-medium">School Stamp</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card h-full min-h-[700px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 print:hidden rounded-xl">
              <Printer className="h-16 w-16 mb-4 text-slate-300" />
              <p className="text-xl font-bold text-slate-500">Document Preview</p>
              <p className="text-sm mt-1 font-medium">Select a student and generate to view certificate</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide all non-printable elements */
          aside, 
          header, 
          .page-header, 
          .print\\:hidden,
          .lg\\:col-span-4 {
            display: none !important;
          }

          /* Reset layout containers to allow natural page flow and printing */
          .layout-root, 
          .layout-root > div,
          main, 
          .grid, 
          .lg\\:col-span-8, 
          .card {
            display: block !important;
            position: static !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Style the certificate container for printing */
          .print-section {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}} />
    </div>
  );
};

export default CertificatesPage;
