"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Check, BookOpen, BarChart3, GraduationCap, Trophy, Flame, X } from "lucide-react";

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  selectedOption?: number | null;
};

type ExamResult = {
  id: string;
  subject: string;
  score: number;
  totalQuestions: number;
  questions: Question[];
  createdAt: string;
};

export default function ExamsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ subjects?: string[]; classe?: string; curso?: string } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [gameState, setGameState] = useState<"setup" | "loading" | "playing" | "finished">("setup");
  const [error, setError] = useState("");
  const [xpGained, setXpGained] = useState(0);
  const [streakUpdated, setStreakUpdated] = useState(0);
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [selectedHistoryExam, setSelectedHistoryExam] = useState<ExamResult | null>(null);

  // Completed topics state — keyed by subject
  const [completedTopics, setCompletedTopics] = useState<Record<string, string[]>>({});

  const loadHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/exams/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Error loading exam history", e);
    }
  };

  const loadCompletedTopics = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/lessons/progress", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data: { subject: string; topicName: string }[] = await res.json();
        const grouped: Record<string, string[]> = {};
        data.forEach(item => {
          if (!grouped[item.subject]) grouped[item.subject] = [];
          grouped[item.subject].push(item.topicName);
        });
        setCompletedTopics(grouped);
      }
    } catch (e) {
      console.error("Error loading completed topics", e);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        if (parsed.subjects && parsed.subjects.length > 0) {
          setSelectedSubject(parsed.subjects[0]);
        }
      } catch (e) {
        console.error("Error loading user profile", e);
      }
    }
    loadHistory();
    loadCompletedTopics();
  }, []);


  const startExam = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setGameState("loading");
    setError("");

    try {
      const res = await fetch("/api/exams/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subject: selectedSubject })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao gerar simulado.");
      }
      if (data.questions && data.questions.length > 0) {
        // Map questions to ensure they have selectedOption defined
        const mappedQuestions = data.questions.map((q: Question) => ({
          ...q,
          selectedOption: null
        }));
        setQuestions(mappedQuestions);
        setCurrentIdx(0);
        setSelectedOption(null);
        setCorrectCount(0);
        setShowExplanation(false);
        setGameState("playing");
      } else {
        throw new Error("O servidor não retornou perguntas válidas.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro de ligação ao servidor.";
      setError(errMsg);
      setGameState("setup");
    }
  };

  const handleSelectOption = (optIdx: number) => {
    if (selectedOption !== null) return; // Prevent double select
    
    setSelectedOption(optIdx);
    
    // Save selection inside the questions state
    setQuestions(prev => prev.map((q, idx) => 
      idx === currentIdx ? { ...q, selectedOption: optIdx } : q
    ));

    const correct = questions[currentIdx].correctIndex;
    if (optIdx === correct) {
      setCorrectCount(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      await finishExam();
    }
  };

  const finishExam = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setGameState("loading");
    
    try {
      // Build final questions array. Since state updates are async, 
      // make sure the current active selection is preserved.
      const finalQuestions = questions.map((q, idx) => 
        idx === currentIdx ? { ...q, selectedOption } : q
      );

      const finalCount = finalQuestions.reduce((acc, q) => 
        q.selectedOption === q.correctIndex ? acc + 1 : acc, 0
      );
      
      const res = await fetch("/api/exams/grade", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          subject: selectedSubject,
          correctCount: finalCount,
          questions: finalQuestions
        })
      });

      const data = await res.json();
      if (res.ok) {
        setXpGained(data.xpGained);
        setStreakUpdated(data.streak);
        
        // Update user cache in localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.xp = data.xpTotal;
          userObj.streak = data.streak;
          localStorage.setItem("user", JSON.stringify(userObj));
        }

        // Reload history
        loadHistory();
      }
      setGameState("finished");
    } catch (err) {
      console.error("Error grading exam:", err);
      setGameState("finished"); // Fallback to complete even if DB save fails
    }
  };

  const subjects = profile?.subjects || ["Matemática", "Física", "Química", "Língua Portuguesa"];
  const currentQuestion = questions[currentIdx];

  return (
    <div className="p-4 sm:p-8 pb-20 min-h-screen bg-dark flex flex-col justify-start">
      {gameState === "setup" && (
        <div className="max-w-xl mx-auto w-full mt-4 sm:mt-10 animate-slide-up">
          <header className="mb-6 sm:mb-8 text-center">
            <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 mb-4 sm:mb-6 shadow-[0_0_15px_rgba(0,200,150,0.15)] animate-pulse">
              <FileText className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">Simulador de Exames Nacionais</h1>
            <p className="mt-2 text-xs sm:text-sm text-muted">Testa os teus conhecimentos com exames reais do Ministério da Educação (MINED) de Angola.</p>
          </header>

          {error && (
            <div className="mb-6 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-surface bg-surface p-5 sm:p-8 shadow-xl">
            <h3 className="text-base sm:text-lg font-bold text-text mb-4">Escolhe uma Disciplina</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {subjects.map((sub: string) => {
                const topicsCount = (completedTopics[sub] || []).length;
                const hasCompleted = topicsCount > 0;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`p-4 rounded-xl text-left border transition-all text-sm font-semibold cursor-pointer active:scale-98 relative ${
                      selectedSubject === sub
                        ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,200,150,0.05)]'
                        : 'border-muted/20 bg-dark/40 text-muted hover:text-text hover:bg-dark'
                    }`}
                  >
                    <span>{sub}</span>
                    {hasCompleted ? (
                      <span className="block text-[10px] mt-1 font-normal text-primary/80 flex items-center gap-1">
                        <Check className="w-3 h-3 text-primary" /> {topicsCount} aula{topicsCount !== 1 ? "s" : ""} concluída{topicsCount !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="block text-[10px] mt-1 font-normal text-muted/50">Sem aulas concluídas</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Emanus IA warning when selected subject has no completed lessons */}
            {selectedSubject && (completedTopics[selectedSubject] || []).length === 0 && (
              <div className="mb-6 flex gap-3 p-4 rounded-xl border border-danger/25 bg-danger/5 animate-slide-up">
                <div className="h-8 w-8 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center flex-shrink-0 text-danger font-bold text-xs">!</div>
                <div>
                  <p className="text-xs font-bold text-danger">Emanus IA — Simulado Indisponível</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    Não tens nenhuma aula concluída em <strong className="text-text">{selectedSubject}</strong>. Conclui pelo menos uma aula na aba <strong className="text-text">Aulas</strong> antes de poderes fazer um simulado.
                  </p>
                </div>
              </div>
            )}

            {/* Show completed topics used for the exam */}
            {selectedSubject && (completedTopics[selectedSubject] || []).length > 0 && (
              <div className="mb-6 p-4 rounded-xl border border-primary/15 bg-primary/5">
                <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Tópicos que vão aparecer no simulado:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(completedTopics[selectedSubject] || []).map((topic, i) => (
                    <span key={i} className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] text-primary font-medium">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={startExam}
              disabled={!selectedSubject || (completedTopics[selectedSubject] || []).length === 0}
              className="w-full py-4 bg-primary text-dark font-bold rounded-xl hover:opacity-95 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg text-center"
            >
              Iniciar Simulado (5 Questões)
            </button>
          </div>

          {/* Histórico de Simulados */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Os Teus Simulados Anteriores
            </h2>
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-muted/20 p-8 text-center text-muted text-sm">
                Ainda não realizaste nenhum simulado. Escolhe uma disciplina acima e começa a testar os teus conhecimentos!
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((exam) => (
                  <div 
                    key={exam.id}
                    className="rounded-xl border border-surface bg-surface p-4 flex items-center justify-between hover:border-primary/40 transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-text text-sm">{exam.subject}</h4>
                      <p className="text-[11px] text-muted mt-1">
                        {new Date(exam.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">{exam.score} / {exam.totalQuestions}</span>
                        <p className="text-[10px] text-muted font-medium">Acertos</p>
                      </div>
                      <button 
                        onClick={() => setSelectedHistoryExam(exam)}
                        className="px-3 py-1.5 bg-muted/15 hover:bg-primary hover:text-dark text-text text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Rever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === "loading" && (
        <div className="max-w-md mx-auto w-full text-center py-20 flex flex-col items-center justify-center animate-fade-in">
          <svg className="animate-spin h-12 w-12 text-primary mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <h3 className="text-xl font-bold text-text mb-3">Preparar Questões</h3>
          <p className="text-muted text-sm max-w-xs">A IA está a consultar a base de dados curricular e a estruturar o teu teste conforme os exames do MINED...</p>
        </div>
      )}

      {gameState === "playing" && currentQuestion && (
        <div className="max-w-3xl mx-auto w-full mt-4 animate-slide-up">
          {/* Barra de Progresso */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs text-muted mb-2 font-medium">
              <span>Simulado de {selectedSubject} ({profile?.classe || "12.ª Classe"})</span>
              <span>Questão {currentIdx + 1} de {questions.length}</span>
            </div>
            <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Enunciado */}
          <div className="rounded-2xl border border-surface bg-surface p-6 mb-6 shadow-md">
            <span className="inline-block bg-primary/10 border border-primary/25 text-primary text-xs px-2 py-0.5 rounded mb-3 font-semibold">MINED Angola</span>
            <p className="text-base text-text leading-relaxed font-medium">
              {currentQuestion.question}
            </p>
          </div>

          {/* Alternativas */}
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = currentQuestion.correctIndex === i;
              
              let style = "border-muted/20 bg-surface text-text hover:bg-surface/80";
              let icon = null;

              if (selectedOption !== null) {
                if (isCorrect) {
                  style = "border-primary bg-primary/10 text-primary";
                  icon = <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
                } else if (isSelected) {
                  style = "border-danger bg-danger/10 text-danger";
                  icon = <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>;
                } else {
                  style = "border-muted/10 bg-surface/50 text-muted opacity-60";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(i)}
                  disabled={selectedOption !== null}
                  className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between gap-4 cursor-pointer active:scale-99 ${style}`}
                >
                  <span className="flex-1">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explicação e Próximo */}
          {showExplanation && (
            <div className="space-y-6 animate-slide-up">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-bold text-primary">Correção da Emanus IA</h4>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-4 bg-primary text-dark font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer shadow-lg text-center"
              >
                {currentIdx < questions.length - 1 ? "Próxima Questão" : "Concluir e Submeter Simulado"}
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === "finished" && (
        <div className="max-w-lg mx-auto w-full mt-10 text-center animate-slide-up">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 mb-6 shadow-[0_0_20px_rgba(0,200,150,0.2)] animate-bounce">
            <Trophy className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-bold text-text mb-2">Simulado Concluído!</h2>
          <p className="text-muted text-sm mb-8">Ótimo esforço! A prática contínua é o caminho mais curto para o sucesso nos exames nacionais.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Nota Final</h4>
              <p className="text-3xl font-extrabold text-primary">{correctCount} <span className="text-sm font-normal text-muted">/ 5 Acertos</span></p>
            </div>
            <div className="rounded-2xl border border-surface bg-surface p-6 shadow-sm">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">XP Ganho</h4>
              <p className="text-3xl font-extrabold text-accent">+{xpGained} <span className="text-sm font-normal text-muted">XP</span></p>
            </div>
          </div>

          {streakUpdated > 0 && (
            <div className="rounded-2xl border border-surface bg-surface p-5 mb-8 flex items-center justify-between text-left">
              <div>
                <h4 className="text-sm font-bold text-text">Estudos Consistentes</h4>
                <p className="text-xs text-muted">Streak de estudos atualizada com sucesso!</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-danger">{streakUpdated}</span>
                <Flame className="w-6 h-6 text-accent" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setGameState("setup")}
              className="w-full py-4 bg-primary text-dark font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer shadow-lg text-center"
            >
              Fazer Outro Simulado
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 border border-muted/20 text-muted font-bold rounded-xl hover:bg-surface/35 hover:text-text transition-colors cursor-pointer text-center"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Modal de Revisão Detalhada */}
      {selectedHistoryExam && (
        <div className="fixed inset-0 bg-dark/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-muted/20 w-full max-w-2xl rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-muted/15 flex items-center justify-between bg-dark/20">
              <div>
                <h3 className="text-lg font-bold text-text">Revisão: Simulado de {selectedHistoryExam.subject}</h3>
                <p className="text-xs text-muted mt-1">Realizado em {new Date(selectedHistoryExam.createdAt).toLocaleString("pt-PT")}</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryExam(null)}
                className="h-8 w-8 rounded-full bg-dark/60 hover:bg-muted/20 text-text transition-colors flex items-center justify-center cursor-pointer border border-muted/10"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-around bg-dark/40 rounded-xl p-4 border border-muted/15">
                <div className="text-center">
                  <span className="text-[10px] text-muted uppercase tracking-wide block font-semibold">Resultado</span>
                  <span className="text-xl font-black text-primary">{selectedHistoryExam.score} / {selectedHistoryExam.totalQuestions}</span>
                  <span className="text-[10px] text-muted block">acertos</span>
                </div>
                <div className="h-8 w-px bg-muted/10"></div>
                <div className="text-center">
                  <span className="text-[10px] text-muted uppercase tracking-wide block font-semibold">Aproveitamento</span>
                  <span className="text-xl font-black text-accent">{Math.round((selectedHistoryExam.score / selectedHistoryExam.totalQuestions) * 100)}%</span>
                  <span className="text-[10px] text-muted block">de acerto</span>
                </div>
              </div>

              <div className="space-y-6">
                {selectedHistoryExam.questions.map((q: Question, idx: number) => {
                  return (
                    <div key={q.id || idx} className="border-b border-muted/15 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2.5 mb-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded bg-dark/80 text-muted font-bold text-xs flex items-center justify-center border border-muted/10">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-text leading-relaxed pt-0.5">
                          {q.question}
                        </p>
                      </div>
                      <div className="space-y-2 ml-8">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrect = q.correctIndex === optIdx;
                          const isSelected = q.selectedOption === optIdx;
                          
                          let optStyle = "border-muted/10 bg-dark/10 text-muted";
                          let badge = null;

                          if (isCorrect) {
                            optStyle = "border-primary/50 bg-primary/5 text-primary font-bold shadow-[0_0_10px_rgba(0,200,150,0.02)]";
                            badge = <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Correta</span>;
                          } else if (isSelected) {
                            optStyle = "border-danger/50 bg-danger/5 text-danger font-bold";
                            badge = <span className="text-[10px] px-2 py-0.5 bg-danger/10 text-danger border border-danger/20 rounded font-semibold flex items-center gap-1"><X className="w-3 h-3" /> Escolha Errada</span>;
                          }

                          return (
                            <div key={optIdx} className={`p-3.5 rounded-xl border text-xs flex justify-between items-center transition-all ${optStyle}`}>
                              <span className="flex-1 pr-4">{opt}</span>
                              {badge}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="mt-4 ml-8 bg-primary/5 border border-primary/15 rounded-xl p-4 text-xs text-muted leading-relaxed">
                          <span className="font-bold text-primary block mb-1">Dica da Emanus IA:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <footer className="p-5 border-t border-muted/15 bg-dark/20 text-right">
              <button 
                onClick={() => setSelectedHistoryExam(null)}
                className="px-5 py-2.5 bg-primary hover:opacity-90 text-dark font-extrabold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wide"
              >
                Fechar Revisão
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
