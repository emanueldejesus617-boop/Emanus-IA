"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Shield,
  Users,
  Zap,
  FileText,
  BookOpen,
  Flame,
  Bug,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/components/toast";

type Stats = {
  totalUsers?: number;
  totalStudents: number;
  totalAdmins?: number;
  averageXp: number;
  totalExams: number;
  totalCompletedTopics: number;
  unresolvedErrors?: number;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student" | string;
  classe: string | null;
  curso: string | null;
  xp: number;
  streak: number;
  createdAt: string;
  lastLoginAt: string | null;
};

type ErrorReport = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  error: string;
  details: string | null;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  reportedByUser?: boolean;
};

const ITEMS_PER_PAGE = 15;

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "errors">("users");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
        headers: { Authorization: `Bearer ${token}` }
      });

      if (statsRes.status === 403) {
        throw new Error("Acesso negado. Apenas administradores podem aceder a esta página.");
      }

      if (!statsRes.ok) throw new Error("Erro ao carregar estatísticas.");
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Fetch users list (todas as contas registradas)
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error("Erro ao carregar lista de utilizadores.");
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);

      // 3. Fetch error reports (unresolved)
      const errorsRes = await fetch("/api/admin/errors?resolved=false", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (errorsRes.ok) {
        const errorsData = await errorsRes.json();
        setErrorReports(Array.isArray(errorsData) ? errorsData : []);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido ao carregar dados.";
      setError(errMsg);
      toast.error("Erro no Painel de Admin", errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [router]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, classFilter, roleFilter]);

  const handleResolveError = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setResolvingId(id);
    try {
      const res = await fetch(`/api/admin/errors/${id}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setErrorReports(prev => prev.filter(e => e.id !== id));
        setStats(prev => prev ? { ...prev, unresolvedErrors: Math.max(0, (prev.unresolvedErrors || 1) - 1) } : prev);
        toast.success("Erro resolvido", "O relatório foi marcado como resolvido com sucesso.");
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error("Erro ao resolver", errJson.error || "Não foi possível atualizar o estado do erro.");
      }
    } catch (err: any) {
      toast.error("Falha de conexão", err?.message || "Tente novamente mais tarde.");
    } finally {
      setResolvingId(null);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            totalUsers: Math.max(0, (prev.totalUsers || prev.totalStudents) - 1),
            totalStudents: Math.max(0, prev.totalStudents - 1)
          };
        });
        toast.success("Conta removida", "A conta do utilizador foi eliminada com sucesso da base de dados.");
      } else {
        toast.error("Não foi possível excluir", data.error || "Erro ao remover utilizador.");
      }
    } catch (err: any) {
      toast.error("Erro de rede", err?.message || "Não foi possível contactar o servidor.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Exportar dados para CSV
  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Nome", "Email", "Tipo de Conta", "Classe", "Curso", "XP", "Streak (Dias)", "Data de Registo", "Último Acesso"];
      const rows = filteredUsers.map(u => [
        `"${u.id}"`,
        `"${u.name.replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        `"${u.role === "admin" ? "Administrador" : "Estudante"}"`,
        `"${(u.classe || "N/A").replace(/"/g, '""')}"`,
        `"${(u.curso || "N/A").replace(/"/g, '""')}"`,
        u.xp || 0,
        u.streak || 0,
        `"${new Date(u.createdAt).toLocaleDateString("pt-PT")}"`,
        `"${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("pt-PT") : "Nunca"}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `emanus_utilizadores_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Relatório gerado", `${filteredUsers.length} contas exportadas com sucesso.`);
    } catch {
      toast.error("Erro ao exportar", "Não foi possível gerar o ficheiro CSV.");
    }
  };

  // Filter users based on search, class and role
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.curso && u.curso.toLowerCase().includes(q));

      const matchesClass = classFilter === "" || u.classe === classFilter;

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && u.role === "admin") ||
        (roleFilter === "student" && u.role !== "admin");

      return matchesSearch && matchesClass && matchesRole;
    });
  }, [users, search, classFilter, roleFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

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

  const totalRegisteredAccounts = stats?.totalUsers ?? users.length;
  const totalStudentCount = stats?.totalStudents ?? users.filter(u => u.role !== "admin").length;
  const totalAdminCount = stats?.totalAdmins ?? users.filter(u => u.role === "admin").length;

  return (
    <div className="p-4 sm:p-8 pb-20 max-w-7xl mx-auto w-full min-h-screen bg-dark">
      {/* Header */}
      <header className="mb-6 sm:mb-8 border-b border-surface/40 sm:border-0 pb-4 sm:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text flex items-center gap-2.5">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" /> Painel de Controlo Administrativo
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted">
            Todas as contas registadas na base de dados, métricas académicas e gestão de erros.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={filteredUsers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-muted/15 text-xs font-semibold text-text hover:border-primary/40 hover:text-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar dados filtrados para CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={loadAdminData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface hover:bg-surface/80 border border-muted/15 text-muted hover:text-primary transition-all cursor-pointer flex-shrink-0"
            title="Atualizar dados agora"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h3 className="font-bold text-text">A carregar dados administrativos...</h3>
          <p className="text-xs text-muted mt-1">Sincronizando com a base de dados Firestore</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Todas as Contas */}
            <div className="rounded-2xl border border-surface bg-surface p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted block font-medium truncate">Total de Contas</span>
                <span className="text-2xl font-black text-text mt-0.5 block">{totalRegisteredAccounts}</span>
                <span className="text-[10px] text-muted block mt-0.5">
                  {totalStudentCount} alunos · {totalAdminCount} admins
                </span>
              </div>
            </div>

            {/* Média XP */}
            <div className="rounded-2xl border border-surface bg-surface p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-xl font-bold shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted block font-medium truncate">Média de XP</span>
                <span className="text-2xl font-black text-text mt-0.5 block">
                  {stats?.averageXp || 0}{" "}
                  <span className="text-xs font-normal text-muted">XP/aluno</span>
                </span>
              </div>
            </div>

            {/* Exames */}
            <div className="rounded-2xl border border-surface bg-surface p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-xl font-bold shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted block font-medium truncate">Exames Feitos</span>
                <span className="text-2xl font-black text-text mt-0.5 block">{stats?.totalExams || 0}</span>
              </div>
            </div>

            {/* Aulas */}
            <div className="rounded-2xl border border-surface bg-surface p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl font-bold shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted block font-medium truncate">Aulas Concluídas</span>
                <span className="text-2xl font-black text-text mt-0.5 block">{stats?.totalCompletedTopics || 0}</span>
              </div>
            </div>

            {/* Erros pendentes */}
            <div
              className="rounded-2xl border border-surface bg-surface p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:border-danger/30 transition-all"
              onClick={() => setActiveTab("errors")}
            >
              <div className="h-12 w-12 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center text-xl font-bold shrink-0">
                <Bug className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-muted block font-medium truncate">Erros por Resolver</span>
                <span className="text-2xl font-black text-danger mt-0.5 block">
                  {stats?.unresolvedErrors ?? errorReports.length}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 border-b border-muted/10">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted hover:text-text"
                }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Todas as Contas ({users.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "errors" ? "border-danger text-danger" : "border-transparent text-muted hover:text-text"
                }`}
            >
              <span className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Relatórios de Erros
                {errorReports.length > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px] font-bold">
                    {errorReports.length}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* User Management Section */}
          {activeTab === "users" && (
            <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-md space-y-5">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-text">Contas Registadas na Base de Dados</h3>
                  <p className="text-xs text-muted mt-1">
                    Lista completa de administradores e estudantes com estatísticas de engajamento em tempo real.
                  </p>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Pesquisar por nome ou email..."
                      className="bg-dark border border-muted/20 rounded-xl pl-8 pr-4 py-2 text-xs text-text focus:outline-none focus:border-primary/50 w-full"
                    />
                  </div>

                  {/* Role filter */}
                  <div className="relative">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as any)}
                      className="bg-dark border border-muted/20 rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="all">Todos os Tipos ({users.length})</option>
                      <option value="student">Estudantes ({totalStudentCount})</option>
                      <option value="admin">Administradores ({totalAdminCount})</option>
                    </select>
                  </div>

                  {/* Class filter */}
                  <div className="relative">
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-dark border border-muted/20 rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="">Todas as Classes</option>
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              {filteredUsers.length === 0 ? (
                <div className="py-12 border border-dashed border-muted/15 rounded-xl text-center text-muted text-xs space-y-1">
                  <p className="font-semibold text-text">Nenhuma conta encontrada</p>
                  <p>Tenta ajustar os termos da pesquisa ou os filtros selecionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-muted/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-dark/50 text-muted uppercase font-bold text-[11px]">
                      <tr>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">Utilizador</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">Tipo / Papel</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">Classe / Curso</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">XP Acumulado</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">Streak</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">Último Acesso</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10">Registo</th>
                        <th className="p-3.5 sm:p-4 border-b border-muted/10 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/10">
                      {paginatedUsers.map((u, i) => {
                        const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                        const isAdmin = u.role === "admin" || u.email === "emanueldejesus617@gmail.com";

                        return (
                          <tr key={u.id} className="hover:bg-dark/25 transition-colors">
                            {/* User details */}
                            <td className="p-3.5 sm:p-4">
                              <div className="flex items-center gap-3">
                                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[11px] shrink-0">
                                  {globalIndex}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-text text-sm truncate max-w-[200px]">{u.name}</p>
                                  <p className="text-[11px] text-muted truncate max-w-[200px]">{u.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="p-3.5 sm:p-4">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/20 text-primary border border-primary/30">
                                  <ShieldCheck className="w-3 h-3" /> Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-muted bg-muted/10 border border-muted/15">
                                  <GraduationCap className="w-3 h-3" /> Estudante
                                </span>
                              )}
                            </td>

                            {/* Class/Course */}
                            <td className="p-3.5 sm:p-4">
                              {u.classe ? (
                                <div>
                                  <span className="font-semibold text-text">{u.classe}</span>
                                  {u.curso && <p className="text-[10px] text-muted truncate max-w-[150px]">{u.curso}</p>}
                                </div>
                              ) : (
                                <span className="text-muted/50 italic">Não definido</span>
                              )}
                            </td>

                            {/* XP */}
                            <td className="p-3.5 sm:p-4 font-bold text-accent">{u.xp || 0} XP</td>

                            {/* Streak */}
                            <td className="p-3.5 sm:p-4">
                              <span className="inline-flex items-center gap-1 font-semibold text-text">
                                {u.streak || 0} <Flame className="w-3.5 h-3.5 text-accent" />
                              </span>
                            </td>

                            {/* Last access */}
                            <td className="p-3.5 sm:p-4 text-muted text-[11px]">
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

                            {/* Registration date */}
                            <td className="p-3.5 sm:p-4 text-muted text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 sm:p-4 text-right">
                              {isAdmin ? (
                                <span className="text-[10px] text-muted italic">Protegido</span>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(u.id)}
                                  title="Excluir conta de utilizador"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/25 text-danger hover:bg-danger/10 hover:border-danger/50 transition-colors cursor-pointer text-[11px] font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Excluir</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-muted/10 text-xs text-muted">
                  <span>
                    A mostrar{" "}
                    <strong className="text-text">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
                    </strong>{" "}
                    de <strong className="text-text">{filteredUsers.length}</strong> contas
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-muted/15 hover:bg-dark text-text disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-2">
                      <span className="font-semibold text-text">{currentPage}</span>
                      <span>/</span>
                      <span>{totalPages}</span>
                    </div>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-muted/15 hover:bg-dark text-text disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Próxima página"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {confirmDeleteId && (() => {
            const targetUser = users.find((u) => u.id === confirmDeleteId);
            return (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface border border-danger/25 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-danger" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text text-sm">Excluir Conta</h3>
                      <p className="text-[11px] text-muted">Ação permanente e irreversível</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Tens a certeza que pretendes eliminar a conta de{" "}
                    <strong className="text-text font-bold">{targetUser?.name}</strong>{" "}
                    (<span className="text-primary font-mono">{targetUser?.email}</span>)?
                    Todos os dados associados serão removidos da base de dados.
                  </p>
                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 py-2.5 rounded-xl border border-muted/20 text-muted text-xs font-semibold hover:bg-dark/50 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleDeleteUser(confirmDeleteId)}
                      disabled={deletingId === confirmDeleteId}
                      className="flex-1 py-2.5 rounded-xl bg-danger text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {deletingId === confirmDeleteId ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          <span>A excluir...</span>
                        </>
                      ) : (
                        "Confirmar Exclusão"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Error Reports Section */}
          {activeTab === "errors" && (
            <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <Bug className="w-5 h-5 text-danger" />
                    Relatórios de Erros do Sistema
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Erros capturados automaticamente e relatórios submetidos pelos utilizadores.
                  </p>
                </div>
              </div>

              {errorReports.length === 0 ? (
                <div className="py-14 border border-dashed border-muted/15 rounded-xl text-center text-muted text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-9 h-9 text-primary/60" />
                  <span className="font-semibold text-text">Tudo em ordem! 🎉</span>
                  <span className="text-[11px] text-muted">Não há erros pendentes no sistema.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {errorReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl border border-muted/10 bg-dark/30 hover:border-muted/20 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${report.reportedByUser
                                ? "bg-secondary/15 text-secondary border border-secondary/20"
                                : "bg-danger/15 text-danger border border-danger/20"
                              }`}
                          >
                            {report.reportedByUser ? "Reportado por Utilizador" : "Erro Automático"}
                          </span>
                          <span className="text-[10px] text-muted font-mono bg-dark/40 px-2 py-0.5 rounded-md border border-muted/10">
                            {report.action}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-text font-medium break-words">{report.error}</p>
                        {report.details && (
                          <p className="text-[11px] text-muted font-mono mt-1 bg-dark/60 p-2 rounded-lg border border-muted/10 break-words">
                            {report.details}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted">
                          {report.userEmail && <span>👤 {report.userEmail}</span>}
                          <span>🕐 {new Date(report.createdAt).toLocaleString("pt-PT")}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResolveError(report.id)}
                        disabled={resolvingId === report.id}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolvingId === report.id ? (
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Resolver
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
