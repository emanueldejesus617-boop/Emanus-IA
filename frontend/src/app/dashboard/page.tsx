"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Flame, Sparkles } from "lucide-react";
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
  const router = useRouter();

  const getDaysUntilExams = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let examDate = new Date(currentYear, 10, 20); // 20 Nov
    if (now.getTime() > examDate.getTime()) {
      examDate = new Date(currentYear + 1, 10, 20);
    }
    const diffTime = examDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const loadUserData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
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
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setHistory(data);
      }
    } catch (e) {
      console.error("Error loading dashboard exam history:", e);
    }

    // Load completed topics progress
    try {
      const res = await fetch("/api/lessons/progress", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setCompletedTopicsCount(data.length || 0);
      }
    } catch (e) {
      console.error("Error loading completed topics:", e);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    loadDashboardData();

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

  if (!user) return null;

  const subjects = profile?.subjects || ['Matemática', 'Física', 'História de Angola'];

  const xp = user.xp || 0;
  // Use completed topics count or fallback to xp-derived value
  const lessonsCompleted = completedTopicsCount;
  const lessonsPercent = Math.min(100, Math.round((lessonsCompleted / 30) * 100)); // Say 30 topics is 100%
  
  // Total exercises solved is sum of questions across all historical exams
  const exercisesSolved = history.reduce((acc, curr) => acc + (curr.totalQuestions || 5), 0);
  const streak = user.streak || 0;

  // Calculate real performance per subject
  const getSubjectProgress = (sub: string) => {
    const subExams = history.filter(h => h.subject.toLowerCase() === sub.toLowerCase());
    if (subExams.length === 0) return 0;
    const totalScore = subExams.reduce((acc, h) => acc + h.score, 0);
    const totalQuestions = subExams.reduce((acc, h) => acc + h.totalQuestions, 0);
    return Math.round((totalScore / totalQuestions) * 100);
  };

  return (
    <div className="p-4 sm:p-8 pb-20">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface/40 sm:border-0 pb-4 sm:pb-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text flex items-center gap-2">
            Olá, {user.name}! <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary inline-block shrink-0" />
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted">Aqui está o teu progresso na {profile?.classe || '12.ª Classe'} {profile?.curso ? `(${profile.curso})` : ''}.</p>
        </div>
        <div className="text-left sm:text-right bg-surface/30 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto">
          <p className="text-xs sm:text-sm font-medium text-muted">Faltam para os Exames:</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{getDaysUntilExams()} Dias</p>
        </div>
      </header>

      {xp === 0 && history.length === 0 && (
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6 shadow-sm animate-fade-in">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-dark">
            <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-primary">Bem-vindo ao teu novo painel de controlo!</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted">Como és um novo utilizador, todas as tuas métricas começam a zero. Começa a tua primeira aula ou resolve exercícios para veres os teus gráficos e estatísticas a crescer dinamicamente com base nas tuas ações.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-surface bg-surface p-4 sm:p-6 shadow-sm">
          <h3 className="text-xs sm:text-sm font-medium text-muted">Aulas Concluídas</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-primary">{lessonsCompleted} <span className="text-xs font-normal text-muted">tópicos</span></p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-dark">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${lessonsPercent}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-surface bg-surface p-4 sm:p-6 shadow-sm">
          <h3 className="text-xs sm:text-sm font-medium text-muted">Exercícios Resolvidos</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-secondary">{exercisesSolved}</p>
          <p className="mt-2 text-xs text-muted">Total acumulado: {xp} XP</p>
        </div>
        <div className="rounded-xl border border-surface bg-surface p-4 sm:p-6 shadow-sm col-span-1 sm:col-span-2 md:col-span-1">
          <h3 className="text-xs sm:text-sm font-medium text-muted">Dias Seguidos (Streak)</h3>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-accent flex items-center gap-1.5">
            {streak} <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
          </p>
          <p className="mt-2 text-xs text-muted">Continua a aprender todos os dias!</p>
        </div>
      </div>

      <div className="mt-8 sm:mt-12 grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
        <div>
          <h2 className="mb-4 sm:mb-6 text-base sm:text-xl font-bold text-text">A tua próxima aula</h2>
          <div className="flex flex-col justify-between rounded-xl border border-surface bg-surface p-4 sm:p-6 h-auto sm:h-[200px]">
            <div>
              <span className="inline-block rounded bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
                {subjects[0]} • {profile?.classe || '12.ª Classe'}
              </span>
              <h3 className="mt-2 sm:mt-3 text-base sm:text-lg font-bold text-text">Introdução à Matéria</h3>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted">Começa a aprender os conceitos básicos desta disciplina.</p>
            </div>
            <button 
              onClick={() => router.push("/dashboard/intelijai")}
              className="mt-4 w-full rounded-lg bg-primary px-6 py-2.5 font-medium text-dark transition-opacity hover:opacity-90 cursor-pointer text-sm active:scale-[0.98]"
            >
              Iniciar Aula com a Emanus IA
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-4 sm:mb-6 text-base sm:text-xl font-bold text-text">Aproveitamento nos Simulados</h2>
          <div className="rounded-xl border border-surface bg-surface p-4 sm:p-6 space-y-3 sm:space-y-4 h-auto sm:h-[200px] overflow-y-auto">
            {subjects.map((sub: string, i: number) => {
              const colors = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-orange-500', 'bg-purple-500', 'bg-green-500', 'bg-primary'];
              const textColors = ['text-primary', 'text-secondary', 'text-accent', 'text-orange-500', 'text-purple-500', 'text-green-500', 'text-primary'];
              const colorIdx = i % colors.length;
              
              const subProgress = getSubjectProgress(sub);

              return (
                <div key={i}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium truncate mr-2">{sub}</span>
                    <span className={`shrink-0 ${textColors[colorIdx]}`}>{subProgress === 0 ? "Sem dados" : `${subProgress}%`}</span>
                  </div>
                  <div className="h-1.5 sm:h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div className={`h-full ${colors[colorIdx]} transition-all duration-500`} style={{ width: `${subProgress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
