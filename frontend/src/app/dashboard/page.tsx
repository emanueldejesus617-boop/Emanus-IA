"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [completedTopicsCount, setCompletedTopicsCount] = useState(0);
  const router = useRouter();

  const loadUserData = async () => {
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
      const data = await res.json();
      if (res.ok && data.user) {
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
  };

  const loadDashboardData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    // Load exam history
    try {
      const res = await fetch("/api/exams/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
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
        const data = await res.json();
        setCompletedTopicsCount(data.length || 0);
      }
    } catch (e) {
      console.error("Error loading completed topics:", e);
    }
  };

  useEffect(() => {
    loadUserData();
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="p-8 pb-20">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Olá, {user.name}! 👋</h1>
          <p className="mt-2 text-muted">Aqui está o teu progresso na {profile?.classe || '12.ª Classe'} {profile?.curso ? `(${profile.curso})` : ''}.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted">Faltam para os Exames:</p>
          <p className="text-2xl font-bold text-primary">45 Dias</p>
        </div>
      </header>

      {xp === 0 && history.length === 0 && (
        <div className="mb-8 flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm animate-fade-in">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-2xl text-dark">
            🚀
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Bem-vindo ao teu novo painel de controlo!</h2>
            <p className="mt-1 text-sm text-muted">Como és um novo utilizador, todas as tuas métricas começam a zero. Começa a tua primeira aula ou resolve exercícios para veres os teus gráficos e estatísticas a crescer dinamicamente com base nas tuas ações.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-surface bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted">Aulas Concluídas</h3>
          <p className="mt-2 text-3xl font-bold text-primary">{lessonsCompleted} <span className="text-xs font-normal text-muted">tópicos</span></p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-dark">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${lessonsPercent}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-surface bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted">Exercícios Resolvidos</h3>
          <p className="mt-2 text-3xl font-bold text-secondary">{exercisesSolved}</p>
          <p className="mt-2 text-xs text-muted">Total acumulado: {xp} XP</p>
        </div>
        <div className="rounded-xl border border-surface bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted">Dias Seguidos (Streak)</h3>
          <p className="mt-2 text-3xl font-bold text-accent">{streak} 🔥</p>
          <p className="mt-2 text-xs text-muted">Continua a aprender todos os dias!</p>
        </div>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-6 text-xl font-bold text-text">A tua próxima aula</h2>
          <div className="flex flex-col justify-between rounded-xl border border-surface bg-surface p-6 h-[200px]">
            <div>
              <span className="inline-block rounded bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
                {subjects[0]} • {profile?.classe || '12.ª Classe'}
              </span>
              <h3 className="mt-3 text-lg font-bold text-text">Introdução à Matéria</h3>
              <p className="mt-2 text-sm text-muted">Começa a aprender os conceitos básicos desta disciplina.</p>
            </div>
            <button 
              onClick={() => router.push("/dashboard/tutor")}
              className="mt-4 w-full rounded-lg bg-primary px-6 py-2 font-medium text-dark transition-opacity hover:opacity-90 cursor-pointer"
            >
              Iniciar Aula com o Tutor IA
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-xl font-bold text-text">Aproveitamento nos Simulados</h2>
          <div className="rounded-xl border border-surface bg-surface p-6 space-y-4 h-[200px] overflow-y-auto">
            {subjects.map((sub: string, i: number) => {
              const colors = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-orange-500', 'bg-purple-500', 'bg-green-500', 'bg-primary'];
              const textColors = ['text-primary', 'text-secondary', 'text-accent', 'text-orange-500', 'text-purple-500', 'text-green-500', 'text-primary'];
              const colorIdx = i % colors.length;
              
              const subProgress = getSubjectProgress(sub);

              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{sub}</span>
                    <span className={textColors[colorIdx]}>{subProgress === 0 ? "Sem dados" : `${subProgress}%`}</span>
                  </div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
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
