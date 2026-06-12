"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setProfile(JSON.parse(storedProfile));
    loadProgress();
  }, []);

  const getTopicsForSubject = (subject: string) => {
    return CURRICULUM[subject] || DEFAULT_TOPICS;
  };

  const isTopicCompleted = (subject: string, topic: string) => {
    return completedTopics.some(
      ct => ct.subject.toLowerCase() === subject.toLowerCase() && ct.topicName.toLowerCase() === topic.toLowerCase()
    );
  };

  const getSubjectProgress = (subject: string) => {
    const topics = getTopicsForSubject(subject);
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
        setError(msg || "Não foi possível conectar com o Tutor IA. Tente novamente.");
      }
    } finally {
      setLessonLoading(false);
    }
  };

const renderContent = (raw: string) => {
    // Clean and parse markdown-like content for display
    const cleaned = raw
      .replace(/^#\s*/gm, "")
      .replace(/[\\*_`~]/g, "")
      .replace(/\\s{2,}/g, " ")
      .trim();
    const lines = cleaned.split('\n');
    const elements: React.ReactNode[] = [];
    let buffer: string[] = [];
    let isOrdered = false;
    const flushBuffer = () => {
      if (buffer.length === 0) return;
      const ListTag = isOrdered ? 'ol' : 'ul';
      const listClass = isOrdered ? 'list-decimal' : 'list-disc';
      elements.push(
        React.createElement(
          ListTag,
          { className: `ml-4 ${listClass} mt-1` },
          buffer.map((item, i) => (
            <li key={i}>{item}</li>
          ))
        )
      );
      buffer = [];
      isOrdered = false;
    };
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Ordered list detection (e.g., "1. Item")
      const orderedMatch = trimmed.match(/^\d+\.\s+(.*)/);
      const unorderedMatch = trimmed.match(/^[-*]\s+(.*)/);
      // Heading detection (markdown levels)
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (orderedMatch) {
        if (!isOrdered && buffer.length) flushBuffer();
        isOrdered = true;
        buffer.push(orderedMatch[1]);
        return;
      }
      if (unorderedMatch) {
        if (isOrdered && buffer.length) flushBuffer();
        buffer.push(unorderedMatch[1]);
        return;
      }
      if (headingMatch) {
        flushBuffer();
        const level = headingMatch[1].length; // number of # symbols
        const text = headingMatch[2];
        const Tag = `h${Math.min(level + 2, 6)}` as "h3" | "h4" | "h5" | "h6"; // map # -> h3, ## -> h4, etc.
        elements.push(
          React.createElement(Tag, { className: "mt-4 font-semibold text-text", key: `h-${idx}` }, text)
        );
        return;
      }
      // Not a list or heading – flush any pending list
      flushBuffer();
      // Preserve simple bold/italic by wrapping with <strong>/<em> if needed (basic)
      let content: React.ReactNode = trimmed;
      // Bold **text**
      if (/\*\*(.+)\*\*/.test(trimmed)) {
        content = trimmed.replace(/\*\*(.+)\*\*/g, (m, p1) => `<strong>${p1}</strong>`);
        // dangerously set inner HTML later if needed – for simplicity, keep as plain text
      }
      elements.push(
        <p className="mt-2.5 text-text" key={`p-${idx}`}>{content}</p>
      );
    });
    // Flush any remaining list items
    flushBuffer();
    return elements;
  };

  

  const toggleSpeech = () => {
    // Ensure Speech Synthesis API is available
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta síntese de fala.');
      return;
    }
    if (!lessonData?.content) return;

    // Clean the lesson content to remove markdown symbols before speaking
    const cleanedContent = lessonData.content
      .replace(/^#\s*/gm, "")
      .replace(/[\\*_`~]/g, "")
      .replace(/\\s{2,}/g, " ")
      .trim();
    if (!cleanedContent) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Choose a Portuguese voice if available
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => /pt[-_]BR|pt[-_]PT/i.test(v.lang)) || null;
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
            className="px-4 py-2 border border-muted/20 text-muted hover:text-text rounded-xl transition-colors cursor-pointer text-xs"
          >
            ← Voltar aos Tópicos
          </button>
        </header>

        {lessonLoading && (
          <div className="py-20 text-center flex flex-col items-center justify-center animate-pulse">
            <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <h3 className="font-bold text-text">Gerar Conteúdo com o Tutor IA...</h3>
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
              {/* Render cleaned and structured content */}
              {lessonData && renderContent(lessonData.content)}
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
                      {isAnswered && isCorrectAnswer && <span className="text-primary font-extrabold text-[10px] uppercase">✓ Correto</span>}
                      {isAnswered && isSelected && !isCorrectAnswer && <span className="text-danger font-extrabold text-[10px] uppercase">✗ Errado</span>}
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

  // 2. TOPICS LIST VIEW
  if (selectedSubject) {
    const topics = getTopicsForSubject(selectedSubject);
    const progress = getSubjectProgress(selectedSubject);

    return (
      <div className="p-8 pb-20 max-w-xl mx-auto w-full min-h-screen bg-dark">
        <header className="mb-8 flex items-center justify-between border-b border-muted/15 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-text">{selectedSubject}</h1>
            <p className="text-xs text-muted mt-1">Plano Curricular Oficial ({profile?.classe || '12.ª Classe'})</p>
          </div>
          <button 
            onClick={() => setSelectedSubject(null)}
            className="px-4 py-2 border border-muted/20 text-muted hover:text-text rounded-xl transition-colors cursor-pointer text-xs"
          >
            ← Mudar Disciplina
          </button>
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
                  <span className={`inline-block text-[10px] mt-1.5 px-2 py-0.5 rounded font-bold uppercase ${completed ? 'bg-primary/10 text-primary' : 'bg-muted/10 text-muted'}`}>
                    {completed ? "✔ Concluído (+30 XP)" : "Pendente"}
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
  return (
    <div className="p-8 pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text">Aulas e Conteúdos</h1>
        <p className="mt-2 text-muted">Acede ao currículo oficial do Ministério da Educação de Angola ({profile?.classe || '12.ª Classe'}).</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dynamicSubjects.map((sub: string, i: number) => {
          const color = baseColors[i % baseColors.length];
          const topics = getTopicsForSubject(sub);
          const progress = getSubjectProgress(sub);

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
                  <p className="text-[11px] text-muted mt-3 font-semibold">{topics.length} Tópicos oficiais</p>
                </div>
              </div>
              <div className="p-5 pt-0 border-t border-muted/5 mt-4">
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>Progresso Curricular</span>
                    <span className="font-bold text-text">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color}`} 
                      style={{ width: `${progress}%` }}
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
