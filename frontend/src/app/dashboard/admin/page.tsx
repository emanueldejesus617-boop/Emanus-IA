"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Shield, Users, Zap, FileText, BookOpen, Flame } from "lucide-react";

type Stats = {
  totalStudents: number;
  averageXp: number;
  totalExams: number;
  totalCompletedTopics: number;
};

type User = {
  id: string;
  name: string;
  email: string;
  classe: string | null;
  curso: string | null;
  xp: number;
  streak: number;
  createdAt: string;
  lastLoginAt: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAdminData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // 1. Fetch stats
        const statsRes = await fetch("/api/admin/stats", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (statsRes.status === 403) {
          throw new Error("Acesso negado. Apenas administradores podem aceder a esta página.");
        }
        
        if (!statsRes.ok) throw new Error("Erro ao carregar estatísticas.");
        const statsData = await statsRes.json();
        setStats(statsData);

        // 2. Fetch users list
        const usersRes = await fetch("/api/admin/users", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!usersRes.ok) throw new Error("Erro ao carregar lista de utilizadores.");
        const usersData = await usersRes.json();
        setUsers(usersData);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erro desconhecido ao carregar dados.";
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, [router]);

  // Filter users based on search query and class filter
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesClass = classFilter === "" || u.classe === classFilter;
    
    return matchesSearch && matchesClass;
  });

  const classes = ["7.ª Classe", "8.ª Classe", "9.ª Classe", "10.ª Classe", "11.ª Classe", "12.ª Classe"];

  if (error) {
    return (
      <div className="p-8 pb-20 min-h-screen bg-dark flex items-center justify-center">
        <div className="max-w-md w-full bg-surface border border-danger/20 rounded-2xl p-8 text-center shadow-xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger border border-danger/25 mb-4 font-bold text-2xl">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Sem Autorização</h2>
          <p className="text-sm text-muted mb-6">{error}</p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-primary text-dark font-extrabold rounded-xl hover:opacity-90 transition-all cursor-pointer text-sm"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 pb-20 max-w-7xl mx-auto w-full min-h-screen bg-dark">
      <header className="mb-6 sm:mb-8 border-b border-surface/40 sm:border-0 pb-4 sm:pb-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-text flex items-center gap-2.5">
          <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" /> Painel de Controlo Administrativo
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted">Acompanha a adoção dos alunos, engajamento e métricas gerais da plataforma Emanus IA.</p>
      </header>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <h3 className="font-bold text-text">A carregar dados administrativos...</h3>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {/* Stats Cards Grid */}
          {stats && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted block font-medium">Alunos Inscritos</span>
                  <span className="text-2xl font-black text-text mt-1 block">{stats.totalStudents}</span>
                </div>
              </div>
              
              <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-xl font-bold shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted block font-medium">Média de XP</span>
                  <span className="text-2xl font-black text-text mt-1 block">{stats.averageXp} <span className="text-xs font-normal text-muted">XP/aluno</span></span>
                </div>
              </div>

              <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted block font-medium">Exames Realizados</span>
                  <span className="text-2xl font-black text-text mt-1 block">{stats.totalExams}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl font-bold shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-muted block font-medium">Aulas Concluídas</span>
                  <span className="text-2xl font-black text-text mt-1 block">{stats.totalCompletedTopics}</span>
                </div>
              </div>
            </div>
          )}

          {/* Student Management Section */}
          <div className="rounded-2xl border border-surface bg-surface p-6 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-text">Gestão de Alunos</h3>
                <p className="text-xs text-muted mt-1">Ranking de desempenho e dados de perfil dos estudantes em Angola.</p>
              </div>
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por nome ou email..."
                  className="bg-dark border border-muted/20 rounded-xl px-4 py-2 text-xs text-text focus:outline-none focus:border-primary/50 w-full sm:w-60"
                />
                
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-dark border border-muted/20 rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="">Todas as Classes</option>
                  {classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            {filteredUsers.length === 0 ? (
              <div className="py-12 border border-dashed border-muted/10 rounded-xl text-center text-muted text-xs">
                Nenhum estudante encontrado com os filtros indicados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-muted/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-dark/50 text-muted uppercase font-bold">
                    <tr>
                      <th className="p-4 border-b border-muted/10">Estudante</th>
                      <th className="p-4 border-b border-muted/10">Classe / Curso</th>
                      <th className="p-4 border-b border-muted/10">XP Acumulado</th>
                      <th className="p-4 border-b border-muted/10">Estudos (Streak)</th>
                      <th className="p-4 border-b border-muted/10">Último Acesso</th>
                      <th className="p-4 border-b border-muted/10">Data de Registo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/10">
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} className="hover:bg-dark/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-bold text-text text-sm">{u.name}</p>
                              <p className="text-[10px] text-muted">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {u.classe ? (
                            <div>
                              <span className="font-semibold text-text">{u.classe}</span>
                              {u.curso && <p className="text-[10px] text-muted truncate max-w-[150px]">{u.curso}</p>}
                            </div>
                          ) : (
                            <span className="text-muted/50 italic">Pendente</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-accent">{u.xp} XP</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-text">
                            {u.streak} <Flame className="w-3.5 h-3.5 text-accent" />
                          </span>
                        </td>
                        <td className="p-4 text-muted">
                          {u.lastLoginAt ? (
                            new Date(u.lastLoginAt).toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          ) : (
                            <span className="text-muted/40">—</span>
                          )}
                        </td>
                        <td className="p-4 text-muted">
                          {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
