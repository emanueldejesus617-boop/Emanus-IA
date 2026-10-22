"use client";

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type ScheduleRow = {
  time: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

const DAY_KEYS: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const REST_KEYWORDS = ["descanso", "lazer", "livre", "pausa", "folga", "recreio"];

/**
 * Verifica se o texto da célula corresponde a uma disciplina de estudo real
 * (e não a um período de descanso ou vazio).
 */
export function isStudySubject(subject: string | null | undefined): boolean {
  if (!subject) return false;
  const clean = subject.trim().toLowerCase();
  if (clean.length === 0) return false;
  return !REST_KEYWORDS.some((kw) => clean.includes(kw));
}

/**
 * Converte strings de horários como "14:00 - 15:30", "14h00 – 15h30" ou "08:30"
 * em horas e minutos numéricos.
 */
export function parseSlotTimes(timeStr: string): {
  startHour: number;
  startMin: number;
  endHour?: number;
  endMin?: number;
} | null {
  if (!timeStr) return null;
  const matches = timeStr.match(/(\d{1,2})[:hH](\d{2})/g);
  if (!matches || matches.length === 0) return null;

  const parseSingle = (str: string) => {
    const parts = str.replace(/[hH]/, ":").split(":");
    return { hour: parseInt(parts[0], 10), min: parseInt(parts[1], 10) };
  };

  const start = parseSingle(matches[0]);
  const end = matches.length > 1 ? parseSingle(matches[1]) : undefined;

  return {
    startHour: start.hour,
    startMin: start.min,
    endHour: end?.hour,
    endMin: end?.min,
  };
}

/**
 * Retorna o estado atual de permissão de notificações do navegador.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Solicita permissão para enviar notificações no aparelho do utilizador.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Dispara notificação de boas-vindas/confirmação no aparelho
      await sendDeviceNotification("Lembretes de Estudo Ativados! 🎉", {
        body: "A Emanus IA avisar-te-á sempre no teu aparelho quando for a hora de estudar cada disciplina do teu horário.",
        icon: "/icon.png",
        badge: "/icon.png",
        tag: "emanus-notif-enabled",
      });
      playNotificationChime();
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Falha ao solicitar permissão de notificações:", err);
    return false;
  }
}

/**
 * Toca um sinal sonoro harmónico e suave via Web Audio API (sem ficheiros externos).
 */
export function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Chime harmónico de 3 notas suaves (Mi - Sol# - Si)
    const notes = [659.25, 830.61, 987.77];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  } catch (_) {
    // Autoplay bloqueado pelo navegador
  }
}

/**
 * Fala em voz alta um lembrete da Emanus IA.
 */
export function speakStudyAnnouncement(subject: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const cleanSubject = subject.replace(/[\*\#\$\_]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(
      `Emanus IA: Está na hora da tua sessão de estudo de ${cleanSubject}. Vamos aprender?`
    );
    utterance.lang = "pt-PT";
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const savedVoiceURI = localStorage.getItem("emanus_voice_uri");
    let ptVoice = savedVoiceURI ? voices.find((v) => v.voiceURI === savedVoiceURI) : null;
    if (!ptVoice) {
      ptVoice =
        voices.find((v) => /pt[-_]PT/i.test(v.lang)) ||
        voices.find((v) => /pt[-_]BR/i.test(v.lang)) ||
        voices.find((v) => /pt/i.test(v.lang)) ||
        null;
    }
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

export type ExtendedNotificationOptions = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
  data?: any;
};

/**
 * Envia uma notificação no aparelho usando Service Worker se disponível,
 * ou recorrendo à Notification API padrão.
 */
export async function sendDeviceNotification(
  title: string,
  options: ExtendedNotificationOptions
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const defaultOptions: ExtendedNotificationOptions = {
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [200, 100, 200, 100, 200],
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await (reg as any).showNotification(title, defaultOptions);
        return;
      }
    }
    new Notification(title, defaultOptions as NotificationOptions);
  } catch (err) {
    try {
      new Notification(title, defaultOptions as NotificationOptions);
    } catch (_) {}
  }
}

/**
 * Dispara o alerta completo para a disciplina agendada (notificação, som e evento in-app).
 */
export async function triggerStudyNotification(subject: string, timeSlot: string) {
  const title = `⏰ Hora de Estudar: ${subject}!`;
  const body = `Olá! Chegou a hora da tua sessão de ${subject} (${timeSlot}). A Emanus IA está à tua espera para te ensinar e tirar dúvidas! 📚✨`;

  // 1. Notificação do sistema no aparelho
  await sendDeviceNotification(title, {
    body,
    icon: "/icon.png",
    badge: "/icon.png",
    tag: `emanus-study-${subject}-${timeSlot}`,
    renotify: true,
    data: {
      url: `/dashboard/intelijai?subject=${encodeURIComponent(subject)}`,
      subject,
      timeSlot,
    },
  });

  // 2. Chime de áudio
  playNotificationChime();

  // 3. Anúncio em voz alta da Emanus
  speakStudyAnnouncement(subject);

  // 4. Disparo de evento para banner visual dentro da aplicação
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("emanusStudyReminder", {
        detail: {
          subject,
          time: timeSlot,
          message: `Hora de estudar ${subject} (${timeSlot})!`,
        },
      })
    );
  }
}

/**
 * Guarda o horário ativo em localStorage para que o serviço de lembretes
 * o consulte em tempo real sem chamadas desnecessárias à API.
 */
export function syncStudySchedule(schedule: ScheduleRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("emanus_active_schedule", JSON.stringify(schedule));
  } catch (e) {
    console.warn("Erro ao salvar horário ativo no storage:", e);
  }
}

/**
 * Recupera o horário ativo em cache.
 */
export function getCachedSchedule(): ScheduleRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("emanus_active_schedule");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Verifica o horário atual contra o plano de estudos do dia e, se coincidir
 * com o início da sessão e ainda não tiver notificado hoje, envia o alerta.
 */
export async function checkAndTriggerStudyNotifications(
  overrideSchedule?: ScheduleRow[] | null
): Promise<void> {
  if (typeof window === "undefined") return;

  const schedule = overrideSchedule || getCachedSchedule();
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return;
  }

  const now = new Date();
  const dayIndex = now.getDay();
  const currentDayKey = DAY_KEYS[dayIndex];

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMin;

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (const row of schedule) {
    const rawSubject = row[currentDayKey];
    if (!isStudySubject(rawSubject)) continue;

    const parsedTimes = parseSlotTimes(row.time);
    if (!parsedTimes) continue;

    const startTotalMins = parsedTimes.startHour * 60 + parsedTimes.startMin;
    const endTotalMins =
      parsedTimes.endHour !== undefined
        ? parsedTimes.endHour * 60 + parsedTimes.endMin!
        : startTotalMins + 90;

    // Janela de notificação: desde 5 minutos antes até 20 minutos após o início do horário
    // (garantindo que se o estudante desbloquear o telemóvel no início do bloco, é avisado)
    const diff = currentTotalMins - startTotalMins;
    const isWithinSlot = diff >= -5 && currentTotalMins <= endTotalMins && diff <= 25;

    if (isWithinSlot) {
      const slotKey = `emanus_notified_${todayStr}_${currentDayKey}_${parsedTimes.startHour}_${parsedTimes.startMin}_${rawSubject.trim()}`;
      const alreadyNotified = localStorage.getItem(slotKey);

      if (!alreadyNotified) {
        localStorage.setItem(slotKey, "true");
        await triggerStudyNotification(rawSubject.trim(), row.time);
      }
    }
  }
}

/**
 * Inicia o agendador global de lembretes na aplicação.
 * Executa uma verificação a cada 30 segundos e também nos eventos de visibilidade e foco.
 */
export function startStudyNotificationScheduler(): () => void {
  if (typeof window === "undefined") return () => {};

  // Verificação inicial após 2 segundos
  const initialTimer = setTimeout(() => {
    checkAndTriggerStudyNotifications();
  }, 2000);

  // Intervalo regular a cada 30 segundos
  const interval = setInterval(() => {
    checkAndTriggerStudyNotifications();
  }, 30000);

  // Verificação quando a janela recupera o foco ou fica visível
  const handleVisibility = () => {
    if (!document.hidden) {
      checkAndTriggerStudyNotifications();
    }
  };

  const handleFocus = () => {
    checkAndTriggerStudyNotifications();
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", handleFocus);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", handleFocus);
  };
}
