# Plano de Implementação - Melhorias na Emanus IA (Áudio em Tempo Real e Limpeza Visual)

Este plano descreve as alterações para otimizar a Emanus IA, minimizando símbolos de formatação que dificultam o aprendizado, removendo o botão de áudio manual e tocando a explicação falada automaticamente em tempo real (frase por frase) enquanto a resposta é escrita no ecrã.

## Alterações Propostas

---

### Backend

#### [MODIFY] [ai.ts](file:///c:/Users/poiuj/Desktop/EMAIT/backend/src/routes/ai.ts)
- Adicionar uma regra de formatação na `SYSTEM_INSTRUCTION` instruindo o modelo Gemini a evitar formatação complexa de Markdown (como hashtags `#` para cabeçalhos ou excesso de asteriscos `**`), garantindo que o texto gerado seja naturalmente mais limpo, simples e amigável para leitura e síntese de voz (TTS).

---

### Frontend

#### [MODIFY] [page.tsx](file:///c:/Users/poiuj/Desktop/EMAIT/frontend/src/app/dashboard/tutor/page.tsx)
1. **Remover o botão de áudio**: Retirar o botão com ícone de altifalante do cabeçalho da resposta da Emanus IA.
2. **Implementar renderizador de texto limpo**: Substituir o simples `.split("\n")` por uma função que parseia formatação básica (negrito, marcadores) sem mostrar símbolos brutos (como `**` ou `*`).
3. **Áudio automático e simultâneo (TTS Streaming)**:
   - Cancelar qualquer reprodução ativa ao submeter uma nova mensagem.
   - Criar uma referência (`spokenOffsetRef`) para rastrear o progresso da fala na resposta atual.
   - Identificar sentenças completas finalizadas por pontuação (`.`, `?`, `!`, `\n`) em tempo real enquanto o stream de dados é recebido.
   - Usar a API Web Speech (`speechSynthesis`) para falar as sentenças limpas sequencialmente conforme são completadas, garantindo que o áudio saia junto com a escrita.
   - Falar qualquer texto restante no fim do stream.
   - Adicionar limpeza da síntese de voz ao desmontar o componente para evitar que o áudio continue a tocar ao mudar de página.

## Plano de Verificação

### Testes Manuais
1. **Envio de pergunta**: Perguntar algo ao Tutor no chat e verificar:
   - A resposta é renderizada sem símbolos como `**` ou `#` soltos.
   - O áudio começa a tocar automaticamente enquanto a resposta ainda está sendo gerada e escrita no ecrã.
   - O botão de áudio não aparece mais no ecrã.
2. **Interrupção**: Enviar uma nova pergunta enquanto o tutor fala e garantir que a fala anterior é imediatamente interrompida e a nova começa do zero.
3. **Navegação**: Sair da página e garantir que a voz é silenciada imediatamente.
