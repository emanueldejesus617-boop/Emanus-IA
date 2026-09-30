"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sparkles, Mic, FileText, Lightbulb, Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { auth, googleProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";

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
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(false);
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotDevLink, setForgotDevLink] = useState("");
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Processa autenticação Google tanto para popup quanto para redirect
  const processGoogleUser = async (user: User) => {
    const idToken = await user.getIdToken();
    const userEmail = user.email || "";
    const userName = user.displayName || userEmail.split("@")[0];

    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        email: userEmail.trim().toLowerCase(),
        name: userName
      })
    });

    const data = await parseJsonResponse(res);

    if (!res.ok) {
      throw new Error(data.error || "Erro ao autenticar com a conta Google.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setSuccess("Autenticado com sucesso via Google! A redirecionar...");

    if (data.user.role === "admin") {
      setTimeout(() => router.push("/dashboard/admin"), 600);
    } else if (!data.user.classe) {
      setTimeout(() => router.push("/onboarding"), 600);
    } else {
      setTimeout(() => router.push("/dashboard"), 600);
    }
  };

  useEffect(() => {
    // Redirecionamento automático de 127.0.0.1 para localhost para garantir compatibilidade com Google Auth no Firebase
    if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
      const newUrl = window.location.href.replace("127.0.0.1", "localhost");
      window.location.replace(newUrl);
      return;
    }

    setMounted(true);

    // Verificar se o utilizador acabou de regressar de um redirecionamento do Google
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          setGoogleLoading(true);
          await processGoogleUser(result.user);
        }
      } catch (redirectErr: any) {
        console.warn("Aviso ao processar retorno do Google:", redirectErr);
        if (redirectErr.code === "auth/unauthorized-domain") {
          setError("O domínio atual precisa de ser adicionado em Firebase Console > Authentication > Settings > Authorized domains. Utilize http://localhost:3000.");
        } else if (redirectErr.code && redirectErr.code !== "auth/null-user") {
          setError(`Erro no Google Auth: ${redirectErr.message || redirectErr.code}`);
        }
      } finally {
        setGoogleLoading(false);
      }
    };

    handleRedirectResult();
  }, []);

  // Critérios de validação de palavra-passe
  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = 
    passwordCriteria.length &&
    passwordCriteria.uppercase &&
    passwordCriteria.lowercase &&
    passwordCriteria.number &&
    passwordCriteria.special;

  // Google Authentication Handler
  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    // Se estiver a aceder por 127.0.0.1, redireciona para localhost onde o Firebase tem autorização oficial
    if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
      const targetUrl = window.location.href.replace("127.0.0.1", "localhost");
      window.location.replace(targetUrl);
      return;
    }

    try {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result && result.user) {
          await processGoogleUser(result.user);
        } else {
          setGoogleLoading(false);
        }
      } catch (fbErr: any) {
        setGoogleLoading(false);
        console.error("Firebase Google Auth Error:", fbErr);

        if (fbErr.code === "auth/popup-closed-by-user") {
          setError("A janela de login da Google foi fechada antes de concluir o acesso.");
          return;
        }

        if (fbErr.code === "auth/cancelled-popup-request") {
          setError("O pedido de autenticação foi interrompido. Por favor, clique novamente para tentar.");
          return;
        }

        if (fbErr.code === "auth/popup-blocked") {
          setError("O navegador bloqueou a janela pop-up da Google. Por favor, autorize os pop-ups para este site na barra de navegação e tente de novo.");
          return;
        }

        if (fbErr.code === "auth/operation-not-allowed") {
          setError("O login com Google não está ativo no Firebase Console. Aceda a Authentication > Sign-in method > Google e ative o fornecedor.");
          return;
        }

        if (fbErr.code === "auth/unauthorized-domain") {
          setError("Domínio não autorizado no Firebase. Certifique-se de aceder por http://localhost:3000.");
          return;
        }

        if (fbErr.code === "auth/network-request-failed") {
          setError("Falha na ligação à rede ao contactar os servidores da Google. Verifique a sua ligação à Internet.");
          return;
        }

        if (fbErr.code === "auth/invalid-api-key" || fbErr.code === "auth/api-key-not-valid-please-pass-a-valid-api-key") {
          setError("A chave API do Firebase é inválida. Verifique o ficheiro frontend/.env.local.");
          return;
        }
        
        throw fbErr;
      }
    } catch (err: any) {
      setGoogleLoading(false);
      setError(err.message || "Falha na ligação com a conta Google.");
    }
  };

  // Reenviar email de verificação
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await sendEmailVerification(userCredential.user);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      setSuccess("Email de verificação reenviado! Verifica a tua caixa de entrada.");
    } catch (err: any) {
      setError("Não foi possível reenviar o email. Tenta novamente mais tarde.");
    } finally {
      setResendLoading(false);
    }
  };

  // Verificar se o email já foi confirmado e fazer login automático
  const handleCheckVerified = async () => {
    setVerifyLoading(true);
    setError("");
    setSuccess("");
    try {
      const cleanEmail = email.trim().toLowerCase();
      // Fazer sign-in para obter o utilizador atualizado
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      // Recarregar o estado do utilizador do Firebase para obter emailVerified atual
      await userCredential.user.reload();

      if (!userCredential.user.emailVerified) {
        setError("O teu email ainda não foi verificado. Clica no link que enviamos para a tua caixa de entrada.");
        setVerifyLoading(false);
        return;
      }

      // Email verificado — obter token e autenticar no backend
      const fbIdToken = await userCredential.user.getIdToken(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${fbIdToken}`
        },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Erro ao autenticar. Tenta novamente.");
      }

      localStorage.setItem("token", data.token || fbIdToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess("Email verificado! A redirecionar...");
      setTimeout(() => {
        if (!data.user.classe) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      }, 600);
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Palavra-passe incorreta. Não foi possível confirmar a tua identidade.");
      } else {
        setError(err.message || "Ocorreu um erro. Tenta novamente.");
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotDevLink("");

    const cleanEmail = forgotEmail.trim().toLowerCase();

    // Critério cliente: email não vazio
    if (!cleanEmail) {
      setForgotError("Por favor insere o teu endereço de e-mail.");
      return;
    }

    // Critério cliente: formato básico válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setForgotError("O formato do e-mail é inválido. Verifica se escreveste corretamente.");
      return;
    }

    setForgotLoading(true);

    try {
      // Tentativa 1: Firebase Client SDK (rápido, direto)
      try {
        await sendPasswordResetEmail(auth, cleanEmail, {
          url: `${window.location.origin}/`,
          handleCodeInApp: false,
        });
        setForgotSuccess("✅ E-mail de recuperação enviado! Verifica a tua caixa de entrada e a pasta de spam.");
        return;
      } catch (fbErr: any) {
        // Se o utilizador não existir no Firebase Auth, tentar pelo backend
        if (fbErr.code !== "auth/user-not-found" && fbErr.code !== "auth/invalid-email") {
          // Erros de config do Firebase (API key inválida, etc.) — tentar backend
          console.warn("Firebase Client reset falhou, a tentar backend:", fbErr.message);
        } else if (fbErr.code === "auth/user-not-found") {
          // Não revelar se o e-mail existe ou não
          setForgotSuccess("Se existir uma conta com este e-mail, receberás uma mensagem de recuperação em breve.");
          return;
        }
      }

      // Tentativa 2: Backend /api/auth/forgot-password
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotError(data.error || "Não foi possível enviar o e-mail de recuperação. Tenta novamente.");
        return;
      }

      setForgotSuccess(data.message || "E-mail de recuperação enviado! Verifica a tua caixa de entrada.");
      if (data.devResetLink) {
        setForgotDevLink(data.devResetLink);
      }
    } catch (err: any) {
      setForgotError("Ocorreu um erro. Verifica a tua ligação à internet e tenta novamente.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Email & Password Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    // Validação estrita no cliente antes do envio
    if (!isLogin && !isPasswordValid) {
      setError("A palavra-passe deve cumprir todos os requisitos de segurança indicados abaixo.");
      return;
    }

    setLoading(true);
    
    try {
      let fbIdToken = "";
      let firebaseUser = null;
      
      // Attempt Firebase client Auth first if configured
      try {
        if (isLogin) {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUser = userCredential.user;

          // Bloquear login se email não foi verificado
          if (!firebaseUser.emailVerified) {
            setLoading(false);
            setEmailVerificationSent(true);
            return;
          }

          fbIdToken = await firebaseUser.getIdToken();
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUser = userCredential.user;
          // Enviar email de verificação
          await sendEmailVerification(firebaseUser);
          
          // Registar também no backend para garantir a persistência imediata do nome e perfil
          try {
            await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name.trim(), email: cleanEmail, password })
            });
          } catch (regErr) {
            console.warn("Registo de apoio no backend:", regErr);
          }

          setLoading(false);
          setEmailVerificationSent(true);
          // Iniciar cooldown de 60s para reenvio
          setResendCooldown(60);
          const interval = setInterval(() => {
            setResendCooldown(prev => {
              if (prev <= 1) { clearInterval(interval); return 0; }
              return prev - 1;
            });
          }, 1000);
          return;
        }
      } catch (fbErr: any) {
        if (!isLogin && fbErr.code === "auth/email-already-in-use") {
          throw new Error("Este endereço de email já está registado. Tenta fazer login.");
        }
        if (!isLogin) {
          throw fbErr;
        }
        // Se estiver em modo login e a autenticação no cliente Firebase falhar (ex: conta admin gerada no backend,
        // conta criada via Google sem senha no Firebase, etc.), prosseguimos para o backend (/api/auth/login),
        // que valida de forma autoritativa no Firestore com bcrypt e emite o token JWT seguro.
        console.warn("Aviso ao autenticar no Firebase Client (a tentar autenticação direta no backend):", fbErr.message);
      }

      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin 
        ? { email: cleanEmail, password } 
        : { name: name.trim(), email: cleanEmail, password };

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
      
      setSuccess("Sessão iniciada com sucesso! A redirecionar...");
      if (data.user.role === "admin") {
        setTimeout(() => router.push("/dashboard/admin"), 600);
      } else if (!data.user.classe) {
        setTimeout(() => router.push("/onboarding"), 600);
      } else {
        setTimeout(() => router.push("/dashboard"), 600);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao processar o seu pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12 bg-dark font-sans text-text overflow-x-hidden transition-colors duration-300">
      {/* Botões Flutuantes no Topo: Baixar App e Alternar Tema */}
      <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex items-center gap-2.5">
        <PWAInstallButton variant="button" />
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-3 rounded-2xl border border-muted/15 bg-surface/80 backdrop-blur-md text-text hover:border-primary/40 active:scale-95 transition-all shadow-xl flex items-center justify-center cursor-pointer"
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
      </div>

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
                <h4 className="font-semibold text-sm text-text">Gamificação e Streaks</h4>
                <p className="text-xs text-muted mt-1">Acumula XP e mantém a tua sequência diária de estudos ativa.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé - Criador e Políticas */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted/80 pt-4 border-t border-muted/10">
          <p>Desenvolvido com excelência por <span className="font-bold text-text">Emanus</span>.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <a 
              href="/privacidade" 
              className="hover:text-primary transition-colors font-medium"
            >
              Privacidade & Cookies
            </a>
            <button 
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-cookie-preferences"))}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Gerir Cookies
            </button>
          </div>
        </div>
      </div>

      {/* Lado Direito - Tela de Login */}
      <div className="relative lg:col-span-5 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-16 min-h-screen bg-dark transition-colors duration-300">
        {/* Glow Blob sutil para o lado direito no mobile */}
        <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] w-[90%] h-[90%] lg:w-[60%] lg:h-[60%] rounded-full bg-primary/5 blur-[90px] pointer-events-none" />

        {/* Cabeçalho visível no Mobile */}
        <div className="lg:hidden flex flex-col items-center mb-6 text-center relative z-10 w-full max-w-xs">
          <Logo variant="splash" className="mb-3" />
          <p className="text-xs text-muted mt-1 mb-4">O teu professor inteligente particular.</p>
          <PWAInstallButton variant="button" className="w-full justify-center" />
        </div>

        {/* Card do Formulário */}
        <div className="w-full max-w-md rounded-2xl border border-muted/10 bg-surface/30 backdrop-blur-xl p-5 sm:p-8 shadow-2xl relative z-10 transition-colors duration-300">

          {/* Ecrã de verificação de email */}
          {emailVerificationSent ? (
            <div className="flex flex-col items-center text-center py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-2">Verifica o teu e-mail</h3>
              <p className="text-sm text-muted leading-relaxed mb-1">
                Enviámos um link de verificação para
              </p>
              <p className="text-sm font-semibold text-primary mb-5 break-all">{email}</p>
              <p className="text-xs text-muted/80 leading-relaxed mb-6">
                Clica no link no email para ativar a tua conta. Após verificares, volta aqui e faz login.
              </p>

              {error && (
                <div className="w-full mb-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="w-full mb-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0}
                className="w-full mb-3 rounded-xl border border-primary/30 bg-primary/10 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {resendLoading ? "A reenviar..." : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar email de verificação"}
              </button>

              <button
                type="button"
                onClick={handleCheckVerified}
                disabled={verifyLoading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-dark transition-all hover:shadow-[0_0_20px_rgba(0,200,150,0.4)] hover:opacity-95 active:scale-[0.99] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {verifyLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>A verificar e a entrar...</span>
                  </>
                ) : (
                  <span>Já verifiquei — Entrar</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailVerificationSent(false);
                  setIsLogin(true);
                  setError("");
                  setSuccess("");
                }}
                className="mt-4 text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                ← Voltar ao ecrã de login
              </button>

              <p className="text-[11px] text-muted/60 mt-3">Não recebeste nada? Verifica a pasta de spam.</p>
            </div>
          ) : (
            <>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-text">
              {isLogin ? "Bem-vindo de volta" : "Criar uma conta segura"}
            </h3>
            <p className="text-xs text-muted mt-1">
              {isLogin 
                ? "Introduz os teus dados para aceder à tua área de estudos." 
                : "Regista-te em segundos com encriptação e segurança total."}
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
            <span>{googleLoading ? "A ligar à Google..." : "Continuar com o Google"}</span>
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
                {isLogin && (
                  <button
                    type="button"
                    id="forgot-password-btn"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotError("");
                      setForgotSuccess("");
                      setForgotDevLink("");
                      setShowForgotPassword(true);
                    }}
                    className="text-[11px] text-primary hover:underline cursor-pointer font-medium transition-colors"
                  >
                    Esqueci a palavra-passe
                  </button>
                )}
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

              {/* Checklist visual de força de palavra-passe no registo */}
              {!isLogin && password.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-dark/40 border border-muted/10 text-xs space-y-1.5 animate-fade-in">
                  <div className="text-[11px] font-semibold text-muted mb-1 uppercase tracking-wider">Requisitos de Segurança:</div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? "text-emerald-400 font-medium" : "text-muted"}`}>
                    {passwordCriteria.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Pelo menos 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.uppercase ? "text-emerald-400 font-medium" : "text-muted"}`}>
                    {passwordCriteria.uppercase ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Pelo menos uma letra maiúscula</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.lowercase ? "text-emerald-400 font-medium" : "text-muted"}`}>
                    {passwordCriteria.lowercase ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Pelo menos uma letra minúscula</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.number ? "text-emerald-400 font-medium" : "text-muted"}`}>
                    {passwordCriteria.number ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Pelo menos um número</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.special ? "text-emerald-400 font-medium" : "text-muted"}`}>
                    {passwordCriteria.special ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Pelo menos um caractere especial (!@#$%...)</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!isLogin && password.length > 0 && !isPasswordValid)}
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
            </>
          )}
        </div>

        {/* Rodapé sutil mobile */}
        <div className="lg:hidden flex flex-col items-center gap-2 mt-8 relative z-10 text-[11px] text-muted/70">
          <div className="flex items-center gap-3">
            <a href="/privacidade" className="hover:text-primary transition-colors">
              Privacidade & Cookies
            </a>
            <span>•</span>
            <button 
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-cookie-preferences"))}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Definições
            </button>
          </div>
          <p className="text-[10px] text-muted/50">
            © 2026 Emanus IA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>

    {/* Modal: Recuperação de Palavra-passe */}
    {showForgotPassword && (
      <div
        id="forgot-password-modal"
        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.6)" }}
        onClick={(e) => { if (e.target === e.currentTarget) { setShowForgotPassword(false); } }}
      >
        <div className="w-full max-w-md bg-surface rounded-2xl border border-muted/20 shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-muted/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Recuperar Palavra-passe</h2>
                <p className="text-[11px] text-muted">Envia um link de redefinição para o teu e-mail</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-muted hover:text-text transition-colors rounded-lg p-1.5 hover:bg-dark/50 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="px-6 py-5">
            {/* Critérios de recuperação */}
            <div className="mb-5 p-4 rounded-xl bg-dark/40 border border-muted/10 space-y-2">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Critérios para recuperação</p>
              <div className="flex items-start gap-2 text-xs text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>A conta deve estar registada com e-mail e palavra-passe</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Não é possível recuperar contas criadas exclusivamente pelo Google</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>O e-mail deve ser válido e não pode ser temporário ou descartável</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-amber-400">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Máximo de 3 pedidos por minuto para proteger a tua conta</span>
              </div>
            </div>

            {/* Feedback de erro */}
            {forgotError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{forgotError}</span>
              </div>
            )}

            {/* Feedback de sucesso */}
            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{forgotSuccess}</span>
                </div>

                {forgotDevLink && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">🛠 Modo Dev — Link de Reset:</p>
                    <a href={forgotDevLink} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-300 hover:underline break-all">
                      {forgotDevLink}
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setForgotSuccess(""); setForgotEmail(""); }}
                  className="w-full rounded-xl bg-primary py-3 font-bold text-dark transition-all duration-300 hover:opacity-90 cursor-pointer"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider">E-mail da conta</label>
                  <input
                    id="forgot-email-input"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-muted/15 bg-dark/50 p-3 text-sm text-text outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="ex: aluno@gmail.com"
                    autoComplete="email"
                    required
                  />
                  <p className="mt-1.5 text-[11px] text-muted">Insere o e-mail com que criaste a tua conta. Enviaremos um link seguro de redefinição.</p>
                </div>

                <button
                  id="send-reset-btn"
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full rounded-xl bg-primary py-3.5 font-bold text-dark transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,200,150,0.4)] hover:opacity-95 active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      A enviar...
                    </>
                  ) : "Enviar Link de Recuperação"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full rounded-xl border border-muted/15 py-3 text-sm text-muted hover:text-text hover:border-muted/40 transition-all cursor-pointer"
                >
                  ← Voltar ao Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
