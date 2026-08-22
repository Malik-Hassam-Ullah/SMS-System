import React, { useState, useEffect } from 'react';
import { Printer, RotateCcw, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeeStructuresPage() {
  const [parentName, setParentName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [docDate, setDocDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB'); // DD/MM/YYYY
  });
  const [className, setClassName] = useState('');

  // Discount values state
  const [discounts, setDiscounts] = useState({
    reg: { c1: '', c2: '', c3: '', c4: '' },
    adm: { c1: '', c2: '', c3: '', c4: '' },
    ann: { c1: '', c2: '', c3: '', c4: '' },
    sec: { c1: '', c2: '', c3: '', c4: '' },
    t4500: { c1: '', c2: '', c3: '', c4: '' },
    t3500: { c1: '', c2: '', c3: '', c4: '' },
    t3000: { c1: '', c2: '', c3: '', c4: '' },
  });

  const handleDiscountChange = (row, child, value) => {
    setDiscounts((prev) => ({
      ...prev,
      [row]: { ...prev[row], [child]: value },
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setParentName('');
    setContactNo('');
    setClassName('');
    setDiscounts({
      reg: { c1: '', c2: '', c3: '', c4: '' },
      adm: { c1: '', c2: '', c3: '', c4: '' },
      ann: { c1: '', c2: '', c3: '', c4: '' },
      sec: { c1: '', c2: '', c3: '', c4: '' },
      t4500: { c1: '', c2: '', c3: '', c4: '' },
      t3500: { c1: '', c2: '', c3: '', c4: '' },
      t3000: { c1: '', c2: '', c3: '', c4: '' },
    });
    toast.success('Form cleared');
  };

  return (
    <div className="min-h-screen bg-slate-200/70 dark:bg-slate-950 py-4 sm:py-8 px-2 sm:px-6 flex flex-col items-center">
      
      {/* ═══════════ TOP ACTION BAR (Hidden in Print) ═══════════ */}
      <div className="w-full max-w-[850px] mb-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-sm no-print">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Official Fee Structure Document</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Active
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Session March 2025 - March 2026 (Grade PG to Grade X)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#00875a] hover:bg-[#00704a] shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* ═══════════ EXACT OFFICIAL DOCUMENT CANVAS ═══════════ */}
      <div className="official-sheet-canvas w-full max-w-[850px] bg-white text-black p-6 sm:p-10 border border-slate-300 shadow-2xl rounded-sm font-serif print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        
        {/* ── 1. HEADER SECTION ── */}
        <div className="flex items-center justify-between pb-2">
          
          {/* Left Brand: The Smart School */}
          <div className="w-[32%] flex items-start gap-2">
            <div className="w-12 h-12 rounded-lg bg-[#b91c1c] flex items-center justify-center text-white font-sans font-black text-2xl shadow-sm shrink-0 border border-red-800">
              @
            </div>
            <div className="leading-none">
              <div className="text-sm font-bold text-[#991b1b] font-serif italic">The</div>
              <div className="text-xl font-black text-[#991b1b] font-serif italic tracking-tight">Smart</div>
              <div className="text-sm font-bold text-[#991b1b] font-serif italic">School</div>
              <div className="text-[10px] text-[#b91c1c] font-serif italic font-semibold mt-1">
                Tomorrow is our Destiny
              </div>
              <div className="text-[9.5px] text-slate-800 font-serif italic font-semibold">
                A Project of <span className="text-[#0369a1] font-bold">The City School</span>
              </div>
            </div>
          </div>

          {/* Center Banner */}
          <div className="w-[42%] text-center flex flex-col items-center">
            {/* Gray Header Pill */}
            <div className="w-full bg-[#9aa0a6] text-black py-1 px-4 rounded-sm border border-slate-400 shadow-sm">
              <h2 className="text-base sm:text-lg font-black font-serif underline tracking-wide text-slate-950 uppercase">
                Fee Structure
              </h2>
            </div>
            {/* School Campus Title */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-serif italic mt-1.5 leading-tight">
              The Smart School Kahuta Campus
            </h3>
            {/* Project subtitle */}
            <p className="text-xs sm:text-sm font-bold font-serif italic text-[#0284c7]">
              A project of <span className="text-[#0284c7] italic">The City School</span>
            </p>
          </div>

          {/* Right Brand: The City School Crest */}
          <div className="w-[26%] flex flex-col items-center text-center">
            {/* Emblem Circle */}
            <div className="w-14 h-14 rounded-full border-2 border-[#1e1b4b] bg-white flex items-center justify-center p-1 relative shadow-sm">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-[#1e1b4b] flex items-center justify-center">
                <span className="text-white font-black text-xs tracking-tighter">TCS</span>
              </div>
            </div>
            <div className="text-[9px] font-black text-[#1e1b4b] font-sans tracking-tight mt-1 uppercase">
              I AM TO LEARN
            </div>
            <div className="text-[8px] text-slate-600 font-sans">
              Since 1978
            </div>
          </div>

        </div>

        {/* ── 2. PARENTS / GUARDIAN META ROW ── */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-sans font-medium pt-3 pb-2 text-slate-900">
          <div className="flex items-center gap-1 w-[45%]">
            <span className="shrink-0 font-semibold">Parents/Guardians’ Name:</span>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full border-b border-black outline-none font-bold text-xs sm:text-sm bg-transparent px-1"
              placeholder="__________________________"
            />
          </div>

          <div className="flex items-center gap-1 w-[30%]">
            <span className="shrink-0 font-semibold">Contact#:</span>
            <input
              type="text"
              value={contactNo}
              onChange={(e) => setContactNo(e.target.value)}
              className="w-full border-b border-black outline-none font-bold text-xs sm:text-sm bg-transparent px-1"
              placeholder="________________"
            />
          </div>

          <div className="flex items-center gap-1 w-[22%]">
            <span className="shrink-0 font-semibold">Date:</span>
            <input
              type="text"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full border-b border-black outline-none font-bold text-xs sm:text-sm bg-transparent px-1"
            />
          </div>
        </div>

        {/* ── 3. ACADEMIC SESSION SHADED BANNER ── */}
        <div className="bg-[#b0b7be] border border-slate-400 py-1 px-2 text-center my-1 rounded-none font-sans">
          <div className="text-xs sm:text-sm font-bold text-slate-950 tracking-wide">
            Fee for Academic Session March 2025 - March 2026
          </div>
          <div className="text-[11px] font-normal text-slate-900">
            ( Grade PG to Grade X )
          </div>
        </div>

        {/* ── 4. MAIN FEE TABLE ── */}
        <div className="w-full mt-1.5 overflow-x-auto">
          <table className="w-full border-collapse border border-black font-sans text-xs sm:text-sm">
            <thead>
              <tr className="bg-white text-black font-bold">
                <th className="border border-black p-2 text-center w-[20%]" rowSpan={2}>
                  Details
                </th>
                <th className="border border-black p-2 text-center w-[20%]" rowSpan={2}>
                  Fee Charges
                </th>
                <th className="border border-black p-1 text-center" colSpan={4}>
                  Recommended by Management
                </th>
                <th className="border border-black p-2 text-center w-[28%]" rowSpan={2}>
                  Remarks
                </th>
              </tr>
              <tr className="bg-white text-black font-bold text-[11px] sm:text-xs">
                <th className="border border-black p-1 text-center w-[8%]">1st Child</th>
                <th className="border border-black p-1 text-center w-[8%]">2nd Child</th>
                <th className="border border-black p-1 text-center w-[8%]">3rd Child</th>
                <th className="border border-black p-1 text-center w-[8%]">4th Child</th>
              </tr>
            </thead>
            <tbody>
              {/* Class Row */}
              <tr>
                <td className="border border-black p-2 font-bold text-center">
                  Class
                </td>
                <td className="border border-black p-2 text-center">
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full text-center border-b border-black outline-none font-bold text-xs sm:text-sm bg-transparent"
                    placeholder="______________"
                  />
                </td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>

              {/* Registration Fee */}
              <tr>
                <td className="border border-black p-2 font-normal">
                  Registration Fee
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  2000
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.reg.c1}
                    onChange={(e) => handleDiscountChange('reg', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.reg.c2}
                    onChange={(e) => handleDiscountChange('reg', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.reg.c3}
                    onChange={(e) => handleDiscountChange('reg', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.reg.c4}
                    onChange={(e) => handleDiscountChange('reg', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-2 text-xs">
                  One Time (Non Refundable)
                </td>
              </tr>

              {/* Admission Fee */}
              <tr>
                <td className="border border-black p-2 font-normal">
                  Admission Fee
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  5000
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.adm.c1}
                    onChange={(e) => handleDiscountChange('adm', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.adm.c2}
                    onChange={(e) => handleDiscountChange('adm', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.adm.c3}
                    onChange={(e) => handleDiscountChange('adm', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.adm.c4}
                    onChange={(e) => handleDiscountChange('adm', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-2 text-xs">
                  One Time (Non Refundable)
                </td>
              </tr>

              {/* Annual Fee */}
              <tr>
                <td className="border border-black p-2 font-normal">
                  Annual Fee
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  5000
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.ann.c1}
                    onChange={(e) => handleDiscountChange('ann', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.ann.c2}
                    onChange={(e) => handleDiscountChange('ann', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.ann.c3}
                    onChange={(e) => handleDiscountChange('ann', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.ann.c4}
                    onChange={(e) => handleDiscountChange('ann', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-2 text-xs">
                  Annually (Non Refundable)
                </td>
              </tr>

              {/* Security Fee */}
              <tr>
                <td className="border border-black p-2 font-normal">
                  Security Fee
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  3000
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.sec.c1}
                    onChange={(e) => handleDiscountChange('sec', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.sec.c2}
                    onChange={(e) => handleDiscountChange('sec', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.sec.c3}
                    onChange={(e) => handleDiscountChange('sec', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.sec.c4}
                    onChange={(e) => handleDiscountChange('sec', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-2 text-xs">
                  One Time (Refundable)
                </td>
              </tr>

              {/* Monthly Tuition Fee (3 Rows) */}
              <tr>
                <td className="border border-black p-2 font-normal align-middle" rowSpan={3}>
                  <div>Monthly Tuition Fee</div>
                  <div className="text-[11px] text-slate-700">(10% annual Increment)</div>
                </td>
                <td className="border border-black p-2 text-center font-bold">
                  <div>4500</div>
                  <div className="text-[10.5px] font-normal text-slate-800">(Pre.IX, IX and X)</div>
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t4500.c1}
                    onChange={(e) => handleDiscountChange('t4500', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t4500.c2}
                    onChange={(e) => handleDiscountChange('t4500', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t4500.c3}
                    onChange={(e) => handleDiscountChange('t4500', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t4500.c4}
                    onChange={(e) => handleDiscountChange('t4500', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-2 text-xs align-middle" rowSpan={3}>
                  Monthly (Non Refundable)
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 text-center font-bold">
                  <div>3500</div>
                  <div className="text-[10.5px] font-normal text-slate-800">(Grade I to VII)</div>
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3500.c1}
                    onChange={(e) => handleDiscountChange('t3500', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3500.c2}
                    onChange={(e) => handleDiscountChange('t3500', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3500.c3}
                    onChange={(e) => handleDiscountChange('t3500', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3500.c4}
                    onChange={(e) => handleDiscountChange('t3500', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 text-center font-bold">
                  <div>3000</div>
                  <div className="text-[10.5px] font-normal text-slate-800">(PG , Nursery and KG)</div>
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3000.c1}
                    onChange={(e) => handleDiscountChange('t3000', 'c1', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3000.c2}
                    onChange={(e) => handleDiscountChange('t3000', 'c2', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3000.c3}
                    onChange={(e) => handleDiscountChange('t3000', 'c3', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
                <td className="border border-black p-1 text-center">
                  <input
                    type="text"
                    value={discounts.t3000.c4}
                    onChange={(e) => handleDiscountChange('t3000', 'c4', e.target.value)}
                    className="w-full text-center outline-none bg-transparent font-medium text-xs"
                  />
                </td>
              </tr>

              {/* Total Fee Charges (Solid Gray Shaded Row across all columns) */}
              <tr className="bg-[#b0b7be]">
                <td className="border border-black p-2 font-black text-black">
                  Total Fee Charges
                </td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 5. NOTE & CHECKLIST ── */}
        <div className="pt-3 pb-2 text-xs sm:text-sm font-sans text-black space-y-1">
          <p className="font-bold">
            Note: Please Submit the Following Documents Along with this Signed Fee Structure and Original Admission Form;
          </p>
          <div className="pl-4 space-y-1 font-normal text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span>➢</span>
              <span>Copy of Child’s Birth Certificate / Copy of Form “B” Issued by NADRA</span>
            </div>
            <div className="flex items-center gap-2">
              <span>➢</span>
              <span>Copy of Result Card of Last Exam</span>
            </div>
            <div className="flex items-center gap-2">
              <span>➢</span>
              <span>School Leaving Certificate</span>
            </div>
            <div className="flex items-center gap-2">
              <span>➢</span>
              <span>3 Passport Size Photograph</span>
            </div>
            <div className="flex items-center gap-2">
              <span>➢</span>
              <span>Copy of Father and Mother ID Card</span>
            </div>
          </div>
        </div>

        {/* ── 6. SIGNATURES ── */}
        <div className="pt-10 pb-6 flex items-end justify-between px-6 font-sans text-xs sm:text-sm font-bold text-black">
          <div className="text-left">
            <div className="mb-1">Admin’s Signature:</div>
            <div className="border-b border-black w-44"></div>
          </div>
          <div className="text-right">
            <div className="mb-1">Parents/Guardians’ Signature:</div>
            <div className="border-b border-black w-56 ml-auto"></div>
          </div>
        </div>

        {/* ── 7. BOTTOM FOOTER RIBBON ── */}
        <div className="bg-[#8c949e] border border-slate-600 text-black text-[11px] sm:text-xs font-semibold py-1 px-3 flex flex-col sm:flex-row items-center justify-between gap-1 font-sans">
          <span>Main Tehsil Road Near PTCL Exchange Kahuta-</span>
          <span>Cell No: +92-334-3311517</span>
          <span>Tel: 051-3311517</span>
        </div>

      </div>

    </div>
  );
}
