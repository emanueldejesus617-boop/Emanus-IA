"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, X, Share2, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallButtonProps {
  className?: string;
  variant?: "minimal" | "icon" | "sidebar";
  showLabel?: boolean;
}

export function PWAInstallButton({ 
  className = "", 
  variant = "minimal",
  showLabel = true 
}: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [activeTab, setActiveTab] = useState<"mobile" | "ios" | "pc">("mobile");

  useEffect(() => {
    // 1. Verificar se já está a correr como app instalada (standalone)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // 2. Detetar iOS / PC
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setActiveTab("ios");
    } else if (/windows|macintosh|linux/.test(ua) && !/android/.test(ua)) {
      setActiveTab("pc");
    } else {
      setActiveTab("mobile");
    }

    // 3. Capturar o evento nativo de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Detetar quando a instalação for concluída
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  // Se já estiver instalada em modo standalone, oculta o botão discretamente
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Variante: Barra Lateral do Dashboard (limpo, discreto como item de menu) */}
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-text hover:bg-muted/10 active:scale-98 transition-all cursor-pointer w-full text-left ${className}`}
          title="Instalar Emanus IA no teu dispositivo"
        >
          <Download className="w-4 h-4 text-primary shrink-0 opacity-80" />
          <span className="truncate">Instalar Aplicação</span>
        </button>
      ) : variant === "icon" ? (
        /* Variante: Apenas Ícone Minimalista */
        <button
          type="button"
          onClick={handleInstallClick}
          className={`p-2.5 rounded-2xl border border-muted/15 bg-surface/80 backdrop-blur-md text-text/80 hover:text-primary hover:border-primary/30 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer ${className}`}
          title="Instalar Emanus IA"
          aria-label="Instalar Emanus IA"
        >
          <Download className="w-4 h-4" />
        </button>
      ) : (
        /* Variante: Minimal (Pill discreto e elegante com texto limpo) */
        <button
          type="button"
          onClick={handleInstallClick}
          className={`h-11 px-3.5 rounded-2xl border border-muted/15 bg-surface/80 backdrop-blur-md text-text/80 hover:text-primary hover:border-primary/30 active:scale-95 transition-all shadow-sm flex items-center gap-2 text-xs font-medium cursor-pointer ${className}`}
          title="Instalar aplicação Emanus IA"
        >
          <Download className="w-3.5 h-3.5 text-primary shrink-0" />
          {showLabel && <span>Instalar App</span>}
        </button>
      )}

      {/* Modal Minimalista de Ajuda para Instalação Manual */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/70 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-muted/15 bg-surface p-6 shadow-2xl space-y-4"
          >
            {/* Fechar */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-text hover:bg-muted/10 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cabeçalho Minimalista */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text">Instalar Emanus IA</h3>
                <p className="text-[11px] text-muted">Acesso rápido e direto sem navegador</p>
              </div>
            </div>

            {/* Abas Sutis */}
            <div className="flex rounded-lg bg-dark/40 p-0.5 border border-muted/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("mobile")}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === "mobile" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                Android
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === "ios" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                iPhone (iOS)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pc")}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === "pc" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                PC
              </button>
            </div>

            {/* Conteúdo de Instruções Direto e Conciso */}
            <div className="text-xs text-muted leading-relaxed space-y-2 py-1">
              {activeTab === "mobile" && (
                deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-2.5 rounded-xl bg-primary text-dark font-semibold text-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Confirmar Instalação
                  </button>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Abre o menu do navegador (<strong>⋮</strong>).</li>
                    <li>Clica em <strong>&quot;Instalar aplicativo&quot;</strong>.</li>
                    <li>Confirma para adicionar ao seu telemóvel.</li>
                  </ol>
                )
              )}

              {activeTab === "ios" && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>No Safari, toca no botão de <strong>Partilha</strong> (<Share2 className="w-3 h-3 inline text-primary" />).</li>
                  <li>Escolhe <strong>&quot;Adicionar ao Ecrã Principal&quot;</strong>.</li>
                  <li>Toca em <strong>Adicionar</strong> no canto superior.</li>
                </ol>
              )}

              {activeTab === "pc" && (
                deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-2.5 rounded-xl bg-primary text-dark font-semibold text-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Instalar no Computador
                  </button>
                ) : (
                  <p>
                    Clica no ícone de instalar (<Monitor className="w-3.5 h-3.5 inline mx-1 text-primary" />) na barra de endereços do Chrome ou Edge para adicionar ao teu ambiente de trabalho.
                  </p>
                )
              )}
            </div>

            {/* Rodapé */}
            <div className="pt-2 border-t border-muted/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-text bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
