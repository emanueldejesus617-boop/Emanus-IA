"use client";

import { useState, useEffect } from "react";

type ScheduleRow = {
  time: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
};

export default function SchedulePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleRow[] | null>(null);
  const [error, setError] = useState("");

  const loadSchedule = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/schedule/current", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.weekData) {
          setScheduleData(data.weekData);
        }
      }
    } catch (err) {
      console.error("Error loading schedule:", err);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleGenerate = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao gerar horário.");
      }
      if (data.weekData) {
        setScheduleData(data.weekData);
      }
    } catch (err: any) {
      setError(err.message || "Erro de ligação ao servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 pb-20">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Horário Inteligente</h1>
          <p className="mt-2 text-muted">O teu plano de estudos optimizado pela IA.</p>
        </div>
        {scheduleData && (
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg border border-primary/50 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? "A atualizar..." : "Regerar Horário"}
          </button>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger max-w-2xl">
          {error}
        </div>
      )}

      {!scheduleData ? (
        <div className="rounded-xl border border-surface bg-surface p-12 text-center shadow-sm max-w-3xl mx-auto">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary/15 text-secondary border border-secondary/20 mb-6 shadow-[0_0_15px_rgba(0,82,255,0.1)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <h3 className="text-2xl font-bold text-text mb-3">
            {isGenerating ? "A analisar o currículo do MINED..." : "Horário ainda não gerado"}
          </h3>
          <p className="text-muted mb-8 max-w-md mx-auto text-sm">
            {isGenerating 
              ? "A criar o plano de estudos semanal ideal focado no teu curso técnico ou geral e matérias selecionadas..." 
              : "Cria um plano de estudos personalizado para a tua classe e curso, optimizado de acordo com a nossa IA."}
          </p>
          
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-primary px-8 py-3 font-bold text-dark hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto min-w-[200px] cursor-pointer"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                A Gerar...
              </>
            ) : "Gerar Horário com IA"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mobile Gestures Warning */}
          <div className="flex md:hidden items-center gap-1.5 text-xs text-muted/70 italic px-1">
            <span>👈 Desliza o quadro para ver todos os dias da semana 👉</span>
          </div>

          <div className="rounded-xl border border-surface bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-dark text-muted">
                <tr>
                  <th className="p-4 font-semibold border-b border-surface">Hora</th>
                  <th className="p-4 font-semibold border-b border-surface">Segunda</th>
                  <th className="p-4 font-semibold border-b border-surface">Terça</th>
                  <th className="p-4 font-semibold border-b border-surface">Quarta</th>
                  <th className="p-4 font-semibold border-b border-surface">Quinta</th>
                  <th className="p-4 font-semibold border-b border-surface">Sexta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {scheduleData.map((row, i) => (
                  <tr key={i} className="hover:bg-dark/30 transition-colors">
                    <td className="p-4 font-semibold text-text whitespace-nowrap">{row.time}</td>
                    <td className="p-4"><span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">{row.monday}</span></td>
                    <td className="p-4"><span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-xs font-medium">{row.tuesday}</span></td>
                    <td className="p-4"><span className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-lg text-xs font-medium">{row.wednesday}</span></td>
                    <td className="p-4"><span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">{row.thursday}</span></td>
                    <td className="p-4"><span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-xs font-medium">{row.friday}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-surface bg-dark/50 text-xs text-muted flex items-center justify-between">
            <span>Plano de estudos atualizado e ativo</span>
            <span className="flex items-center text-primary font-medium">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Optimizado para o Currículo de Angola
            </span>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
