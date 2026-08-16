"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sparkles, Mic, FileText, Lightbulb, Zap, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/logo";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

import { parseJsonResponse } from "@/lib/utils";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Google Authentication Handler
  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      let idToken = "";
      let userEmail = "";
      let userName = "";

      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        idToken = await user.getIdToken();
        userEmail = user.email || "";
        userName = user.displayName || userEmail.split("@")[0];
      } catch (fbErr: any) {
        console.error("Erro no Firebase Client Auth:", fbErr);
        if (fbErr.code === "auth/popup-closed-by-user") {
          setGoogleLoading(false);
          setError("O login com o Google foi cancelado pelo utilizador.");
          return;
        }
        if (fbErr.code === "auth/popup-blocked") {
          setGoogleLoading(false);
          setError("O navegador bloqueou a janela pop-up. Permita pop-ups para este site e tente novamente.");
          return;
        }
        if (fbErr.code === "auth/operation-not-allowed") {
          setGoogleLoading(false);
          setError("O login com Google não está ativo no Firebase Console. Aceda a Authentication > Sign-in method > Ativar Google.");
          return;
        }
        if (fbErr.code === "auth/unauthorized-domain") {
          setGoogleLoading(false);
          setError("O domínio 'localhost' precisa de ser adicionado em Firebase Console > Authentication > Settings > Authorized domains.");
          return;
        }
        if (fbErr.code === "auth/invalid-api-key" || fbErr.code === "auth/api-key-not-valid-please-pass-a-valid-api-key") {
          setGoogleLoading(false);
          setError("A chave API do Firebase é inválida. Verifique o ficheiro frontend/.env.local.");
          return;
        }
        
        // General fallback error
        setGoogleLoading(false);
        setError(`Erro no Firebase Auth: ${fbErr.message || fbErr.code}`);
        return;
      }

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          email: userEmail,
          name: userName
        })
      });

      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Erro ao autenticar com a conta Google.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess("Autenticado com sucesso via Google! Redirecionando...");

      if (!data.user.classe) {
        setTimeout(() => router.push("/onboarding"), 800);
      } else {
        setTimeout(() => router.push("/dashboard"), 800);
      }
    } catch (err: any) {
      setError(err.message || "Falha na ligação com a conta Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email & Password Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      let fbIdToken = "";
      
      // Attempt Firebase client Auth first if configured
      try {
        if (isLogin) {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          fbIdToken = await userCredential.user.getIdToken();
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          fbIdToken = await userCredential.user.getIdToken();
        }
      } catch (fbErr: any) {
        console.warn("Aviso ao autenticar no Firebase Client (a usar servidor backend):", fbErr.message);
      }

      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(fbIdToken ? { "Authorization": `Bearer ${fbIdToken}` } : {})
        },
        body: JSON.stringify(body)
      });
      
      const data = await parseJsonResponse(res);
      
      if (!res.ok) {
        throw new Error(data.error || (isLogin ? "Erro no login" : "Erro no registo"));
      }
      
      localStorage.setItem("token", data.token || fbIdToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (!isLogin) {
        setSuccess("Conta criada com sucesso! Redirecionando...");
        setTimeout(() => router.push("/onboarding"), 800);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao processar o seu pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12 bg-dark font-sans text-text overflow-x-hidden transition-colors duration-300">
      {/* Botão Flutuante de Alternância de Tema */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="fixed top-6 right-6 z-50 p-3 rounded-2xl border border-muted/15 bg-surface/80 backdrop-blur-md text-text hover:border-primary/40 active:scale-95 transition-all shadow-xl flex items-center justify-center cursor-pointer"
          aria-label="Alternar Tema"
        >
          {theme === "dark" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="M4.93 4.93l1.41 1.41"></path>
              <path d="M17.66 17.66l1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="M6.34 17.66l-1.41 1.41"></path>
              <path d="M19.07 4.93l-1.41 1.41"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          )}
        </button>
      )}

      {/* Lado Esquerdo - Painel Criativo / Exortação (visível apenas em telas grandes) */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-16 bg-[#E5E7EB] dark:bg-dark border-r border-muted/5 overflow-hidden transition-colors duration-300">
        {/* Glow Blobs decorativos de fundo */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-secondary/15 blur-[120px] animate-glow pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px] animate-glow pointer-events-none" style={{ animationDelay: "2s" }} />

        {/* Topo - Logo */}
        <div className="relative z-10">
          <Logo variant="custom" height={44} />
        </div>

        {/* Centro - Mensagem e Exortação */}
        <div className="relative z-10 my-auto max-w-xl space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> A evolução do estudo
          </div>

          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-text via-text to-primary/80 bg-clip-text text-transparent">
            A tua mente sem limites com a <span className="text-primary font-black">Emanus IA</span>.
          </h2>

          <p className="text-base text-muted/90 leading-relaxed">
            Olá, sou a <strong className="text-text font-semibold">Emanus</strong>, a tua nova explicadora virtual baseada em inteligência artificial. Estou aqui para te guiar nas disciplinas do currículo nacional, tirar todas as tuas dúvidas e ajudar-te a atingir os melhores resultados de forma divertida e interactiva!
          </p>

          {/* Cards de Recursos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex gap-4 rounded-xl border border-muted/10 bg-surface/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-primary/20 hover:bg-surface/60">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-text">Áudio em Tempo Real</h4>
                <p className="text-xs text-muted mt-1">Escuta explicações detalhadas por voz enquanto lê as respostas.</p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-muted/10 bg-surface/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-primary/20 hover:bg-surface/60">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-text">Simulação de Exames</h4>
                <p className="text-xs text-muted mt-1">Gera testes práticos cronometrados fiéis aos exames oficiais angolanos.</p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-muted/10 bg-surface/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-primary/20 hover:bg-surface/60">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-text">Tutor Personalizado</h4>
                <p className="text-xs text-muted mt-1">Recebe caminhos de estudo adaptados à tua classe e curso escolar.</p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-muted/10 bg-surface/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-primary/20 hover:bg-surface/60">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-text">Feedback Imediato</h4>
                <p className="text-xs text-muted mt-1">Identifica os teus pontos fracos e melhora instantaneamente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel */}
        <div className="relative z-10 flex items-center justify-between border-t border-muted/5 pt-6 text-xs text-muted">
          <span>© 2026 Emanus IA. Todos os direitos reservados.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Disponível em toda Angola
          </span>
        </div>
      </div>

      {/* Lado Direito - Tela de Login */}
      <div className="relative lg:col-span-5 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-16 min-h-screen bg-dark transition-colors duration-300">
        {/* Glow Blob sutil para o lado direito no mobile */}
        <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] w-[90%] h-[90%] lg:w-[60%] lg:h-[60%] rounded-full bg-primary/5 blur-[90px] pointer-events-none" />

        {/* Cabeçalho visível no Mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8 text-center relative z-10">
          <Logo variant="splash" className="mb-3" />
          <p className="text-xs text-muted mt-1">O teu professor inteligente particular.</p>
        </div>

        {/* Card do Formulário */}
        <div className="w-full max-w-md rounded-2xl border border-muted/10 bg-surface/30 backdrop-blur-xl p-5 sm:p-8 shadow-2xl relative z-10 transition-colors duration-300">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-text">
              {isLogin ? "Bem-vindo de volta" : "Criar uma conta"}
            </h3>
            <p className="text-xs text-muted mt-1">
              {isLogin 
                ? "Introduz os teus dados para aceder à tua área de estudos." 
                : "Regista-te em segundos para começares a aprender com a Emanus IA."}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger animate-fade-in flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary animate-fade-in flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Botão de Autenticação com a Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full mb-5 flex items-center justify-center gap-3 rounded-xl border border-muted/20 bg-surface/60 py-3 px-4 text-sm font-semibold text-text shadow-sm transition-all duration-300 hover:bg-surface/90 hover:border-primary/40 active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{googleLoading ? "Conectando à Google..." : "Continuar com o Google"}</span>
          </button>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted/15"></div>
            </div>
            <span className="relative bg-dark px-3 text-[11px] font-medium uppercase tracking-wider text-muted">
              ou com e-mail
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-muted/15 bg-dark/50 p-3 text-sm text-text outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="ex: Emanuel de Jesus"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider">E-mail de estudante</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-muted/15 bg-dark/50 p-3 text-sm text-text outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="ex: aluno@gmail.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">Palavra-passe</label>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-muted/15 bg-dark/50 p-3 pr-12 text-sm text-text outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder={isLogin ? "••••••••" : "Mínimo 8 caracteres"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted hover:text-text focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-primary py-3.5 font-bold text-dark transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,200,150,0.4)] hover:opacity-95 active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {loading ? "A processar..." : (isLogin ? "Entrar na plataforma" : "Criar a minha conta")}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            {isLogin ? "Ainda não tens uma conta? " : "Já criaste uma conta? "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }} 
              className="text-primary font-bold hover:underline ml-1 cursor-pointer"
            >
              {isLogin ? "Cria uma aqui" : "Faz login"}
            </button>
          </div>
        </div>

        {/* Rodapé sutil mobile */}
        <p className="lg:hidden text-center text-[10px] text-muted/60 mt-8 relative z-10">
          © 2026 Emanus IA. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
