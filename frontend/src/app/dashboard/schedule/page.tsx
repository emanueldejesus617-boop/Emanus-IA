"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, ArrowLeft, ArrowRight } from "lucide-react";

type ScheduleRow = {
  time: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DAY_COLORS: Record<DayKey, string> = {
  monday:    "bg-primary/10 text-primary",
  tuesday:   "bg-secondary/10 text-secondary",
  wednesday: "bg-accent/10 text-accent",
  thursday:  "bg-primary/10 text-primary",
  friday:    "bg-secondary/10 text-secondary",
  saturday:  "bg-danger/10 text-danger",
  sunday:    "bg-[#8350e8]/10 text-[#8350e8]",
};


const SunriseIcon = () => (
  <svg className="w-10 h-10 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sunriseGrad" x1="24" y1="8" x2="24" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF8A00" />
        <stop offset="100%" stopColor="#FFC700" />
      </linearGradient>
      <linearGradient id="seaGrad" x1="24" y1="32" x2="24" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00C896" />
        <stop offset="100%" stopColor="#0052FF" />
      </linearGradient>
    </defs>
    <line x1="24" y1="6" x2="24" y2="10" stroke="#FF8A00" strokeWidth="3" strokeLinecap="round" />
    <line x1="11.27" y1="11.27" x2="14.1" y2="14.1" stroke="#FF8A00" strokeWidth="3" strokeLinecap="round" />
    <line x1="36.73" y1="11.27" x2="33.9" y2="14.1" stroke="#FF8A00" strokeWidth="3" strokeLinecap="round" />
    <path d="M12 32C12 25.3726 17.3726 20 24 20C30.6274 20 36 25.3726 36 32H12Z" fill="url(#sunriseGrad)" />
    <path d="M8 32H40" stroke="#8892A4" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 37C18 37 20 35 24 35C28 35 30 37 34 37" stroke="url(#seaGrad)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const AfternoonIcon = () => (
  <svg className="w-10 h-10 shrink-0 animate-[spin_60s_linear_infinite]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sunGrad" x1="24" y1="12" x2="24" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB800" />
        <stop offset="100%" stopColor="#FF7A00" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="12" fill="url(#sunGrad)" />
    <path d="M24 6V9" stroke="#FFB800" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M24 39V42" stroke="#FF7A00" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M6 24H9" stroke="#FFB800" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M39 24H42" stroke="#FF7A00" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M11.27 11.27l2.12 2.12" stroke="#FFB800" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M34.61 34.61l2.12 2.12" stroke="#FF7A00" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M11.27 36.73l2.12-2.12" stroke="#FFB800" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M34.61 13.39l2.12-2.12" stroke="#FF7A00" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

const NightIcon = () => (
  <svg className="w-10 h-10 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="moonGrad" x1="16" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8350E8" />
        <stop offset="50%" stopColor="#0052FF" />
        <stop offset="100%" stopColor="#00C896" />
      </linearGradient>
      <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFF" />
        <stop offset="100%" stopColor="#FFB800" />
      </linearGradient>
    </defs>
    <path d="M34 32C25.1634 32 18 24.8366 18 16C18 13.7912 18.446 11.6865 19.252 9.77093C13.882 11.5369 10 16.618 10 22.5833C10 30.5456 16.4544 37 24.4167 37C30.382 37 35.4631 33.118 37.2291 27.748C35.3135 28.554 33.2088 29 31 29" fill="url(#moonGrad)" />
    <path d="M34 10L35 12L37 13L35 14L34 16L33 14L31 13L33 12Z" fill="url(#starGrad)" className="animate-pulse" />
    <path d="M40 18L40.5 19L41.5 19.5L40.5 20L40 21L39.5 20L38.5 19.5L39.5 19Z" fill="url(#starGrad)" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
  </svg>
);

const SHIFT_OPTIONS = [
  {
    id: "morning",
    label: "Manhã",
    time: "07:00 – 12:30",
    icon: <SunriseIcon />,
    description: "Tempo livre: tarde e noite",
  },
  {
    id: "afternoon",
    label: "Tarde",
    time: "13:00 – 18:00",
    icon: <AfternoonIcon />,
    description: "Tempo livre: manhã e noite",
  },
  {
    id: "night",
    label: "Noite",
    time: "18:30 – 23:00",
    icon: <NightIcon />,
    description: "Tempo livre: manhã e tarde",
  },
];

export default function SchedulePage() {
  const [step, setStep] = useState<"select-shift" | "table">("select-shift");
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleRow[] | null>(null);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ScheduleRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: DayKey } | null>(null);
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const loadSchedule = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/schedule/current", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.weekData) {
          setScheduleData(data.weekData);
          setEditData(JSON.parse(JSON.stringify(data.weekData)));
          setStep("table");
        }
      }
    } catch (err) {
      console.error("Error loading schedule:", err);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    if (editMode && editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell, editMode]);

  useEffect(() => {
    if (editMode && editingTime !== null && timeInputRef.current) {
      timeInputRef.current.focus();
      timeInputRef.current.select();
    }
  }, [editingTime, editMode]);

  const handleTimeChange = (rowIdx: number, value: string) => {
    setEditData((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], time: value };
      return updated;
    });
  };

  const handleGenerate = async () => {
    if (!selectedShift) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shift: selectedShift }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar horário.");
      if (data.weekData) {
        setScheduleData(data.weekData);
        setEditData(JSON.parse(JSON.stringify(data.weekData)));
        setStep("table");
      }
    } catch (err: any) {
      setError(err.message || "Erro de ligação ao servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCellChange = (rowIdx: number, col: DayKey, value: string) => {
    setEditData((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [col]: value };
      return updated;
    });
  };

  const handleSaveEdits = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/schedule/update", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weekData: editData }),
      });
      if (!res.ok) throw new Error("Falha ao guardar.");
      setScheduleData(JSON.parse(JSON.stringify(editData)));
      setEditMode(false);
      setEditingCell(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao guardar edições.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData(JSON.parse(JSON.stringify(scheduleData!)));
    setEditMode(false);
    setEditingCell(null);
    setEditingTime(null);
  };

  const handleRegenerate = () => {
    setStep("select-shift");
    setSelectedShift(null);
    setScheduleData(null);
    setEditData([]);
    setEditMode(false);
  };

  const shiftLabel = SHIFT_OPTIONS.find((s) => s.id === selectedShift)?.label?.toLowerCase() || "";

  // ── SHIFT SELECTION ──────────────────────────────────────────────────────
  if (step === "select-shift") {
    return (
      <div className="p-8 pb-20 max-w-2xl mx-auto">
        <header className="mb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 border border-primary/20 shadow-[0_0_20px_rgba(0,255,136,0.1)] mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text">Horário Inteligente</h1>
          <p className="mt-3 text-muted text-sm max-w-sm mx-auto leading-relaxed">
            Para criar o teu plano de estudos ideal, precisamos de saber em que
            {" "}<strong className="text-text">turno</strong> frequentas a escola.
          </p>
        </header>

        <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-5 text-center">
            Qual é o teu turno escolar?
          </p>

          <div className="grid grid-cols-1 gap-3 mb-6">
            {SHIFT_OPTIONS.map((option) => {
              const isSelected = selectedShift === option.id;
              return (
                <button
                  key={option.id}
                  id={`shift-${option.id}`}
                  onClick={() => setSelectedShift(option.id)}
                  className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer
                    ${isSelected
                      ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(0,255,136,0.12)]"
                      : "border-surface hover:border-primary/30 hover:bg-dark/50"
                    }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-dark/30 border border-surface/50 shadow-sm p-1.5 transition-transform group-hover:scale-105">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-base ${isSelected ? "text-primary" : "text-text"}`}>
                        {option.label}
                      </span>
                      <span className="text-xs text-muted border border-surface rounded-full px-2 py-0.5">
                        {option.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{option.description}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${isSelected ? "border-primary bg-primary" : "border-muted/40"}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            id="generate-schedule-btn"
            onClick={handleGenerate}
            disabled={!selectedShift || isGenerating}
            className="w-full rounded-xl bg-primary px-6 py-3.5 font-bold text-dark hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                A analisar e gerar horário...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Gerar Horário com IA
              </>
            )}
          </button>

          {isGenerating && (
            <p className="mt-3 text-center text-xs text-muted flex items-center justify-center gap-1.5 animate-pulse">
              <Bot className="w-4 h-4 text-primary" /> A criar o plano para o tempo livre do turno da {shiftLabel}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── TABLE VIEW ───────────────────────────────────────────────────────────
  const days: { key: DayKey; label: string }[] = [
    { key: "monday",    label: "Segunda" },
    { key: "tuesday",   label: "Terça"   },
    { key: "wednesday", label: "Quarta"  },
    { key: "thursday",  label: "Quinta"  },
    { key: "friday",    label: "Sexta"   },
    { key: "saturday",  label: "Sábado"  },
    { key: "sunday",    label: "Domingo" },
  ];

  const displayData = editMode ? editData : (scheduleData ?? []);

  return (
    <div className="p-4 sm:p-8 pb-20">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface/40 sm:border-0 pb-4 sm:pb-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Horário Inteligente</h1>
          <p className="mt-1 text-muted text-xs sm:text-sm">
            Plano de estudos no teu tempo livre — optimizado pela IA.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Guardado com sucesso!
            </span>
          )}

          {!editMode ? (
            <>
              <button
                id="edit-schedule-btn"
                onClick={() => { setEditMode(true); setEditData(JSON.parse(JSON.stringify(scheduleData))); }}
                className="rounded-lg border border-accent/50 text-accent px-3.5 py-2 text-xs sm:text-sm font-medium hover:bg-accent/10 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar
              </button>
              <button
                id="regenerate-schedule-btn"
                onClick={handleRegenerate}
                className="rounded-lg border border-primary/50 text-primary px-3.5 py-2 text-xs sm:text-sm font-medium hover:bg-primary/10 transition-colors cursor-pointer active:scale-95"
              >
                Regerar Horário
              </button>
            </>
          ) : (
            <>
              <button
                id="cancel-edit-btn"
                onClick={handleCancelEdit}
                className="rounded-lg border border-surface text-muted px-3.5 py-2 text-xs sm:text-sm font-medium hover:bg-dark/50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="save-schedule-btn"
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="rounded-lg bg-primary text-dark px-3.5 py-2 text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    A Guardar...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Guardar
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/50 bg-danger/10 p-4 text-xs sm:text-sm text-danger max-w-2xl">
          {error}
        </div>
      )}

      {editMode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3.5 py-2.5 text-xs text-accent max-w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Modo de edição activo — clica em qualquer célula ou hora para editar.</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex md:hidden items-center justify-center gap-1.5 text-xs text-muted/70 italic px-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Desliza o quadro para ver todos os dias</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>

        <div className="rounded-xl border border-surface bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-dark text-muted">
                <tr>
                  <th className="p-3 sm:p-4 font-semibold border-b border-surface whitespace-nowrap sticky left-0 bg-dark z-10 border-r border-surface/50">Hora</th>
                  {days.map((d) => (
                    <th key={d.key} className="p-3 sm:p-4 font-semibold border-b border-surface whitespace-nowrap">{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {displayData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-dark/30 transition-colors">
                    <td className="p-3 sm:p-4 font-semibold text-text whitespace-nowrap sticky left-0 bg-surface/90 backdrop-blur-sm z-10 border-r border-surface/50">
                      {editMode ? (
                        editingTime === rowIdx ? (
                          <input
                            ref={timeInputRef}
                            type="text"
                            value={editData[rowIdx]?.time ?? ""}
                            onChange={(e) => handleTimeChange(rowIdx, e.target.value)}
                            onBlur={() => setEditingTime(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") setEditingTime(null);
                            }}
                            placeholder="ex: 06:00 - 07:30"
                            className="w-full min-w-[130px] rounded-lg border border-primary/60 bg-dark px-2 py-1.5 text-xs text-text font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingTime(rowIdx)}
                            className="group inline-flex items-center gap-1.5 text-text font-semibold text-sm hover:text-primary transition-colors cursor-pointer"
                            title="Clica para editar a hora"
                          >
                            <span>{editData[rowIdx]?.time ?? row.time}</span>
                            <svg className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )
                      ) : (
                        row.time
                      )}
                    </td>
                    {days.map((d) => {
                      const isEditing = editMode && editingCell?.row === rowIdx && editingCell?.col === d.key;
                      return (
                        <td key={d.key} className="p-3">
                          {editMode ? (
                            isEditing ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editData[rowIdx]?.[d.key] ?? ""}
                                onChange={(e) => handleCellChange(rowIdx, d.key, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") setEditingCell(null);
                                }}
                                className="w-full min-w-[120px] rounded-lg border border-accent/50 bg-dark px-2 py-1.5 text-xs text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingCell({ row: rowIdx, col: d.key })}
                                className={`group inline-flex items-center gap-1.5 px-3 py-1.5 ${DAY_COLORS[d.key]} rounded-lg text-xs font-medium cursor-pointer hover:ring-1 hover:ring-accent/40 transition-all w-full text-left`}
                              >
                                <span className="flex-1">{editData[rowIdx]?.[d.key] ?? ""}</span>
                                <svg className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            )
                          ) : (
                            <span className={`inline-block px-3 py-1 ${DAY_COLORS[d.key]} rounded-lg text-xs font-medium`}>
                              {row[d.key]}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-surface bg-dark/50 text-xs text-muted flex items-center justify-between flex-wrap gap-2">
            <span>Plano de estudos no tempo livre — actualizado e activo</span>
            <span className="flex items-center text-primary font-medium">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Optimizado para o Currículo de Angola
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


