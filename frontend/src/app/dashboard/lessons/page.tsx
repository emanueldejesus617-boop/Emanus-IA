"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowLeft } from "lucide-react";
import { renderMessageContent } from "@/lib/renderMarkdown";
import { cleanTextForTTS } from "@/lib/textSanitizer";

const CURRICULUM: Record<string, string[]> = {
  "Matemática": ["Trigonometria", "Geometria Espacial", "Limites e Sucessões", "Derivadas", "Estatística e Probabilidades"],
  "Física": ["Mecânica Quântica Básica", "Eletricidade e Magnetismo", "Óptica e Ondas", "Termodinâmica", "Cinemática e Dinâmica"],
  "Química": ["Química Orgânica", "Estequiometria", "Tabela Periódica", "Ligações Químicas", "Soluções e Cenética Química"],
  "Língua Portuguesa": ["Sintaxe da Oração", "Acordo Ortográfico", "Literatura Angolana (Geração de 50)", "Gramática e Semântica", "Técnicas de Redação"],
  "História de Angola": ["Reinos Antigos (Kongo, Ndongo)", "Colonização Portuguesa", "Luta de Libertação Nacional", "Acordos de Alvor e Independência", "Angola Pós-Independência"],
  "Biologia": ["Biologia Celular", "Genética Mendeliada", "Anatomia Humana", "Ecosistemas e Biodiversidade Angolana", "Evolução e Classificação"],
  "Inglês": ["Verb Tenses", "Business English Vocabulary", "Reported Speech", "Passive Voice", "Conditionals"],
  "Geografia": ["Geografia Física de Angola", "Climas e Bacias Hidrográficas", "População e Demografia", "Recursos Minerais e Económicos", "Geografia Global"],
  "Filosofia": ["Introdução ao Pensar Filosófico", "Ética e Moral", "Lógica Aristotélica", "Filosofia Política", "Epistemologia"],
  "Sociologia": ["Cultura e Identidade Angolana", "Estratificação Social", "Globalização", "Instituições Sociais", "Movimentos Sociais"],
  "Técnicas de Programação": ["Algoritmos e Fluxogramas", "Estruturas de Decisão", "Estruturas de Repetição", "Vetores e Matrizes", "Programação Orientada a Objetos"],
  "Sistemas de Informação": ["Fundamentos de Redes", "Sistemas Operativos", "Bases de Dados Relacionais", "Segurança da Informação", "Engenharia de Software"],
  "Arquitetura de Computadores": ["Sistemas de Numeração", "Portas Lógicas", "CPU, Memória e Barramentos", "Sistemas de E/S", "Manutenção de Hardware"],
  "Empreendedorismo": ["Ideias de Negócio em Angola", "Plano de Negócios", "Marketing e Vendas", "Gestão Financeira Básica", "Legislação Comercial"]
};

// Fallback list of topics if not explicitly listed
const DEFAULT_TOPICS = ["Fundamentos da Disciplina", "Tópico Avançado I", "Estudo de Caso Prático", "Revisão Curricular MINED", "Exercícios de Fixação"];

type CompletedTopic = {
  id: string;
  subject: string;
  topicName: string;
  completedAt: string;
};

type GeneratedLesson = {
  content: string;
  question: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
};

export default function LessonsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [completedTopics, setCompletedTopics] = useState<CompletedTopic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Lesson view state
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonData, setLessonData] = useState<GeneratedLesson | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Program editor state
  const [programs, setPrograms] = useState<Record<string, string[]>>({});
  const [programsLoading, setProgramsLoading] = useState(true);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [programInput, setProgramInput] = useState("");
  const [savingProgram, setSavingProgram] = useState(false);

  // New state variables for MINED curriculum validation
  const [invalidTopics, setInvalidTopics] = useState<string[]>([]);
  const [officialCurriculum, setOfficialCurriculum] = useState<string[]>([]);
  const [curriculumSearch, setCurriculumSearch] = useState("");

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    };
  }, [activeTopic]);

  const loadProgress = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/lessons/progress", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedTopics(data);
      }
    } catch (err) {
      console.error("Error loading completed topics:", err);
    }
  };

  const loadPrograms = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/lessons/programs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const progMap: Record<string, string[]> = {};
        data.forEach((p: any) => {
          progMap[p.subject] = p.topics;
        });
        setPrograms(progMap);
      }
    } catch (err) {
      console.error("Error loading quarterly programs:", err);
    } finally {
      setProgramsLoading(false);
    }
  };

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setProfile(JSON.parse(storedProfile));
    loadProgress();
    loadPrograms();
  }, []);

  // Fetch official curriculum when a subject is chosen
  useEffect(() => {
    if (selectedSubject) {
      setCurriculumSearch("");
      setInvalidTopics([]);
      const token = localStorage.getItem("token");
      if (token) {
        fetch(`/api/lessons/curriculum?subject=${encodeURIComponent(selectedSubject)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setOfficialCurriculum(data);
            }
          })
          .catch(err => console.error("Error fetching official curriculum:", err));
      }
    } else {
      setOfficialCurriculum([]);
      setInvalidTopics([]);
    }
  }, [selectedSubject, isEditingProgram]);

  // Update program input when subject or editing state changes
  useEffect(() => {
    if (selectedSubject) {
      const topics = programs[selectedSubject] || [];
      setProgramInput(topics.join("\n"));
    } else {
      setProgramInput("");
    }
  }, [selectedSubject, isEditingProgram, programs]);

  const handleSaveProgram = async () => {
    if (!selectedSubject) return;
    setSavingProgram(true);
    setError("");
    setInvalidTopics([]);

    const token = localStorage.getItem("token");
    if (!token) return;

    const topics = programInput
      .split("\n")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const res = await fetch("/api/lessons/programs", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: selectedSubject,
          topics
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.invalidTopics) {
          setInvalidTopics(data.invalidTopics);
        }
        throw new Error(data.error || "Erro ao guardar o programa.");
      }

      await loadPrograms();
      setIsEditingProgram(false);
      setInvalidTopics([]);
    } catch (err: any) {
      setError(err.message || "Não foi possível guardar o programa.");
    } finally {
      setSavingProgram(false);
    }
  };

  const getTopicsForSubject = (subject: string) => {
    return programs[subject] || [];
  };

  const isTopicCompleted = (subject: string, topic: string) => {
    return completedTopics.some(
      ct => ct.subject.toLowerCase() === subject.toLowerCase() && ct.topicName.toLowerCase() === topic.toLowerCase()
    );
  };

  const getSubjectProgress = (subject: string) => {
    const topics = getTopicsForSubject(subject);
    if (topics.length === 0) return 0;
    const completed = topics.filter(t => isTopicCompleted(subject, t)).length;
    return Math.round((completed / topics.length) * 100);
  };

  const handleStartLesson = async (topic: string) => {
    if (!selectedSubject) return;

    setActiveTopic(topic);
    setLessonLoading(true);
    setLessonData(null);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch("/api/lessons/generate-lesson", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: selectedSubject,
          topicName: topic,
          classe: profile?.classe,
          curso: profile?.curso
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        // Provide user-friendly error messages
        if (res.status === 429) {
          throw new Error("Limite de requisições atingido. Aguarde 1 minuto e tente novamente.");
        }
        throw new Error(data.error || "Erro ao carregar conteúdo da aula.");
      }
      
      setLessonData(data);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
        setError("Servidor indisponível. Verifique se o backend está em execução.");
      } else {
        setError(msg || "Não foi possível conectar com a Emanus IA. Tente novamente.");
      }
    } finally {
      setLessonLoading(false);
    }
  };



  

  const toggleSpeech = () => {
    // Ensure Speech Synthesis API is available
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta síntese de fala.');
      return;
    }
    if (!lessonData?.content) return;

    // Clean the lesson content to remove markdown and LaTeX symbols before speaking
    const cleanedContent = cleanTextForTTS(lessonData.content);
    if (!cleanedContent) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Choose configured or default Portuguese voice
      const voices = window.speechSynthesis.getVoices();
      const savedVoiceURI = typeof window !== "undefined" ? localStorage.getItem("emanus_voice_uri") : null;
      let ptVoice = savedVoiceURI ? voices.find(v => v.voiceURI === savedVoiceURI) : null;
      if (!ptVoice) {
        ptVoice = voices.find(v => /pt[-_]PT/i.test(v.lang)) || voices.find(v => /pt[-_]BR/i.test(v.lang)) || voices.find(v => /pt/i.test(v.lang)) || null;
      }
      const utterance = new SpeechSynthesisUtterance(cleanedContent);
      utterance.lang = ptVoice?.lang || "pt-PT";
      if (ptVoice) utterance.voice = ptVoice;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleAnswerSubmit = (optIdx: number) => {
    if (!lessonData || isAnswered) return;
    
    setSelectedOption(optIdx);
    setIsAnswered(true);
    
    const correct = lessonData.question.correctIndex === optIdx;
    setIsCorrect(correct);
  };

  const handleCompleteLesson = async () => {
    if (!selectedSubject || !activeTopic || savingProgress) return;

    setSavingProgress(true);
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: selectedSubject,
          topicName: activeTopic
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Update user XP inside localstorage cache
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.xp = data.xpTotal;
          localStorage.setItem("user", JSON.stringify(userObj));
        }
        
        await loadProgress();
        // Go back to topic list
        setActiveTopic(null);
        setLessonData(null);
      }
    } catch (err) {
      console.error("Error saving lesson progress:", err);
    } finally {
      setSavingProgress(false);
    }
  };

  const baseColors = ["bg-primary", "bg-secondary", "bg-accent", "bg-orange-500", "bg-purple-500", "bg-green-500", "bg-blue-500"];
  const dynamicSubjects = profile?.subjects || ["Matemática", "Física", "Química", "História de Angola", "Língua Portuguesa", "Biologia"];

  // 1. LECTURE READER VIEW
  if (activeTopic) {
    return (
      <div className="p-8 pb-20 max-w-3xl mx-auto w-full min-h-screen bg-dark">
        <header className="mb-6 flex items-center justify-between border-b border-muted/15 pb-4">
          <div>
            <span className="text-xs font-semibold text-primary uppercase">{selectedSubject}</span>
            <h2 className="text-xl font-bold text-text mt-1">{activeTopic}</h2>
          </div>
          <button 
            onClick={() => {
              setActiveTopic(null);
              setLessonData(null);
            }}
            className="px-4 py-2 border border-muted/20 text-muted hover:text-text rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Tópicos
          </button>
        </header>

        {lessonLoading && (
          <div className="py-20 text-center flex flex-col items-center justify-center animate-pulse">
            <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <h3 className="font-bold text-text">Gerar Conteúdo com a Emanus IA...</h3>
            <p className="text-xs text-muted mt-2 max-w-xs">A IA está a consultar o plano oficial do MINED para estruturar a aula e o exercício de validação.</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-center text-sm text-danger mt-10">
            <p className="font-bold mb-2">Erro de Ligação</p>
            <p>{error}</p>
            <button 
              onClick={() => handleStartLesson(activeTopic)}
              className="mt-4 px-4 py-2 bg-danger text-white rounded-lg font-bold text-xs"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {lessonData && (
          <div className="space-y-8 animate-slide-up">
            {/* Aula Teórica */}
            <article className="prose prose-invert max-w-none text-text text-sm leading-relaxed space-y-4 rounded-2xl border border-surface bg-surface/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-block bg-primary/10 border border-primary/20 text-primary text-[10px] px-2 py-0.5 rounded font-bold uppercase">Aula Teórica</span>
                <button
                  onClick={toggleSpeech}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${isPlaying ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-primary/10 text-primary border border-primary/20'}`}
                >
                  {isPlaying ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      Parar Áudio
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                      Ouvir Aula
                    </>
                  )}
                </button>
              </div>
              {/* Render structured content using shared markdown renderer */}
              {lessonData && renderMessageContent(lessonData.content)}
            </article>

            {/* Exercício de Fixação */}
            <section className="rounded-2xl border border-surface bg-surface p-6 shadow-md">
              <span className="inline-block bg-secondary/15 border border-secondary/20 text-secondary text-[10px] px-2 py-0.5 rounded font-bold uppercase mb-4">Exercício de Validação</span>
              <p className="font-bold text-sm text-text mb-6">{lessonData.question.question}</p>
              
              <div className="space-y-2">
                {lessonData.question.options.map((opt, i) => {
                  const isSelected = selectedOption === i;
                  const isCorrectAnswer = lessonData.question.correctIndex === i;

                  let btnStyle = "border-muted/20 bg-dark/30 text-text hover:bg-dark/60";
                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      btnStyle = "border-primary bg-primary/10 text-primary font-bold";
                    } else if (isSelected) {
                      btnStyle = "border-danger bg-danger/10 text-danger font-bold";
                    } else {
                      btnStyle = "border-muted/10 bg-dark/10 text-muted opacity-50";
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswerSubmit(i)}
                      disabled={isAnswered}
                      className={`w-full p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isCorrectAnswer && <span className="text-primary font-extrabold text-[10px] uppercase flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Correto</span>}
                      {isAnswered && isSelected && !isCorrectAnswer && <span className="text-danger font-extrabold text-[10px] uppercase flex items-center gap-1"><X className="w-3.5 h-3.5" /> Errado</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explicação & Botão de Conclusão */}
              {isAnswered && (
                <div className="mt-6 space-y-6 animate-slide-up">
                  <div className={`rounded-xl border p-4 text-xs leading-relaxed ${isCorrect ? 'border-primary/20 bg-primary/5 text-text' : 'border-danger/25 bg-danger/5 text-text'}`}>
                    <h4 className={`font-bold mb-1 ${isCorrect ? 'text-primary' : 'text-danger'}`}>
                      {isCorrect ? "Excelente! Resposta Certa!" : "Não foi desta vez. Estuda a explicação:"}
                    </h4>
                    <p className="text-muted">{lessonData.question.explanation}</p>
                  </div>

                  {isCorrect ? (
                    <button
                      onClick={handleCompleteLesson}
                      disabled={savingProgress}
                      className="w-full py-4 bg-primary text-dark font-extrabold rounded-xl hover:opacity-95 transition-opacity cursor-pointer shadow-lg text-center text-sm"
                    >
                      {savingProgress ? "A Gravar..." : "Concluir Aula & Ganhar +30 XP"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedOption(null);
                        setIsAnswered(false);
                      }}
                      className="w-full py-4 border border-muted/20 text-text hover:bg-muted/10 font-bold rounded-xl transition-all cursor-pointer text-center text-xs"
                    >
                      Tentar Resolver Novamente
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    );
  }

  // 2. TOPICS LIST VIEW / PROGRAM EDITOR
  if (selectedSubject) {
    const topics = getTopicsForSubject(selectedSubject);
    const progress = getSubjectProgress(selectedSubject);
    const hasProgram = topics.length > 0;

    if (!hasProgram || isEditingProgram) {
      return (
        <div className="p-4 sm:p-8 pb-20 max-w-xl mx-auto w-full min-h-screen bg-dark">
          <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-muted/15 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text">{selectedSubject}</h1>
              <p className="text-xs text-muted mt-1">Inserir Programa Trimestral</p>
            </div>
            <button 
              onClick={() => {
                setIsEditingProgram(false);
                setSelectedSubject(null);
              }}
              className="px-4 py-2 border border-muted/20 text-muted hover:text-text rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar às Disciplinas
            </button>
          </header>

          <div className="p-6 rounded-2xl border border-surface bg-surface flex gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 relative">
              <img src="/venus-logo.svg" alt="Emanus IA" className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-text flex items-center gap-1">
                <span>Emanus IA</span>
                <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold uppercase">Tutor</span>
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Insere o teu programa trimestral de <strong>{selectedSubject}</strong>. Escreve os temas e tópicos que queres aprender (um por linha) para que eu possa gerar as tuas aulas.
              </p>
            </div>
          </div>

          {invalidTopics.length > 0 && (
            <div className="mb-6 p-5 rounded-xl border border-danger/30 bg-danger/5 text-xs text-text flex gap-3 animate-slide-up">
              <div className="h-8 w-8 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center flex-shrink-0 text-danger font-bold">!</div>
              <div>
                <h4 className="font-bold text-danger">Temas Inválidos Detetados</h4>
                <p className="text-muted mt-1 leading-relaxed">
                  Os seguintes temas não constam no currículo oficial do MINED: <strong className="text-danger">{invalidTopics.join(", ")}</strong>. Por favor, corrige ou remove estes temas para que eu possa gerar as tuas aulas.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <textarea
              value={programInput}
              onChange={(e) => setProgramInput(e.target.value)}
              placeholder={
                selectedSubject && CURRICULUM[selectedSubject]
                  ? `Exemplo:\n${CURRICULUM[selectedSubject].slice(0, 3).join("\n")}`
                  : "Exemplo:\nTrigonometria\nLimites e Sucessões\nCálculo de Derivadas"
              }
              rows={8}
              className="w-full p-4 rounded-xl border border-muted/20 bg-dark/50 text-text text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted/40 font-mono resize-y"
            />
            
            {/* Searchable suggestions from MINED curriculum */}
            {officialCurriculum.length > 0 && (
              <div className="rounded-xl border border-surface bg-surface/50 p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-text">Sugestões do Programa do MINED</span>
                  <span className="text-[10px] text-muted">Clica para adicionar ao teu programa</span>
                </div>
                <input
                  type="text"
                  value={curriculumSearch}
                  onChange={(e) => setCurriculumSearch(e.target.value)}
                  placeholder="Pesquisar tópicos oficiais..."
                  className="w-full p-2.5 rounded-lg border border-muted/10 bg-dark/20 text-xs text-text focus:outline-none focus:border-primary/30 placeholder:text-muted/40 mb-3"
                />
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 scrollbar-thin">
                  {officialCurriculum
                    .filter(t => t.toLowerCase().includes(curriculumSearch.toLowerCase()))
                    .map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const trimmedInput = programInput.trim();
                          const newLines = trimmedInput ? `${trimmedInput}\n${topic}` : topic;
                          setProgramInput(newLines);
                        }}
                        className="px-2.5 py-1.5 bg-dark/40 hover:bg-primary/20 hover:text-primary border border-muted/5 hover:border-primary/20 rounded-lg text-[10px] text-muted transition-all cursor-pointer"
                      >
                        + {topic}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {error && !invalidTopics.length && (
              <p className="text-xs text-danger font-semibold bg-danger/10 border border-danger/20 p-3 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveProgram}
                disabled={savingProgram}
                className="flex-1 py-4 bg-primary text-dark font-extrabold rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm shadow-md"
              >
                {savingProgram ? "A guardar..." : "Guardar Programa Trimestral"}
              </button>
              {hasProgram && (
                <button
                  onClick={() => setIsEditingProgram(false)}
                  className="px-6 py-4 border border-muted/20 text-muted hover:text-text font-bold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-8 pb-20 max-w-xl mx-auto w-full min-h-screen bg-dark">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-muted/15 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text">{selectedSubject}</h1>
            <p className="text-xs text-muted mt-1">Programa Trimestral ({profile?.classe || '12.ª Classe'})</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditingProgram(true)}
              className="px-3 py-2 border border-primary/20 text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer text-xs font-semibold"
            >
              Editar Programa
            </button>
            <button 
              onClick={() => setSelectedSubject(null)}
              className="px-4 py-2 border border-muted/20 text-muted hover:text-text rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Mudar Disciplina
            </button>
          </div>
        </header>

        <div className="rounded-2xl bg-surface border border-surface p-6 mb-8">
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="text-muted font-medium">Progresso de Tópicos Concluídos</span>
            <span className="text-primary font-bold">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          {topics.map((topic, i) => {
            const completed = isTopicCompleted(selectedSubject, topic);
            return (
              <div 
                key={i}
                className={`rounded-xl border p-4 flex items-center justify-between transition-colors bg-surface ${completed ? 'border-primary/20' : 'border-muted/10'}`}
              >
                <div>
                  <h4 className="font-semibold text-text text-sm">{topic}</h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] mt-1.5 px-2 py-0.5 rounded font-bold uppercase ${completed ? 'bg-primary/10 text-primary' : 'bg-muted/10 text-muted'}`}>
                    {completed ? (
                      <>
                        <Check className="w-3 h-3" /> Concluído (+30 XP)
                      </>
                    ) : (
                      "Pendente"
                    )}
                  </span>
                </div>
                <button
                  onClick={() => handleStartLesson(topic)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${completed ? 'bg-muted/10 text-muted hover:bg-muted/20' : 'bg-primary text-dark hover:opacity-90'}`}
                >
                  {completed ? "Rever Aula" : "Estudar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. SUBJECT CARDS GRID (INITIAL SCREEN)
  const hasAnyProgram = Object.values(programs).some(topics => topics && topics.length > 0);

  return (
    <div className="p-4 sm:p-8 pb-20">
      <header className="mb-6 sm:mb-8 border-b border-surface/40 sm:border-0 pb-4 sm:pb-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">Aulas e Conteúdos</h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted">Acede ao currículo das tuas disciplinas.</p>
      </header>

      {!programsLoading && !hasAnyProgram && (
        <div className="mb-8 p-6 rounded-2xl border border-warning/30 bg-warning/5 backdrop-blur-md flex flex-col md:flex-row items-center gap-4 animate-slide-up">
          <div className="h-16 w-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 relative">
            <img src="/venus-logo.svg" alt="Emanus IA" className="h-10 w-10 animate-pulse" />
            <span className="absolute -bottom-1 -right-1 bg-warning text-dark text-[9px] font-black px-1 rounded uppercase">Aviso</span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-text flex items-center gap-1.5">
              <span className="text-primary">Emanus IA</span>
              <span className="text-[10px] text-muted font-normal bg-white/5 px-2 py-0.5 rounded">Tutora Virtual</span>
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Olá! Como a tua tutora virtual, informo que <strong className="text-warning">é impossível gerar aula por falta de programa trimestral escolar</strong>. Por favor, escolhe uma das disciplinas abaixo e insere o teu programa trimestral de tópicos para começarmos a estudar!
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dynamicSubjects.map((sub: string, i: number) => {
          const color = baseColors[i % baseColors.length];
          const topics = getTopicsForSubject(sub);
          const progress = getSubjectProgress(sub);
          const hasProgram = topics.length > 0;

          return (
            <div 
              key={i} 
              onClick={() => setSelectedSubject(sub)}
              className="rounded-xl border border-surface bg-surface overflow-hidden group cursor-pointer hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className={`h-28 ${color}/10 relative flex flex-col items-center justify-center`}>
                  <span className={`text-4xl font-black ${color.replace('bg-', 'text-')}`}>
                    {sub.charAt(0)}
                  </span>
                  <div className="absolute bottom-3 right-3 bg-dark/50 px-2 py-0.5 rounded text-[10px] font-bold text-white backdrop-blur-sm">
                    {profile?.classe || '12.ª Classe'}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-text group-hover:text-primary transition-colors">{sub}</h3>
                  <p className="text-xs text-muted mt-1">Aulas estruturadas sobre o currículo de Angola.</p>
                  <p className="text-[11px] text-muted mt-3 font-semibold">
                    {hasProgram ? `${topics.length} Tópicos inseridos` : "Sem programa trimestral escolar"}
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0 border-t border-muted/5 mt-4">
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>{hasProgram ? "Progresso Curricular" : "Programa Trimestral"}</span>
                    <span className="font-bold text-text">{hasProgram ? `${progress}%` : "Pendente"}</span>
                  </div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${hasProgram ? color : 'bg-muted/20'}`} 
                      style={{ width: `${hasProgram ? progress : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
