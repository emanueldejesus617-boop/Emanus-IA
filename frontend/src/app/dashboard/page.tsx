"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Flame,
  Sparkles,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  GraduationCap,
  Calendar,
  CheckCircle2,
  TrendingUp
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

  const getDaysUntilExams = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let examDate = new Date(currentYear, 10, 20); // 20 Nov
    if (now.getTime() > examDate.getTime()) {
      examDate = new Date(currentYear + 1, 10, 20);
    }
    const diffTime = examDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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

    // Load exam history
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

    // Load completed topics progress
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
        } catch {}
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
      : ["Matemática", "Física", "História de Angola"];
  }, [profile]);

  const xp = user?.xp || 0;
  const lessonsCompleted = completedTopicsCount;
  const lessonsPercent = Math.min(100, Math.round((lessonsCompleted / 30) * 100));
  const exercisesSolved = history.reduce((acc, curr) => acc + (curr.totalQuestions || 5), 0);
  const streak = user?.streak || 0;

  const getSubjectProgress = useCallback(
    (sub: string) => {
      const subExams = history.filter((h) => h.subject.toLowerCase() === sub.toLowerCase());
      if (subExams.length === 0) return 0;
      const totalScore = subExams.reduce((acc, h) => acc + h.score, 0);
      const totalQuestions = subExams.reduce((acc, h) => acc + h.totalQuestions, 0);
      return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    },
    [history]
  );

  if (!user) return null;

  const daysUntilExams = getDaysUntilExams();

  return (
    <div className="p-4 sm:p-8 pb-20 max-w-7xl mx-auto w-full animate-fade-in space-y-6 sm:space-y-8">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-surface/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
              Olá, {user.name}!
            </h1>
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs sm:text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-text">
              <GraduationCap className="w-4 h-4 text-primary" />
              {profile?.classe || "12.ª Classe"}
            </span>
            {profile?.curso && (
              <>
                <span className="text-muted/40">•</span>
                <span>{profile.curso}</span>
              </>
            )}
          </div>
        </div>

        {/* Exames Countdown Pill */}
        <div className="flex items-center gap-3 bg-surface border border-muted/15 px-4 py-2.5 rounded-2xl shadow-sm self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted block leading-none">Exames Finais</span>
            <span className="text-base sm:text-lg font-bold text-primary leading-tight mt-0.5 block">
              {daysUntilExams} {daysUntilExams === 1 ? "Dia" : "Dias"}
            </span>
          </div>
        </div>
      </header>

      {/* Boas-vindas para novos alunos */}
      {xp === 0 && history.length === 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-dark font-bold">
            <Rocket className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm sm:text-base font-bold text-primary">Bem-vindo ao teu painel de estudo!</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
              O teu percurso começa agora. Inicia a tua primeira aula interativa com o Tutor IA ou testa os teus
              conhecimentos nos simulados para acompanhar o teu progresso em tempo real.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/intelijai")}
            className="w-full sm:w-auto px-4 py-2.5 bg-primary text-dark font-semibold text-xs rounded-xl hover:opacity-90 active:scale-98 transition-all cursor-pointer shrink-0"
          >
            Começar Agora
          </button>
        </div>
      )}

      {/* Grid de Métricas Principais (3 Colunas) */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Aulas Concluídas */}
        <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted">Aulas Concluídas</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-text">{lessonsCompleted}</span>
              <span className="text-xs text-muted font-normal">tópicos concluídos</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-dark">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(lessonsPercent, lessonsCompleted > 0 ? 5 : 0)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-[11px] text-muted">
              <span>Meta do trimestre</span>
              <span className="font-semibold text-text">{lessonsPercent}%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Exercícios Resolvidos */}
        <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted">Exercícios Resolvidos</span>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-text">{exercisesSolved}</span>
              <span className="text-xs text-muted font-normal">questões respondidas</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-accent">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{xp} XP acumulados</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">Pontos ganhos em simulados e aulas</p>
          </div>
        </div>

        {/* Card 3: Sequência (Streak) */}
        <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-sm space-y-3 col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted">Dias Seguidos (Streak)</span>
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-text">{streak}</span>
              <Flame className="w-6 h-6 text-accent shrink-0" />
            </div>
            <p className="mt-3 text-xs font-medium text-text">
              {streak > 0 ? "Ritmo ativo! Continua firme." : "Inicia hoje a tua sequência de estudo!"}
            </p>
            <p className="mt-1 text-[11px] text-muted">Estuda diariamente para manter o streak aceso</p>
          </div>
        </div>
      </section>

      {/* Sessão de Ação & Desempenho (2 Colunas) */}
      <section className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Card Esquerdo: Próxima Aula / Estudar com a IA */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> A tua próxima sessão de estudo
          </h2>

          <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary/10 text-secondary border border-secondary/20">
                  {subjects[0]}
                </span>
                <span className="text-xs text-muted font-medium">• {profile?.classe || "12.ª Classe"}</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-text leading-snug">
                Introdução e Tópicos Fundamentais
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Tira dúvidas em tempo real, compreende fórmulas e analisa conceitos de forma adaptada ao currículo de Angola.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/dashboard/intelijai")}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs sm:text-sm font-semibold text-dark hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm shadow-primary/20"
              >
                <span>Iniciar Aula com Tutor IA</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push("/dashboard/schedule")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-muted/20 px-4 py-3 text-xs font-semibold text-text hover:bg-dark hover:border-muted/30 active:scale-98 transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-muted" />
                <span>Horário</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card Direito: Aproveitamento nos Simulados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" /> Aproveitamento nos Simulados
            </h2>
            <button
              onClick={() => router.push("/dashboard/exams")}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Fazer Simulado
            </button>
          </div>

          <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-sm space-y-4">
            {subjects.map((sub: string, i: number) => {
              const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-emerald-500", "bg-purple-500", "bg-sky-500"];
              const textColors = ["text-primary", "text-secondary", "text-accent", "text-emerald-500", "text-purple-500", "text-sky-500"];
              const colorIdx = i % colors.length;
              const subProgress = getSubjectProgress(sub);

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-text truncate pr-2">{sub}</span>
                    <span className={`shrink-0 font-bold ${textColors[colorIdx]}`}>
                      {subProgress === 0 ? "Sem dados" : `${subProgress}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[colorIdx]} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(subProgress, subProgress > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
