"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle, Smartphone, Monitor, X, Share, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallButtonProps {
  className?: string;
  variant?: "button" | "badge" | "compact";
}

export function PWAInstallButton({ className = "", variant = "button" }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "pc">("android");

  useEffect(() => {
    // 1. Verificar se já está a correr como app instalada (standalone)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // 2. Detetar iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);
    if (isIosDevice) {
      setActiveTab("ios");
    } else if (/windows|macintosh|linux/.test(ua) && !/android/.test(ua)) {
      setActiveTab("pc");
    } else {
      setActiveTab("android");
    }

    // 3. Capturar o evento nativo do browser de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Detetar quando a instalação for concluída com sucesso
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowModal(false);
    });

    // 5. Registar o Service Worker para garantir prontidão PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registado com sucesso para a Emanus IA:", reg.scope);
        })
        .catch((err) => {
          console.warn("Registo de Service Worker:", err);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Disparar o prompt nativo do Chrome / Edge / Android
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setIsInstallable(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowModal(true);
      }
    } else {
      // Caso não tenha prompt automático ativo no momento (ex: iOS Safari ou Chrome desktop)
      setShowModal(true);
    }
  };

  // Se já estiver instalada em modo standalone, ocultar o botão
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Botão de Download / Instalação */}
      {variant === "compact" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/20 hover:border-primary/40 active:scale-95 transition-all cursor-pointer ${className}`}
          title="Baixar aplicativo Emanus IA"
        >
          <Download className="w-3.5 h-3.5 shrink-0 animate-bounce" />
          <span>Baixar App</span>
        </button>
      ) : variant === "badge" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 border border-muted/20 text-xs font-medium text-text hover:border-primary/40 hover:text-primary active:scale-95 transition-all shadow-md cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold">Instalar App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary/20 via-surface to-surface border border-primary/30 text-text font-bold text-xs tracking-wide uppercase hover:border-primary hover:shadow-[0_0_20px_rgba(0,229,153,0.3)] active:scale-95 transition-all shadow-lg cursor-pointer ${className}`}
          id="btn-download-app"
        >
          <span className="p-1.5 rounded-lg bg-primary/20 text-primary group-hover:bg-primary group-hover:text-dark transition-colors">
            <Download className="w-4 h-4" />
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-muted font-normal normal-case leading-none">Aplicativo Oficial</span>
            <span className="text-text group-hover:text-primary transition-colors text-xs font-bold leading-tight">
              Baixar App
            </span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-primary/70 shrink-0" />
        </button>
      )}

      {/* Modal Interativo com Guia de Download / Instalação */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/80 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-muted/20 bg-surface/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-scale-up space-y-6">
            {/* Fechar */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-muted hover:text-text hover:bg-dark/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shrink-0">
                <img src="/icon-192.png" alt="Emanus IA" className="w-10 h-10 object-contain rounded-xl" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Instalar Aplicação
                </span>
                <h3 className="text-xl font-bold text-text">Emanus IA no teu Ecrã</h3>
                <p className="text-xs text-muted">Acesso rápido, modo tela inteira e sem precisar abrir o navegador.</p>
              </div>
            </div>

            {/* Seletor de Plataforma */}
            <div className="flex items-center p-1 rounded-2xl bg-dark/50 border border-muted/15 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "android"
                    ? "bg-primary text-dark shadow-md"
                    : "text-muted hover:text-text"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "ios"
                    ? "bg-primary text-dark shadow-md"
                    : "text-muted hover:text-text"
                }`}
              >
                <Share className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pc")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "pc"
                    ? "bg-primary text-dark shadow-md"
                    : "text-muted hover:text-text"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Computador</span>
              </button>
            </div>

            {/* Conteúdo de Instruções */}
            <div className="space-y-3">
              {activeTab === "android" && (
                <div className="space-y-3 rounded-2xl border border-muted/15 bg-dark/40 p-4 text-xs text-muted leading-relaxed">
                  {deferredPrompt ? (
                    <div className="text-center py-2 space-y-3">
                      <p className="text-text font-medium">O teu navegador está pronto para baixar a aplicação diretamente!</p>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-3 rounded-xl bg-primary text-dark font-bold text-sm uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Download className="w-4 h-4" /> Instalar Agora no Android
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                        <span>No Chrome do teu telemóvel, clica no menu de <strong>três pontos (⋮)</strong> no canto superior direito.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                        <span>Clica na opção <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar ao ecrã principal&quot;</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                        <span>Confirma em <strong>Instalar</strong>. O ícone da Emanus IA surgirá diretamente na tua gaveta de aplicações!</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ios" && (
                <div className="space-y-2.5 rounded-2xl border border-muted/15 bg-dark/40 p-4 text-xs text-muted leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>No navegador <strong>Safari</strong> do iPhone/iPad, toca no botão de <strong>Partilha</strong> (ícone com quadrado e seta a apontar para cima <Share className="w-3.5 h-3.5 inline mx-1 text-primary" />).</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Desliza para baixo e toca em <strong>&quot;Adicionar ao Ecrã Principal&quot;</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Toca em <strong>Adicionar</strong> no canto superior direito. Pronto! O app fica disponível no teu iPhone.</span>
                  </div>
                </div>
              )}

              {activeTab === "pc" && (
                <div className="space-y-3 rounded-2xl border border-muted/15 bg-dark/40 p-4 text-xs text-muted leading-relaxed">
                  {deferredPrompt ? (
                    <div className="text-center py-2 space-y-3">
                      <p className="text-text font-medium">O teu computador suporta a instalação da aplicação nativa!</p>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-3 rounded-xl bg-primary text-dark font-bold text-sm uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Download className="w-4 h-4" /> Instalar Aplicativo no Computador
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                        <span>Na barra de endereço do Chrome ou Edge, repara no ícone de <strong>instalação/computador</strong> no lado direito.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                        <span>Clica em <strong>&quot;Instalar Emanus IA&quot;</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                        <span>Abre uma janela independente e cria um atalho no teu Ambiente de Trabalho / Barra de Tarefas!</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vantagens */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-muted/10 text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Acesso offline rápido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Sem barras de navegação</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Carregamento instantâneo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Atualizações automáticas</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl bg-dark/60 border border-muted/20 text-xs font-semibold text-text hover:border-primary/40 transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
