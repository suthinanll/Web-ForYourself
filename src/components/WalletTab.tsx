"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import Tesseract from "tesseract.js";
import {
  PlusCircle,
  Trash2,
  UploadCloud,
  Loader2,
  TrendingUp,
  TrendingDown,
  PieChart,
  Info,
  X,
  CheckCircle2,
  Wallet,
  ArrowRight,
} from "lucide-react";
import {
  showSuccess,
  showError,
  showDeleteConfirm,
  getSwalTheme,
} from "../lib/swalConfig";

interface FinanceRecord {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  slip_url: string | null;
  created_at: string;
}

interface WalletTabProps {
  userId: string;
}

const CATEGORIES = [
  "อาหาร",
  "เดินทาง",
  "ช้อปปิ้ง",
  "ที่อยู่อาศัย",
  "บันเทิง",
  "อื่นๆ",
];
const CATEGORY_COLORS: { [key: string]: string } = {
  อาหาร: "#f87171", // red-400
  เดินทาง: "#60a5fa", // blue-400
  ช้อปปิ้ง: "#f472b6", // pink-400
  ที่อยู่อาศัย: "#fbbf24", // amber-400
  บันเทิง: "#a78bfa", // violet-400
  อื่นๆ: "#94a3b8", // slate-400
};

export default function WalletTab({ userId }: WalletTabProps) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountInput, setAmountInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [recordType, setRecordType] = useState("expense");

  // OCR state
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSlipPreview, setOcrSlipPreview] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRecords();
  }, [userId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching finance records:", message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || isNaN(parseFloat(amountInput))) return;

    try {
      const val = parseFloat(amountInput);
      const { error } = await supabase.from("finance_records").insert({
        user_id: userId,
        amount: val,
        type: recordType,
        category: recordType === "income" ? "รายได้" : selectedCategory,
        slip_url: null,
      });

      if (error) throw error;
      setAmountInput("");

      showSuccess("บันทึกสำเร็จ!", "เพิ่มข้อมูลลงในประวัติการเงินของคุณแล้ว");
      fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showError("บันทึกไม่สำเร็จ", message);
    }
  };

  const handleSaveOcr = async () => {
    if (!amountInput || isNaN(parseFloat(amountInput))) return;

    try {
      const val = parseFloat(amountInput);
      const { error } = await supabase.from("finance_records").insert({
        user_id: userId,
        amount: val,
        type: "expense",
        category: selectedCategory,
        slip_url: "mock_slip_url_scanned",
      });

      if (error) throw error;
      setAmountInput("");
      setOcrSlipPreview(null);
      setOcrSuccess(false);

      showSuccess("บันทึกสลิปสำเร็จ!", "ระบบจำแนกและบันทึกค่าใช้จ่ายแล้ว");
      fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showError("บันทึกไม่สำเร็จ", message);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await showDeleteConfirm(
      "ต้องการลบรายการนี้?",
      "หากลบแล้วจะไม่สามารถกู้คืนได้"
    );

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("finance_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showSuccess("ลบรายการสำเร็จ");
      fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showError("ลบไม่สำเร็จ", message);
    }
  };

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setOcrSlipPreview(reader.result as string);
      setOcrScanning(true);
      setOcrSuccess(false);
      setOcrProgress(0);

      Tesseract.recognize(file, "tha+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      })
        .then(({ data: { text } }) => {
          setOcrScanning(false);
          setOcrSuccess(true);

          console.log("Detailed Detected Text From Tesseract:", text);

          let detectedAmount = 0;
          const lowerTextWithSpaces = text.toLowerCase();
          const lowerTextClean = lowerTextWithSpaces.replace(/\s+/g, "");

          const moneyRegex = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b/g;
          const matches = text.match(moneyRegex);

          if (matches) {
            const numbers = matches
              .map((m) => parseFloat(m.replace(/,/g, "")))
              .filter((n) => n > 0);

            const validAmounts = numbers.filter(
              (n) => n !== 2569 && n !== 2026 && n !== 543 && n < 500000,
            );

            if (validAmounts.length > 0) {
              detectedAmount = validAmounts[0];
            }
          }

          if (detectedAmount === 0 || detectedAmount === 0.0) {
            const anyNumberRegex =
              /(?:จำนวนเงิน|จ่ายแล้ว)[\s\n]*[:\-]*[\s\n]*(\d+)/i;
            const backupMatch = lowerTextWithSpaces.match(anyNumberRegex);
            if (backupMatch && backupMatch[1]) {
              detectedAmount = parseFloat(backupMatch[1]);
            }
          }

          let detectedCategory = "อาหาร";

          if (
            lowerTextClean.includes("เติมเงิน") ||
            lowerTextClean.includes("topup") ||
            lowerTextClean.includes("mymo")
          ) {
            detectedCategory = "บันเทิง";
          } else if (
            lowerTextClean.includes("ค่าไฟ") ||
            lowerTextClean.includes("ค่าน้ำ") ||
            lowerTextClean.includes("กฟภ") ||
            lowerTextClean.includes("กปภ")
          ) {
            detectedCategory = "ที่อยู่อาศัย";
          } else if (
            lowerTextClean.includes("bts") ||
            lowerTextClean.includes("mrt") ||
            lowerTextClean.includes("รถไฟฟ้า") ||
            lowerTextClean.includes("taxi") ||
            lowerTextClean.includes("grab")
          ) {
            detectedCategory = "เดินทาง";
          } else if (
            lowerTextClean.includes("shopee") ||
            lowerTextClean.includes("lazada") ||
            lowerTextClean.includes("ซื้อของ") ||
            lowerTextClean.includes("ช้อป") ||
            lowerTextClean.includes("7-eleven") ||
            lowerTextClean.includes("เซเว่น")
          ) {
            detectedCategory = "ช้อปปิ้ง";
          }

          setAmountInput(detectedAmount > 0 ? detectedAmount.toFixed(2) : "");
          setSelectedCategory(detectedCategory);
          setRecordType("expense");
        })
        .catch((err) => {
          console.error("OCR Error:", err);
          setOcrScanning(false);
          setOcrSuccess(true);
          setAmountInput("");
        });
    };
    reader.readAsDataURL(file);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRecords = records.filter((r) => {
    const date = new Date(r.created_at);
    return (
      date.getMonth() === currentMonth && date.getFullYear() === currentYear
    );
  });

  const totalIncome = monthlyRecords
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = monthlyRecords
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const expenseByCategory: { [key: string]: number } = {};
  CATEGORIES.forEach((cat) => {
    expenseByCategory[cat] = 0;
  });

  monthlyRecords
    .filter((r) => r.type === "expense")
    .forEach((r) => {
      const cat = r.category || "อื่นๆ";
      if (expenseByCategory[cat] !== undefined) {
        expenseByCategory[cat] += r.amount;
      } else {
        expenseByCategory["อื่นๆ"] += r.amount;
      }
    });

  let highestCategory = "";
  let highestAmount = 0;
  CATEGORIES.forEach((cat) => {
    if (expenseByCategory[cat] > highestAmount) {
      highestAmount = expenseByCategory[cat];
      highestCategory = cat;
    }
  });

  let accumulatedPercent = 0;
  const donutSegments = CATEGORIES.map((cat) => {
    const amt = expenseByCategory[cat];
    const pct = totalExpense > 0 ? amt / totalExpense : 0;
    const startPercent = accumulatedPercent;
    accumulatedPercent += pct;
    return {
      category: cat,
      amount: amt,
      percent: pct,
      startPercent,
    };
  }).filter((s) => s.amount > 0);

  return (
    <div className="space-y-6 pb-24 lg:pb-8 text-slate-800 dark:text-slate-200 antialiased">
      {/* Tab Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/60 pb-4">
        <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ระบบการเงิน
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            วิเคราะห์ข้อมูลและสรุปรายรับ-รายจ่าย ประจำเดือนนี้
          </p>
        </div>
      </div>

      {/* Balance Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-gradient-to-br dark:from-emerald-500/[0.02] dark:to-emerald-500/[0.06] p-4 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>รายรับเดือนนี้</span>
          </div>
          <p className="mt-2 text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            +{totalIncome.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-gradient-to-br dark:from-rose-500/[0.02] dark:to-rose-500/[0.06] p-4 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>รายจ่ายเดือนนี้</span>
          </div>
          <p className="mt-2 text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            -
            {totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-gradient-to-br dark:from-indigo-500/[0.02] dark:to-indigo-500/[0.06] p-4 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Wallet className="h-3.5 w-3.5" />
            <span>ยอดเหลือสุทธิ</span>
          </div>
          <p className={`mt-2 text-xl lg:text-2xl font-black tracking-tight ${netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {netBalance >= 0 ? "+" : ""}
            {netBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Summary insights box */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-inner">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {totalExpense > 0 ? (
            <span>
              เดือนนี้คุณใช้จ่ายไปกับหมวดหมู่{" "}
              <strong className="font-semibold text-rose-600 dark:text-rose-400">
                "{highestCategory}"
              </strong>{" "}
              มากที่สุด เป็นจำนวนเงิน{" "}
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {highestAmount.toLocaleString("th-TH")} บาท
              </strong>
            </span>
          ) : (
            <span className="italic text-slate-400 dark:text-slate-500">
              เดือนนี้ยังไม่มีประวัติการบันทึกค่าใช้จ่าย
            </span>
          )}
        </p>
      </div>

      {/* Main Grid: Split chart and input/history on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side (Donut Chart) */}
        {totalExpense > 0 && (
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <PieChart className="h-4 w-4" />
              <span>สัดส่วนค่าใช้จ่ายทั้งหมด</span>
            </div>

            <div className="flex flex-col items-center justify-around gap-6">
              <div className="relative h-40 w-40 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="currentcolor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="3.5"
                  />
                  {donutSegments.map((seg, idx) => {
                    const dashArray = `${seg.percent * 100} ${100 - seg.percent * 100}`;
                    const dashOffset = 100 - seg.startPercent * 100;
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke={CATEGORY_COLORS[seg.category]}
                        strokeWidth="3.5"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    จ่ายรวม
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {totalExpense.toLocaleString("th-TH", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    บาท
                  </span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="grid grid-cols-2 gap-2.5 w-full text-xs">
                {donutSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/40 p-1.5 px-2"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: CATEGORY_COLORS[seg.category] }}
                    />
                    <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                      {seg.category}
                    </span>
                    <span className="ml-auto text-slate-500 dark:text-slate-400 font-bold">
                      {Math.round(seg.percent * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right Side (Input and History) */}
        <div className={`space-y-6 ${totalExpense > 0 ? "lg:col-span-7" : "lg:col-span-12"}`}>
          {/* Slip OCR Scanner Area */}
          <div className="rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-50/[0.2] dark:bg-gradient-to-b dark:from-indigo-500/[0.01] dark:to-indigo-500/[0.03] p-6 text-center shadow-sm">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-300 tracking-wide">
              สแกนใบเสร็จ / สลิปโอนเงิน
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              ประมวลผลยอดเงินและจำแนกหมวดหมู่อัตโนมัติอย่างแม่นยำ
            </p>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleSlipUpload}
              className="hidden"
            />

            {!ocrSlipPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/10 transition-all hover:bg-indigo-500 active:scale-95 cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                อัปโหลดรูปภาพสลิป
              </button>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="relative mx-auto max-w-[140px] overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-md">
                  <img
                    src={ocrSlipPreview}
                    alt="Slip preview"
                    className="h-auto w-full opacity-60 dark:opacity-50"
                  />

                  {ocrScanning && (
                    <div className="absolute left-0 right-0 h-[2px] bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_10px_#818cf8] animate-scan top-0" />
                  )}
                </div>

                {ocrScanning && (
                  <div className="flex flex-col items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <div className="flex items-center gap-2 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      กำลังแปลงข้อความจากสลิป...
                    </div>
                    <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {ocrProgress}% Complete
                    </div>
                  </div>
                )}

                {ocrSuccess && (
                  <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left shadow-lg">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        ตรวจสอบผลลัพธ์ OCR
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                          ยอดเงินที่ตรวจพบ (บาท)
                        </label>
                        <input
                          type="number"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                          ยืนยันหรือเปลี่ยนหมวดหมู่
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategory(cat)}
                              className={`rounded-xl px-2 py-2 text-xs text-center border transition-all ${
                                selectedCategory === cat
                                  ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/10"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 mt-2">
                      <button
                        onClick={handleSaveOcr}
                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
                      >
                        บันทึกรายการ
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setOcrSlipPreview(null);
                          setOcrSuccess(false);
                          setAmountInput("");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Insert Form */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">
              เพิ่มรายการด้วยตนเอง
            </h3>
            <form onSubmit={handleAddManual} className="mt-4 space-y-3.5">
              <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setRecordType("expense")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    recordType === "expense"
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-inner"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  รายจ่าย
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType("income")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    recordType === "income"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-inner"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  รายรับ
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="จำนวนเงิน (บาท)"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium placeholder-slate-400 dark:placeholder-slate-600"
                />
                {recordType === "expense" && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="text-slate-900 dark:text-white bg-white dark:bg-slate-950"
                      >
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl bg-slate-800 dark:bg-slate-800 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-700 active:scale-95 shadow-md cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                บันทึกรายการลงประวัติ
              </button>
            </form>
          </div>

          {/* Transaction History List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">
              ประวัติรายการเงินล่าสุด
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                ยังไม่มีข้อมูลบันทึกทางการเงิน
              </p>
            ) : (
              <div className="space-y-2.5">
                {records.map((rec) => {
                  const isIncome = rec.type === "income";
                  const date = new Date(rec.created_at).toLocaleDateString(
                    "th-TH",
                    {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );

                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 lg:p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-9 w-9 flex items-center justify-center rounded-xl text-sm shrink-0 shadow-sm"
                          style={{
                            backgroundColor: isIncome
                              ? "#10b98115"
                              : `${CATEGORY_COLORS[rec.category || "อื่นๆ"]}15`,
                            color: isIncome
                              ? "#10b981"
                              : CATEGORY_COLORS[rec.category || "อื่นๆ"],
                          }}
                        >
                          {isIncome ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {isIncome ? "รายได้" : rec.category}
                          </h4>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-extrabold tracking-tight ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {rec.amount.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/[0.05] transition-all cursor-pointer"
                          title="ลบรายการ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
