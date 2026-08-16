"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Zap, Mic } from "lucide-react";
import { renderMessageContent } from "@/lib/renderMarkdown";
import { cleanTextForTTS } from "@/lib/textSanitizer";

type Message = {
  role: "user" | "model";
  parts: {
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }[];
};

type Conversation = {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
};

export default function IntelijaiPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsListening] = useState(false);
  const [profile, setProfile] = useState<{ classe?: string; curso?: string; subjects?: string[] } | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const spokenOffsetRef = useRef<number>(0);

  // Media upload/recording states and refs
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [personality, setPersonality] = useState<"step-by-step" | "direct" | "mixed">("step-by-step");
  
  const mediaRecorderRef = useRef<any>(null);
  const audioStreamRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const stored = localStorage.getItem("emanus_personality");
    if (stored) {
      setPersonality(stored as any);
    }

    const handleChanged = () => {
      const updated = localStorage.getItem("emanus_personality");
      if (updated) {
        setPersonality(updated as any);
      }
    };
    window.addEventListener("emanusPersonalityChanged", handleChanged);
    return () => {
      window.removeEventListener("emanusPersonalityChanged", handleChanged);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load context from local storage if redirected from elsewhere
  useEffect(() => {
    const context = localStorage.getItem("intelijai_context");
    if (context) {
      setInput(context);
      localStorage.removeItem("intelijai_context");
    }
  }, []);

  // Load user profile and load previous conversations
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
      } catch (e) {
        console.error("Error parsing userProfile", e);
      }
    }
    loadConversations();
  }, []);

  // Cancel audio upon page unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    };
  }, []);

  const loadConversations = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/conversations", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const selectConversation = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    spokenOffsetRef.current = 0;
    setIsLoading(true);
    setActiveConversationId(id);
    setHistorySidebarOpen(false); // Close mobile drawer

    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Find conversation subject to keep filter synced
        const conv = conversations.find(c => c.id === id);
        if (conv) {
          setActiveSubject(conv.subject);
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (confirm("Tens a certeza que desejas eliminar esta conversa?")) {
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          setConversations(prev => prev.filter(c => c.id !== id));
          if (activeConversationId === id) {
            handleNewConversation();
          }
        }
      } catch (err) {
        console.error("Error deleting conversation:", err);
      }
    }
  };

  const handleNewConversation = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    spokenOffsetRef.current = 0;
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setHistorySidebarOpen(false); // Close mobile drawer
  };

  const stopAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleToggleAudio = () => {
    if (isSpeaking) {
      stopAudio();
    } else {
      const modelMessages = messages.filter(m => m.role === "model");
      if (modelMessages.length > 0) {
        const lastModelMsg = modelMessages[modelMessages.length - 1];
        const lastText = lastModelMsg?.parts.find(p => p.text)?.text;
        if (lastText) {
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          spokenOffsetRef.current = 0;
          speakSegment(lastText);
        }
      }
    }
  };

  const speakSegment = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    
    const cleanText = cleanTextForTTS(text);

    if (!cleanText || cleanText.length < 2) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Escolhe a voz configurada pelo utilizador ou a melhor voz em Português disponível no browser
    const voices = window.speechSynthesis.getVoices();
    const savedVoiceURI = typeof window !== "undefined" ? localStorage.getItem("emanus_voice_uri") : null;
    let ptVoice = savedVoiceURI ? voices.find(v => v.voiceURI === savedVoiceURI) : null;
    if (!ptVoice) {
      ptVoice = voices.find(v => /pt[-_]PT/i.test(v.lang)) || voices.find(v => /pt[-_]BR/i.test(v.lang)) || voices.find(v => /pt/i.test(v.lang)) || null;
    }
    utterance.lang = ptVoice?.lang || "pt-PT";
    if (ptVoice) utterance.voice = ptVoice;
    
    utterance.rate = audioSpeed;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const speakStream = (text: string, isFinal: boolean) => {
    if (!("speechSynthesis" in window)) return;

    const start = spokenOffsetRef.current;
    if (start >= text.length) return;

    const remaining = text.slice(start);
    
    const boundaryRegex = /[.?!;\n]+/;
    const match = remaining.match(boundaryRegex);

    if (match && match.index !== undefined) {
      const boundaryIndex = match.index + match[0].length;
      const sentence = remaining.slice(0, boundaryIndex).trim();
      
      if (sentence) {
        speakSegment(sentence);
      }
      
      spokenOffsetRef.current = start + boundaryIndex;
      speakStream(text, isFinal);
    } else if (isFinal && remaining.trim()) {
      speakSegment(remaining.trim());
      spokenOffsetRef.current = text.length;
    }
  };



  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("O seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-PT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.error("Speech recognition error", event.error);
      } else {
        console.warn("Speech recognition timeout: Nenhuma fala detetada.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };


  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      setImagePreview(resultStr);
      setImageMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };
  
  const removeImage = () => {
    setImagePreview(null);
    setImageMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startAudioRecording = async () => {
    if (isRecording) return;

    // --- Guard: verificar se estamos num contexto seguro ---
    // navigator.mediaDevices só existe em HTTPS ou localhost (não em acesso por IP)
    const hasMediaDevices =
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    // Fallback: API legada (Chrome antigo)
    const legacyGetUserMedia =
      typeof navigator !== "undefined" &&
      (
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia
      );

    if (!hasMediaDevices && !legacyGetUserMedia) {
      const isInsecure =
        typeof window !== "undefined" &&
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";

      if (isInsecure) {
        alert(
          "[Aviso] O microfone requer uma ligação segura.\n\n" +
          "Acede à aplicação através de:\n" +
          "• http://localhost:3000 (em vez do IP)\n" +
          "• ou https:// em produção\n\n" +
          "O teu browser bloqueia o acesso ao microfone por IP não seguro."
        );
      } else {
        alert(
          "O teu browser não suporta gravação de áudio.\n" +
          "Tenta usar Chrome, Edge ou Firefox atualizados."
        );
      }
      return;
    }

    try {
      let stream: MediaStream;

      if (hasMediaDevices) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // Fallback para API legada
        stream = await new Promise<MediaStream>((resolve, reject) => {
          const legacyFn =
            (navigator as any).getUserMedia ||
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia;
          legacyFn.call(navigator, { audio: true }, resolve, reject);
        });
      }

      audioStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setAudioMimeType(audioBlob.type);

        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);

        const reader = new FileReader();
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(",")[1];
          setAudioBase64(base64Data);
        };
        reader.readAsDataURL(audioBlob);
      };

      setRecordingTime(0);
      setIsRecording(true);
      recorder.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: unknown) {
      console.error("Error accessing microphone:", err);

      // Mensagem específica por tipo de erro
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          alert(
            "[Erro] Permissão do microfone negada.\n\n" +
            "Para ativar:\n" +
            "1. Clica no ícone de permissões na barra de endereço\n" +
            "2. Permite o acesso ao microfone\n" +
            "3. Recarrega a página"
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          alert("[Erro] Nenhum microfone encontrado. Liga um microfone e tenta novamente.");
        } else if (err.name === "NotReadableError") {
          alert("[Erro] O microfone está a ser usado por outra aplicação. Fecha-a e tenta novamente.");
        } else {
          alert(`[Erro] Erro ao aceder ao microfone: ${err.message}`);
        }
      } else {
        alert("[Erro] Não foi possível aceder ao microfone. Verifica as permissões do navegador.");
      }
    }
  };
  
  const stopAudioRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track: any) => track.stop());
    }
    
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelAudioRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.onstop = () => {};
    mediaRecorderRef.current.stop();
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track: any) => track.stop());
    }
    
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    setAudioPreviewUrl(null);
    setAudioBase64(null);
    setAudioMimeType(null);
  };
  
  const removeAudio = () => {
    setAudioPreviewUrl(null);
    setAudioBase64(null);
    setAudioMimeType(null);
  };

  const submitMessage = async (userMessage: string, currentHistory: Message[]) => {
    if (!userMessage.trim() && !imagePreview && !audioBase64) return;
    if (isLoading) return;
    
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    spokenOffsetRef.current = 0;

    const token = localStorage.getItem("token");

    // Add user message to state (including any media parts)
    const userParts: any[] = [{ text: userMessage }];
    let payloadMediaData: string | null = null;
    let payloadMediaType: string | null = null;

    if (imagePreview) {
      // Split off metadata header (e.g. data:image/png;base64,)
      const base64Data = imagePreview.split(",")[1];
      payloadMediaData = base64Data;
      payloadMediaType = imageMimeType;
      userParts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: base64Data
        }
      });
      removeImage();
    } else if (audioBase64) {
      payloadMediaData = audioBase64;
      payloadMediaType = audioMimeType;
      userParts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: audioBase64
        }
      });
      removeAudio();
    }

    const nextMessages = [...currentHistory, { role: "user" as const, parts: userParts }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          message: userMessage,
          mediaData: payloadMediaData || undefined,
          mediaType: payloadMediaType || undefined,
          history: currentHistory,
          classe: profile?.classe,
          curso: profile?.curso,
          conversationId: activeConversationId || undefined,
          subject: activeSubject,
          personality
        })
      });

      if (!res.ok) {
        // Try to read the server's error message for better diagnostics
        try {
          const errData = await res.json();
          throw new Error(errData.error || `Erro ${res.status}`);
        } catch {
          throw new Error(`Falha na comunicação (${res.status})`);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream indisponível");
      
      const decoder = new TextDecoder("utf-8");

      // Place placeholder for assistant's response
      setMessages(prev => [...prev, { role: "model", parts: [{ text: "" }] }]);

      let done = false;
      let buffer = "";
      let accumulatedText = "";
      let hasReceivedConvId = false;
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              let parsedData: any = null;
              try {
                parsedData = JSON.parse(dataStr);
              } catch (e) {
                console.error("Error parsing chunk", e, dataStr);
              }

              if (parsedData) {
                if (parsedData.error) {
                  accumulatedText = "Ocorreu um erro: " + parsedData.error;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "model") {
                      newMsgs[newMsgs.length - 1] = {
                        ...lastMsg,
                        parts: [{ text: accumulatedText }]
                      };
                    }
                    return newMsgs;
                  });
                  done = true;
                  break;
                }
                
                // Catch conversationId and subject if returned by backend
                if (parsedData.conversationId) {
                  if (!hasReceivedConvId) {
                    setActiveConversationId(parsedData.conversationId);
                    hasReceivedConvId = true;
                  }
                  if (parsedData.subject) {
                    setActiveSubject(parsedData.subject);
                  }
                  loadConversations(); // Reload sidebar list
                }

                if (parsedData.text) {
                  accumulatedText += parsedData.text;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "model") {
                      newMsgs[newMsgs.length - 1] = {
                        ...lastMsg,
                        parts: [{ text: accumulatedText }]
                      };
                    }
                    return newMsgs;
                  });

                  speakStream(accumulatedText, false);
                }
              }
            }
          }
        }
      }

      speakStream(accumulatedText, true);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === "model") {
          newMsgs[newMsgs.length - 1] = {
            ...lastMsg,
            parts: [{ text: "Ocorreu um erro: " + errorMessage }]
          };
        } else {
          newMsgs.push({ role: "model", parts: [{ text: "Ocorreu um erro: " + errorMessage }] });
        }
        return newMsgs;
      });
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = input;
    setInput("");
    submitMessage(msg, messages);
  };

  const userSubjects = profile?.subjects || ["Matemática", "Física", "Química", "Língua Portuguesa"];
  const subjects = userSubjects;

  // Set initial active subject to first user subject if not already set
  if (!activeSubject && userSubjects.length > 0) {
    setActiveSubject(userSubjects[0]);
  }

  // Conversas filtradas pela disciplina ativa
  const filteredConversations = conversations.filter(c => {
    if (c.subject === activeSubject) return true;
    if ((!c.subject || c.subject === "Geral" || !userSubjects.includes(c.subject)) && activeSubject === userSubjects[0]) {
      return true;
    }
    return false;
  });

  // Ao trocar de disciplina: reset do chat e filtra histórico
  const handleSubjectChange = (subject: string) => {
    if (subject === activeSubject) return;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    spokenOffsetRef.current = 0;
    setActiveSubject(subject);
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex h-full w-full bg-dark relative overflow-hidden">
      {/* Mobile history overlay */}
      {historySidebarOpen && (
        <div 
          onClick={() => setHistorySidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar de Histórico de Conversas - filtrado por disciplina */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-80 max-w-[80vw] border-r border-surface/50 bg-surface flex flex-col h-full z-40 transition-transform duration-300 lg:translate-x-0
        ${historySidebarOpen ? "translate-x-0" : "-translate-x-full lg:flex"}
      `}>
        <div className="p-4 border-b border-surface/70">
          <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Disciplina</h2>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((sub: string) => (
              <button
                key={sub}
                onClick={() => handleSubjectChange(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeSubject === sub
                    ? 'bg-primary text-dark font-bold shadow-sm'
                    : 'bg-dark/50 border border-muted/20 text-muted hover:text-text hover:border-primary/30'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-surface/50">
          <button 
            onClick={handleNewConversation}
            className="w-full py-2.5 px-4 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer active:scale-98"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nova Conversa em {activeSubject}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-xs text-muted py-8 px-2 flex flex-col items-center">
              <MessageSquare className="w-8 h-8 text-muted/60 mb-2" />
              <span>Nenhuma conversa de <span className="text-primary font-semibold">{activeSubject}</span> ainda.</span>
              <span className="mt-0.5">Inicia uma nova conversa acima!</span>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${activeConversationId === conv.id ? 'bg-primary/10 text-primary border-primary/20' : 'bg-dark/40 border-transparent hover:bg-dark/80 hover:text-text'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden mr-6">
                  <svg className={`shrink-0 ${activeConversationId === conv.id ? 'text-primary' : 'text-muted'}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-sm font-medium truncate">{conv.title}</span>
                    <span className="text-[10px] text-muted/60 truncate">{new Date(conv.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-danger p-1 rounded transition-opacity cursor-pointer"
                  title="Eliminar Conversa"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area Principal */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-dark">
        {/* Cabeçalho da disciplina ativa no chat */}
        <div className="p-4 border-b border-surface bg-surface/20 flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setHistorySidebarOpen(!historySidebarOpen)}
            className="lg:hidden p-2 rounded-lg bg-dark/40 border border-muted/15 text-muted hover:text-text cursor-pointer flex items-center gap-1.5"
            title="Ver Conversas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
            <span className="text-[10px] font-bold">Histórico</span>
          </button>
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-sm font-semibold text-text">{activeSubject}</span>
          {activeConversationId && (
            <span className="text-xs text-muted shrink-0 hidden sm:inline">
              ({filteredConversations.find(c => c.id === activeConversationId)?.title || "Conversa ativa"})
            </span>
          )}

          {/* Controlos de Áudio da Emanus */}
          <div className="ml-auto flex items-center gap-2 bg-surface/50 border border-muted/10 rounded-xl px-2 py-1 shadow-sm">
            {isSpeaking && (
              <div className="flex items-center gap-0.5 px-1.5" title="A reproduzir áudio...">
                <span className="w-0.5 h-3 bg-primary rounded-full animate-bounce"></span>
                <span className="w-0.5 h-4.5 bg-primary rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-0.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
            )}
            
            {/* Botão de Velocidade */}
            <button
              type="button"
              onClick={() => {
                const speeds = [1.0, 1.5, 2.0];
                const nextIdx = (speeds.indexOf(audioSpeed) + 1) % speeds.length;
                setAudioSpeed(speeds[nextIdx]);
              }}
              className="px-2 py-1 text-[10px] font-bold bg-dark hover:bg-dark/80 text-primary border border-muted/10 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-0.5"
              title="Velocidade de Leitura"
            >
              <Zap className="w-3 h-3 text-primary" />
              <span>{audioSpeed}x</span>
            </button>

            {/* Botão de Parar/Recomeçar */}
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                isSpeaking 
                  ? "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]" 
                  : messages.some(m => m.role === "model")
                    ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(0,200,150,0.15)]"
                    : "bg-dark/50 border-muted/10 text-muted opacity-50 cursor-not-allowed"
              }`}
              disabled={!isSpeaking && !messages.some(m => m.role === "model")}
              title={isSpeaking ? "Parar Explicação de Áudio" : "Recomeçar Explicação de Áudio"}
            >
              {isSpeaking ? (
                // Ícone de Stop Profissional
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                </svg>
              ) : (
                // Ícone de Play / Recomeçar Profissional
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-muted mt-6 animate-fade-in">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4 shadow-[0_0_15px_rgba(0,200,150,0.15)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    {/* Outer ring */}
                    <circle cx="12" cy="12" r="10" strokeWidth="1" strokeOpacity={0.25}/>
                    {/* Triangle connections between outer nodes */}
                    <line x1="12" y1="3.5" x2="5.5" y2="17" strokeWidth="0.75" strokeOpacity={0.3}/>
                    <line x1="12" y1="3.5" x2="18.5" y2="17" strokeWidth="0.75" strokeOpacity={0.3}/>
                    <line x1="5.5" y1="17" x2="18.5" y2="17" strokeWidth="0.75" strokeOpacity={0.3}/>
                    {/* Hub lines from center */}
                    <line x1="12" y1="9.5" x2="12" y2="5.3" strokeWidth="1" strokeOpacity={0.55}/>
                    <line x1="9.8" y1="13.2" x2="7.2" y2="15.5" strokeWidth="1" strokeOpacity={0.55}/>
                    <line x1="14.2" y1="13.2" x2="16.8" y2="15.5" strokeWidth="1" strokeOpacity={0.55}/>
                    {/* Outer nodes */}
                    <circle cx="12" cy="3.5" r="1.7" strokeWidth="1.4" fill="currentColor" fillOpacity={0.15}/>
                    <circle cx="5.5" cy="17" r="1.7" strokeWidth="1.4" fill="currentColor" fillOpacity={0.15}/>
                    <circle cx="18.5" cy="17" r="1.7" strokeWidth="1.4" fill="currentColor" fillOpacity={0.15}/>
                    {/* Center node */}
                    <circle cx="12" cy="12" r="2.6" strokeWidth="1.6" fill="currentColor" fillOpacity={0.25}/>
                    {/* Center dot */}
                    <circle cx="12" cy="12" r="1" fill="currentColor" strokeWidth={0}/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-text mb-1">Sou a Emanus IA</h2>
                <p className="max-w-md mx-auto text-xs text-muted mb-8">
                  Estou pronta para ajudar-te com a disciplina de <span className="text-primary font-semibold">{activeSubject}</span>. Como posso ajudar-te hoje?
                </p>

                <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                  {["Explica os principais conceitos", "Faz-me um resumo detalhado", "Dá-me um exercício resolvido"].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(`${suggestion} de ${activeSubject}`)}
                      className="px-4 py-2 rounded-full border border-surface bg-surface/50 text-xs font-medium text-text hover:border-primary/50 hover:text-primary transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const textPart = msg.parts.find(p => p.text);
              const mediaPart = msg.parts.find(p => p.inlineData);

              return (
                <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start") + " animate-slide-up"}>
                  <div className={"max-w-[80%] rounded-2xl p-4 " + (msg.role === "user" ? "bg-primary text-dark rounded-br-none font-medium shadow-md" : "bg-surface border border-muted/10 text-text rounded-bl-none shadow-sm min-w-[150px]")}>
                    {msg.role === "model" && (
                      <div className="flex justify-between items-center w-full mb-2 pb-2 border-b border-muted/10 animate-fade-in">
                        <span className="text-xs font-semibold text-primary/80">Emanus IA</span>
                        {activeConversationId && (
                          <span className="text-[9px] text-muted">{activeSubject}</span>
                        )}
                      </div>
                    )}
                    <div className="prose prose-invert max-w-none text-text text-sm space-y-2">
                      {textPart?.text && renderMessageContent(textPart.text)}
                      
                      {mediaPart?.inlineData && (
                        <div>
                          {mediaPart.inlineData.mimeType.startsWith("image/") && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-muted/10 max-w-sm shadow-sm bg-dark/30 p-1">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={`data:${mediaPart.inlineData.mimeType};base64,${mediaPart.inlineData.data}`} 
                                alt="Imagem anexada" 
                                className="w-full h-auto object-contain max-h-64 rounded-lg cursor-pointer hover:opacity-95" 
                                onClick={() => {
                                  // Open image in new tab for a larger view
                                  const mimeType = mediaPart.inlineData?.mimeType;
                                  const data = mediaPart.inlineData?.data;
                                  if (!mimeType || !data) return;
                                  const w = window.open();
                                  w?.document.write(`<img src="data:${mimeType};base64,${data}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                }}
                              />
                            </div>
                          )}
                          {mediaPart.inlineData.mimeType.startsWith("audio/") && (
                            <div className="mt-2 p-2 rounded-xl bg-dark/20 border border-muted/10 flex items-center justify-center max-w-xs">
                              <audio 
                                src={`data:${mediaPart.inlineData.mimeType};base64,${mediaPart.inlineData.data}`} 
                                controls 
                                className="w-full h-8 accent-primary text-xs" 
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-surface border border-muted/10 rounded-2xl rounded-bl-none p-4 text-muted flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-gradient-to-t from-dark via-dark to-transparent">
          <div className="max-w-3xl mx-auto">
            {/* Media previews */}
            {(imagePreview || audioPreviewUrl || isRecording) && (
              <div className="mb-3 p-3 rounded-2xl bg-surface border border-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-slide-up">
                {isRecording ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                    <span className="text-xs text-text font-bold">A gravar áudio...</span>
                    <span className="text-xs text-muted font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelAudioRecording}
                        className="px-2.5 py-1 bg-dark text-muted hover:text-danger rounded-lg text-xs font-semibold border border-muted/10 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={stopAudioRecording}
                        className="px-3 py-1 bg-primary text-dark font-bold rounded-lg text-xs transition-opacity cursor-pointer hover:opacity-95 shadow-md animate-pulse"
                      >
                        Parar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
                      {imagePreview && (
                        <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden border border-muted/10 bg-dark shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                      {audioPreviewUrl && (
                        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-none">
                          <Mic className="w-5 h-5 text-primary shrink-0" />
                          <audio src={audioPreviewUrl} controls className="h-8 w-44 sm:w-60 accent-primary" />
                        </div>
                      )}
                      <div className="flex flex-col text-left truncate">
                        <span className="text-xs font-bold text-text truncate">Ficheiro Anexado</span>
                        <span className="text-[10px] text-muted truncate">{imagePreview ? 'Imagem' : 'Áudio gravado'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={imagePreview ? removeImage : removeAudio}
                      className="p-1 text-muted hover:text-danger rounded transition-colors cursor-pointer self-end sm:self-center"
                      title="Remover anexo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3.5 sm:left-4 p-2 rounded-full text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-50 z-10"
                title="Anexar imagem"
                disabled={isLoading || isRecording || (audioPreviewUrl !== null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? "Gravação..." : `Dúvida de ${activeSubject}...`}
                disabled={isLoading || isRecording}
                className="w-full bg-surface/80 border border-muted/30 rounded-full py-3.5 sm:py-4 pl-12 sm:pl-14 pr-20 sm:pr-24 text-text focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 shadow-lg disabled:opacity-50 text-xs sm:text-sm transition-all placeholder:text-muted/60"
              />
              <button
                type="button"
                onClick={isRecording ? stopAudioRecording : startAudioRecording}
                disabled={isLoading || (imagePreview !== null)}
                className={`absolute right-12 sm:right-14 p-2 rounded-full transition-colors cursor-pointer ${isRecording ? 'text-danger animate-pulse' : 'text-muted hover:text-primary'} disabled:opacity-50`}
                title={isRecording ? "Parar Gravação" : "Gravar Áudio"}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                )}
              </button>
              <button
                type="submit"
                disabled={(!input.trim() && !imagePreview && !audioBase64) || isLoading || isRecording}
                className="absolute right-2 sm:right-2.5 p-2 bg-primary rounded-full text-dark hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
            <p className="text-center text-[10px] text-muted mt-2.5 sm:mt-3 truncate">
              Emanus IA pode cometer erros. Confirma as respostas importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
