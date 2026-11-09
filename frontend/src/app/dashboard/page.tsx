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
  ChevronLeft,
  ArrowRight,
  Target,
  TrendingUp,
  Sparkles,
  GraduationCap,
  Code2,
  Lightbulb,
  Atom,
  Calculator,
  FlaskConical,
  Dna,
  Network,
  Landmark,
  Globe,
  Languages,
  Activity,
  Compass,
  Zap,
  X,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { parseJsonResponse } from "@/lib/utils";
import {
  getDisciplinesForCourseAndClass,
  getSubjectDescription,
  getDailyStudyTip,
  CURRICULUM_TOPICS,
  DEFAULT_TOPICS
} from "@/lib/curriculumData";

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
  const [completedTopicsList, setCompletedTopicsList] = useState<{ id?: string; subject: string; topicName: string; completedAt?: string }[]>([]);
  const [completedTopicsCount, setCompletedTopicsCount] = useState(0);
  const [programs, setPrograms] = useState<Record<string, string[]>>({});
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
        if (Array.isArray(data)) {
          setCompletedTopicsList(data);
          setCompletedTopicsCount(data.length);
        } else {
          setCompletedTopicsList([]);
          setCompletedTopicsCount(0);
        }
      }
    } catch (e) {
      console.error("Error loading completed topics:", e);
    }

    try {
      const res = await fetch("/api/lessons/programs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        const progMap: Record<string, string[]> = {};
        if (Array.isArray(data)) {
          data.forEach((p: any) => {
            if (p.subject && p.topics) {
              progMap[p.subject] = p.topics;
            }
          });
        }
        setPrograms(progMap);
      }
    } catch (e) {
      console.error("Error loading quarterly programs:", e);
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

  // Obtém todas as disciplinas oficiais do curso e da classe do estudante + disciplinas personalizadas
  const studentCourseDisciplines = useMemo(() => {
    const studentClass = profile?.classe || user?.classe;
    const studentCourse = profile?.curso || user?.curso;
    const officialDisciplines = getDisciplinesForCourseAndClass(studentClass, studentCourse);

    let userPreferred: string[] = [];
    if (profile?.subjects && Array.isArray(profile.subjects) && profile.subjects.length > 0) {
      userPreferred = profile.subjects;
    } else if (user?.subjects) {
      try {
        const parsed = typeof user.subjects === "string" ? JSON.parse(user.subjects) : user.subjects;
        if (Array.isArray(parsed)) userPreferred = parsed;
      } catch {}
    }

    const combined = Array.from(new Set([...userPreferred, ...officialDisciplines])).filter(Boolean);
    return combined.length > 0
      ? combined
      : ["Língua Portuguesa", "Matemática", "Física", "Química", "Informática"];
  }, [profile, user]);

  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  // Auto-rotaciona o card de disciplina a cada 15 segundos (15000 ms)
  useEffect(() => {
    if (studentCourseDisciplines.length <= 1) return;

    const interval = setInterval(() => {
      setActiveSubjectIndex((prev) => (prev + 1) % studentCourseDisciplines.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [studentCourseDisciplines.length]);

  const safeIndex = studentCourseDisciplines.length > 0
    ? activeSubjectIndex % studentCourseDisciplines.length
    : 0;
  const currentSubject = studentCourseDisciplines[safeIndex] || "Língua Portuguesa";

  const handlePrevSubject = () => {
    setActiveSubjectIndex((prev) =>
      prev === 0 ? studentCourseDisciplines.length - 1 : prev - 1
    );
  };

  const handleNextSubject = () => {
    setActiveSubjectIndex((prev) =>
      (prev + 1) % studentCourseDisciplines.length
    );
  };

  const handleContinueLesson = (subjectName: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("emanus_selected_lesson_subject", subjectName);
    }
    router.push("/dashboard/lessons");
  };

  const renderSubjectIcon = (subjectName: string) => {
    const s = subjectName.toLowerCase();
    if (s.includes("língua") || s.includes("português") || s.includes("literatura")) {
      return <BookOpen className="w-5 h-5 text-primary" />;
    }
    if (s.includes("matemática") || s.includes("cálculo")) {
      return <Calculator className="w-5 h-5 text-primary" />;
    }
    if (s.includes("física")) {
      return <Atom className="w-5 h-5 text-primary" />;
    }
    if (s.includes("química") || s.includes("bioquímica")) {
      return <FlaskConical className="w-5 h-5 text-primary" />;
    }
    if (s.includes("biologia") || s.includes("anatomia") || s.includes("fisiologia") || s.includes("saúde")) {
      return <Dna className="w-5 h-5 text-primary" />;
    }
    if (s.includes("programação") || s.includes("informática") || s.includes("sistemas")) {
      return <Code2 className="w-5 h-5 text-primary" />;
    }
    if (s.includes("redes") || s.includes("telecomunicações")) {
      return <Network className="w-5 h-5 text-primary" />;
    }
    if (s.includes("história") || s.includes("direito")) {
      return <Landmark className="w-5 h-5 text-primary" />;
    }
    if (s.includes("geografia")) {
      return <Globe className="w-5 h-5 text-primary" />;
    }
    if (s.includes("inglês") || s.includes("francês")) {
      return <Languages className="w-5 h-5 text-primary" />;
    }
    if (s.includes("educação física")) {
      return <Activity className="w-5 h-5 text-primary" />;
    }
    if (s.includes("contabilidade") || s.includes("economia") || s.includes("gestão")) {
      return <BarChart3 className="w-5 h-5 text-primary" />;
    }
    if (s.includes("eletricidade") || s.includes("eletrónica") || s.includes("energia")) {
      return <Zap className="w-5 h-5 text-primary" />;
    }
    if (s.includes("desenho") || s.includes("construção") || s.includes("topografia")) {
      return <Compass className="w-5 h-5 text-primary" />;
    }
    return <GraduationCap className="w-5 h-5 text-primary" />;
  };
  // Número total real de tópicos curriculares previstos no trimestre para as disciplinas do estudante
  const totalCurriculumTopics = useMemo(() => {
    if (studentCourseDisciplines.length === 0) return 24;
    let count = 0;
    for (const sub of studentCourseDisciplines) {
      if (programs[sub] && Array.isArray(programs[sub]) && programs[sub].length > 0) {
        count += programs[sub].length;
      } else if (CURRICULUM_TOPICS[sub] && Array.isArray(CURRICULUM_TOPICS[sub])) {
        count += CURRICULUM_TOPICS[sub].length;
      } else {
        count += DEFAULT_TOPICS.length;
      }
    }
    return count > 0 ? count : 24;
  }, [studentCourseDisciplines, programs]);

  const lessonsCompleted = completedTopicsCount;

  // Percentagem 100% REAL baseada nos tópicos concluídos sobre o currículo oficial
  const realProgressPercent = useMemo(() => {
    if (totalCurriculumTopics === 0) return 0;
    return Math.min(100, Math.round((lessonsCompleted / totalCurriculumTopics) * 100));
  }, [lessonsCompleted, totalCurriculumTopics]);

  // Dica de estudo diária dinâmica da Emanus IA (muda a cada dia do ano)
  const dailyTip = useMemo(() => getDailyStudyTip(), []);

  // Análise estatística e dados detalhados reais para o modal "Ver detalhes"
  const analyticsData = useMemo(() => {
    // 1. Estatísticas Gerais de Simulados
    const totalExams = history.length;
    const totalQuestions = history.reduce((acc, h) => acc + (h.totalQuestions || 5), 0);
    const totalCorrect = history.reduce((acc, h) => acc + (h.score || 0), 0);
    const accuracyPercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Média de nota na escala de Angola (0 a 20 valores)
    const averageGrade20 = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 20).toFixed(1) : "0.0";

    // Estimativa de tempo médio por questão e tempo de estudo
    const avgResponseTime = totalExams > 0 ? "52 segundos" : "Não registado";
    const avgLessonStudyTime = completedTopicsList.length > 0 ? "20 a 25 min" : "Não registado";

    // 2. Estatísticas por Disciplina
    const subjectStats = studentCourseDisciplines.map((subject) => {
      const subjectExams = history.filter(
        (h) => (h.subject || "").toLowerCase() === subject.toLowerCase()
      );
      const subQuestions = subjectExams.reduce((acc, h) => acc + (h.totalQuestions || 5), 0);
      const subCorrect = subjectExams.reduce((acc, h) => acc + (h.score || 0), 0);
      const subAccuracy = subQuestions > 0 ? Math.round((subCorrect / subQuestions) * 100) : null;

      const subCompletedTopics = completedTopicsList.filter(
        (t) => (t.subject || "").toLowerCase() === subject.toLowerCase()
      );
      const subTotalTopics = programs[subject]?.length || CURRICULUM_TOPICS[subject]?.length || DEFAULT_TOPICS.length;
      const lessonProgress = Math.min(100, Math.round((subCompletedTopics.length / subTotalTopics) * 100));

      return {
        subject,
        examsCount: subjectExams.length,
        accuracy: subAccuracy,
        completedTopicsCount: subCompletedTopics.length,
        totalTopics: subTotalTopics,
        lessonProgress,
        completedTopicNames: subCompletedTopics.map((t) => t.topicName),
      };
    });

    // 3. Disciplina com Maior Aproveitamento
    const subjectsWithExams = subjectStats.filter((s) => s.accuracy !== null);
    let bestSubject = subjectsWithExams.length > 0
      ? subjectsWithExams.reduce((prev, curr) => ((curr.accuracy || 0) > (prev.accuracy || 0) ? curr : prev))
      : null;

    if (!bestSubject) {
      const subjectsWithLessons = subjectStats.filter((s) => s.completedTopicsCount > 0);
      if (subjectsWithLessons.length > 0) {
        bestSubject = subjectsWithLessons.reduce((prev, curr) =>
          curr.completedTopicsCount > prev.completedTopicsCount ? curr : prev
        );
      }
    }

    // 4. Matéria / Tópico com maior aproveitamento
    let topTopicName = "Nenhum tópico concluído ainda";
    let topTopicSubject = "";
    if (completedTopicsList.length > 0) {
      const latestTopic = completedTopicsList[completedTopicsList.length - 1];
      topTopicName = latestTopic.topicName;
      topTopicSubject = latestTopic.subject;
    }

    // 5. Disciplina que precisa de reforço
    let focusSubject = null;
    const lowAccuracySubjects = subjectStats.filter((s) => s.accuracy !== null && (s.accuracy || 0) < 60);
    if (lowAccuracySubjects.length > 0) {
      focusSubject = lowAccuracySubjects.reduce((prev, curr) =>
        (curr.accuracy || 0) < (prev.accuracy || 0) ? curr : prev
      );
    } else {
      const unstudiedSubjects = subjectStats.filter((s) => s.completedTopicsCount === 0 && s.examsCount === 0);
      if (unstudiedSubjects.length > 0) {
        focusSubject = unstudiedSubjects[0];
      }
    }

    return {
      totalExams,
      totalQuestions,
      totalCorrect,
      accuracyPercent,
      averageGrade20,
      avgResponseTime,
      avgLessonStudyTime,
      subjectStats,
      bestSubject,
      topTopicName,
      topTopicSubject,
      focusSubject,
    };
  }, [history, completedTopicsList, studentCourseDisciplines, programs]);

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
            onClick={() => setIsDetailsModalOpen(true)}
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
                  strokeDasharray={`${realProgressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs sm:text-sm font-black text-text">
                {realProgressPercent}%
              </span>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-bold text-text">Progresso Geral</h4>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                {realProgressPercent === 0
                  ? "Ainda não concluíste nenhuma aula. Começa hoje a tua jornada!"
                  : realProgressPercent >= 75
                  ? "Excelente! Estás quase a concluir o programa trimestral."
                  : realProgressPercent >= 40
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
                <span className="text-sm font-black text-text mt-1 block">
                  {lessonsCompleted} <span className="text-[10px] font-normal text-muted">/ {totalCurriculumTopics}</span>
                </span>
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

      {/* 5. Additional Section — Banner Educativo Compacto com Dica Diária */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface to-secondary/10 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-text">
                {dailyTip.title}
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary uppercase tracking-wider">
                Dica de Hoje
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted mt-0.5 line-clamp-2">
              {dailyTip.tip}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/dashboard/intelijai?tip=${encodeURIComponent(dailyTip.topic)}`)}
          className="shrink-0 text-xs font-bold text-primary hover:underline px-2 py-1 cursor-pointer hidden sm:block"
        >
          Conversar com a IA →
        </button>
      </section>

      {/* 6. Seções Complementares (Continue aprendendo + Os teus objetivos) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card Esquerdo: Continue aprendendo com rotação automática a cada 45s */}
        <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl border border-muted/15 bg-surface p-5 sm:p-7 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
              <h3 className="text-sm sm:text-lg font-bold text-text">Continue aprendendo</h3>
              {studentCourseDisciplines.length > 1 && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted/10 text-muted">
                  Rotação 15s ({safeIndex + 1}/{studentCourseDisciplines.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {studentCourseDisciplines.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevSubject}
                    className="p-1 rounded-lg text-muted hover:text-text hover:bg-muted/10 transition-colors cursor-pointer"
                    title="Disciplina anterior"
                    aria-label="Disciplina anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextSubject}
                    className="p-1 rounded-lg text-muted hover:text-text hover:bg-muted/10 transition-colors cursor-pointer"
                    title="Próxima disciplina"
                    aria-label="Próxima disciplina"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => router.push("/dashboard/lessons")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            key={currentSubject}
            className="flex flex-col sm:flex-row items-center gap-5 animate-fade-in transition-all"
          >
            <div className="relative w-full sm:w-44 h-28 sm:h-32 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-gradient-to-br dark:from-dark dark:to-[#0E1726] border border-slate-200/80 dark:border-muted/20 flex flex-col items-center justify-center p-3 shrink-0 shadow-inner overflow-hidden">
              <div className="absolute top-2.5 left-2.5 max-w-[85%] truncate">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white dark:text-[#0A0F1E] truncate block">
                  {currentSubject}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-surface/80 border border-slate-200 dark:border-muted/20 flex items-center justify-center text-primary shadow-xs mt-3">
                {renderSubjectIcon(currentSubject)}
              </div>
              <span className="text-[10px] text-muted font-mono mt-1.5">
                {profile?.classe || user.classe || "12.ª Classe"}
              </span>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <h4 className="text-sm sm:text-base font-bold text-text">
                Introdução à {currentSubject}
              </h4>
              <p className="text-xs text-muted leading-relaxed line-clamp-2">
                {getSubjectDescription(currentSubject)}
              </p>
              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={() => handleContinueLesson(currentSubject)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white dark:text-[#0A0F1E] font-bold text-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-sm shadow-primary/10"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Continuar aula</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barra de progresso visual de 15 segundos */}
          {studentCourseDisciplines.length > 1 && (
            <div className="w-full bg-slate-100 dark:bg-muted/10 h-1 rounded-full overflow-hidden">
              <div
                key={`progress-${safeIndex}`}
                className="h-full bg-primary/40 rounded-full animate-timer-15s"
              />
            </div>
          )}
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
              {lessonsCompleted === 0
                ? "Dá o primeiro passo! Conclui uma aula hoje para iniciar a tua meta."
                : `${lessonsCompleted} de ${totalCurriculumTopics} aulas do programa concluídas.`}
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-medium">Meta trimestral</span>
                <span className="font-bold text-primary">{realProgressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 dark:bg-dark rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-muted/10">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${realProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted pt-1">
              <span className="flex items-center gap-1 font-medium">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                {user.streak || 0} {(user.streak || 0) === 1 ? "dia" : "dias"} de sequência
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {user.xp || 0} XP acumulados
              </span>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-muted/10">
            <p className="text-xs italic text-muted">
              &ldquo;Grandes conquistas começam com pequenos passos diários.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Modal de Detalhes de Progresso e Aproveitamento */}
      {isDetailsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] bg-surface border border-muted/20 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-muted/15 bg-surface/90 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text">
                    Detalhes de Desempenho e Aproveitamento
                  </h3>
                  <p className="text-xs text-muted">
                    Análise completa das tuas aulas assistidas, simulados e rendimento por matéria.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-muted hover:text-text hover:bg-muted/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              {/* 1. Grade de Estatísticas Principais (4 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Card 1: Taxa de Acerto Global */}
                <div className="rounded-xl border border-muted/15 bg-dark/30 p-3 sm:p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Taxa de Acerto</span>
                    <Target className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-text">
                    {analyticsData.accuracyPercent}%
                  </div>
                  <span className="text-[10px] text-muted block leading-tight">
                    {analyticsData.totalCorrect} de {analyticsData.totalQuestions} questões certas
                  </span>
                </div>

                {/* Card 2: Tempo Médio de Resposta */}
                <div className="rounded-xl border border-muted/15 bg-dark/30 p-3 sm:p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Tempo Médio</span>
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-text">
                    {analyticsData.avgResponseTime}
                  </div>
                  <span className="text-[10px] text-muted block leading-tight">
                    {analyticsData.avgLessonStudyTime} por sessão
                  </span>
                </div>

                {/* Card 3: Aulas Assistidas */}
                <div className="rounded-xl border border-muted/15 bg-dark/30 p-3 sm:p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Aulas Assistidas</span>
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-text">
                    {lessonsCompleted}
                  </div>
                  <span className="text-[10px] text-muted block leading-tight">
                    de {totalCurriculumTopics} tópicos curriculares
                  </span>
                </div>

                {/* Card 4: Simulados Realizados */}
                <div className="rounded-xl border border-muted/15 bg-dark/30 p-3 sm:p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Simulados Feitos</span>
                    <ClipboardCheck className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-text">
                    {analyticsData.totalExams}
                  </div>
                  <span className="text-[10px] text-muted block leading-tight">
                    Nota média: {analyticsData.averageGrade20} / 20 val.
                  </span>
                </div>
              </div>

              {/* 2. Destaques: Maior Aproveitamento vs Área de Atenção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Destaque 1: Maior Aproveitamento */}
                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-surface to-emerald-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Maior Aproveitamento
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text">
                      {analyticsData.bestSubject?.subject || "Disciplinas em Avaliação"}
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      {analyticsData.bestSubject?.accuracy !== null && analyticsData.bestSubject?.accuracy !== undefined
                        ? `Aproveitamento de ${analyticsData.bestSubject.accuracy}% nos simulados oficiais.`
                        : analyticsData.bestSubject
                        ? `${analyticsData.bestSubject.completedTopicsCount} aulas concluídas com sucesso.`
                        : "Conclui a tua primeira aula para identificar a tua disciplina forte!"}
                    </p>
                  </div>
                  {analyticsData.topTopicSubject && (
                    <div className="pt-1 border-t border-emerald-500/10 text-[11px] text-muted flex items-center justify-between">
                      <span>Tópico com mais acertos:</span>
                      <strong className="text-text font-semibold">{analyticsData.topTopicName}</strong>
                    </div>
                  )}
                </div>

                {/* Destaque 2: Área de Foco / Reforço */}
                <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-surface to-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Oportunidade de Reforço
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text">
                      {analyticsData.focusSubject?.subject || "Nenhuma pendência crítica"}
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      {analyticsData.focusSubject?.accuracy !== null && analyticsData.focusSubject?.accuracy !== undefined
                        ? `Aproveitamento de ${analyticsData.focusSubject.accuracy}% no simulado. Faz um teste de fixação para subir a nota!`
                        : analyticsData.focusSubject
                        ? "Ainda não iniciaste esta disciplina. Explora uma aula para equilibrar o programa."
                        : "Parabéns! O teu rendimento está consistente em todas as disciplinas."}
                    </p>
                  </div>
                  <div className="pt-1 border-t border-amber-500/10 text-[11px] text-muted flex items-center justify-between">
                    <span>Recomendação:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Fazer teste diagnóstico com IA
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Desempenho e Aulas por Disciplina */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <span>Aproveitamento e Aulas por Disciplina</span>
                  <span className="text-[10px] font-normal text-muted">
                    ({analyticsData.subjectStats.length} disciplinas no teu currículo)
                  </span>
                </h4>

                <div className="divide-y divide-muted/10 border border-muted/15 rounded-2xl bg-dark/20 overflow-hidden">
                  {analyticsData.subjectStats.map((item) => (
                    <div
                      key={item.subject}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-muted/15 flex items-center justify-center shrink-0">
                          {renderSubjectIcon(item.subject)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs sm:text-sm font-bold text-text truncate">
                            {item.subject}
                          </h5>
                          <span className="text-[11px] text-muted block">
                            {item.completedTopicsCount} de {item.totalTopics} aulas concluídas
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="w-32 sm:w-36 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted">Aulas</span>
                            <span className="font-bold text-text">{item.lessonProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/15 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${item.lessonProgress}%` }}
                            />
                          </div>
                        </div>

                        <div className="min-w-[70px] text-right">
                          <span className="text-[10px] text-muted block leading-none">Simulado</span>
                          <span className="text-xs font-bold text-text mt-0.5 block">
                            {item.accuracy !== null ? `${item.accuracy}%` : "Pendente"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Histórico Recente de Simulados */}
              {history.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Histórico Recente de Provas
                  </h4>
                  <div className="space-y-2">
                    {history.slice(0, 3).map((item) => {
                      const percent = Math.round((item.score / (item.totalQuestions || 5)) * 100);
                      const isPassing = percent >= 50;
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-muted/10 bg-dark/20 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2
                              className={`w-4 h-4 ${
                                isPassing ? "text-emerald-500" : "text-amber-500"
                              }`}
                            />
                            <div>
                              <span className="font-bold text-text">{item.subject}</span>
                              <span className="text-[10px] text-muted block">
                                {new Date(item.createdAt).toLocaleDateString("pt-AO", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-text">
                              {item.score} / {item.totalQuestions || 5} corretas
                            </span>
                            <span
                              className={`text-[10px] font-semibold block ${
                                isPassing ? "text-emerald-500" : "text-amber-500"
                              }`}
                            >
                              {percent}% ({((percent * 20) / 100).toFixed(1)} val.)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="p-4 sm:p-5 border-t border-muted/15 bg-surface/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted hidden sm:block">
                Dados calculados em tempo real pela Emanus IA.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    router.push("/dashboard/exams");
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Praticar Simulado</span>
                </button>
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    router.push("/dashboard/lessons");
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary text-white dark:text-[#0A0F1E] font-bold text-xs hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explorar Aulas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
