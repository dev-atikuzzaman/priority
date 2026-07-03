import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, X, Pencil, Trash2, Check, Flame, Wallet, ListChecks,
  HandCoins, ImagePlus, TrendingUp, TrendingDown, Bell, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

/* ---------------- helpers ---------------- */

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (d) => d.slice(0, 7);
const yearKey = (d) => d.slice(0, 4);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const bnNum = (n) =>
  String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const money = (n) => "৳" + bnNum(Number(n || 0).toLocaleString("en-IN"));

const bnDate = (iso) => {
  const months = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  const d = new Date(iso + "T00:00:00");
  return `${bnNum(d.getDate())} ${months[d.getMonth()]}, ${bnNum(d.getFullYear())}`;
};

const CATEGORY_COLORS = {
  "কাজ": "#E8A33D",
  "স্বাস্থ্য": "#3FA796",
  "ইবাদত": "#8B7FE8",
  "পড়াশোনা": "#5AA9E6",
  "সম্পর্ক": "#E5626E",
  "অন্যান্য": "#8B93A7",
};

const EXPENSE_COLORS = ["#E8A33D", "#3FA796", "#8B7FE8", "#5AA9E6", "#E5626E", "#65C18C", "#D97757", "#8B93A7"];

const DEFAULT_PRIORITIES = [
  { id: uid(), name: "ফজরের নামাজ", category: "ইবাদত", plannedMinutes: 15, time: "05:00", completedDates: {}, streak: 0 },
  { id: uid(), name: "পানি পান (৮ গ্লাস)", category: "স্বাস্থ্য", plannedMinutes: 5, time: "", completedDates: {}, streak: 0 },
  { id: uid(), name: "গভীর কাজ / ফোকাস টাইম", category: "কাজ", plannedMinutes: 90, time: "09:00", completedDates: {}, streak: 0 },
  { id: uid(), name: "বই পড়া", category: "পড়াশোনা", plannedMinutes: 30, time: "21:00", completedDates: {}, streak: 0 },
];

const MOTIVATION = [
  { min: 0, text: "শুরুটা আজই হোক। ছোট এক পা-ই যথেষ্ট।" },
  { min: 25, text: "ভালো শুরু! এভাবেই এগিয়ে যাও।" },
  { min: 50, text: "অর্ধেক পথ পার — এই গতি ধরে রাখো।" },
  { min: 75, text: "চমৎকার! আজকের দিনটা প্রায় জয় করে ফেলেছো।" },
  { min: 100, text: "মাশা'আল্লাহ! আজকের সবকিছু সম্পন্ন। নিজেকে বাহবা দাও।" },
];

/* ---------------- persistence (localStorage) ---------------- */

const STORAGE_PREFIX = "nijer-hishab:";

function useStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });

  const persist = useCallback((next) => {
    setValue(next);
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(next));
    } catch (e) {
      console.error("storage set failed", e);
    }
  }, [key]);

  return [value, persist, true];
}

/* ---------------- shared UI bits ---------------- */

function FAB({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-5 z-20 flex items-center gap-2 rounded-full bg-amber-400 text-slate-900 px-5 py-3 shadow-lg shadow-amber-400/20 active:scale-95 transition"
    >
      <Plus size={20} strokeWidth={2.5} />
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-[#1c2230] rounded-t-3xl sm:rounded-3xl border border-white/5 p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#EDEFF3] font-semibold text-lg" style={{ fontFamily: "'Tiro Bangla', serif" }}>{title}</h3>
          <button onClick={onClose} className="text-[#8B93A7] hover:text-white p-1"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-[#8B93A7] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#14181f] border border-white/10 rounded-xl px-3 py-2.5 text-[#EDEFF3] text-sm outline-none focus:border-amber-400/60";

/* ---------------- Priorities Tab ---------------- */

function ProgressRing({ pct, size = 108 }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#252c3d" strokeWidth="10" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="url(#grad)" strokeWidth="10" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8A33D" />
          <stop offset="100%" stopColor="#3FA796" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PrioritiesTab({ priorities, setPriorities }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", category: "কাজ", plannedMinutes: 15, time: "" });
  const today = todayISO();

  const doneToday = priorities.filter((p) => p.completedDates[today]).length;
  const pct = priorities.length ? Math.round((doneToday / priorities.length) * 100) : 0;
  const motivation = [...MOTIVATION].reverse().find((m) => pct >= m.min)?.text;

  const openAdd = () => { setForm({ name: "", category: "কাজ", plannedMinutes: 15, time: "" }); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm(item); setModal({ mode: "edit", id: item.id }); };

  const save = () => {
    if (!form.name.trim()) return;
    if (modal.mode === "add") {
      setPriorities([...priorities, { id: uid(), name: form.name, category: form.category, plannedMinutes: Number(form.plannedMinutes) || 0, time: form.time, completedDates: {}, streak: 0 }]);
    } else {
      setPriorities(priorities.map((p) => p.id === modal.id ? { ...p, name: form.name, category: form.category, plannedMinutes: Number(form.plannedMinutes) || 0, time: form.time } : p));
    }
    setModal(null);
  };

  const remove = (id) => setPriorities(priorities.filter((p) => p.id !== id));

  const toggleToday = (item) => {
    const done = { ...item.completedDates };
    let streak = item.streak || 0;
    if (done[today]) {
      delete done[today];
      streak = Math.max(0, streak - 1);
    } else {
      done[today] = true;
      streak = streak + 1;
    }
    setPriorities(priorities.map((p) => p.id === item.id ? { ...p, completedDates: done, streak } : p));
  };

  return (
    <div className="px-4 pb-28 pt-5">
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <ProgressRing pct={pct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#EDEFF3]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{bnNum(pct)}%</span>
            <span className="text-[10px] text-[#8B93A7]">{bnNum(doneToday)}/{bnNum(priorities.length)}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-[#c9cee0] max-w-xs">{motivation}</p>
      </div>

      <h2 className="text-[#8B93A7] text-xs uppercase tracking-wider mb-2">আজকের প্রায়োরিটি — {bnDate(today)}</h2>

      <div className="space-y-2.5">
        {priorities.map((p) => {
          const done = !!p.completedDates[today];
          const color = CATEGORY_COLORS[p.category] || "#8B93A7";
          return (
            <div key={p.id} className="flex items-center gap-3 bg-[#1c2230] rounded-2xl p-3.5 border border-white/5">
              <button
                onClick={() => toggleToday(p)}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition"
                style={{ borderColor: color, background: done ? color : "transparent" }}
              >
                {done && <Check size={16} className="text-slate-900" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "text-[#8B93A7] line-through" : "text-[#EDEFF3]"}`}>{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: color + "22", color }}>{p.category}</span>
                  {p.time && <span className="text-[10px] text-[#8B93A7]">{p.time}</span>}
                  {p.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400"><Flame size={11} />{bnNum(p.streak)}</span>
                  )}
                </div>
              </div>
              <button onClick={() => openEdit(p)} className="text-[#8B93A7] p-1.5"><Pencil size={15} /></button>
              <button onClick={() => remove(p.id)} className="text-[#E5626E] p-1.5"><Trash2 size={15} /></button>
            </div>
          );
        })}
        {priorities.length === 0 && (
          <p className="text-center text-[#8B93A7] text-sm py-10">এখনও কোনো প্রায়োরিটি যোগ করা হয়নি।</p>
        )}
      </div>

      <FAB onClick={openAdd} label="নতুন প্রায়োরিটি" />

      {modal && (
        <Modal title={modal.mode === "add" ? "নতুন প্রায়োরিটি" : "প্রায়োরিটি সম্পাদনা"} onClose={() => setModal(null)}>
          <Field label="নাম">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: সকালে হাঁটা" />
          </Field>
          <Field label="ক্যাটাগরি">
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="সময়কাল (মিনিট)">
              <input type="number" className={inputCls} value={form.plannedMinutes} onChange={(e) => setForm({ ...form, plannedMinutes: e.target.value })} />
            </Field>
            <Field label="সময় (ঐচ্ছিক)">
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
          </div>
          <p className="text-[11px] text-[#8B93A7] flex items-center gap-1.5 mb-3"><Bell size={12} /> ব্রাউজারে ট্যাব খোলা থাকলে রিমাইন্ডার নোটিফিকেশন দেখাবে।</p>
          <button onClick={save} className="w-full bg-amber-400 text-slate-900 font-semibold rounded-xl py-2.5 mt-1">সংরক্ষণ করো</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Expenses Tab ---------------- */

function ExpensesTab({ expenses, setExpenses }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ amount: "", category: "খাবার", note: "", date: todayISO(), receipt: null });
  const [range, setRange] = useState("month");
  const [cursor, setCursor] = useState(todayISO());

  const categories = ["খাবার", "যাতায়াত", "বাসাভাড়া", "কেনাকাটা", "স্বাস্থ্য", "বিনোদন", "অন্যান্য"];

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (range === "day") return e.date === cursor;
      if (range === "month") return monthKey(e.date) === monthKey(cursor);
      return yearKey(e.date) === yearKey(cursor);
    });
  }, [expenses, range, cursor]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const pieData = useMemo(() => {
    const map = {};
    filtered.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const barData = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const k = range === "day" ? e.date : monthKey(e.date);
      map[k] = (map[k] || 0) + Number(e.amount);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([k, v]) => ({ label: k.slice(5) || k, value: v }));
  }, [expenses, range]);

  const openAdd = () => { setForm({ amount: "", category: "খাবার", note: "", date: todayISO(), receipt: null }); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm(item); setModal({ mode: "edit", id: item.id }); };

  const save = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    if (modal.mode === "add") {
      setExpenses([{ ...form, id: uid(), amount: Number(form.amount) }, ...expenses]);
    } else {
      setExpenses(expenses.map((e) => e.id === modal.id ? { ...form, amount: Number(form.amount) } : e));
    }
    setModal(null);
  };

  const remove = (id) => setExpenses(expenses.filter((e) => e.id !== id));

  const handleUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, receipt: reader.result }));
    reader.readAsDataURL(file);
  };

  const shiftCursor = (dir) => {
    const d = new Date(cursor + "T00:00:00");
    if (range === "day") d.setDate(d.getDate() + dir);
    else if (range === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCursor(d.toISOString().slice(0, 10));
  };

  return (
    <div className="px-4 pb-28 pt-5">
      <div className="flex gap-2 mb-4">
        {[["day", "দিন"], ["month", "মাস"], ["year", "বছর"]].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)} className={`flex-1 py-2 rounded-xl text-xs font-medium ${range === v ? "bg-amber-400 text-slate-900" : "bg-[#1c2230] text-[#8B93A7]"}`}>{l}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 bg-[#1c2230] rounded-2xl p-3">
        <button onClick={() => shiftCursor(-1)} className="text-[#8B93A7] p-1"><ChevronLeft size={18} /></button>
        <span className="text-sm text-[#EDEFF3] font-medium">{range === "day" ? bnDate(cursor) : range === "month" ? bnNum(monthKey(cursor)) : bnNum(yearKey(cursor))}</span>
        <button onClick={() => shiftCursor(1)} className="text-[#8B93A7] p-1"><ChevronRight size={18} /></button>
      </div>

      <div className="bg-[#1c2230] rounded-2xl p-4 mb-4 border border-white/5">
        <p className="text-xs text-[#8B93A7] mb-1">মোট খরচ</p>
        <p className="text-2xl font-bold text-[#EDEFF3]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(total)}</p>
      </div>

      {pieData.length > 0 && (
        <div className="bg-[#1c2230] rounded-2xl p-4 mb-4 border border-white/5">
          <p className="text-xs text-[#8B93A7] mb-2">ক্যাটাগরি অনুযায়ী</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#14181f", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => money(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((d, i) => (
              <span key={d.name} className="text-[10px] flex items-center gap-1 text-[#c9cee0]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />{d.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {barData.length > 0 && (
        <div className="bg-[#1c2230] rounded-2xl p-4 mb-4 border border-white/5">
          <p className="text-xs text-[#8B93A7] mb-2 flex items-center gap-1"><TrendingUp size={12} /> সাম্প্রতিক প্রবণতা</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252c3d" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#8B93A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8B93A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#14181f", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => money(v)} />
              <Bar dataKey="value" fill="#3FA796" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="text-[#8B93A7] text-xs uppercase tracking-wider mb-2">তালিকা</h2>
      <div className="space-y-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center gap-3 bg-[#1c2230] rounded-2xl p-3.5 border border-white/5">
            {e.receipt && <img src={e.receipt} alt="" className="w-10 h-10 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#EDEFF3] font-medium">{e.note || e.category}</p>
              <p className="text-[10px] text-[#8B93A7]">{e.category} · {bnDate(e.date)}</p>
            </div>
            <p className="text-sm font-semibold text-[#E5626E]">-{money(e.amount)}</p>
            <button onClick={() => openEdit(e)} className="text-[#8B93A7] p-1"><Pencil size={14} /></button>
            <button onClick={() => remove(e.id)} className="text-[#E5626E] p-1"><Trash2 size={14} /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-[#8B93A7] text-sm py-8">এই সময়সীমায় কোনো খরচ নেই।</p>}
      </div>

      <FAB onClick={openAdd} label="খরচ যোগ করো" />

      {modal && (
        <Modal title={modal.mode === "add" ? "নতুন খরচ" : "খরচ সম্পাদনা"} onClose={() => setModal(null)}>
          <Field label="পরিমাণ (৳)">
            <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="০" />
          </Field>
          <Field label="ক্যাটাগরি">
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="নোট (ঐচ্ছিক)">
            <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="কী বাবদ খরচ" />
          </Field>
          <Field label="তারিখ">
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="রসিদ আপলোড (ঐচ্ছিক)">
            <label className="flex items-center gap-2 justify-center border border-dashed border-white/15 rounded-xl py-3 text-[#8B93A7] text-xs cursor-pointer">
              <ImagePlus size={16} />
              {form.receipt ? "ছবি নির্বাচিত হয়েছে — বদলাতে ট্যাপ করো" : "ছবি বেছে নাও"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
            </label>
          </Field>
          <button onClick={save} className="w-full bg-amber-400 text-slate-900 font-semibold rounded-xl py-2.5 mt-1">সংরক্ষণ করো</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Debts Tab ---------------- */

function DebtsTab({ debts, setDebts }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", type: "owe", note: "", date: todayISO() });

  const active = debts.filter((d) => !d.settled);
  const settled = debts.filter((d) => d.settled);

  const iOwe = active.filter((d) => d.type === "owe").reduce((s, d) => s + Number(d.amount), 0);
  const owedToMe = active.filter((d) => d.type === "owed").reduce((s, d) => s + Number(d.amount), 0);

  const openAdd = () => { setForm({ name: "", amount: "", type: "owe", note: "", date: todayISO() }); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm(item); setModal({ mode: "edit", id: item.id }); };

  const save = () => {
    if (!form.name.trim() || !form.amount) return;
    if (modal.mode === "add") {
      setDebts([{ ...form, id: uid(), amount: Number(form.amount), settled: false }, ...debts]);
    } else {
      setDebts(debts.map((d) => d.id === modal.id ? { ...d, ...form, amount: Number(form.amount) } : d));
    }
    setModal(null);
  };

  const remove = (id) => setDebts(debts.filter((d) => d.id !== id));
  const toggleSettled = (id) => setDebts(debts.map((d) => d.id === id ? { ...d, settled: !d.settled, settledDate: !d.settled ? todayISO() : null } : d));

  return (
    <div className="px-4 pb-28 pt-5">
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#1c2230] rounded-2xl p-4 border border-white/5">
          <p className="text-[10px] text-[#8B93A7] flex items-center gap-1 mb-1"><TrendingDown size={12} className="text-[#E5626E]" /> আমি দেব</p>
          <p className="text-lg font-bold text-[#E5626E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(iOwe)}</p>
        </div>
        <div className="bg-[#1c2230] rounded-2xl p-4 border border-white/5">
          <p className="text-[10px] text-[#8B93A7] flex items-center gap-1 mb-1"><TrendingUp size={12} className="text-[#3FA796]" /> আমি পাব</p>
          <p className="text-lg font-bold text-[#3FA796]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(owedToMe)}</p>
        </div>
      </div>

      <h2 className="text-[#8B93A7] text-xs uppercase tracking-wider mb-2">চলমান</h2>
      <div className="space-y-2 mb-6">
        {active.map((d) => (
          <div key={d.id} className="flex items-center gap-3 bg-[#1c2230] rounded-2xl p-3.5 border border-white/5">
            <button onClick={() => toggleSettled(d.id)} className="shrink-0 w-7 h-7 rounded-full border-2 border-[#3FA796] flex items-center justify-center">
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#EDEFF3] font-medium">{d.name}</p>
              <p className="text-[10px] text-[#8B93A7]">{d.type === "owe" ? "আমি দেব" : "আমি পাব"} · {bnDate(d.date)}{d.note ? " · " + d.note : ""}</p>
            </div>
            <p className={`text-sm font-semibold ${d.type === "owe" ? "text-[#E5626E]" : "text-[#3FA796]"}`}>{money(d.amount)}</p>
            <button onClick={() => openEdit(d)} className="text-[#8B93A7] p-1"><Pencil size={14} /></button>
            <button onClick={() => remove(d.id)} className="text-[#8B93A7] p-1"><Trash2 size={14} /></button>
          </div>
        ))}
        {active.length === 0 && <p className="text-center text-[#8B93A7] text-sm py-6">কোনো চলমান হিসাব নেই।</p>}
      </div>

      {settled.length > 0 && (
        <>
          <h2 className="text-[#8B93A7] text-xs uppercase tracking-wider mb-2">শোধ হয়েছে</h2>
          <div className="space-y-2">
            {settled.map((d) => (
              <div key={d.id} className="flex items-center gap-3 bg-[#1c2230]/50 rounded-2xl p-3.5 border border-white/5 opacity-60">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#3FA796] flex items-center justify-center"><Check size={14} className="text-slate-900" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#EDEFF3] line-through">{d.name}</p>
                  <p className="text-[10px] text-[#8B93A7]">শোধ: {bnDate(d.settledDate || d.date)}</p>
                </div>
                <p className="text-sm text-[#8B93A7]">{money(d.amount)}</p>
                <button onClick={() => toggleSettled(d.id)} className="text-[10px] text-amber-400">ফিরিয়ে আনো</button>
                <button onClick={() => remove(d.id)} className="text-[#8B93A7] p-1"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      <FAB onClick={openAdd} label="নতুন হিসাব" />

      {modal && (
        <Modal title={modal.mode === "add" ? "নতুন ধার-দেনা" : "হিসাব সম্পাদনা"} onClose={() => setModal(null)}>
          <Field label="নাম">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ব্যক্তির নাম" />
          </Field>
          <Field label="ধরন">
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...form, type: "owe" })} className={`flex-1 py-2 rounded-xl text-xs font-medium ${form.type === "owe" ? "bg-[#E5626E] text-white" : "bg-[#14181f] text-[#8B93A7]"}`}>আমি দেব</button>
              <button onClick={() => setForm({ ...form, type: "owed" })} className={`flex-1 py-2 rounded-xl text-xs font-medium ${form.type === "owed" ? "bg-[#3FA796] text-white" : "bg-[#14181f] text-[#8B93A7]"}`}>আমি পাব</button>
            </div>
          </Field>
          <Field label="পরিমাণ (৳)">
            <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="তারিখ">
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="নোট (ঐচ্ছিক)">
            <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="কারণ / সম্পদের বিবরণ" />
          </Field>
          <button onClick={save} className="w-full bg-amber-400 text-slate-900 font-semibold rounded-xl py-2.5 mt-1">সংরক্ষণ করো</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- App shell ---------------- */

export default function App() {
  const [priorities, setPriorities] = useStorage("priorities", DEFAULT_PRIORITIES);
  const [expenses, setExpenses] = useStorage("expenses", []);
  const [debts, setDebts] = useStorage("debts", []);
  const [tab, setTab] = useState("priorities");

  const TABS = [
    { id: "priorities", label: "প্রায়োরিটি", icon: ListChecks },
    { id: "expenses", label: "খরচ", icon: Wallet },
    { id: "debts", label: "ধার-দেনা", icon: HandCoins },
  ];

  return (
    <div className="min-h-screen bg-[#14181f]" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <header className="px-5 pt-6 pb-3 sticky top-0 z-10 bg-[#14181f]/90 backdrop-blur-sm border-b border-white/5">
        <h1 className="text-[#EDEFF3] text-xl font-bold" style={{ fontFamily: "'Tiro Bangla', serif" }}>নিজের হিসাব</h1>
        <p className="text-[11px] text-[#8B93A7]">{bnDate(todayISO())}</p>
      </header>

      {tab === "priorities" && <PrioritiesTab priorities={priorities} setPriorities={setPriorities} />}
      {tab === "expenses" && <ExpensesTab expenses={expenses} setExpenses={setExpenses} />}
      {tab === "debts" && <DebtsTab debts={debts} setDebts={setDebts} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1c2230] border-t border-white/5 flex z-20">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex flex-col items-center gap-1 py-3">
              <Icon size={20} color={active ? "#E8A33D" : "#8B93A7"} strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[10px] ${active ? "text-amber-400 font-medium" : "text-[#8B93A7]"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
