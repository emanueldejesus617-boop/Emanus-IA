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
  Code2
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
      : ["Informática", "Matemática", "Física", "Língua Portuguesa"];
  }, [profile]);

  const currentSubject = subjects[0] || "Informática";
  const lessonsCompleted = completedTopicsCount;
  // Cálculo de percentagem com base nos tópicos ou padrão visual
  const lessonsPercent = Math.max(15, Math.min(100, Math.round((lessonsCompleted / 24) * 100) || 25));

  if (!user) return null;

  const firstName = user.name.split(" ")[0] || "Estudante";

  return (
    <div className="p-4 sm:p-8 pb-20 max-w-7xl mx-auto w-full animate-fade-in space-y-6 sm:space-y-8">
      {/* 1. Saudação Superior */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
          Olá, {firstName}! <span className="inline-block animate-bounce text-2xl sm:text-3xl">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Bem-vindo de volta à Emanus IA. Vamos continuar a aprender?
        </p>
      </header>

      {/* 2. Hero Banner: O teu futuro começa aqui! */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-surface via-surface to-[#0A1A2F] p-6 sm:p-10 shadow-xl">
        {/* Glow de fundo sutil com as cores da marca */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Lado Esquerdo: Textos e Botão */}
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text tracking-tight leading-tight">
              O teu futuro começa <span className="text-primary font-black">aqui!</span>
            </h2>
            <p className="text-xs sm:text-base text-muted leading-relaxed">
              Estuda com a Emanus IA e atinge os teus objetivos escolares com inteligência artificial adaptada ao currículo de Angola.
            </p>

            <div className="pt-2">
              <button
                onClick={() => router.push("/dashboard/lessons")}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-primary text-dark font-bold text-xs sm:text-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-lg shadow-primary/20"
              >
                <Play className="w-4 h-4 fill-dark" />
                <span>Explorar as Aulas</span>
              </button>
            </div>
          </div>

          {/* Lado Direito: Ilustração de Livros + Cartola de Graduação + Frase */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className="relative w-64 h-44 sm:w-80 sm:h-52 flex items-center justify-center">
              {/* Ilustração SVG de Livros e Capelo */}
              <svg viewBox="0 0 320 220" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Livro Inferior (Verde Primário) */}
                <path d="M40 160 C120 180 200 180 280 160 L280 178 C200 198 120 198 40 178 Z" fill="#065f49" />
                <path d="M40 152 C120 172 200 172 280 152 L280 164 C200 184 120 184 40 164 Z" fill="#F3F4F6" />
                <path d="M40 144 C120 164 200 164 280 144 L280 154 C200 174 120 174 40 154 Z" fill="#00C896" />

                {/* Livro Médio (Azul Secundário) */}
                <path d="M55 128 C125 146 195 146 265 128 L265 144 C195 162 125 162 55 144 Z" fill="#0035A8" />
                <path d="M55 122 C125 138 195 138 265 122 L265 132 C195 148 125 148 55 132 Z" fill="#E5E7EB" />
                <path d="M55 114 C125 130 195 130 265 114 L265 124 C195 140 125 140 55 124 Z" fill="#0052FF" />

                {/* Capelo / Cartola Académica */}
                {/* Base inferior do chapéu */}
                <path d="M125 80 C125 105 195 105 195 80 L195 90 C195 115 125 115 125 90 Z" fill="#0F172A" />
                {/* Faixa dourada */}
                <path d="M125 88 C125 96 195 96 195 88 L195 92 C195 100 125 100 125 92 Z" fill="#FFB800" />
                {/* Losango superior */}
                <polygon points="160,35 245,68 160,98 75,68" fill="#1E293B" stroke="#334155" strokeWidth="2" />
                <polygon points="160,38 240,68 160,94 80,68" fill="#0F172A" />

                {/* Botão e Fita do Capelo */}
                <circle cx="160" cy="66" r="4.5" fill="#FFB800" />
                <path d="M160 66 Q205 75 220 110" stroke="#FFB800" strokeWidth="3" fill="none" strokeLinecap="round" />
                {/* Pompom dourado */}
                <ellipse cx="220" cy="115" rx="5" ry="8" fill="#FFB800" />

                {/* Brilhos decorativos sutis */}
                <path d="M60 70 L65 73 L62 78 L59 73 Z" fill="#00C896" opacity="0.8" />
                <path d="M260 45 L265 48 L262 53 L259 48 Z" fill="#0052FF" opacity="0.8" />
                <circle cx="270" cy="85" r="2.5" fill="#FFB800" />
              </svg>

              {/* Calligraphy / Frase "Aprender é poder!" */}
              <div className="absolute -top-3 sm:-top-5 -right-2 sm:-right-4 rotate-6 select-none pointer-events-none">
                <span className="text-lg sm:text-2xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary drop-shadow">
                  Aprender é poder!
                </span>
                <div className="w-full h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-0.5 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Grade de 4 Ações Rápidas (Aulas, Simulados, Gerar Horário, Meu Progresso) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Aulas */}
        <div
          onClick={() => router.push("/dashboard/lessons")}
          className="group rounded-2xl border border-muted/15 bg-surface p-4 sm:p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors">Aulas</h3>
              <p className="text-[11px] text-muted mt-0.5">Estude com qualidade</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-text group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Card 2: Simulados */}
        <div
          onClick={() => router.push("/dashboard/exams")}
          className="group rounded-2xl border border-muted/15 bg-surface p-4 sm:p-5 shadow-sm hover:border-purple-500/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text group-hover:text-purple-400 transition-colors">Simulados</h3>
              <p className="text-[11px] text-muted mt-0.5">Teste os seus conhecimentos</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-text group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Card 3: Gerar Horário */}
        <div
          onClick={() => router.push("/dashboard/schedule")}
          className="group rounded-2xl border border-muted/15 bg-surface p-4 sm:p-5 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text group-hover:text-emerald-400 transition-colors">Gerar Horário</h3>
              <p className="text-[11px] text-muted mt-0.5">Organize o seu estudo</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-text group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Card 4: Meu Progresso */}
        <div
          onClick={() => router.push("/dashboard/exams")}
          className="group rounded-2xl border border-muted/15 bg-surface p-4 sm:p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors">Meu Progresso</h3>
              <p className="text-[11px] text-muted mt-0.5">Acompanhe a sua evolução</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-text group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </section>

      {/* 4. Linha Inferior: Continue aprendendo + Os teus objetivos */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card Esquerdo: Continue aprendendo (7 Colunas) */}
        <div className="lg:col-span-7 rounded-3xl border border-muted/15 bg-surface p-5 sm:p-7 shadow-sm space-y-5 flex flex-col justify-between">
          {/* Cabeçalho do Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
              <h3 className="text-base sm:text-lg font-bold text-text">Continue aprendendo</h3>
            </div>
            <button
              onClick={() => router.push("/dashboard/lessons")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conteúdo Principal do Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Thumbnail com Badge e Ícone */}
            <div className="relative w-full sm:w-48 h-32 rounded-2xl bg-gradient-to-br from-dark to-[#0E1726] border border-muted/20 flex flex-col items-center justify-center p-3 shrink-0 shadow-inner overflow-hidden">
              <div className="absolute top-2.5 left-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-dark">
                  {currentSubject}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface/80 border border-muted/20 flex items-center justify-center text-primary shadow-sm mt-3">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <span className="text-[10px] text-muted font-mono mt-2">{profile?.classe || "12.ª Classe"}</span>
            </div>

            {/* Informações da Aula e CTA */}
            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <h4 className="text-base font-bold text-text">
                Introdução à {currentSubject}
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Aprenda os conceitos básicos desta disciplina de forma simples e prática com explicações inteligentes.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => router.push("/dashboard/intelijai")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-dark font-bold text-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-md shadow-primary/10"
                >
                  <Play className="w-3.5 h-3.5 fill-dark" />
                  <span>Continuar aula</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Direito: Os teus objetivos (5 Colunas) */}
        <div className="lg:col-span-5 rounded-3xl border border-muted/15 bg-gradient-to-br from-surface to-[#0A1A24] p-5 sm:p-7 shadow-sm space-y-5 flex flex-col justify-between">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-text">Os teus objetivos</h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </div>

          {/* Mensagem motivacional e progresso */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-text">
              Continua firme! Tu consegues!
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-medium">Progresso geral</span>
                <span className="font-bold text-primary">{lessonsPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-dark rounded-full overflow-hidden p-0.5 border border-muted/10">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[#00E5A3] rounded-full transition-all duration-700"
                  style={{ width: `${lessonsPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Citação Inspiracional */}
          <div className="pt-2 text-center border-t border-muted/10">
            <p className="text-xs italic text-muted">
              &ldquo;Grandes conquistas começam com um pequeno passo.&rdquo;
            </p>
            <div className="w-16 h-0.5 bg-primary/60 rounded-full mx-auto mt-2" />
          </div>
        </div>
      </section>
    </div>
  );
}
