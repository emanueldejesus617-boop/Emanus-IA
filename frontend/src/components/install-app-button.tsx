"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share2, Monitor, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallAppButtonProps {
  onClose?: () => void;
  className?: string;
}

export function InstallAppButton({ onClose, className = "" }: InstallAppButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | "pc">("android");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalada como app standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Detetar plataforma
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("pc");
    }

    // Capturar evento nativo (Android Chrome, Edge, etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleClick = useCallback(async () => {
    // Se o browser tem o prompt nativo pronto, usa-o diretamente
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          onClose?.();
          return;
        }
      } catch {
        // Falhou o prompt nativo — abre o modal de instruções
      }
    }
    // Sempre mostra o modal com instruções claras
    setShowModal(true);
  }, [deferredPrompt, onClose]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    onClose?.();
  }, [onClose]);

  // Oculta o botão se já estiver instalado como app
  if (isInstalled) return null;

  return (
    <>
      {/* Botão no menu sidebar */}
      <button
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-dark text-text transition-all cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 text-primary flex-shrink-0" />
        <span>Descarregar App</span>
      </button>

      {/* Modal de instruções de instalação */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-dark/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-muted/15 bg-surface p-6 shadow-2xl space-y-5"
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Instalar Emanus IA</h3>
                  <p className="text-[11px] text-muted mt-0.5">Adiciona ao teu dispositivo, grátis</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-muted/10 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruções por plataforma */}
            <div className="rounded-xl bg-dark/5 border border-muted/10 p-4 space-y-3">
              {platform === "android" && (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Smartphone className="w-4 h-4" />
                    <span>Android (Chrome / Samsung)</span>
                  </div>
                  <ol className="text-xs text-muted space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Toca nos <strong className="text-text">três pontos (⋮)</strong> no canto superior do navegador.</li>
                    <li>Seleciona <strong className="text-text">&quot;Instalar aplicativo&quot;</strong> ou <strong className="text-text">&quot;Adicionar ao ecrã principal&quot;</strong>.</li>
                    <li>Confirma e a app fica no teu telemóvel!</li>
                  </ol>
                </>
              )}

              {platform === "ios" && (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Share2 className="w-4 h-4" />
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="text-xs text-muted space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Toca no botão de <strong className="text-text">Partilha</strong> (<Share2 className="w-3 h-3 inline text-primary" />) na barra do Safari.</li>
                    <li>Desliza para baixo e toca em <strong className="text-text">&quot;Adicionar ao Ecrã Principal&quot;</strong>.</li>
                    <li>Toca em <strong className="text-text">Adicionar</strong> para confirmar.</li>
                  </ol>
                </>
              )}

              {platform === "pc" && (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Monitor className="w-4 h-4" />
                    <span>Computador (Chrome / Edge)</span>
                  </div>
                  <ol className="text-xs text-muted space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Clica no ícone de <strong className="text-text">instalar</strong> (<Monitor className="w-3 h-3 inline text-primary" />) na barra de endereços.</li>
                    <li>Ou abre o menu do Chrome (<strong className="text-text">⋮</strong>) e clica em <strong className="text-text">&quot;Instalar Emanus IA&quot;</strong>.</li>
                    <li>Confirma a instalação.</li>
                  </ol>
                </>
              )}
            </div>

            {/* Botão de confirmar se houver prompt nativo disponível */}
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleClick}
                className="w-full py-3 rounded-xl bg-primary text-dark font-bold text-sm hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Instalar Agora
              </button>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="w-full py-2 rounded-xl border border-muted/15 text-muted hover:text-text hover:bg-muted/5 text-xs font-medium transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
