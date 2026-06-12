"use client";

import { useState, useEffect } from "react";

type Appointment = {
  id: string;
  tutorId: string;
  studentId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  subject: string;
  createdAt: string;
  tutorName?: string;
  studentName?: string;
};

type Availability = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export default function AppointmentsPage() {
  const [userRole, setUserRole] = useState<string>("student");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  
  // For Tutors: defining availability
  const [newAvail, setNewAvail] = useState<Availability>({ dayOfWeek: 1, startTime: "14:00", endTime: "16:00" });
  
  // For Rescheduling
  const [isRescheduling, setIsRescheduling] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "student");
    loadAppointments();

    const interval = setInterval(() => {
      loadAppointments(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userRole === "tutor") {
      loadAvailabilities();
    }
  }, [userRole]);

  const loadAppointments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/appointments", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadAvailabilities = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`/api/appointments/availability/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvailabilities(data.availabilities || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAvailability = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/appointments/availability", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newAvail)
      });
      if (res.ok) {
        loadAvailabilities();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async (id: string) => {
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      setError("Preencha todos os campos para reagendar.");
      return;
    }
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: rescheduleDate,
          startTime: rescheduleStartTime,
          endTime: rescheduleEndTime,
          status: "rescheduled"
        })
      });
      if (res.ok) {
        setIsRescheduling(null);
        loadAppointments();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDay = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day] || "Desconhecido";
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text">As minhas Aulas</h1>
        <p className="mt-2 text-muted">Gere e visualize os seus agendamentos em tempo real.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {userRole === "tutor" && (
        <div className="mb-10 rounded-xl border border-surface bg-surface p-6">
          <h2 className="text-xl font-bold text-text mb-4">A minha Disponibilidade</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-muted mb-1">Dia da Semana</label>
              <select 
                value={newAvail.dayOfWeek} 
                onChange={e => setNewAvail({...newAvail, dayOfWeek: parseInt(e.target.value)})}
                className="bg-dark border border-surface rounded-lg p-2 text-sm text-text outline-none focus:border-primary"
              >
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Hora Início</label>
              <input type="time" value={newAvail.startTime} onChange={e => setNewAvail({...newAvail, startTime: e.target.value})} className="bg-dark border border-surface rounded-lg p-2 text-sm text-text outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Hora Fim</label>
              <input type="time" value={newAvail.endTime} onChange={e => setNewAvail({...newAvail, endTime: e.target.value})} className="bg-dark border border-surface rounded-lg p-2 text-sm text-text outline-none focus:border-primary" />
            </div>
            <button onClick={handleAddAvailability} className="bg-primary text-dark font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Adicionar
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {availabilities.map((a, i) => (
              <div key={i} className="bg-dark px-3 py-1.5 rounded-lg text-xs text-text border border-surface">
                {formatDay(a.dayOfWeek)}: {a.startTime} - {a.endTime}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-text mb-4">Próximas Aulas</h2>
        {loading && appointments.length === 0 ? (
          <p className="text-muted">A carregar...</p>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-surface rounded-xl">
            <p className="text-muted">Nenhuma aula agendada.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map(app => (
              <div key={app.id} className="relative bg-surface rounded-xl p-5 border border-surface shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className={`text-xs px-2 py-1 rounded-md font-medium ${app.status === 'rescheduled' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    {app.status === 'rescheduled' ? 'Reagendado' : 'Agendado'}
                  </div>
                  <div className="text-sm text-muted font-medium">{app.date}</div>
                </div>
                
                <h3 className="text-lg font-bold text-text mb-1">{app.subject || "Aula Geral"}</h3>
                <p className="text-sm text-muted mb-4">
                  {userRole === "tutor" ? `Aluno: ${app.studentName}` : `Tutor: ${app.tutorName}`}
                </p>
                
                <div className="flex items-center text-sm font-medium text-text mb-4">
                  <svg className="w-4 h-4 mr-2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {app.startTime} - {app.endTime}
                </div>

                {isRescheduling === app.id ? (
                  <div className="mt-4 pt-4 border-t border-surface space-y-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Nova Data</label>
                      <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="w-full bg-dark border border-surface rounded-lg p-2 text-sm text-text outline-none focus:border-primary" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-muted mb-1">Novo Início</label>
                        <input type="time" value={rescheduleStartTime} onChange={e => setRescheduleStartTime(e.target.value)} className="w-full bg-dark border border-surface rounded-lg p-2 text-sm text-text outline-none focus:border-primary" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted mb-1">Novo Fim</label>
                        <input type="time" value={rescheduleEndTime} onChange={e => setRescheduleEndTime(e.target.value)} className="w-full bg-dark border border-surface rounded-lg p-2 text-sm text-text outline-none focus:border-primary" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => handleReschedule(app.id)} className="flex-1 bg-primary text-dark py-2 rounded-lg text-sm font-semibold hover:opacity-90">Guardar</button>
                      <button onClick={() => setIsRescheduling(null)} className="flex-1 bg-surface border border-surface text-text py-2 rounded-lg text-sm font-semibold hover:bg-dark">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsRescheduling(app.id);
                      setRescheduleDate(app.date);
                      setRescheduleStartTime(app.startTime);
                      setRescheduleEndTime(app.endTime);
                    }}
                    className="w-full py-2 bg-dark rounded-lg text-sm font-medium text-text border border-surface hover:border-primary/30 transition-colors"
                  >
                    Reagendar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
