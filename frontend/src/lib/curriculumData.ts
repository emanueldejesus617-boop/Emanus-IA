/**
 * Dados curriculares e de disciplinas oficiais segundo o MINED (Ministério da Educação de Angola).
 * Utilizado para mapeamento automático de disciplinas no onboarding, dashboard e assistente IA.
 */

export const DISCIPLINAS_POR_CURSO: Record<string, string[]> = {
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

/**
 * Retorna as disciplinas oficiais com base na classe e no curso do estudante.
 */
export function getDisciplinesForCourseAndClass(classe?: string, curso?: string): string[] {
  const cleanClasse = (classe || "").toLowerCase().trim();
  const isICiclo = ["7ª", "7ª classe", "8ª", "8ª classe", "9ª", "9ª classe", "7", "8", "9"].some(
    (c) => cleanClasse.includes(c)
  );

  if (isICiclo) {
    return DISCIPLINAS_POR_CURSO["I Ciclo (7ª - 9ª)"] || [];
  }

  if (curso && DISCIPLINAS_POR_CURSO[curso]) {
    return DISCIPLINAS_POR_CURSO[curso];
  }

  if (curso) {
    const key = Object.keys(DISCIPLINAS_POR_CURSO).find(
      (k) =>
        k.toLowerCase() === curso.toLowerCase() ||
        curso.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(curso.toLowerCase())
    );
    if (key && DISCIPLINAS_POR_CURSO[key]) {
      return DISCIPLINAS_POR_CURSO[key];
    }
  }

  // Fallback padrão angolano
  return [
    "Língua Portuguesa",
    "Matemática",
    "Física",
    "Química",
    "Biologia",
    "Inglês"
  ];
}

/**
 * Retorna uma descrição curta e contextual para cada disciplina.
 */
export function getSubjectDescription(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("língua portuguesa") || s.includes("português") || s.includes("literatura")) {
    return "Domina a gramática, interpretação de texto e redação com sínteses práticas da língua portuguesa.";
  }
  if (s.includes("matemática") || s.includes("cálculo")) {
    return "Resolve fórmulas, equações e problemas com o passo a passo guiado pela Emanus IA.";
  }
  if (s.includes("física")) {
    return "Explora mecânica, dinâmica, eletricidade e energia com exemplos do quotidiano.";
  }
  if (s.includes("química")) {
    return "Compreende reações, estrutura atómica e tabela periódica de forma clara e visual.";
  }
  if (s.includes("biologia") || s.includes("anatomia") || s.includes("fisiologia")) {
    return "Aprende sobre células, ecossistemas e anatomia humana com explicações ricas.";
  }
  if (s.includes("programação") || s.includes("informática") || s.includes("sistemas")) {
    return "Desenvolve lógica de programação, algoritmos e domina o funcionamento de computadores.";
  }
  if (s.includes("redes") || s.includes("telecomunicações")) {
    return "Aprende protocolos, topologias e infraestruturas de telecomunicações e internet.";
  }
  if (s.includes("história")) {
    return "Compreende os grandes marcos de Angola, de África e do mundo com cronologias detalhadas.";
  }
  if (s.includes("geografia")) {
    return "Estuda relevo, clima, demografia e economia angolana e global com mapas interativos.";
  }
  if (s.includes("inglês") || s.includes("francês") || s.includes("língua")) {
    return "Treina vocabulário, estruturas gramaticais e conversação para o teu sucesso académico.";
  }
  if (s.includes("contabilidade") || s.includes("economia") || s.includes("gestão")) {
    return "Aprende lançamentos contabilísticos, finanças e noções de economia aplicada.";
  }
  if (s.includes("eletricidade") || s.includes("eletrónica")) {
    return "Domina circuitos elétricos, leis de Ohm e instrumentos de medição e automação.";
  }
  return "Aprende os conceitos essenciais desta disciplina com explicações inteligentes e testes de fixação.";
}

export const CURRICULUM_TOPICS: Record<string, string[]> = {
  "Matemática": ["Trigonometria", "Geometria Espacial", "Limites e Sucessões", "Derivadas", "Estatística e Probabilidades"],
  "Física": ["Mecânica Quântica Básica", "Eletricidade e Magnetismo", "Óptica e Ondas", "Termodinâmica", "Cinemática e Dinâmica"],
  "Química": ["Química Orgânica", "Estequiometria", "Tabela Periódica", "Ligações Químicas", "Soluções e Cenética Química"],
  "Língua Portuguesa": ["Sintaxe da Oração", "Acordo Ortográfico", "Literatura Angolana (Geração de 50)", "Gramática e Semântica", "Técnicas de Redação"],
  "História de Angola": ["Reinos Antigos (Kongo, Ndongo)", "Colonização Portuguesa", "Luta de Libertação Nacional", "Acordos de Alvor e Independência", "Angola Pós-Independência"],
  "História": ["Reinos Antigos (Kongo, Ndongo)", "Colonização Portuguesa", "Luta de Libertação Nacional", "Acordos de Alvor e Independência", "Angola Pós-Independência"],
  "Biologia": ["Biologia Celular", "Genética Mendeliada", "Anatomia Humana", "Ecosistemas e Biodiversidade Angolana", "Evolução e Classificação"],
  "Inglês": ["Verb Tenses", "Business English Vocabulary", "Reported Speech", "Passive Voice", "Conditionals"],
  "Inglês Técnico": ["Technical Vocabulary", "Reading Technical Manuals", "Grammar & Syntax", "Technical Documentation", "Professional Communication"],
  "Geografia": ["Geografia Física de Angola", "Climas e Bacias Hidrográficas", "População e Demografia", "Recursos Minerais e Económicos", "Geografia Global"],
  "Filosofia": ["Introdução ao Pensar Filosófico", "Ética e Moral", "Lógica Aristotélica", "Filosofia Política", "Epistemologia"],
  "Sociologia": ["Cultura e Identidade Angolana", "Estratificação Social", "Globalização", "Instituições Sociais", "Movimentos Sociais"],
  "Técnicas de Programação": ["Algoritmos e Fluxogramas", "Estruturas de Decisão", "Estruturas de Repetição", "Vetores e Matrizes", "Programação Orientada a Objetos"],
  "Sistemas de Informação": ["Fundamentos de Redes", "Sistemas Operativos", "Bases de Dados Relacionais", "Segurança da Informação", "Engenharia de Software"],
  "Arquitetura de Computadores": ["Sistemas de Numeração", "Portas Lógicas", "CPU, Memória e Barramentos", "Sistemas de E/S", "Manutenção de Hardware"],
  "Redes de Computadores": ["Topologias de Rede", "Modelo OSI e TCP/IP", "Endereçamento IP e Sub-redes", "Equipamentos de Rede", "Segurança em Redes"],
  "Empreendedorismo": ["Ideias de Negócio em Angola", "Plano de Negócios", "Marketing e Vendas", "Gestão Financeira Básica", "Legislação Comercial"],
  "Educação Física": ["Condição Física e Saúde", "Jogos Coletivos e Individuais", "Regras e Arbitragem", "Fisiologia do Exercício", "Primeiros Socorros no Desporto"],
  "Economia": ["Introdução à Ciência Económica", "Agentes Económicos e Circuitos", "Moeda e Inflação", "Comércio Internacional", "Economia de Angola"],
  "Contabilidade Geral": ["Conceitos Fundamentais", "Património e Inventário", "Balancete e Contas", "Lançamentos Contabilísticos", "Demonstrações Financeiras"],
  "Desenho Técnico": ["Normas e Escalas", "Construções Geométricas", "Projeções Ortogonais", "Cortes e Seções", "Cotagem e Perspetivas"]
};

export const DEFAULT_TOPICS = [
  "Fundamentos da Disciplina",
  "Tópico Avançado I",
  "Estudo de Caso Prático",
  "Revisão Curricular MINED",
  "Exercícios de Fixação"
];

export interface StudyTip {
  id: number;
  title: string;
  tip: string;
  topic: string;
}

export const DAILY_STUDY_TIPS: StudyTip[] = [
  {
    id: 1,
    title: "Consistência e Foco",
    tip: "Estudar 20 a 30 minutos todos os dias fortalece as ligações neurais e melhora a retenção em 60%. Mantém a tua dedicação diária!",
    topic: "consistência de estudo"
  },
  {
    id: 2,
    title: "Técnica de Feynman",
    tip: "Explica a matéria a ti mesmo em voz alta com palavras simples, como se ensinasses a um colega. Onde hesitares é onde precisas de rever!",
    topic: "técnica de feynman"
  },
  {
    id: 3,
    title: "Repetição Espaçada",
    tip: "Rever um tema 24h após a aula e novamente 7 dias depois combate a curva do esquecimento e fixa o conhecimento a longo prazo.",
    topic: "repetição espaçada"
  },
  {
    id: 4,
    title: "Active Recall (Prática Ativa)",
    tip: "Resolver questões e exercícios sem consultar os apontamentos ativa o cérebro 3 vezes mais do que apenas reler passivamente o texto.",
    topic: "recuperação ativa"
  },
  {
    id: 5,
    title: "Método Pomodoro",
    tip: "Estuda em blocos de 25 minutos de concentração total seguidos de 5 minutos de pausa. Isso recarrega a tua energia mental e foco.",
    topic: "método pomodoro"
  },
  {
    id: 6,
    title: "O Poder do Sono Reparador",
    tip: "Dormir 7 a 8 horas por noite é indispensável: é durante o sono profundo que o cérebro consolida as memórias do que estudaste.",
    topic: "sono e aprendizagem"
  },
  {
    id: 7,
    title: "Ambiente sem Distrações",
    tip: "Deixa o telemóvel noutro compartimento ou em modo não incomodar durante as sessões. Cada distração custa até 15 minutos para recuperar o foco.",
    topic: "eliminação de distrações"
  },
  {
    id: 8,
    title: "Mapas Mentais e Esquemas",
    tip: "Conectar ideias com setas, cores e pequenos resumos ativa a memória visual e ajuda a compreender sistemas complexos rapidamente.",
    topic: "mapas mentais"
  },
  {
    id: 9,
    title: "Curiosidade Investigativa",
    tip: "Antes de abrir um capítulo novo, tenta adivinhar o que significa o título. Ter perguntas na mente faz o cérebro absorver as respostas com avidez.",
    topic: "curiosidade ativa"
  },
  {
    id: 10,
    title: "Hidratação e Energia Mental",
    tip: "O cérebro é composto por cerca de 75% de água. Beber um copo de água ao iniciar os estudos alivia a fadiga e aumenta a velocidade de raciocínio.",
    topic: "hidratação e foco"
  },
  {
    id: 11,
    title: "Prática Intercalada",
    tip: "Alterna disciplinas diferentes na mesma jornada (ex: Matemática e História). Isso ensina o cérebro a categorizar e aplicar estratégias distintas.",
    topic: "prática intercalada"
  },
  {
    id: 12,
    title: "Conversa com a Emanus IA",
    tip: "Resume à Emanus o que acabaste de aprender na aula e pede-lhe para te fazer perguntas surpresa sobre o tema!",
    topic: "revisão com a emanus ia"
  },
  {
    id: 13,
    title: "Sublinhar com Consciência",
    tip: "Sublinhar o livro inteiro dá uma falsa sensação de domínio. Destaca apenas palavras-chave e anota as tuas próprias conclusões à margem.",
    topic: "técnicas de sublinhado"
  },
  {
    id: 14,
    title: "Auto-avaliação ao Fechar o Livro",
    tip: "Depois de ler uma página, fecha-a e resume mentalmente: 'Quais foram os 3 pontos mais importantes que acabei de aprender?'",
    topic: "auto-teste"
  },
  {
    id: 15,
    title: "Ambiente Sagrado de Estudo",
    tip: "Estudar num espaço limpo e dedicado cria um gatilho psicológico automático que diz ao teu cérebro: 'Agora é hora de focar'.",
    topic: "ambiente de estudo"
  },
  {
    id: 16,
    title: "Dividir Metas Grandes",
    tip: "Não tentes aprender um trimestre numa noite. Um conceito dominado por dia resulta em mais de 30 conceitos dominados no final do mês!",
    topic: "micro-metas diárias"
  },
  {
    id: 17,
    title: "Oportunidade nos Erros",
    tip: "Errar uma questão num simulado é valioso. Descobre o porquê do erro para garantir que no dia do exame oficial não cometes o mesmo deslize.",
    topic: "aprender com os erros"
  },
  {
    id: 18,
    title: "Pausas Ativas",
    tip: "Nos intervalos, levanta-te, alonga o corpo e caminha um pouco. O aumento da circulação sanguínea leva mais oxigénio ao teu cérebro.",
    topic: "pausas ativas"
  },
  {
    id: 19,
    title: "Planear na Véspera",
    tip: "Antes de dormir, anota a disciplina e o tema que vais estudar no dia seguinte. Acordar sabendo a meta elimina a procrastinação matinal.",
    topic: "planeamento de rotina"
  },
  {
    id: 20,
    title: "Exemplos do Quotidiano",
    tip: "Ao aprender fórmulas de Física ou Matemática, tenta associá-las a situações práticas de Angola (ex: velocidades nas estradas, circuitos caseiros).",
    topic: "aplicação prática"
  },
  {
    id: 21,
    title: "Fichas de Revisão (Flashcards)",
    tip: "Cria fichas rápidas: de um lado escreve o conceito ou pergunta, do outro a explicação. Podes rever em qualquer lugar e a qualquer hora!",
    topic: "flashcards"
  },
  {
    id: 22,
    title: "Controlo Emocional em Exames",
    tip: "Em dias de prova, faz 3 respirações lentas e profundas antes de ler o enunciado. A tranquilidade abre caminho para a memória de trabalho.",
    topic: "gestão de ansiedade"
  },
  {
    id: 23,
    title: "Prioridade às Dificuldades",
    tip: "Começa a tua sessão de estudo pela disciplina que consideras mais difícil, enquanto o teu nível de energia e atenção está no auge.",
    topic: "priorização de matérias"
  },
  {
    id: 24,
    title: "Associações Mnemónicas",
    tip: "Cria frases engraçadas ou siglas usando as primeiras letras das palavras que precisas de memorizar em ordem. O cérebro adora histórias!",
    topic: "mnemónicas"
  },
  {
    id: 25,
    title: "Aprender em Grupo",
    tip: "Discutir resoluções com colegas de turma estimula o pensamento crítico e solidifica o conhecimento através do debate construtivo.",
    topic: "estudo colaborativo"
  },
  {
    id: 26,
    title: "Autoconfiança e Postura",
    tip: "Visualiza-te a ter sucesso nos exames. A atitude confiante baseada na preparação diária reduz a ansiedade e melhora o desempenho.",
    topic: "mindset positivo"
  },
  {
    id: 27,
    title: "Leitura Interrogativa",
    tip: "Transforma os subtítulos dos teus manuais em perguntas. À medida que lês, a tua mente procura ativamente pelas respostas.",
    topic: "leitura ativa"
  },
  {
    id: 28,
    title: "Revisão Geral Semanal",
    tip: "Dedica 45 minutos ao fim de semana para rever os resumos da semana. Essa revisão geral consolida o aprendizado de forma duradoura.",
    topic: "revisão semanal"
  },
  {
    id: 29,
    title: "Celebra o Teu Progresso",
    tip: "Concluíste um tópico ou resolveste um simulado difícil? Reconhece o teu mérito! A sensação de conquista motiva o próximo desafio.",
    topic: "motivação e recompensa"
  },
  {
    id: 30,
    title: "Sons e Concentração",
    tip: "Para tarefas que exigem muita leitura ou cálculos, prefere silêncio ou sons instrumentais suaves para não sobrecarregar a memória verbal.",
    topic: "som e concentração"
  },
  {
    id: 31,
    title: "O Futuro Constrói-se Hoje",
    tip: "Cada aula assistida e cada exercício resolvido aproximam-te dos teus sonhos académicos e profissionais. O teu esforço vale a pena!",
    topic: "propósito nos estudos"
  }
];

/**
 * Retorna a dica de estudo diária com base na data do calendário (muda automaticamente a cada 24 horas à meia-noite).
 */
export function getDailyStudyTip(date: Date = new Date()): StudyTip {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = Math.abs(dayOfYear) % DAILY_STUDY_TIPS.length;
  return DAILY_STUDY_TIPS[index] || DAILY_STUDY_TIPS[0];
}



