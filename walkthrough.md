# Walkthrough: Melhorias na Emanus IA e Migrações

## Melhorias na Emanus IA (Áudio em Tempo Real e Limpeza Visual)

Implementámos otimizações na experiência de chat da Emanus IA, focando-nos em reduzir a distração visual causada por símbolos Markdown e oferecer um sistema de leitura de voz (TTS) contínuo e em tempo real.

### Alterações Realizadas

#### Backend ([ai.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/routes/ai.ts)):
1. **Atualização da SYSTEM_INSTRUCTION**:
   - Instruímos o modelo (Gemini) a evitar símbolos Markdown complexos (`#`, `**`, `*`).
   - O texto gerado é agora focado em parágrafos simples e legíveis.

#### Frontend ([page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/tutor/page.tsx)):
1. **Renderizador de Texto Limpo**:
   - Criada a função `parseInlineStyles` que processa formatações (negritos, itálicos) de forma nativa e oculta os símbolos brutos.
2. **Streaming de Áudio Contínuo (TTS)**:
   - Implementada a leitura frase-a-frase (usando `speechSynthesis`).
   - O sistema divide o texto streamado por pontuação (`.`, `?`, `!`, `\n`) e inicia a fala sequencialmente durante a digitação.
3. **Limpeza e Otimização**:
   - Remoção do botão de áudio manual que existia no cabeçalho.
   - Cancelamento automático do áudio sempre que uma nova mensagem é submetida ou se a página é desmontada.

---

## Migração para o Supabase (PostgreSQL)

Concluímos a migração da base de dados local SQLite para o Supabase PostgreSQL na nuvem e resolvemos os problemas de resolução de dependências no workspace de desenvolvimento.

## Alterações Realizadas

### Backend:
1. **Configuração de Dependências ([package.json](file:///c:/Users/poiuj/Desktop/EMAIT/backend/package.json)):**
   - Removido o driver SQLite `@libsql/client`.
   - Adicionado o driver do PostgreSQL `postgres` v3.4.5.
2. **Atualização do Drizzle Schema ([schema.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/db/schema.ts)):**
   - Alterado de `sqlite-core` para `pg-core` (PostgreSQL).
   - Substituídas as declarações de `sqliteTable` para `pgTable` e tipos compatíveis com PostgreSQL.
3. **Instanciação da Ligação ([db.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/db/db.ts)):**
   - Adaptada a ligação para utilizar o driver `postgres-js` em substituição da biblioteca `libsql`.
   - Mantida a função de auto-seeding do Administrador no Supabase.
4. **Configurações Globais:**
   - [.env](file:///c:/Users/poiuj/Desktop/EMAIT/backend/.env): Variável de ambiente `DATABASE_URL` adicionada utilizando a URI de pooling (Session Mode - porta `5432` em IPv4).
   - [drizzle.config.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/drizzle.config.ts): Alterado para `dialect: 'postgresql'` e adicionado `schemaFilter: ["public"]` para otimizar introspecções e evitar crashes na leitura de schemas internos do Supabase.

### Frontend & Workspaces:
1. **Compatibilidade do npm ([package.json](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/package.json)):**
   - Ajustadas as versões de pacotes na secção `devDependencies` para o formato completo semver (ex. `^4.0.0` em vez de `^4`), o que evitou o erro `npm error Invalid Version` durante a instalação local.
2. **Ficheiro vercel.json ([vercel.json](file:///c:/Users/poiuj/Desktop/EMAIT/vercel.json)):**
   - Criado na raiz para orientar o deploy da app Next.js no Vercel (enquanto o backend será hospedado num ambiente dedicado como Railway/Render).

---

## Verificação e Testes

1. **Migração de Banco de Dados:**
   - Executada a geração de migrations (`npm run db:generate`) para criar o ficheiro SQL inicial (`0000_typical_puppet_master.sql`).
   - Aplicada a migração ao Supabase com `npx drizzle-kit migrate`. Todas as tabelas foram criadas com sucesso no schema `public`.
2. **Execução Local:**
   - Executado o comando `npm run dev` na raiz do workspace.
   - O Next.js iniciou normalmente em `http://localhost:3000`.
   - O backend Fastify conectou com sucesso ao Supabase, executou o seed do usuário administrador e iniciou o servidor na porta `8080`.

---

## Horário Inteligente no Tempo Livre e Edição Manual

Implementámos uma atualização na aba do Horário Inteligente para permitir que o plano semanal de estudos seja adaptado ao turno escolar do estudante e possa ser ajustado manualmente por ele.

### Alterações Realizadas

#### Backend ([schedule.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/routes/schedule.ts)):
1. **Filtro por Turno Escolar no Gerador (`POST /generate`)**:
   - O endpoint agora aceita o parâmetro `shift` (manhã, tarde ou noite) no corpo da requisição.
   - Definimos mapeamentos de horários de estudo específicos para o tempo livre de cada turno:
     - **Manhã** (escola de manhã) -> Horários livres: tarde/noite (`14:00 - 15:30`, `16:00 - 17:30`, `19:00 - 20:30`).
     - **Tarde** (escola de tarde) -> Horários livres: manhã/noite (`06:00 - 07:30`, `08:00 - 09:30`, `19:30 - 21:00`).
     - **Noite** (escola à noite) -> Horários livres: manhã/tarde (`07:00 - 08:30`, `10:00 - 11:30`, `14:00 - 15:30`).
   - O prompt enviado para a IA (Gemini) foi adaptado para instruí-la a criar tópicos práticos adequados ao currículo de Angola e agendar as matérias estritamente nesses horários livres.
2. **Atualização Manual de Horário (`PUT /update`)**:
   - Criado um novo endpoint que recebe o array completo de dados do horário atualizados (`weekData`) e atualiza ou insere o plano de estudos ativo do usuário logado na base de dados.

#### Frontend ([page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/schedule/page.tsx)):
1. **Passo Inicial de Seleção de Turno**:
    - Caso o estudante não tenha um horário ativo, ou decida regerar, é-lhe apresentada uma tela com opções interativas de turno escolar (Manhã, Tarde ou Noite) com ícones e descrições claras dos blocos livres.
    - Substituímos os emojis antigos por ilustrações vetoriais SVG personalizadas e profissionais (amanhecer graduado com ondas do mar, sol radiante animado com rotação suave e lua crescente iridescente com estrelas pulsantes).
2. **Edição Manual Célula-a-Célula**:
    - Adicionado o botão "Editar Manualmente" que ativa o modo de edição.
    - No modo de edição, cada célula da tabela torna-se clicável e transforma-se num input de texto focado para que o usuário altere o conteúdo de qualquer dia/hora da semana.
    - O usuário pode confirmar clicando em "Guardar Alterações" (que persiste os dados via `PUT /api/schedule/update` no banco de dados com feedback visual de sucesso) ou em "Cancelar" para descartar as alterações.

---

## Estilo de Resposta e Personalização da Emanus IA

Implementámos 3 estilos de personalidade/resposta para a explicadora virtual Emanus IA e disponibilizámos controlos reativos para mudar a sua personalidade no início de novas conversas e a partir do menu do utilizador.

### Alterações Realizadas

#### Backend ([ai.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/routes/ai.ts)):
1. **Suporte a Personalidade no Schema de Chat**:
   - O schema `ChatSchema` agora valida e aceita um parâmetro opcional `personality` com os valores: `step-by-step`, `direct` e `mixed`.
2. **Atualização da SYSTEM_INSTRUCTION**:
   - **Tutoria (`step-by-step`)**: Explica detalhadamente passo a passo guiando o raciocínio sem fornecer a resposta final de bandeja.
   - **Direta (`direct`)**: Foca em respostas extremamente diretas, indo direto ao ponto com concisão.
   - **Híbrida (`mixed`)**: Fornece a resposta direta acompanhada de uma explicação passo a passo simplificada.

#### Frontend:
1. **Modal de Configuração Global ([layout.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/layout.tsx))**:
   - Adicionada a aba **Personalização** no menu do perfil (acima de "Terminar Sessão").
   - Criado um modal moderno com cartões informativos para configurar o estilo de resposta global da Emanus IA, salvando-o no `localStorage`.
   - Dispara o evento de janela `"venusPersonalityChanged"` sempre que a personalidade é alterada.
2. **Selector no Início do Chat ([page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/intelijai/page.tsx))**:
   - Ao iniciar uma nova conversa (com histórico vazio), é apresentado um selector interativo com as 3 personalidades para que o utilizador escolha como a Emanus IA irá responder antes de iniciar a conversa.
   - Escuta reativamente o evento de alteração do estilo global da Emanus IA para manter os seletores e requisições sempre em sincronia.

---

## 📱 Otimização de Responsividade Mobile

Implementámos uma renovação completa de responsividade em todos os ecrãs da aplicação para telemóveis (320px a 480px) e tablets.

### Alterações Realizadas

1. **Barra de Navegação Fixa Mobile ([layout.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/layout.tsx))**:
   - Adicionada barra superior fixa em dispositivos móveis (`md:hidden`) com botão hambúrguer com ícone `Menu`, logótipo da plataforma e atalho rápido de perfil.
2. **Dashboard Otimizado ([page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/page.tsx))**:
   - Margens dinâmicas (`p-4 sm:p-8`) e disposição flexível em coluna para cabeçalhos e cartões de progresso.
3. **Chat e Controlo de Voz ([intelijai/page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/intelijai/page.tsx))**:
   - Entrada de texto, pré-visualização de imagem/áudio e botões de gravação otimizados para evitar ocultar o ecrã com teclados virtuais móveis.
4. **Simulador de Exames ([exams/page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/exams/page.tsx))**:
   - Reorganização da grelha de disciplinas para 1 coluna em ecrãs estreitos (`grid-cols-1 sm:grid-cols-2`).
5. **Horário Inteligente com Coluna Fixa ([schedule/page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/schedule/page.tsx))**:
   - Coluna de "Hora" fixa (`sticky left-0`) para permitir deslizar os dias horizontalmente sem perder a referência horária no telemóvel.

---

## 🧹 Remoção de Símbolos Não Didáticos e Leitura Suave (Emanus IA)

Implementámos uma limpeza profunda de notações matemáticas brutas, comandos LaTeX (`\frac`, `\sqrt`, etc.) e cifrões (`$`) para proporcionar uma leitura visual agradável e uma pronúncia por voz (TTS) 100% didática para os estudantes.

### Alterações Realizadas

1. **Higienizador Universal de Texto ([textSanitizer.ts](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/lib/textSanitizer.ts))**:
   - `cleanLatexAndSymbols`: Converte notações como `\frac{dy}{dx}` -> `dy/dx`, `\sqrt{x}` -> `raiz(x)`, remove cifrões (`$f(x)$` -> `f(x)`) e formata marcadores de lista.
   - `cleanTextForTTS`: Traduz notações matemáticas para leitura de voz natural em português (ex: `f'(x)` -> `f linha de x`, `dy/dx` -> `dy sobre dx`, `y'` -> `y linha`, `11ª` -> `décima primeira`).
2. **Atualização do Renderizador Markdown ([renderMarkdown.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/lib/renderMarkdown.tsx))**:
   - Aplicação automática de `cleanLatexAndSymbols` em todas as mensagens renderizadas no ecrã para evitar a exibição de código de cifrão ou LaTeX no chat e nas aulas.
3. **Leitura por Voz Sem Símbolos Estranhos ([intelijai/page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/intelijai/page.tsx) e [lessons/page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/lessons/page.tsx))**:
   - Integração da sanitização `cleanTextForTTS` antes de enviar qualquer segmento para a `SpeechSynthesisUtterance`, garantindo que a síntese de áudio nunca leia termos como "cifrão", "backslash" ou "frac".
4. **Reforço nas Instruções do Backend ([ai.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/routes/ai.ts) e [lessons.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/routes/lessons.ts))**:
   - Proibição estrita de símbolos LaTeX ou cifrões nas instruções de sistema da Emanus IA, forçando a IA a gerar notações em português límpido desde a origem.
