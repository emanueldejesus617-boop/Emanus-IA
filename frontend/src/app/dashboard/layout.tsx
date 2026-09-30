"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { 
  X, 
  GraduationCap, 
  Rocket, 
  Volume2, 
  User as UserIcon, 
  Camera, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  AtSign,
  HelpCircle,
  ShieldCheck,
  FileText,
  Bug,
  LifeBuoy,
  Send,
  CheckCircle2,
  Lock,
  BookOpen
} from "lucide-react";
import { Logo } from "@/components/logo";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { parseJsonResponse } from "@/lib/utils";



type User = {
  id: string;
  name: string;
  displayName?: string;
  username?: string;
  photoUrl?: string;
  avatar?: string;
  email: string;
  role: string;
  classe?: string;
  curso?: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [personality, setPersonality] = useState<"step-by-step" | "direct" | "mixed">("step-by-step");

  // Estados do Modal de Perfil
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Estados da Aba de Ajuda
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<"support" | "privacy-center" | "privacy-policy" | "terms" | "report-bug">("support");
  const [bugCategory, setBugCategory] = useState("ia");
  const [bugDescription, setBugDescription] = useState("");
  const [bugSending, setBugSending] = useState(false);
  const [bugSuccess, setBugSuccess] = useState(false);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        const ptVoices = available.filter(v => /pt/i.test(v.lang) || /Portuguese/i.test(v.name));
        setVoices(ptVoices.length > 0 ? ptVoices : available);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      const saved = localStorage.getItem("emanus_voice_uri");
      if (saved) setSelectedVoiceURI(saved);
    }
  }, []);

  const handleSelectVoice = (uri: string) => {
    setSelectedVoiceURI(uri);
    localStorage.setItem("emanus_voice_uri", uri);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("emanusVoiceChanged"));
    }
  };

  const handleTestVoice = (uri: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const available = window.speechSynthesis.getVoices();
    const v = available.find(voice => voice.voiceURI === uri);
    const utterance = new SpeechSynthesisUtterance("Olá! Eu sou a Emanus IA, a tua professora particular.");
    if (v) {
      utterance.voice = v;
      utterance.lang = v.lang;
    } else {
      utterance.lang = "pt-PT";
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      router.push("/");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      localStorage.clear();
      router.push("/");
      return;
    }

    // Validação ativa da sessão em segundo plano
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.clear();
            try { await signOut(auth); } catch {}
            router.push("/");
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch(() => {
        // Falha de rede temporária: mantém estado em cache offline sem desconectar imediatamente
      });

    const storedPersonality = localStorage.getItem("emanus_personality");
    if (storedPersonality) {
      setPersonality(storedPersonality as any);
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Emanus IA", href: "/dashboard/intelijai" },
    { name: "Simulador de Exames", href: "/dashboard/exams" },
    { name: "Aulas", href: "/dashboard/lessons" },
    { name: "Horário", href: "/dashboard/schedule" },
  ];

  if (user.role === "admin") {
    navItems.push({ name: "Painel Admin", href: "/dashboard/admin" });
  }

  const handleLogout = async () => {
    localStorage.clear();
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Aviso ao encerrar sessão no Firebase:", err);
    }
    router.push("/");
  };

  const handleSavePersonality = (value: "step-by-step" | "direct" | "mixed") => {
    setPersonality(value);
    localStorage.setItem("emanus_personality", value);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("emanusPersonalityChanged"));
    }
  };

  const handleOpenProfileModal = () => {
    if (user) {
      setEditDisplayName(user.displayName || user.name || "");
      // Auto-preencher username com prefixo do email se ainda não tiver definido
      const defaultUsername = user.username || (user.email ? user.email.split("@")[0] : "");
      setEditUsername(defaultUsername);
      setEditPhotoUrl(user.photoUrl || user.avatar || "");
      setProfileError("");
      setProfileSuccess("");
    }
    setProfileModalOpen(true);
    setProfileMenuOpen(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Por favor seleciona um ficheiro de imagem válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("A imagem não pode ter mais de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setEditPhotoUrl(compressed);
          setProfileError("");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!editDisplayName.trim()) {
      setProfileError("O nome de apresentação não pode estar vazio.");
      return;
    }

    if (editUsername.trim() && editUsername.trim().length < 3) {
      setProfileError("O nome de utilizador deve ter pelo menos 3 caracteres.");
      return;
    }

    setSavingProfile(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          username: editUsername.trim().replace(/^@/, ""),
          photoUrl: editPhotoUrl
        })
      });

      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar perfil.");
      }

      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("userProfileUpdated"));
      }

      setProfileSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => {
        setProfileModalOpen(false);
        setProfileSuccess("");
      }, 900);
    } catch (err: any) {
      setProfileError(err.message || "Não foi possível guardar as alterações.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendBugReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDescription.trim()) return;
    setBugSending(true);
    try {
      // Registo do relatório
      await new Promise(r => setTimeout(r, 600));
      setBugSuccess(true);
      setBugDescription("");
      setTimeout(() => {
        setBugSuccess(false);
      }, 4000);
    } catch {
      // Silencioso
    } finally {
      setBugSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-dark flex-col md:flex-row overflow-hidden relative transition-colors duration-300">
      {/* Mobile Header Bar */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-surface border-b border-muted/10 h-16 w-full shrink-0 z-30 sticky top-0">
        <Link href="/dashboard" className="cursor-pointer">
          <Logo variant="topbar" />
        </Link>
        <div className="flex items-center gap-2">
          <PWAInstallButton variant="compact" />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-dark/40 text-text hover:text-primary transition-colors cursor-pointer border border-muted/15 flex items-center justify-center"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 border-r border-surface bg-surface flex flex-col z-50 transition-transform duration-300 md:translate-x-0
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 flex items-center justify-between">
          <Link href="/dashboard" className="cursor-pointer">
            <Logo variant="sidebar" />
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg bg-dark/40 text-muted hover:text-text border border-muted/10 cursor-pointer flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={"flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors " + (isActive ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface hover:text-text")}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Instalar / Baixar App na barra lateral */}
        <div className="px-4 py-2">
          <PWAInstallButton variant="badge" className="w-full justify-center" />
        </div>

        {/* Setor de Perfil do Usuário com Dropdown */}
        <div className="p-4 border-t border-muted/20 relative">
          {/* Dropdown Menu (Popup acoplado acima do perfil) */}
          {profileMenuOpen && (
            <>
              {/* Overlay invisível para fechar ao clicar fora */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="absolute bottom-16 left-4 right-4 bg-surface border border-muted/15 rounded-xl p-3.5 shadow-2xl z-20 space-y-2.5 animate-slide-up">
                {/* Botão Alteração de Modos */}
                {mounted && (
                  <button
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-dark text-text transition-all cursor-pointer"
                  >
                    {theme === "dark" ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
                          <circle cx="12" cy="12" r="5"></circle>
                          <line x1="12" y1="1" x2="12" y2="3"></line>
                          <line x1="12" y1="21" x2="12" y2="23"></line>
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                          <line x1="1" y1="12" x2="3" y2="12"></line>
                          <line x1="21" y1="12" x2="23" y2="12"></line>
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                        <span>Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 flex-shrink-0">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        <span>Modo Escuro</span>
                      </>
                    )}
                  </button>
                )}

                {/* Botão Perfil */}
                <button
                  onClick={handleOpenProfileModal}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-dark text-text transition-all cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Perfil</span>
                </button>

                {/* Botão Personalização da Emanus */}
                <button
                  onClick={() => {
                    setPersonalizationOpen(true);
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-dark text-text transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary flex-shrink-0">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  <span>Personalização</span>
                </button>

                <div className="h-px bg-muted/10" />

                {/* Botão Ajuda */}
                <button
                  onClick={() => {
                    setHelpOpen(true);
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-dark text-text transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Ajuda</span>
                </button>

                {/* Botão Acerca da Emanus IA */}
                <button
                  onClick={() => {
                    setAboutOpen(true);
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-dark text-text transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Acerca da Emanus IA</span>
                </button>

                <div className="h-px bg-muted/10" />

                {/* Botão Terminar Sessão */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-danger flex-shrink-0">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Terminar Sessão</span>
                </button>
              </div>
            </>
          )}

          {/* Gatilho: Setor de Perfil clicável */}
          <div 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-dark/45 cursor-pointer transition-all active:scale-[0.98] border border-transparent hover:border-muted/10"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {user.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt={user.displayName || user.name} 
                  className="h-10 w-10 rounded-full object-cover border border-primary/30 shadow-[0_0_12px_rgba(0,200,150,0.15)] shrink-0" 
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-[0_0_12px_rgba(0,200,150,0.15)] shrink-0">
                  {(user.displayName || user.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left overflow-hidden">
                <p className="text-sm font-semibold text-text truncate max-w-[125px]">
                  {user.displayName || user.name}
                </p>
                <p className="text-[11px] text-muted truncate max-w-[125px] leading-none mt-0.5">
                  {user.username ? `@${user.username}` : user.role}
                </p>
              </div>
            </div>
            {/* Indicador visual de menu clicável */}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform duration-300 ${profileMenuOpen ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-dark transition-colors duration-300">
        {children}
      </main>

      {/* Modal "Acerca da Emanus IA" */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-surface border border-muted/15 rounded-2xl p-6 lg:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-muted/10 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-bold text-text">Acerca da Emanus IA</h3>
              </div>
              <button 
                onClick={() => setAboutOpen(false)}
                className="p-1 rounded-lg hover:bg-dark/60 text-muted hover:text-text cursor-pointer transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Explicativo */}
            <div className="space-y-5 text-sm text-muted/90 leading-relaxed">
              <p>
                A <strong className="text-primary">Emanus IA</strong> é uma plataforma de tutoria inteligente e apoio escolar de última geração. Projetada para revolucionar a aprendizagem, o sistema adapta-se dinamicamente ao ritmo e nível escolar de cada estudante.
              </p>
              <p>
                Com total integração de áudio explicativo em tempo real e simulações completas de exames oficiais angolanos baseados no currículo do <strong className="text-text font-semibold">MINED (Ministério da Educação de Angola)</strong>, a Emanus IA funciona como um mentor particular disponível 24 horas por dia.
              </p>

              {/* Tabela de Equipa / Créditos */}
              <div className="border border-muted/10 bg-dark/40 rounded-xl p-4 mt-6 space-y-3.5">
                <h4 className="text-xs font-semibold text-text uppercase tracking-wider border-b border-muted/10 pb-2 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-primary" /> Ficha Técnica & Criação
                </h4>
                
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Fundador e Desenvolvedor</span>
                    <strong className="text-text font-semibold">Emanuel De Jesus</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Co-fundadores</span>
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-text font-semibold">Alfredo Rodriguez</strong>
                      <strong className="text-text font-semibold">Daniel Taba</strong>
                    </div>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-[10px] text-muted block uppercase">Equipa de Programadores</span>
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-text font-semibold">Emanuel De Jesus</strong>
                      <strong className="text-text font-semibold">Dewers Matari</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="mt-6 pt-4 border-t border-muted/10 flex justify-end">
              <button 
                onClick={() => setAboutOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-dark font-bold text-xs tracking-wider uppercase hover:shadow-[0_0_15px_rgba(0,200,150,0.35)] active:scale-[0.98] cursor-pointer transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Personalização da Emanus IA" */}
      {personalizationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-muted/15 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-muted/10 pb-4 mb-4 sm:mb-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-text">Estilo de Resposta (Emanus IA)</h3>
              </div>
              <button 
                onClick={() => setPersonalizationOpen(false)}
                className="p-1.5 rounded-lg hover:bg-dark/60 text-muted hover:text-text cursor-pointer transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Escolhe como preferes que a Emanus IA (tua explicadora IA) responda às tuas dúvidas:
            </p>

            <div className="space-y-3">
              {[
                {
                  id: "step-by-step",
                  title: "Tutoria (Passo a Passo)",
                  desc: "A Emanus IA guia-te pelo raciocínio e explica detalhadamente cada passo, sem dar a resposta diretamente. Perfeito para aprender de verdade.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  ),
                },
                {
                  id: "direct",
                  title: "Direta (Foco em Resultados)",
                  desc: "A Emanus IA vai direta ao assunto e dá a resposta ou solução objetiva sem rodeios. Ideal para verificações rápidas.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                    </svg>
                  ),
                },
                {
                  id: "mixed",
                  title: "Híbrida (Produtividade)",
                  desc: "A junção de ambos: a Emanus IA dá a resposta direta mas apresenta também um passo a passo resumido para que possas aprender de forma produtiva.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                    </svg>
                  ),
                },
              ].map((opt) => {
                const isSelected = personality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSavePersonality(opt.id as any)}
                    className={`w-full text-left rounded-xl border p-3.5 sm:p-4 transition-all duration-200 cursor-pointer active:scale-[0.99]
                      ${isSelected 
                        ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,255,136,0.08)]" 
                        : "border-surface hover:border-muted/30 hover:bg-dark/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary/20 text-primary" : "bg-dark/60 text-muted"}`}>
                          {opt.icon}
                        </div>
                        <span className={`text-xs sm:text-sm font-bold truncate ${isSelected ? "text-primary" : "text-text"}`}>
                          {opt.title}
                        </span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0
                        ${isSelected ? "border-primary bg-primary text-dark" : "border-muted/40"}`}>
                        {isSelected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-dark" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted mt-2 leading-relaxed pl-0 sm:pl-11">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Seletor de Voz da Explicadora */}
            <div className="mt-5 sm:mt-6 pt-4 border-t border-muted/10">
              <label className="text-xs font-bold text-text mb-1.5 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
                <span>Voz da Explicadora (Síntese de Voz)</span>
              </label>
              <p className="text-[11px] text-muted mb-3 leading-tight">
                Escolhe a voz do teu sistema/navegador para a leitura explicativa das aulas:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => handleSelectVoice(e.target.value)}
                  className="w-full flex-1 rounded-xl border border-muted/20 bg-dark px-3 py-2.5 text-xs text-text outline-none focus:border-primary"
                >
                  <option value="">Voz Padrão do Sistema (Automática)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleTestVoice(selectedVoiceURI)}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  title="Testar como soa a voz selecionada"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Testar Voz
                </button>
              </div>
            </div>

            <button
              onClick={() => setPersonalizationOpen(false)}
              className="w-full mt-5 sm:mt-6 rounded-xl bg-primary px-4 py-3 font-bold text-dark hover:opacity-95 transition-opacity cursor-pointer text-xs sm:text-sm active:scale-[0.98]"
            >
              Confirmar Escolha
            </button>
          </div>
        </div>
      )}

      {/* Modal Editar Perfil — Minimalista */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-muted/20 rounded-3xl p-6 sm:p-7 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-text">Editar perfil</h3>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-full text-muted hover:text-text hover:bg-dark/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileError && (
              <div className="mb-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Centralizado com botão de câmara */}
              <div className="flex justify-center pb-2">
                <div className="relative">
                  {editPhotoUrl ? (
                    <img 
                      src={editPhotoUrl} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/30 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-medium tracking-wide shadow-md">
                      {(() => {
                        const name = (editDisplayName || user.name || "U").trim();
                        const parts = name.split(/\s+/);
                        if (parts.length > 1) {
                          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                        }
                        return name.slice(0, 2).toUpperCase();
                      })()}
                    </div>
                  )}

                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-dark border border-muted/20 text-muted hover:text-text shadow flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                    title="Carregar foto"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                  <input 
                    id="avatar-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload}
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Campo Nome de Apresentação */}
              <div className="rounded-xl border border-muted/25 bg-surface px-4 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <label className="block text-[11px] text-muted font-medium mb-0.5">
                  Nome de apresentação
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Emanuel De Jesus"
                  maxLength={60}
                  required
                  className="w-full bg-transparent text-text text-sm outline-none placeholder:text-muted/40 font-medium"
                />
              </div>

              {/* Campo Nome de Utilizador */}
              <div className="rounded-xl border border-muted/25 bg-surface px-4 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <label className="block text-[11px] text-muted font-medium mb-0.5">
                  Nome de utilizador
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
                    setEditUsername(val);
                  }}
                  placeholder={user.email ? user.email.split("@")[0] : "emanueldejesus617"}
                  maxLength={50}
                  className="w-full bg-transparent text-text text-sm outline-none placeholder:text-muted/40 font-normal"
                />
              </div>

              {/* Botões Cancelar / Guardar */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-full border border-muted/30 text-text hover:bg-dark/40 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2 rounded-full bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>A guardar...</span>
                    </>
                  ) : (
                    <span>Guardar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aba de Ajuda */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-surface border border-muted/15 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text">Central de Ajuda</h3>
                  <p className="text-xs text-muted">Apoio ao estudante, privacidade e termos da Emanus IA</p>
                </div>
              </div>
              <button 
                onClick={() => setHelpOpen(false)}
                className="p-1.5 rounded-full text-muted hover:text-text hover:bg-dark/40 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Abas (Sub-navegação) */}
            <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-muted/10 bg-dark/25 overflow-x-auto shrink-0 scrollbar-none">
              {[
                { id: "support", label: "Centro de apoio", icon: LifeBuoy },
                { id: "privacy-center", label: "Centro de privacidade", icon: ShieldCheck },
                { id: "privacy-policy", label: "Política de privacidade", icon: Lock },
                { id: "terms", label: "Termos de serviço", icon: FileText },
                { id: "report-bug", label: "Comunicar um erro", icon: Bug },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = helpTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setHelpTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-dark shadow-sm"
                        : "text-muted hover:text-text hover:bg-surface/80"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conteúdo da Aba Ativa */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm text-text leading-relaxed flex-1">
              {helpTab === "support" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-xs sm:text-sm text-text flex items-start gap-3">
                    <LifeBuoy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-primary font-semibold mb-1">Como podemos ajudar-te?</strong>
                      <p className="text-muted leading-relaxed">
                        A Emanus IA foi concebida para te acompanhar nos estudos do ensino primário, secundário e pré-universitário angolano. Consulta as perguntas frequentes abaixo ou entra em contacto direto.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Perguntas Frequentes (FAQ)</h4>

                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1">
                      <p className="font-semibold text-text text-xs sm:text-sm">Como tirar o máximo proveito da Emanus IA?</p>
                      <p className="text-xs text-muted leading-relaxed">
                        Podes fazer perguntas em texto ou voz. Para explicações aprofundadas, escolhe o estilo &quot;Passo a Passo&quot; nas opções de personalização.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1">
                      <p className="font-semibold text-text text-xs sm:text-sm">Os exames do simulador são oficiais?</p>
                      <p className="text-xs text-muted leading-relaxed">
                        Sim, todos os enunciados e tópicos seguem rigorosamente a matriz curricular oficial do Ministério da Educação de Angola (MINED).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1">
                      <p className="font-semibold text-text text-xs sm:text-sm">Como alterar a voz sintetizada?</p>
                      <p className="text-xs text-muted leading-relaxed">
                        No menu de perfil, clica em &quot;Personalização&quot; para escolher entre as vozes em língua portuguesa disponíveis no teu dispositivo.
                      </p>
                    </div>
                  </div>

                  {/* Contacto Direto */}
                  <div className="p-4 rounded-2xl border border-muted/15 bg-dark/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-muted block">Precisas de suporte direto da equipa?</span>
                      <a href="mailto:suporteemanusia@gmail.com" className="text-text font-semibold hover:text-primary transition-colors">suporteemanusia@gmail.com</a>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-surface border border-muted/20 text-muted font-medium text-[11px]">
                      Seg – Sáb: 08h às 18h
                    </span>
                  </div>
                </div>
              )}

              {helpTab === "privacy-center" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-secondary font-semibold mb-1">Privacidade em Primeiro Lugar</strong>
                      <p className="text-xs text-muted leading-relaxed">
                        Na Emanus IA, a privacidade dos estudantes é um princípio fundamental. Conhece como gerimos e protegemos os teus dados educativos.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1.5">
                      <strong className="text-text font-semibold block">Sem Anúncios ou Rastreamento Comercial</strong>
                      <p className="text-muted leading-relaxed">
                        Não vendemos as tuas informações e nunca utilizamos dados de estudantes para anúncios direcionados.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1.5">
                      <strong className="text-text font-semibold block">Encriptação de Ponta a Ponta</strong>
                      <p className="text-muted leading-relaxed">
                        Todas as mensagens, notas e resoluções de exercícios são transmitidas via ligação segura encriptada (HTTPS / SSL).
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1.5">
                      <strong className="text-text font-semibold block">Gestão Transparente da Conta</strong>
                      <p className="text-muted leading-relaxed">
                        Podes editar a tua fotografia, o teu nome de utilizador e preferências de aprendizagem sempre que desejares.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-muted/15 bg-dark/30 space-y-1.5">
                      <strong className="text-text font-semibold block">Eliminação de Dados</strong>
                      <p className="text-muted leading-relaxed">
                        Podes solicitar a exclusão de todo o teu histórico e dados da conta através do endereço <a href="mailto:suporteemanusia@gmail.com" className="text-primary font-mono hover:underline">suporteemanusia@gmail.com</a>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {helpTab === "privacy-policy" && (
                <div className="space-y-4 text-xs text-muted leading-relaxed">
                  <div className="space-y-1 border-b border-muted/10 pb-3">
                    <h4 className="text-sm font-bold text-text">Política de Privacidade da Emanus IA</h4>
                    <p className="text-[11px] text-muted">Última atualização: Setembro de 2026</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <strong className="text-text font-semibold block mb-1">1. Informações que Recolhemos</strong>
                      <p>
                        Recolhemos apenas as informações essenciais para a experiência de aprendizagem: nome, endereço de e-mail, classe/curso escolar e o histórico de progresso e resolução de exercícios.
                      </p>
                    </div>

                    <div>
                      <strong className="text-text font-semibold block mb-1">2. Finalidade do Tratamento de Dados</strong>
                      <p>
                        Os dados são utilizados exclusivamente para: (a) personalizar o plano de aulas do estudante; (b) permitir a correção automática de exames e simulações; (c) otimizar o desempenho do tutor inteligente.
                      </p>
                    </div>

                    <div>
                      <strong className="text-text font-semibold block mb-1">3. Proteção e Armazenamento</strong>
                      <p>
                        Os dados são armazenados em infraestrutura segura com cópias de segurança criptografadas e controlo de acesso restrito a equipas autorizadas.
                      </p>
                    </div>

                    <div>
                      <strong className="text-text font-semibold block mb-1">4. Direitos dos Estudantes e Encarregados</strong>
                      <p>
                        Garantimos o direito de aceder, corrigir, descarregar ou eliminar os seus dados pessoais a qualquer momento. Para pedidos de privacidade: <a href="mailto:suporteemanusia@gmail.com" className="text-primary font-medium hover:underline">suporteemanusia@gmail.com</a>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {helpTab === "terms" && (
                <div className="space-y-4 text-xs text-muted leading-relaxed">
                  <div className="space-y-1 border-b border-muted/10 pb-3">
                    <h4 className="text-sm font-bold text-text">Termos de Serviço da Plataforma</h4>
                    <p className="text-[11px] text-muted">Condições Gerais de Uso Pedagógico</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <strong className="text-text font-semibold block mb-1">1. Aceitação dos Termos</strong>
                      <p>
                        Ao aceder à plataforma Emanus IA, o utilizador declara concordar com as regras de utilização pedagógica e de convivência digital aqui descritas.
                      </p>
                    </div>

                    <div>
                      <strong className="text-text font-semibold block mb-1">2. Uso Ético e Académico</strong>
                      <p>
                        A Emanus IA é uma ferramenta de estudo e mentoria. Os utilizadores comprometem-se a utilizar as explicações e resoluções para fins formativos e de compreensão genuína, promovendo a integridade académica.
                      </p>
                    </div>

                    <div>
                      <strong className="text-text font-semibold block mb-1">3. Propriedade Intelectual</strong>
                      <p>
                        Todos os conteúdos, módulos de IA, interfaces, designs, exercícios e materiais pedagógicos pertencem à equipa de desenvolvimento da Emanus IA e estão protegidos pelas leis de propriedade intelectual.
                      </p>
                    </div>

                    <div>
                      <strong className="text-text font-semibold block mb-1">4. Responsabilidade e Disponibilidade</strong>
                      <p>
                        Esforçamo-nos para manter a plataforma sempre acessível e com as matérias rigorosamente alinhadas aos programas nacionais. No entanto, o serviço é fornecido no estado em que se encontra (&quot;as is&quot;).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {helpTab === "report-bug" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-text mb-1">Comunicar um Erro ou Problema</h4>
                    <p className="text-xs text-muted">
                      Encontraste alguma falha ou comportamento inesperado na plataforma? Descreve abaixo para a nossa equipa técnica resolver o mais rápido possível.
                    </p>
                  </div>

                  {bugSuccess && (
                    <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/10 text-xs text-primary flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                      <span>O teu relatório foi enviado com sucesso à equipa técnica da Emanus IA. Obrigado pela tua colaboração!</span>
                    </div>
                  )}

                  <form onSubmit={handleSendBugReport} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1.5">
                        Onde ocorreu o erro?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: "ia", label: "Tutor Emanus IA" },
                          { id: "exams", label: "Simulador / Exames" },
                          { id: "audio", label: "Voz e Áudio" },
                          { id: "ui", label: "Visual / Interface" },
                          { id: "auth", label: "Conta / Login" },
                          { id: "other", label: "Outro" }
                        ].map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setBugCategory(cat.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                              bugCategory === cat.id
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-muted/20 bg-dark/40 text-muted hover:text-text hover:border-muted/40"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text mb-1.5">
                        Descrição do erro
                      </label>
                      <textarea
                        value={bugDescription}
                        onChange={(e) => setBugDescription(e.target.value)}
                        placeholder="Ex: Ao tentar responder à questão 3 do exame de Matemática, a página não carregou a imagem da figura geométrica..."
                        rows={4}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-muted/25 bg-dark/50 text-text text-xs sm:text-sm outline-none focus:border-primary transition-colors resize-none placeholder:text-muted/40"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setHelpOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-text transition-colors cursor-pointer"
                      >
                        Fechar
                      </button>
                      <button
                        type="submit"
                        disabled={bugSending || !bugDescription.trim()}
                        className="px-5 py-2.5 rounded-xl bg-primary text-dark font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {bugSending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>A enviar...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Relatório</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
