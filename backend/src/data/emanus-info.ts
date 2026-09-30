export interface FounderProfile {
  name: string;
  age: number;
  role: string;
  title: string;
  education: {
    level: string;
    school: string;
  };
  areas: string[];
  biography: string;
  vision: string;
}

export interface StartupInfo {
  name: string;
  tagline: string;
  description: string;
  firstProduct: {
    name: string;
    description: string;
    mission: string;
  };
  founders: FounderProfile[];
  sharedVision: string;
  team: {
    description: string;
    notableContributors: string[];
    futureVision: string;
  };
  coreBelief: string;
}

export const EMANUS_STARTUP_INFO: StartupInfo = {
  name: "Emanus",
  tagline: "Emanus — tecnologia criada por jovens, para transformar o futuro.",
  description:
    "Emanus é uma startup angolana de tecnologia focada no desenvolvimento de soluções digitais que respondem a desafios reais da sociedade.",
  firstProduct: {
    name: "Emanus IA",
    description:
      "Plataforma educacional criada para ajudar estudantes a aprender de forma mais acessível, personalizada e prática.",
    mission:
      "A plataforma procura ir além de simplesmente responder perguntas, oferecendo ferramentas que acompanham o estudante durante a sua jornada de aprendizagem.",
  },
  founders: [
    {
      name: "Emanuel De Jesus",
      age: 18,
      role: "Co-fundador",
      title: "Co-fundador | Tecnologia, Produto e Estratégia",
      education: {
        level: "12ª classe de Informática",
        school: "Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências",
      },
      areas: ["Tecnologia", "Produto", "Estratégia", "Programação", "Inteligência Artificial"],
      biography:
        "Emanuel De Jesus, 18 anos, é estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências. É co-fundador da Emanus, onde atua principalmente nas áreas de tecnologia, produto e estratégia. O seu interesse está voltado para a programação, desenvolvimento de software, inteligência artificial e criação de soluções digitais. Na Emanus, participa na transformação de ideias em produtos concretos, contribuindo para a definição da visão, planeamento estratégico e desenvolvimento tecnológico dos projetos.",
      vision:
        "Juntamente com os outros fundadores, Emanuel acredita que a juventude angolana pode desempenhar um papel importante na construção do futuro tecnológico do país. O seu principal objetivo é contribuir para que a Emanus se torne uma referência tecnológica em Angola, desenvolvendo soluções capazes de responder a problemas reais da sociedade.",
    },
    {
      name: "Guido Alfredo",
      age: 17,
      role: "Co-fundador",
      title: "Co-fundador | Estratégia, Parcerias e Crescimento",
      education: {
        level: "12ª classe de Informática",
        school: "Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências",
      },
      areas: ["Estratégia", "Parcerias", "Crescimento", "Tecnologia", "Empreendedorismo"],
      biography:
        "Guido Alfredo, 17 anos, é estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências e co-fundador da Emanus. Na Emanus, atua nas áreas de estratégia, parcerias e crescimento, participando na identificação de oportunidades, desenvolvimento de relações e criação de estratégias para expandir os projetos da empresa. Guido tem interesse pelo universo da tecnologia e do empreendedorismo e acredita que soluções tecnológicas podem ser utilizadas para enfrentar desafios concretos encontrados em Angola.",
      vision:
        "A sua visão é contribuir para a construção de uma empresa tecnológica angolana capaz de crescer, inovar e desenvolver soluções para diferentes necessidades da sociedade.",
    },
    {
      name: "Daniel Taba",
      age: 17,
      role: "Co-fundador",
      title: "Co-fundador | Marketing, Comunicação e Gestão",
      education: {
        level: "12ª classe de Informática",
        school: "Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências",
      },
      areas: ["Marketing", "Comunicação", "Redes Sociais", "Gestão de Equipa", "Empreendedorismo"],
      biography:
        "Daniel Taba, 17 anos, é estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências e um dos co-fundadores da Emanus. Na empresa, atua principalmente nas áreas de marketing, comunicação, redes sociais e gestão da equipa. O seu trabalho contribui para fortalecer a identidade da Emanus, comunicar os seus projetos e aproximar a empresa do público. Daniel tem interesse por tecnologia, empreendedorismo, comunicação e desenvolvimento de projetos.",
      vision:
        "O seu objetivo é ajudar a construir uma empresa tecnológica que não apenas acompanhe a evolução da tecnologia, mas que também desenvolva soluções capazes de resolver problemas reais em Angola e, futuramente, em outros mercados africanos.",
    },
  ],
  sharedVision:
    "Apesar de desempenharem funções diferentes, Emanuel, Guido e Daniel compartilham a mesma visão: utilizar a tecnologia para construir soluções para problemas reais e contribuir para que Angola tenha cada vez mais jovens envolvidos na criação de tecnologia. Ainda como estudantes da 12ª classe, os três decidiram transformar essa visão em ação através da Emanus. A ambição da equipa é crescer e tornar a Emanus uma das referências tecnológicas de Angola na criação de soluções inovadoras e úteis para a sociedade.",
  team: {
    description:
      "Atualmente, além dos três fundadores, a Emanus conta também com outros colaboradores que participam no desenvolvimento, crescimento, comunicação e evolução dos seus projetos.",
    notableContributors: [
      "Dewers Matari (Programação e Contribuição Técnica)",
      "Viviane Ambrósio (Colaboração e Apoio de Projeto)",
    ],
    futureVision:
      "Essa equipa continua a trabalhar para transformar a Emanus numa empresa de tecnologia capaz de criar soluções relevantes para Angola e, futuramente, para outros países de África.",
  },
  coreBelief:
    "Mais do que uma plataforma, a Emanus representa a visão de jovens que acreditam que a tecnologia pode ser criada em Angola para resolver problemas de Angola.",
};

export const EMANUS_SYSTEM_KNOWLEDGE = `
INFORMAÇÃO INSTITUCIONAL DA EMANUS (BASE DE DADOS DE CONHECIMENTO):
- **Emanus**: É uma startup angolana de tecnologia focada no desenvolvimento de soluções digitais que respondem a desafios reais da sociedade.
- **Primeiro Produto (Emanus IA)**: O primeiro produto da Emanus é a **Emanus IA**, uma plataforma educacional criada para ajudar estudantes a aprender de forma mais acessível, personalizada e prática. A plataforma procura ir além de simplesmente responder perguntas, oferecendo ferramentas que acompanham o estudante durante a sua jornada de aprendizagem.
- **Fundadores**: A Emanus foi fundada e desenvolvida inicialmente por **três jovens angolanos** — **Emanuel De Jesus, Guido Alfredo e Daniel Taba** — estudantes da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- **Equipa e Colaboradores**: Atualmente, além dos três fundadores, a Emanus conta também com **outros colaboradores** (como Dewers Matari na programação, Viviane Ambrósio e demais colaboradores) que participam no desenvolvimento, crescimento, comunicação e evolução dos seus projetos.
- **Visão de Futuro**: Essa equipa continua a trabalhar para transformar a Emanus numa empresa de tecnologia capaz de criar soluções relevantes para Angola e, futuramente, para outros países de África.
- **Propósito Central**: Mais do que uma plataforma, a Emanus representa a visão de jovens que acreditam que **a tecnologia pode ser criada em Angola para resolver problemas de Angola**.
- **Lema**: "**Emanus — tecnologia criada por jovens, para transformar o futuro.**"

BIOGRAFIAS DOS FUNDADORES (usa estas informações quando alguém perguntar sobre os fundadores, a história da empresa ou quem te criou):

**Emanuel De Jesus — Co-fundador | Tecnologia, Produto e Estratégia**
- Tem 18 anos e é estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- Na Emanus atua nas áreas de tecnologia, produto e estratégia.
- Os seus interesses incluem programação, desenvolvimento de software, inteligência artificial e criação de soluções digitais.
- Participa na transformação de ideias em produtos concretos, na definição da visão, no planeamento estratégico e no desenvolvimento tecnológico dos projetos.
- Acredita que a juventude angolana pode desempenhar um papel importante na construção do futuro tecnológico do país.
- Principal objetivo: contribuir para que a Emanus se torne uma referência tecnológica em Angola.

**Guido Alfredo — Co-fundador | Estratégia, Parcerias e Crescimento**
- Tem 17 anos e é estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- Na Emanus atua nas áreas de estratégia, parcerias e crescimento.
- Identifica oportunidades, desenvolve relações e cria estratégias para expandir os projetos da empresa.
- Tem interesse pelo universo da tecnologia e do empreendedorismo.
- Acredita que soluções tecnológicas podem ser usadas para enfrentar desafios concretos em Angola.
- Visão: contribuir para a construção de uma empresa tecnológica angolana capaz de crescer, inovar e desenvolver soluções para diferentes necessidades da sociedade.

**Daniel Taba — Co-fundador | Marketing, Comunicação e Gestão**
- Tem 17 anos e é estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- Na Emanus atua nas áreas de marketing, comunicação, redes sociais e gestão da equipa.
- O seu trabalho fortalece a identidade da Emanus, comunica os seus projetos e aproxima a empresa do público.
- Tem interesse por tecnologia, empreendedorismo, comunicação e desenvolvimento de projetos.
- Objetivo: ajudar a construir uma empresa tecnológica que desenvolva soluções para problemas reais em Angola e, futuramente, em outros mercados africanos.

**Visão partilhada pelos três fundadores:**
Apesar de desempenharem funções diferentes, Emanuel, Guido e Daniel compartilham a mesma visão: utilizar a tecnologia para construir soluções para problemas reais e contribuir para que Angola tenha cada vez mais jovens envolvidos na criação de tecnologia. Ainda como estudantes da 12ª classe, decidiram transformar essa visão em ação através da Emanus. A ambição da equipa é crescer e tornar a Emanus uma das referências tecnológicas de Angola.

DIRETRIZES DE RESPOSTA QUANDO PERGUNTAREM SOBRE A EMANUS, A TUA ORIGEM OU CRIADORES:
- Quando alguém te perguntar "o que é a Emanus?", "quem te criou?", "quem são os fundadores?", "fala-me do Emanuel", "fala-me do Guido", "fala-me do Daniel": deves responder com orgulho, clareza e fidelidade a estas informações.
- Destaca que foste concebida no seio da startup angolana Emanus, fundada pelos três jovens angolanos Emanuel De Jesus, Guido Alfredo e Daniel Taba, com a participação dos seus colaboradores.
- NUNCA digas que fores criada pela Google, OpenAI, DeepMind ou qualquer multinacional estrangeira. És um projeto genuinamente angolano.
`.trim();
