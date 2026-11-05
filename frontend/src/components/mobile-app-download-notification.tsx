"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone, Share2, ExternalLink } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DOWNLOAD_PAGE_URL = "https://emanueldejesus617-boop.github.io/emanus-app-download/";
const DISMISS_KEY = "emanus_mobile_app_notif_dismissed_at";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas

export function MobileAppDownloadNotification() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Não exibir se já estiver a rodar como app instalada (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // 2. Detetar se é dispositivo móvel (celular/tablet)
    const ua = window.navigator.userAgent.toLowerCase();
    const isMobileDevice =
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua) ||
      (window.innerWidth <= 768 && "ontouchstart" in window);

    if (!isMobileDevice) return;

    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);

    // 3. Verificar se o utilizador dispensou nas últimas 24h
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < DISMISS_COOLDOWN_MS) {
        return;
      }
    }

    // 4. Capturar evento nativo do navegador para PWA (Android Chrome, Edge, etc.)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5. Exibir a notificação elegante após 1.5s
    const timer = setTimeout(() => {
      setVisible(true);

      // Tentar enviar notificação nativa do sistema se o utilizador já tiver permissão concedida
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification("📲 Baixar a App Emanus IA", {
                body: "Instala a aplicação oficial no teu telemóvel para um estudo mais rápido e sem distrações!",
                icon: "/icon.png",
                badge: "/icon.png",
                data: { url: DOWNLOAD_PAGE_URL }
              });
            }).catch(() => {});
          } else {
            new Notification("📲 Baixar a App Emanus IA", {
              body: "Instala a aplicação oficial no teu telemóvel para um estudo mais rápido!",
              icon: "/icon.png"
            });
          }
        } catch {}
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  }, []);

  const handleInstallOrDownload = useCallback(async () => {
    // Se o navegador disparou o evento nativo de PWA (Android Chrome, Edge, Samsung Internet)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          handleDismiss();
          return;
        }
      } catch {
        // Fallback para abrir a página de download oficial
      }
    }

    // Se for iOS Safari, mostra as instruções de instalação
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // Pedir permissão de notificações no clique caso ainda esteja 'default'
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    // Redirecionar para a página oficial de download da Emanus IA
    window.open(DOWNLOAD_PAGE_URL, "_blank", "noopener,noreferrer");
    handleDismiss();
  }, [deferredPrompt, isIOS, handleDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] md:hidden animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-surface/95 dark:bg-[#111827]/95 p-4 shadow-2xl backdrop-blur-xl text-text">
        {/* Glow sutil */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        {/* Botão fechar */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:text-text hover:bg-dark/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          {/* Ícone da App com Badge */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center overflow-hidden p-1.5 shadow-md shadow-primary/10">
              <img
                src="/icon.png"
                alt="Emanus IA"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-dark text-[10px] font-bold shadow-sm">
              <Download className="w-3 h-3 stroke-[2.5]" />
            </div>
          </div>

          {/* Conteúdo da Notificação */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                App Oficial
              </span>
              <span className="text-[10px] text-muted">• Grátis</span>
            </div>
            <h4 className="text-sm font-bold text-text mt-1 leading-snug">
              Baixar a App Emanus IA
            </h4>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              Instala no teu telemóvel para estudar sem distrações e com carregamento instantâneo.
            </p>

            {/* Guia iOS rápido */}
            {showIOSGuide ? (
              <div className="mt-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] text-text space-y-1 animate-fade-in">
                <p className="font-semibold text-primary">Instalação no iPhone/iPad:</p>
                <p className="flex items-center gap-1.5">
                  1. Toca no botão <strong>Partilha</strong> <Share2 className="w-3.5 h-3.5 text-primary inline" /> no Safari.
                </p>
                <p>2. Seleciona <strong>&quot;Adicionar ao Ecrã Principal&quot;</strong>.</p>
                <a
                  href={DOWNLOAD_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary font-bold underline mt-1"
                >
                  Ou descarrega o ficheiro direto <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : null}

            {/* Ações */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallOrDownload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-dark font-bold text-xs shadow-md shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{deferredPrompt ? "Instalar App" : "Baixar App"}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2.5 rounded-xl border border-muted/20 text-muted hover:text-text hover:bg-dark/5 dark:hover:bg-white/5 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              >
                Mais tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

