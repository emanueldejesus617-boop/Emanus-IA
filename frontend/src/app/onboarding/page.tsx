"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  Check, 
  Plus, 
  X, 
  CheckCircle2, 
  ArrowRight
} from "lucide-react";
import { parseJsonResponse } from "@/lib/utils";

const CLASSES = [
  "7.ª Classe", 
  "8.ª Classe", 
  "9.ª Classe",
  "10.ª Classe", 
  "11.ª Classe", 
  "12.ª Classe"
];

const CURSOS = [
  // Cursos do Ensino Geral (Liceu)
  "Ciências Físicas e Biológicas",
  "Ciências Económico-Jurídicas",
  "Ciências Humanas",
  // Cursos do Ensino Técnico-Profissional (MINED Angola)
  "Informática",
  "Informática de Gestão",
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
  "Mecânica Industrial",
  "Outro Curso"
];

/** Grelha curricular oficial e recomendada pelo MINED Angola */
const DISCIPLINAS_POR_CURSO: Record<string, string[]> = {
  // Ensino Geral I Ciclo (7ª à 9ª)
  "I Ciclo (7ª - 9ª)": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química",
    "Biologia",
    "Geografia",
    "História",
    "Inglês",
    "Francês",
    "Educação Visual e Plástica",
    "Educação Física",
    "Educação Moral e Cívica",
    "Informática / TIC"
  ],

  // Ensino Secundário Geral (10ª à 12ª)
  "Ciências Físicas e Biológicas": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química",
    "Biologia",
    "Geologia",
    "Inglês",
    "Filosofia",
    "Educação Física",
    "Informática / TIC"
  ],

  "Ciências Económico-Jurídicas": [
    "Língua Portuguesa",
    "Matemática",
    "Economia",
    "Introdução ao Direito",
    "História",
    "Geografia",
    "Inglês",
    "Filosofia",
    "Educação Física",
    "Informática / TIC"
  ],

  "Ciências Humanas": [
    "Língua Portuguesa",
    "Literatura em Língua Portuguesa",
    "História",
    "Geografia",
    "Filosofia",
    "Sociologia",
    "Psicologia",
    "Inglês",
    "Francês",
    "Educação Física",
    "Matemática"
  ],

  // Ensino Técnico-Profissional (Institutos Médios)
  "Informática": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Inglês Técnico",
    "Técnicas de Programação",
    "Sistemas de Informação",
    "Arquitetura de Computadores",
    "Redes de Computadores",
    "Empreendedorismo",
    "Educação Física"
  ],

  "Informática de Gestão": [
    "Língua Portuguesa",
    "Matemática",
    "Inglês Técnico",
    "Técnicas de Programação",
    "Sistemas de Informação",
    "Arquitetura de Computadores",
    "Contabilidade Geral",
    "Organização e Gestão de Empresas",
    "Empreendedorismo",
    "Educação Física"
  ],

  "Eletrónica e Telecomunicações": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Inglês Técnico",
    "Eletricidade Prática",
    "Eletrónica Analógica",
    "Eletrónica Digital",
    "Sistemas de Telecomunicações",
    "Desenho Técnico",
    "Empreendedorismo",
    "Educação Física"
  ],

  "Eletricidade": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Inglês Técnico",
    "Eletrotecnia",
    "Instalações Elétricas",
    "Máquinas Elétricas",
    "Desenho Técnico",
    "Medidas Elétricas",
    "Higiene e Segurança no Trabalho",
    "Educação Física"
  ],

  "Construção Civil": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Inglês Técnico",
    "Desenho Técnico",
    "Materiais de Construção",
    "Topografia",
    "Mecânica dos Solos",
    "Estruturas e Construção",
    "Orçamentação de Obras",
    "Educação Física"
  ],

  "Contabilidade e Gestão": [
    "Língua Portuguesa",
    "Matemática",
    "Contabilidade Geral",
    "Técnicas de Organização Empresarial",
    "Fiscalidade",
    "Economia",
    "Direito Comercial",
    "Inglês Técnico",
    "Informática Aplicada",
    "Cálculo Financeiro",
    "Educação Física"
  ],

  "Enfermagem": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química",
    "Biologia",
    "Anatomia e Fisiologia",
    "Farmacologia",
    "Primeiros Socorros",
    "Patologia",
    "Enfermagem Geral",
    "Saúde Comunitária",
    "Ética e Deontologia Profissional",
    "Inglês Técnico",
    "Educação Física"
  ],

  "Análises Clínicas": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química",
    "Biologia",
    "Bioquímica Clínica",
    "Hematologia",
    "Microbiologia e Parasitologia",
    "Anatomofisiologia",
    "Imunologia",
    "Inglês Técnico",
    "Educação Física"
  ],

  "Farmácia": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química Geral e Orgânica",
    "Biologia",
    "Farmacologia",
    "Farmacognosia",
    "Tecnologia Farmacêutica",
    "Bioquímica",
    "Toxicologia",
    "Inglês Técnico",
    "Educação Física"
  ],

  "Agro-Pecuária": [
    "Língua Portuguesa",
    "Matemática",
    "Biologia",
    "Química",
    "Fitotecnia",
    "Zootecnia",
    "Máquinas e Motores Agrícolas",
    "Gestão de Explorações Agrícolas",
    "Edafologia e Fertilização",
    "Proteção Vegetal",
    "Inglês Técnico",
    "Educação Física"
  ],

  "Hotelaria e Turismo": [
    "Língua Portuguesa",
    "Matemática",
    "Técnicas de Acolhimento",
    "Geografia Turística",
    "Inglês Técnico",
    "Francês Técnico",
    "Gastronomia e Restauração",
    "Gestão Hoteleira",
    "História e Património Cultural",
    "Relações Públicas",
    "Educação Física"
  ],

  "Energias Renováveis": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química",
    "Sistemas Solares Fotovoltaicos",
    "Energia Eólica e Hídrica",
    "Conversão e Armazenamento de Energia",
    "Manutenção de Sistemas de Energia",
    "Desenho Técnico",
    "Eletrónica de Potência",
    "Inglês Técnico",
    "Educação Física"
  ],

  "Mecânica Industrial": [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Tecnologia Mecânica",
    "Desenho Técnico",
    "Sistemas Hidráulicos e Pneumáticos",
    "Resistência dos Materiais",
    "Metrologia e Controlo de Qualidade",
    "Máquinas-Ferramentas",
    "Higiene e Segurança no Trabalho",
    "Inglês Técnico",
    "Educação Física"
  ],

  "Outro Curso": [
    "Língua Portuguesa",
    "Matemática",
    "Inglês",
    "Física",
    "Química",
    "Educação Física",
    "Empreendedorismo"
  ]
};

export default function OnboardingPage() {
  const [classe, setClasse] = useState("");
  const [curso, setCurso] = useState("");
  const [customCurso, setCustomCurso] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isSegundoCiclo = classe.includes("10") || classe.includes("11") || classe.includes("12");

  // Obtém a lista oficial de disciplinas sugeridas pela Emanus IA
  const suggestedSubjects = useMemo(() => {
    if (!classe) return [];
    if (!isSegundoCiclo) {
      return DISCIPLINAS_POR_CURSO["I Ciclo (7ª - 9ª)"] || [];
    }
    if (!curso) return [];
    return DISCIPLINAS_POR_CURSO[curso] || DISCIPLINAS_POR_CURSO["Outro Curso"] || [];
  }, [classe, curso, isSegundoCiclo]);

  // Atualiza as disciplinas selecionadas automaticamente quando classe ou curso mudarem
  useEffect(() => {
    if (suggestedSubjects.length > 0) {
      setSelectedSubjects(suggestedSubjects);
    } else {
      setSelectedSubjects([]);
    }
  }, [suggestedSubjects]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSelectAll = () => {
    // Une todas as sugeridas com as já selecionadas (incluindo personalizadas)
    const all = Array.from(new Set([...suggestedSubjects, ...selectedSubjects]));
    setSelectedSubjects(all);
  };

  const handleDeselectAll = () => {
    setSelectedSubjects([]);
  };

  const handleAddCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (selectedSubjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSubjectInput("");
      return;
    }
    setSelectedSubjects(prev => [...prev, trimmed]);
    setNewSubjectInput("");
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    setSelectedSubjects(prev => prev.filter(s => s !== subjectToRemove));
  };

  const handleSave = async () => {
    if (!classe) {
      setError("Por favor, seleciona a tua classe escolar.");
      return;
    }

    if (isSegundoCiclo && !curso) {
      setError("Por favor, seleciona o teu curso.");
      return;
    }

    const finalCurso = isSegundoCiclo 
      ? (curso === "Outro Curso" && customCurso.trim() ? customCurso.trim() : curso)
      : "Ensino Geral (I Ciclo)";

    if (selectedSubjects.length === 0) {
      setError("Por favor, seleciona pelo menos uma disciplina para o teu plano de estudos.");
      return;
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
        body: JSON.stringify({ 
          classe, 
          curso: finalCurso, 
          subjects: selectedSubjects 
        })
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar perfil");
      }

      localStorage.setItem("userProfile", JSON.stringify({ 
        classe, 
        curso: finalCurso, 
        subjects: selectedSubjects 
      }));

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao guardar as tuas opções.");
    } finally {
      setIsLoading(false);
    }
  };

  const isReadyToChooseSubjects = classe && (!isSegundoCiclo || curso);

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-2xl rounded-3xl bg-surface p-6 sm:p-10 shadow-2xl border border-muted/20 animate-fade-in relative overflow-hidden">
        
        {/* Glow decorativo sutil no topo do card */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        {/* Cabeçalho */}
        <div className="mb-8 text-center relative z-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm animate-bounce">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
            Personaliza o teu Perfil Escolar
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
            Diz-nos a tua classe e curso. A <strong className="text-primary font-bold">Emanus IA</strong> preparou a lista oficial de disciplinas para começares a estudar!
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-danger/25 bg-danger/10 p-4 text-xs sm:text-sm text-danger flex items-center gap-3 animate-slide-up">
            <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6 relative z-10">
          {/* 1. Seleção de Classe e Curso em Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Classe */}
            <div>
              <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                1. Classe Escolar
              </label>
              <select
                value={classe}
                onChange={(e) => {
                  setClasse(e.target.value);
                  setCurso("");
                  setCustomCurso("");
                }}
                disabled={isLoading}
                className="w-full rounded-xl border border-muted/20 bg-dark p-3.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium"
              >
                <option value="">Selecione a sua classe...</option>
                {CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Curso (se aplicável ao II Ciclo) */}
            <div>
              <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                2. Curso Escolar
              </label>
              {isSegundoCiclo ? (
                <select
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-muted/20 bg-dark p-3.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium"
                >
                  <option value="">Selecione o seu curso...</option>
                  {CURSOS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full rounded-xl border border-muted/15 bg-dark/50 p-3.5 text-sm text-muted font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>{classe ? "Ensino Geral (I Ciclo)" : "Aguardando seleção da classe"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo de Curso Personalizado (se selecionou "Outro Curso") */}
          {isSegundoCiclo && curso === "Outro Curso" && (
            <div className="animate-slide-up">
              <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                Nome do Curso Específico
              </label>
              <input
                type="text"
                value={customCurso}
                onChange={(e) => setCustomCurso(e.target.value)}
                placeholder="Ex: Gestão de Recursos Humanos, Mecatrónica..."
                disabled={isLoading}
                className="w-full rounded-xl border border-muted/20 bg-dark p-3.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          )}

          {/* 2. Seçcão Interativa de Disciplinas Sugeridas pela Emanus IA */}
          {isReadyToChooseSubjects && (
            <div className="pt-2 border-t border-muted/15 animate-slide-up space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text">
                      Disciplinas Sugeridas pela Emanus IA
                    </h3>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Escolha as disciplinas que frequentas neste ano letivo ({selectedSubjects.length} selecionadas):
                  </p>
                </div>

                {/* Ações Rápidas */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-semibold text-primary hover:underline px-2 py-1 rounded cursor-pointer"
                  >
                    Selecionar Todas
                  </button>
                  <span className="text-muted/40">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-semibold text-muted hover:text-text px-2 py-1 rounded cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Grade de Disciplinas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {suggestedSubjects.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer select-none active:scale-98 ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-dark/40 border-muted/20 text-muted hover:border-muted/40 hover:text-text hover:bg-dark"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted"}`} />
                        <span className="truncate">{subject}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? "bg-primary border-primary text-white" 
                          : "border-muted/30 bg-surface/50"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}

                {/* Disciplinas personalizadas adicionadas manualmente que não estão na lista oficial */}
                {selectedSubjects
                  .filter(s => !suggestedSubjects.includes(s))
                  .map((customSub) => (
                    <div
                      key={customSub}
                      className="flex items-center justify-between p-3 rounded-xl border bg-primary/10 border-primary text-primary text-xs font-semibold shadow-sm select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="truncate">{customSub}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(customSub)}
                        className="text-primary hover:text-danger p-0.5 rounded transition-colors cursor-pointer"
                        title="Remover disciplina"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>

              {/* Adicionar Disciplina Extra Personalizada */}
              <form onSubmit={handleAddCustomSubject} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  placeholder="Frequentas outra disciplina? Ex: Robótica, Francês..."
                  className="flex-1 rounded-xl border border-muted/20 bg-dark px-3.5 py-2.5 text-xs text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted/50"
                />
                <button
                  type="submit"
                  disabled={!newSubjectInput.trim()}
                  className="px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>
            </div>
          )}

          {/* Botão de Conclusão */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={!classe || (isSegundoCiclo && !curso) || selectedSubjects.length === 0 || isLoading}
              className="w-full rounded-2xl bg-primary py-4 font-bold text-dark transition-all duration-300 hover:opacity-95 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>A preparar o teu ambiente de estudos...</span>
                </>
              ) : (
                <>
                  <span>Concluir Perfil e Começar a Estudar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-muted text-center">
            Poderás sempre ajustar as tuas disciplinas e preferências no teu painel a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
