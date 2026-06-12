"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || (isLogin ? "Erro no login" : "Erro no registo"));
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (!isLogin) {
        setSuccess("Conta criada com sucesso! Redirecionando...");
        setTimeout(() => router.push("/onboarding"), 1000);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">TUTOR IA</h1>
          <p className="mt-2 text-muted">O teu professor. A qualquer hora.</p>
        </div>
        
        {error && (
          <div className="mb-4 rounded border border-danger/50 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 rounded border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-text">Nome</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-muted/20 bg-dark p-3 text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="ex: Emanuel"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-text">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-muted/20 bg-dark p-3 text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="ex: aluno@gmail.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text">Palavra-passe</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-muted/20 bg-dark p-3 pr-12 text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder={isLogin ? "" : "Mínimo 6 caracteres"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-3 font-semibold text-dark transition-opacity hover:opacity-90"
          >
            {isLogin ? "Entrar" : "Criar Conta"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          {isLogin ? "Não tens conta? " : "Já tens conta? "}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }} 
            className="text-primary hover:underline"
          >
            {isLogin ? "Regista-te" : "Faz Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
