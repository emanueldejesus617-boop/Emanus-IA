"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  BookOpen,
  ClipboardCheck,
  Calendar,
  BarChart3,
  Play,
  ChevronRight,
  ArrowRight,
  Target,
  TrendingUp,
  Sparkles,
  GraduationCap,
  Code2,
  Lightbulb
} from "lucide-react";
import { parseJsonResponse } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  classe?: string;
  curso?: string;
  subjects?: string;
  xp: number;
  streak: number;
  createdAt: string;
  lastLoginAt?: string;
}

interface Profile {
  classe?: string;
  curso?: string;
  subjects: string[];
}

interface ExamHistory {
  id: string;
  userId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userProfile");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [completedTopicsCount, setCompletedTopicsCount] = useState(0);

  const loadUserData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("userProfile");
          router.push("/");
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await parseJsonResponse(res);
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));

        const profileData = {
          classe: data.user.classe,
          curso: data.user.curso,
          subjects: data.user.subjects || []
        };
        setProfile(profileData);
        localStorage.setItem("userProfile", JSON.stringify(profileData));
      }
    } catch (err) {
      console.error("Error loading user from DB:", err);
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));

      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) setProfile(JSON.parse(storedProfile));
    }
  }, [router]);

  const loadDashboardData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/exams/history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error loading dashboard exam history:", e);
    }

    try {
      const res = await fetch("/api/lessons/progress", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setCompletedTopicsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) {
      console.error("Error loading completed topics:", e);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([loadUserData(), loadDashboardData()]);

    const handleProfileUpdated = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch { }
      }
    };
    window.addEventListener("userProfileUpdated", handleProfileUpdated);
    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdated);
    };
  }, [loadUserData, loadDashboardData]);

  const subjects = useMemo(() => {
    return profile?.subjects && profile.subjects.length > 0
      ? profile.subjects
      : ["Informática", "Matemática", "Física", "Língua Portuguesa"];
  }, [profile]);

  const currentSubject = subjects[0] || "Informática";
  const lessonsCompleted = completedTopicsCount;
  // Cálculo de percentagem com base nos tópicos ou padrão visual
  const lessonsPercent = Math.max(15, Math.min(100, Math.round((lessonsCompleted / 24) * 100) || 25));

  if (!user) return null;

  const firstName = user.name.split(" ")[0] || "Estudante";

  return (
    <div className="p-4 sm:p-8 pb-8 max-w-7xl mx-auto w-full animate-fade-in space-y-6 sm:space-y-8">
      {/* 1. Welcome Section — Saudação personalizada e incentivadora */}
      <header className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
          Olá, {firstName}! <span className="inline-block animate-bounce text-xl sm:text-3xl">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Bem-vindo de volta à Emanus IA. Pronto para aprender hoje?
        </p>
      </header>

      {/* 2. Featured Section — Cartão principal de destaque */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-br from-surface via-surface to-primary/10 dark:to-[#0A1A2F] p-5 sm:p-8 lg:p-10 shadow-sm transition-all">
        {/* Glow de fundo sutil com as cores da marca */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 sm:w-72 h-64 sm:h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Lado Esquerdo: Mensagem e Ação Principal */}
          <div className="max-w-xl space-y-3 sm:space-y-4 text-left w-full">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>O teu futuro começa aqui!</span>
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-text tracking-tight leading-tight">
              Aprende no teu ritmo com a <span className="text-primary font-black">Emanus IA</span>.
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Estuda com inteligência artificial adaptada ao currículo de Angola e atinge os melhores resultados escolares.
            </p>

            <div className="pt-1">
              <button
                onClick={() => router.push("/dashboard/lessons")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl sm:rounded-2xl bg-primary text-white dark:text-[#0A0F1E] font-bold text-xs sm:text-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-md shadow-primary/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Explorar as Aulas</span>
              </button>
            </div>
          </div>

          {/* Lado Direito: Ilustração Acadêmica (visível em tablet/desktop para manter a tela mobile limpa) */}
          <div className="relative hidden md:flex items-center justify-center shrink-0">
            <div className="relative w-64 h-44 sm:w-76 sm:h-48 flex items-center justify-center">
              <svg viewBox="0 0 320 220" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 160 C120 180 200 180 280 160 L280 178 C200 198 120 198 40 178 Z" fill="#065f49" />
                <path d="M40 152 C120 172 200 172 280 152 L280 164 C200 184 120 184 40 164 Z" fill="#F3F4F6" />
                <path d="M40 144 C120 164 200 164 280 144 L280 154 C200 174 120 174 40 154 Z" fill="#00C896" />

                <path d="M55 128 C125 146 195 146 265 128 L265 144 C195 162 125 162 55 144 Z" fill="#0035A8" />
                <path d="M55 122 C125 138 195 138 265 122 L265 132 C195 148 125 148 55 132 Z" fill="#E5E7EB" />
                <path d="M55 114 C125 130 195 130 265 114 L265 124 C195 140 125 140 55 124 Z" fill="#0052FF" />

                <path d="M125 80 C125 105 195 105 195 80 L195 90 C195 115 125 115 125 90 Z" fill="#0F172A" />
                <path d="M125 88 C125 96 195 96 195 88 L195 92 C195 100 125 100 125 92 Z" fill="#FFB800" />
                <polygon points="160,35 245,68 160,98 75,68" fill="#1E293B" stroke="#334155" strokeWidth="2" />
                <polygon points="160,38 240,68 160,94 80,68" fill="#0F172A" />
                <circle cx="160" cy="66" r="4.5" fill="#FFB800" />
                <path d="M160 66 Q205 75 220 110" stroke="#FFB800" strokeWidth="3" fill="none" strokeLinecap="round" />
                <ellipse cx="220" cy="115" rx="5" ry="8" fill="#FFB800" />
              </svg>

              <div className="absolute -top-3 -right-2 rotate-6 select-none pointer-events-none">
                <span className="text-base sm:text-xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary drop-shadow">
                  Aprender é poder!
                </span>
                <div className="w-full h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-0.5 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Progress Section — Seu Progresso com Indicador Circular */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-sm sm:text-base font-bold text-text">Seu Progresso</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/exams")}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver detalhes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-2xl border border-muted/15 bg-surface p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
          {/* Lado Esquerdo: Indicador Circular + Percentagem */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted/15"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary transition-all duration-1000 ease-out"
                  strokeDasharray={`${lessonsPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs sm:text-sm font-black text-text">
                {lessonsPercent}%
              </span>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text">Progresso Geral</h4>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                {lessonsPercent >= 75
                  ? "Excelente! Estás quase a concluir o programa trimestral."
                  : lessonsPercent >= 40
                  ? "Bom ritmo! Continua consistente nos teus estudos."
                  : "Início de jornada. Mantém a tua dedicação diária!"}
              </p>
            </div>
          </div>

          {/* Lado Direito: Estatísticas de Aulas e Simulados */}
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[280px]">
            {/* Aulas Assistidas */}
            <div className="rounded-xl border border-muted/10 bg-dark/40 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted block leading-none truncate">Aulas assistidas</span>
                <span className="text-sm font-black text-text mt-1 block">{lessonsCompleted}</span>
              </div>
            </div>

            {/* Simulados Realizados */}
            <div className="rounded-xl border border-muted/10 bg-dark/40 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted block leading-none truncate">Simulados feitos</span>
                <span className="text-sm font-black text-text mt-1 block">{history.length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Quick Access Section — Acesso Rápido (Grid de 4 elementos) */}
      <section className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-text">Acesso Rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Aulas */}
          <div
            onClick={() => router.push("/dashboard/lessons")}
            className="group rounded-2xl border border-muted/15 bg-surface p-4 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-3 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text group-hover:text-primary transition-colors">Aulas</h4>
              <p className="text-[11px] text-muted mt-0.5 line-clamp-1">Explorar conteúdos</p>
            </div>
          </div>

          {/* Card 2: Emanus IA */}
          <div
            onClick={() => router.push("/dashboard/intelijai")}
            className="group rounded-2xl border border-muted/15 bg-surface p-4 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text group-hover:text-primary transition-colors">Emanus</h4>
              <p className="text-[11px] text-muted mt-0.5 line-clamp-1">Tira dúvidas com IA</p>
            </div>
          </div>

          {/* Card 3: Simulados */}
          <div
            onClick={() => router.push("/dashboard/exams")}
            className="group rounded-2xl border border-muted/15 bg-surface p-4 shadow-xs hover:border-purple-500/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mb-3 group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Simulados</h4>
              <p className="text-[11px] text-muted mt-0.5 line-clamp-1">Provas do MINED</p>
            </div>
          </div>

          {/* Card 4: Horário */}
          <div
            onClick={() => router.push("/dashboard/schedule")}
            className="group rounded-2xl border border-muted/15 bg-surface p-4 shadow-xs hover:border-emerald-500/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mb-3 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Horário</h4>
              <p className="text-[11px] text-muted mt-0.5 line-clamp-1">Organizar rotina</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Additional Section — Banner Educativo Compacto */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface to-secondary/10 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text">Dica de Estudo da Emanus IA</h4>
            <p className="text-[11px] sm:text-xs text-muted mt-0.5 line-clamp-2">
              Estudar 20 a 30 minutos todos os dias fortalece as ligações neurais e melhora a retenção em 60%. Mantém o foco!
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard/intelijai")}
          className="shrink-0 text-xs font-bold text-primary hover:underline px-2 py-1 cursor-pointer hidden sm:block"
        >
          Conversar com a IA →
        </button>
      </section>

      {/* 6. Seções Complementares (Continue aprendendo + Os teus objetivos) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card Esquerdo: Continue aprendendo */}
        <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl border border-muted/15 bg-surface p-5 sm:p-7 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
              <h3 className="text-sm sm:text-lg font-bold text-text">Continue aprendendo</h3>
            </div>
            <button
              onClick={() => router.push("/dashboard/lessons")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-full sm:w-44 h-28 sm:h-32 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-gradient-to-br dark:from-dark dark:to-[#0E1726] border border-slate-200/80 dark:border-muted/20 flex flex-col items-center justify-center p-3 shrink-0 shadow-inner overflow-hidden">
              <div className="absolute top-2.5 left-2.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white dark:text-[#0A0F1E]">
                  {currentSubject}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-surface/80 border border-slate-200 dark:border-muted/20 flex items-center justify-center text-primary shadow-xs mt-3">
                <Code2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] text-muted font-mono mt-1.5">{profile?.classe || "12.ª Classe"}</span>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <h4 className="text-sm sm:text-base font-bold text-text">
                Introdução à {currentSubject}
              </h4>
              <p className="text-xs text-muted leading-relaxed line-clamp-2">
                Aprende os conceitos essenciais desta disciplina com explicações inteligentes e testes de fixação.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => router.push("/dashboard/intelijai")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white dark:text-[#0A0F1E] font-bold text-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-sm shadow-primary/10"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Continuar aula</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Direito: Os teus objetivos */}
        <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl border border-muted/15 bg-gradient-to-br from-surface via-surface to-emerald-500/10 dark:to-[#0A1A24] p-5 sm:p-7 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text">Os teus objetivos</h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold text-text">
              Continua firme! Cada sessão conta para o teu sucesso.
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-medium">Meta trimestral</span>
                <span className="font-bold text-primary">{lessonsPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 dark:bg-dark rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-muted/10">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${lessonsPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-muted/10">
            <p className="text-xs italic text-muted">
              &ldquo;Grandes conquistas começam com pequenos passos diários.&rdquo;
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
