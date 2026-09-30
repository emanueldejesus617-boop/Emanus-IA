"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Lock, 
  Cookie, 
  CheckCircle2, 
  ArrowLeft, 
  BrainCircuit, 
  SlidersHorizontal, 
  Mail, 
  UserCheck 
} from "lucide-react";
import { Logo } from "@/components/logo";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
  };

  return (
    <div className="min-h-screen bg-dark font-sans text-text transition-colors duration-300">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 border-b border-muted/10 bg-dark/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="custom" height={36} />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-muted/15 bg-surface/50 text-xs font-semibold text-text hover:border-primary/40 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-12">
        {/* Banner Superior Hero */}
        <div className="text-center space-y-4 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-primary" /> Compromisso com a Segurança e Transparência
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-text via-text to-primary/90 bg-clip-text text-transparent">
            Política de Privacidade & Cookies
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto">
            A tua privacidade é fundamental para nós. Descobre como a <strong className="text-text font-semibold">Emanus IA</strong> recolhe, utiliza, protege e respeita os teus dados de aprendizagem.
          </p>
          <p className="text-xs text-muted/60">
            Última atualização: 11 de Setembro de 2026 • Versão 2.4
          </p>
        </div>

        {/* Destaques Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-muted/10 bg-surface/40 backdrop-blur-md space-y-2">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 text-primary flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text">Encriptação Total</h3>
            <p className="text-xs text-muted leading-relaxed">
              Todas as palavras-passe, sessões e comunicações utilizam criptografia robusta de ponta a ponta (SSL/TLS e Firebase Security).
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-muted/10 bg-surface/40 backdrop-blur-md space-y-2">
            <div className="h-10 w-10 rounded-xl bg-secondary/15 border border-secondary/20 text-secondary flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text">IA Ética e Privada</h3>
            <p className="text-xs text-muted leading-relaxed">
              As tuas conversas escolares não são partilhadas com terceiros nem vendidas para fins publicitários.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-muted/10 bg-surface/40 backdrop-blur-md space-y-2">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 text-primary flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text">Controlo do Aluno</h3>
            <p className="text-xs text-muted leading-relaxed">
              Podes consultar, alterar o teu perfil, limpar o teu histórico ou gerir os teus cookies a qualquer momento.
            </p>
          </div>
        </div>

        {/* Artigos Detalhados */}
        <div className="space-y-10 text-muted leading-relaxed text-sm">
          {/* Secção 1 */}
          <section className="space-y-3 p-6 sm:p-8 rounded-2xl border border-muted/10 bg-surface/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <span className="text-primary font-mono text-base">01.</span> Identificação e Âmbito
            </h2>
            <p>
              A plataforma <strong>Emanus IA</strong> é o primeiro produto da <strong>Emanus</strong>, uma startup angolana de tecnologia focada no desenvolvimento de soluções digitais que respondem a desafios reais da sociedade. A Emanus foi fundada e desenvolvida inicialmente por três jovens angolanos — <strong>Emanuel De Jesus, Guido Alfredo e Daniel Taba</strong> —, contando atualmente com uma equipa alargada de colaboradores para transformar o futuro da educação e da tecnologia em Angola.
            </p>
            <p>
              Esta Política de Privacidade estabelece os termos em que os dados pessoais dos utilizadores (estudantes, professores e encarregados de educação) são tratados no estrito cumprimento da legislação de proteção de dados (incluindo a Lei de Proteção de Dados Pessoais de Angola e normas internacionais de referência como o RGPD).
            </p>
          </section>

          {/* Secção 2 */}
          <section className="space-y-3 p-6 sm:p-8 rounded-2xl border border-muted/10 bg-surface/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <span className="text-primary font-mono text-base">02.</span> Dados Pessoais que Recolhemos
            </h2>
            <p>Recolhemos apenas as informações estritamente necessárias para proporcionar uma experiência pedagógica personalizada:</p>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Dados de Registo e Autenticação:</strong> Nome, endereço de e-mail, fotografia de perfil (caso autenticado via Google Sign-In) e credenciais de acesso encriptadas.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Perfil Académico:</strong> Classe escolar (ex: 7ª à 13ª classe), curso (ex: Ciências Físicas e Biológicas, Ciências Económicas e Jurídicas, Informática) e disciplinas de foco.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Interações Educacionais:</strong> Mensagens de texto e áudio trocadas com a explicadora virtual, simulados realizados, pontuações de exames, XP e dias consecutivos de estudo (*streaks*).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Dados Técnicos e Diagnóstico:</strong> Endereço IP anonimizado, tipo de navegador, sistema operativo e registos de erros para manutenção de segurança.</span>
              </li>
            </ul>
          </section>

          {/* Secção 3 */}
          <section className="space-y-3 p-6 sm:p-8 rounded-2xl border border-muted/10 bg-surface/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <span className="text-primary font-mono text-base">03.</span> Finalidade do Tratamento de Dados
            </h2>
            <p>Os teus dados são processados com os seguintes objetivos legítimos:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-muted/10 bg-dark/40">
                <h4 className="font-semibold text-text text-xs mb-1">Adaptação do Ensino</h4>
                <p className="text-xs">Personalizar os exemplos, resumos e questões geradas pela IA para o teu nível escolar exato.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-muted/10 bg-dark/40">
                <h4 className="font-semibold text-text text-xs mb-1">Acompanhamento e Gamificação</h4>
                <p className="text-xs">Calcular a tua evolução semanal, níveis de XP e consistência de estudo.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-muted/10 bg-dark/40">
                <h4 className="font-semibold text-text text-xs mb-1">Segurança e Integridade</h4>
                <p className="text-xs">Proteger a tua conta contra acessos indevidos, fraudes e abusos de tráfego.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-muted/10 bg-dark/40">
                <h4 className="font-semibold text-text text-xs mb-1">Melhoria Contínua</h4>
                <p className="text-xs">Otimizar os tempos de resposta da IA e refinar os modelos pedagógicos.</p>
              </div>
            </div>
          </section>

          {/* Secção 4 - Política de Cookies */}
          <section className="space-y-4 p-6 sm:p-8 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
                  <Cookie className="w-5 h-5 text-primary" /> Política de Cookies e Armazenamento Local
                </h2>
                <p className="text-xs text-muted mt-1">
                  Cookies são pequenos ficheiros guardados no teu dispositivo que ajudam a aplicação a funcionar de forma fluida.
                </p>
              </div>

              <button
                onClick={handleOpenCookieSettings}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-dark font-bold text-xs hover:shadow-[0_0_15px_rgba(0,200,150,0.3)] transition-all cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Gerir Preferências de Cookies</span>
              </button>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-muted/20 text-text font-semibold">
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Finalidade</th>
                    <th className="py-2.5 px-3">Duração</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/10">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-text">Sessão & Autenticação</td>
                    <td className="py-3 px-3">Mantém a tua sessão iniciada com o token seguro e guarda o tema (Dark/Light).</td>
                    <td className="py-3 px-3">Até 7 dias / Permanente</td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">Obrigatório</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-text">Preferências de IA</td>
                    <td className="py-3 px-3">Memoriza as últimas matérias consultadas e o nível de dificuldade preferido.</td>
                    <td className="py-3 px-3">Persistente</td>
                    <td className="py-3 px-3 text-primary font-semibold">Opcional</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-text">Desempenho & Telemetria</td>
                    <td className="py-3 px-3">Mede a velocidade da síntese de voz (TTS) e geração de aulas.</td>
                    <td className="py-3 px-3">Sessão</td>
                    <td className="py-3 px-3 text-secondary font-semibold">Opcional</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Secção 5 */}
          <section className="space-y-3 p-6 sm:p-8 rounded-2xl border border-muted/10 bg-surface/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <span className="text-primary font-mono text-base">05.</span> Uso Ético da Inteligência Artificial (Google Gemini)
            </h2>
            <p>
              O motor pedagógico da Emanus é alimentado por modelos de inteligência artificial de última geração. Garantimos que:
            </p>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>As tuas perguntas não são utilizadas para treinar modelos públicos que revelem a tua identidade pessoal.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>As respostas geradas são filtradas por filtros éticos estritos de segurança, proteção infantil e combate a conteúdos impróprios.</span>
              </li>
            </ul>
          </section>

          {/* Secção 6 */}
          <section className="space-y-3 p-6 sm:p-8 rounded-2xl border border-muted/10 bg-surface/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <span className="text-primary font-mono text-base">06.</span> Os Teus Direitos como Titular dos Dados
            </h2>
            <p>Tens o direito inalienável de:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-muted/10 bg-dark/40">
                <strong className="text-text block mb-1">Acesso e Retificação:</strong>
                <p className="text-xs">Consultar e atualizar o teu nome, classe, curso e disciplinas no teu perfil.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-muted/10 bg-dark/40">
                <strong className="text-text block mb-1">Direito ao Esquecimento:</strong>
                <p className="text-xs">Solicitar a exclusão total da tua conta e histórico de conversas a qualquer momento.</p>
              </div>
            </div>
          </section>

          {/* Secção 7 */}
          <section className="space-y-3 p-6 sm:p-8 rounded-2xl border border-muted/10 bg-surface/20 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <span className="text-primary font-mono text-base">07.</span> Contacto do Encarregado de Proteção de Dados
            </h2>
            <p>
              Se tiveres qualquer dúvida sobre a nossa Política de Privacidade, ou se pretenderes exercer qualquer um dos teus direitos, podes contactar a equipa de suporte:
            </p>
            <div className="inline-flex items-center gap-3 p-4 rounded-xl border border-muted/15 bg-surface/50 text-text">
              <Mail className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-muted block">E-mail de Suporte e Privacidade:</span>
                <a href="mailto:suporteemanusia@gmail.com" className="text-sm font-bold text-text hover:text-primary transition-colors">suporteemanusia@gmail.com</a>
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé da Página */}
        <div className="pt-8 border-t border-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© 2026 Emanus — tecnologia criada por jovens, para transformar o futuro.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenCookieSettings}
              className="text-primary hover:underline cursor-pointer"
            >
              Definições de Cookies
            </button>
            <Link href="/" className="hover:text-text transition-colors">
              Página Principal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
