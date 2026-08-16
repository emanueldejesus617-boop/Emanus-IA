"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { X, GraduationCap, Rocket, Volume2 } from "lucide-react";
import { Logo } from "@/components/logo";


type User = {
  id: string;
  name: string;
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
    } else {
      setUser(JSON.parse(storedUser));
    }

    const storedPersonality = localStorage.getItem("emanus_personality");
    if (storedPersonality) {
      setPersonality(storedPersonality as any);
    }
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

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  const handleSavePersonality = (value: "step-by-step" | "direct" | "mixed") => {
    setPersonality(value);
    localStorage.setItem("emanus_personality", value);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("emanusPersonalityChanged"));
    }
  };

  return (
    <div className="flex h-screen bg-dark flex-col md:flex-row overflow-hidden relative transition-colors duration-300">
      {/* Mobile Header Bar */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-surface border-b border-muted/10 h-16 w-full shrink-0 z-30 sticky top-0">
        <Link href="/dashboard" className="cursor-pointer">
          <Logo variant="topbar" />
        </Link>
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-[0_0_12px_rgba(0,200,150,0.15)]">
                {user.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-text truncate max-w-[120px]">{user.name}</p>
                <p className="text-[11px] text-muted capitalize leading-none mt-0.5">{user.role}</p>
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
                    <span className="text-[10px] text-muted block uppercase">Co-fundador</span>
                    <strong className="text-text font-semibold">Alfredo Rodriguez</strong>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-[10px] text-muted block uppercase">Equipa de Programadores</span>
                    <strong className="text-text font-semibold">Emanuel De Jesus & Dewers Matari</strong>
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
    </div>
  );
}
