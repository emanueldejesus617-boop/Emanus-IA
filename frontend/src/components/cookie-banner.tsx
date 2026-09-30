"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, Settings, X, ChevronRight, SlidersHorizontal, Info } from "lucide-react";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  personalization: boolean;
}

const STORAGE_KEY = "emanus_cookie_consent_v1";

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: true,
    personalization: true,
  });

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Pequeno delay para animação de entrada suave
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        setShowBanner(true);
      }
    }

    // Ouvir evento customizado para reabrir o modal de preferências a partir do rodapé
    const handleOpenPreferences = () => {
      setShowModal(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpenPreferences);
    return () => {
      window.removeEventListener("open-cookie-preferences", handleOpenPreferences);
    };
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowModal(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      personalization: true,
    });
  };

  const acceptEssentialOnly = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      personalization: false,
    });
  };

  const handleCustomSave = () => {
    savePreferences(preferences);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Banner Flutuante Inferior */}
      {showBanner && !showModal && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-xl z-50 animate-slide-up">
          <div className="rounded-2xl border border-muted/20 bg-surface/90 backdrop-blur-xl p-5 sm:p-6 shadow-2xl text-text relative overflow-hidden transition-all duration-300">
            {/* Glow de fundo sutil */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm sm:text-base text-text flex items-center gap-2">
                    Respeitamos a tua privacidade 🍪
                  </h4>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="text-muted hover:text-text p-1 rounded-lg transition-colors cursor-pointer"
                    aria-label="Fechar banner temporariamente"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Utilizamos cookies e tecnologias semelhantes para garantir o funcionamento seguro da plataforma, personalizar a tua experiência com a explicadora virtual <strong className="text-text font-semibold">Emanus</strong> e analisar o desempenho dos estudos.
                </p>

                <div className="pt-1 flex items-center gap-3 text-xs">
                  <Link
                    href="/privacidade"
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Ler Política de Privacidade
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="pt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={acceptAll}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary text-dark font-bold text-xs hover:shadow-[0_0_15px_rgba(0,200,150,0.3)] transition-all cursor-pointer"
                  >
                    Aceitar Todos
                  </button>
                  <button
                    onClick={acceptEssentialOnly}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-muted/20 bg-surface/60 hover:bg-surface/90 text-text font-semibold text-xs transition-all cursor-pointer"
                  >
                    Apenas Necessários
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-3 py-2 rounded-xl border border-muted/20 bg-surface/40 hover:bg-surface/80 text-muted hover:text-text text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Personalizar Cookies"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Personalizar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalização de Cookies */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-muted/20 bg-surface/95 backdrop-blur-2xl p-6 shadow-2xl text-text max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-4 border-b border-muted/15">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 text-primary flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text">Preferências de Cookies</h3>
                  <p className="text-xs text-muted">Gere como utilizamos as tuas informações</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-muted/15 text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Categorias de Cookies */}
            <div className="py-4 space-y-4">
              {/* Necessários */}
              <div className="p-4 rounded-xl border border-muted/15 bg-surface/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-semibold text-sm text-text">Cookies Estritamente Necessários</h4>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Sempre Ativos
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Essenciais para o login seguro, proteção contra fraudes, persistência da sessão e seleção de temas. Sem estes cookies, a plataforma não pode funcionar.
                </p>
              </div>

              {/* Personalização & IA */}
              <div className="p-4 rounded-xl border border-muted/15 bg-surface/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-text">Personalização e Inteligência Artificial</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.personalization}
                      onChange={(e) =>
                        setPreferences({ ...preferences, personalization: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Permitem que a explicadora Emanus se lembre do teu ano escolar, disciplinas favoritas e ritmo de aprendizagem para gerar recomendações personalizadas.
                </p>
              </div>

              {/* Desempenho e Análise */}
              <div className="p-4 rounded-xl border border-muted/15 bg-surface/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cookie className="w-4 h-4 text-secondary" />
                    <h4 className="font-semibold text-sm text-text">Desempenho e Estatísticas</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Recolhem dados anónimos sobre tempos de resposta e eventuais erros para melhorar a estabilidade e velocidade do sistema.
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-3 border-t border-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/privacidade"
                onClick={() => setShowModal(false)}
                className="text-xs text-muted hover:text-primary transition-colors order-2 sm:order-1"
              >
                Ver Política de Privacidade Completa
              </Link>
              <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                <button
                  onClick={acceptAll}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-muted/20 bg-surface/60 hover:bg-surface text-text font-semibold text-xs cursor-pointer"
                >
                  Aceitar Tudo
                </button>
                <button
                  onClick={handleCustomSave}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary text-dark font-bold text-xs hover:shadow-[0_0_15px_rgba(0,200,150,0.3)] cursor-pointer"
                >
                  Guardar Preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
