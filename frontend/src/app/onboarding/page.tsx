"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { parseJsonResponse } from "@/lib/utils";

const CURSOS = [
  // Cursos do Ensino Geral
  "Ciências Físicas e Biológicas",
  "Ciências Económico-Jurídicas",
  "Ciências Humanas",
  // Cursos do Ensino Técnico-Profissional (MINED)
  "Informática de Gestão",
  "Informática",
  "Eletrónica e Telecomunicações",
  "Eletricidade",
  "Construção Civil",
  "Contabilidade e Gestão",
  "Enfermagem",
  "Análises Clínicas",
  "Farmácia",
  "Agro-Pecuária",
  "Hotelaria e Turismo",
  "Energias Renováveis",
  "Mecânica Industrial"
];

const CLASSES = [
  "7.ª Classe", "8.ª Classe", "9.ª Classe",
  "10.ª Classe", "11.ª Classe", "12.ª Classe"
];

export default function OnboardingPage() {
  const [classe, setClasse] = useState("");
  const [curso, setCurso] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!classe) return;
    if (classe.includes("10") || classe.includes("11") || classe.includes("12")) {
      if (!curso) return;
    }

    let subjects: string[] = [];
    
    // Simple logic to define subjects based on class and course
    const baseSubjects = ["Língua Portuguesa", "Matemática", "Inglês", "Educação Física"];
    
    if (classe.includes("10") || classe.includes("11") || classe.includes("12")) {
      if (curso === "Ciências Físicas e Biológicas") {
        subjects = [...baseSubjects, "Física", "Química", "Biologia"];
      } else if (curso === "Ciências Económico-Jurídicas") {
        subjects = [...baseSubjects, "Economia", "Introdução ao Direito", "História", "Geografia"];
      } else if (curso === "Ciências Humanas") {
        subjects = [...baseSubjects, "História", "Geografia", "Filosofia", "Sociologia"];
      } else if (curso === "Informática de Gestão" || curso === "Informática") {
        subjects = [...baseSubjects, "Técnicas de Programação", "Sistemas de Informação", "Arquitetura de Computadores", "Empreendedorismo"];
      } else if (curso === "Eletrónica e Telecomunicações" || curso === "Eletricidade") {
        subjects = [...baseSubjects, "Eletricidade Prática", "Eletrónica Analógica", "Sistemas de Telecomunicações"];
      } else if (curso === "Construção Civil") {
        subjects = [...baseSubjects, "Desenho Técnico", "Materiais de Construção", "Topografia"];
      } else if (curso === "Contabilidade e Gestão") {
        subjects = [...baseSubjects, "Contabilidade Geral", "Técnicas de Organização Empresarial", "Fiscalidade"];
      } else if (curso === "Enfermagem" || curso === "Análises Clínicas" || curso === "Farmácia") {
        subjects = [...baseSubjects, "Anatomia e Fisiologia", "Farmacologia", "Primeiros Socorros", "Patologia"];
      } else if (curso === "Agro-Pecuária") {
        subjects = [...baseSubjects, "Fitotecnia", "Zootecnia", "Máquinas Agrícolas", "Gestão de Explorações Agrícolas"];
      } else if (curso === "Hotelaria e Turismo") {
        subjects = [...baseSubjects, "Técnicas de Acolhimento", "Geografia Turística", "Inglês Técnico", "Gastronomia"];
      } else if (curso === "Energias Renováveis") {
        subjects = [...baseSubjects, "Sistemas Solares Fotovoltaicos", "Conversão de Energia", "Manutenção de Sistemas de Energia"];
      } else if (curso === "Mecânica Industrial") {
        subjects = [...baseSubjects, "Tecnologia Mecânica", "Desenho Técnico", "Sistemas Hidráulicos e Pneumáticos", "Metrologia"];
      }
    } else {
      // 7 to 9
      subjects = [...baseSubjects, "Física", "Química", "Biologia", "Geografia", "História", "Educação Moral e Cívica"];
    }

    setIsLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ classe, curso, subjects })
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar perfil");
      }

      localStorage.setItem("userProfile", JSON.stringify({ classe, curso, subjects }));
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const requiresCurso = classe.includes("10") || classe.includes("11") || classe.includes("12");

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 sm:p-8 shadow-2xl border border-muted/20">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Cria o teu Perfil</h1>
          <p className="mt-2 text-muted">Para personalizar as tuas aulas e a Emanus IA, diz-nos qual é a tua classe.</p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-danger/50 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Classe</label>
            <select
              value={classe}
              onChange={(e) => {
                setClasse(e.target.value);
                setCurso("");
              }}
              disabled={isLoading}
              className="w-full rounded-lg border border-muted/20 bg-dark p-3 text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
            >
              <option value="">Selecione a classe...</option>
              {CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {requiresCurso && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">Curso</label>
              <select
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-muted/20 bg-dark p-3 text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
              >
                <option value="">Selecione o curso...</option>
                {CURSOS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!classe || (requiresCurso && !curso) || isLoading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-dark transition-opacity hover:opacity-90 disabled:opacity-50 mt-4"
          >
            {isLoading ? "A guardar..." : "Concluir Perfil"}
          </button>
        </div>
      </div>
    </div>
  );
}
