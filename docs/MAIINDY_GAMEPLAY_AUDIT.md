# Auditoria de Gameplay — Maiindy Game

Data da auditoria: 2026-07-01  
Projeto: `d7-jogo-consciencia`  
Escopo: análise de gameplay, engajamento, progressão e arquitetura React atual, sem alteração de código funcional.

## 1. Visão Geral do Projeto

O Maiindy Game é um MVP local em React + Vite, estruturado como uma experiência gamificada de presença, silêncio, respiração, símbolos e progressão diária. O app funciona sem backend real nesta versão: login, progresso, sala, roda, admin, assinatura local e relatórios são persistidos no navegador.

### Stack atual

- React `19.2.7`.
- Vite `8.1.0`.
- CSS global em `src/App.css` e `src/index.css`.
- Sem roteador externo: navegação por hash controlada em `src/App.jsx`.
- Sem bibliotecas de UI, estado global ou áudio externas.
- Persistência por `localStorage`, com wrappers seguros em `src/utils/storageSafe.js`.

### Principais componentes

- `src/App.jsx`: orquestra autenticação, navegação, estado principal, rotas/telas, timer, prática, selos, roda, rádio e admin.
- `src/components/D7CinematicEntrance.jsx`: entrada cinematográfica inicial.
- `src/components/D7PlayablePractice.jsx`: fluxo principal da sessão oficial Maiindy.
- `src/components/D7PulseTimer.jsx`: timer visual reutilizado em prática e selos.
- `src/components/D7RadioPlayer.jsx`: rádio local com playlist, volume, shuffle e repeat.
- `src/components/D7Wheel.jsx`: Roda Maiindy com custo em D7T e limite diário.
- `src/components/D7Plans.jsx`: prévia local de planos.
- `src/components/D7Room.jsx`: sala local MVP, chat e salas criadas por jogadores.
- `src/components/AdminPanel.jsx`: acesso admin local e centro de controle.
- `src/components/InitiationLibrary.jsx`: biblioteca iniciática e estudo.

### Principais rotas/telas

A navegação é definida por `appNavItems` e `navGroups` em `src/App.jsx`, com views:

- `home`
- `jornada`
- `pratica`
- `codice`
- `biblioteca`
- `sala`
- `ranking`
- `circulos`
- `roda`
- `perfil`
- `planos`
- `acompanhamento`
- `admin`

As rotas são escritas como hash (`#/home`, `#/pratica`, etc.) por `writeHashRoute()`.

### Onde a gameplay acontece

A gameplay principal acontece em quatro camadas:

1. Prática diária oficial em `D7PlayablePractice` + `completePractice()`.
2. Jornada A-E / 35 dias em `src/data/game.js` e `src/utils/gameState.js`.
3. Sistemas de recompensa e progressão em `gameState.js`, `sealEngine.js`, `libraryEngine.js` e `wheelService.js`.
4. Superfícies de retorno: Home, Jornada, Biblioteca, Códice, Ranking, Roda, Sala e Perfil.

### Onde o progresso é salvo

O progresso é salvo localmente:

- Estado legado anônimo: `d7-jogo-consciencia-state-v2` e `d7-jogo-consciencia-state-v1`.
- Progresso por usuário: `d7_progress_by_user`.
- Usuários locais: `d7_local_users`.
- Sessão local: `d7_current_session`.
- Preferência de entrada cinematográfica: `d7_entrance_seen`.
- Técnica de respiração selecionada: `maiindy_breathing_technique`.
- Eventos da roda: `d7_wheel_events_by_user`.
- Giro de boas-vindas: `d7_welcome_spin_granted`.
- Eventos de selos: `d7_seal_events_by_user`.

### Onde a jornada A-E é definida

A jornada oficial é definida em `src/data/game.js`:

- Semana A: Iniciante, 1 minuto.
- Semana B: Consolidação, 2 minutos.
- Semana C: Avanço, 3 minutos.
- Semana D: Maestria, 4 minutos.
- Semana E: Culminação, 5 minutos.

O total oficial é `OFFICIAL_JOURNEY_DAYS = 35`. A lógica de avanço, reinício, conclusão e medalha está em `src/utils/gameState.js`.

## 2. Mapa da Experiência Atual do Jogador

### Entrada cinematográfica

O jogador novo passa por `D7CinematicEntrance`, com vídeo/poster, símbolo central, partículas, chamada “Maiindy Game” e ações “Começar Jornada” ou “Entrar no Game”. A entrada é forte como primeiro impacto visual, mas depois é marcada como vista em `localStorage`.

### Login

O acesso é local. O jogador cria uma conta com nome, login e senha; a senha é hasheada localmente. A tela explica que é MVP local e que acesso entre dispositivos exigirá backend futuro.

### Home

A Home funciona como dashboard de estado atual:

- Código atual (`A1`, `B3`, etc.).
- Dia oficial dentro de 35.
- Semana/categoria.
- Tempo oficial do dia.
- Streak.
- XP, centelhas e score.
- Missões diárias.
- Trilhas hebraica/sânscrita.
- Acesso para Prática, Biblioteca, Códice e abertura cinematográfica.
- Rádio compacta.

O CTA principal é “Entrar no Nada”.

### Jornada

A tela Jornada mostra as cinco semanas/categorias com sete dias cada. Cada semana tem intenção, tempo oficial, grade de dias, progresso semanal e portal. Portais ficam selados até completar o dia 7 da categoria.

### Prática

A Prática é o principal fluxo jogável:

1. Painel do dia.
2. Escolha/preparação respiratória.
3. Respiração guiada.
4. Silêncio com timer oficial.
5. Palavra final.
6. Carta revelada.
7. Level-up / resumo de avanço.

O sistema deixa claro que o tempo oficial é fixo por categoria e que práticas extras podem ser livres, sem duplicar avanço principal.

### Respiração

As técnicas estão em `src/data/breathingTechniques.js`. Há biblioteca com técnicas como 4-7-8, respiração quadrada, 5-5, 6-6, 7-11, entre outras. A respiração é tratada como preparação, não como a prática oficial em si.

### Timer

`D7PulseTimer` exibe círculo, tempo restante, estado, ações de iniciar/pausar/cancelar/reiniciar/concluir e contador D7. O timer é usado na prática e também nos selos.

### Palavra/reflexão final

Após concluir o timer, o jogador precisa registrar uma palavra. `recordWord()` adiciona +2 centelhas, marca a missão de palavra, salva no `wordLog` e cria entrada no Códice.

### Progresso

`completePractice()` registra sessão, XP, centelhas, D7T, streak, cartas desbloqueadas, marcos 21/108, dias concluídos, portais/códigos derivados e Medalha de Honra em E7.

### Recompensas

As recompensas atuais incluem:

- XP.
- Centelhas.
- D7T.
- Cartas.
- Códigos.
- Portais.
- Selos.
- Medalhas.
- Títulos/avatar.
- Frases e cartas cosméticas pela roda.
- Score/ranking.

### Rádio

A Rádio Maiindy funciona como ambiente de foco, com controles próprios. Ela aparece na Home como rail e em outras telas como player flutuante compacto.

### Ranking, círculos e sala

O Ranking é local e mistura jogadores mockados com usuários locais. Círculos são protótipos visuais com gate premium. Sala é MVP local, com chat, solicitações de fala/câmera, moderação local e criação de salas por jogadores.

### Planos e Roda

Planos são prévia local de Free/Premium/Founder. A Roda usa D7T, tem giro gratuito de boas-vindas, custo de 3 D7T e limite de 3 giros/dia. As recompensas são simbólicas, educativas e cosméticas.

## 3. Core Loop Atual do Game

Loop atual observado:

1. Jogador entra.
2. Vê código atual, nível, streak, missões e progresso.
3. Clica em “Entrar no Nada”.
4. Escolhe ou confirma uma técnica de respiração.
5. Faz preparação respiratória.
6. Cumpre o timer oficial do nível atual.
7. Registra uma palavra final.
8. Recebe carta/feedback/recompensas.
9. Avança na jornada A-E.
10. Volta no dia seguinte para manter streak e evitar reinício.

O loop existe e está implementado. Ele é mais claro dentro da tela de Prática do que na experiência geral. A Home mostra muitos sistemas e métricas, mas ainda pode reforçar melhor uma pergunta central: “O que devo fazer agora para avançar no jogo?”.

Avaliação: o core loop está funcional, mas precisa de reforço emocional e hierárquico. A mecânica central é boa; o risco é o jogador perceber o app como um dashboard contemplativo com muitos módulos, e não como um jogo com objetivo diário inevitável.

## 4. Sistemas de Gamificação Já Existentes

### Níveis

`playerLevel(xp)` calcula nível por XP: `Math.floor(xp / 250) + 1`.

### Categorias A-E e 35 dias

As categorias A-E formam a Primeira Fase, com 35 dias oficiais. Cada categoria dura sete dias e aumenta o tempo da prática de 1 a 5 minutos.

### XP

XP é dado por prática diária, visitas de missão, estudo, biblioteca, selos e roda. É usado em nível e ranking.

### Score

O score atual vem de `getRankingScore()`, combinando XP, centelhas, cartas, selos, desafios, D7T, streak, minutos rituais, biblioteca, marcos 21/108 e penalidades por avisos de integridade.

### Centelhas

Centelhas são dadas por prática e palavra final. Funcionam como moeda/energia leve, mas seu papel ainda é menos evidente que XP e D7T.

### Streak

O streak aumenta em práticas oficiais diárias. Se o jogador perde um dia antes de concluir a Primeira Fase, `ensureToday()` marca `restartRequired` e exige reinício oficial em A1.

### Medalhas

A principal medalha é a `Medalha de Honra da Primeira Fase`, liberada em E7. Também há códigos/selos como `seal-return`, `seal-stay`, `seal-cycle`.

### Ranking

Ranking local com jogadores mockados e usuários locais. O score é rico, mas o impacto emocional do ranking ainda é limitado porque não há comunidade real/backend.

### Roda

A Roda Maiindy usa D7T para giros, com recompensas simbólicas. É uma boa mecânica de retorno, mas precisa estar mais amarrada a objetivos diários e recompensas desejáveis.

### Planos

Planos funcionam como gates locais para Premium. Atualmente são prévia de produto, não mecânica central de gameplay.

### Missões diárias

Missões em `game.js`:

- Concluir prática do dia.
- Registrar uma palavra.
- Estudar 1 carta do Códice.
- Abrir Jornada.
- Visitar Ranking.

São úteis, mas simples e pouco narrativas.

### Trilhas

Trilhas hebraica, sânscrita, biblioteca iniciática, códigos duais e cartas. São fortes como progressão de conhecimento, mas precisam de melhor curadoria no loop diário.

### Biblioteca/Códice

Códice e Biblioteca têm grande volume simbólico, cards, módulos, pontes, desafios e notas éticas. São uma base robusta para metagame.

### Sala/Comunidade

Sala e Círculos existem como MVP local. O papel comunitário ainda é protótipo e não interfere de forma relevante na progressão solo.

### Selos e presença

Os selos adicionam timers, desafios, cooldown, requisitos, pontuação de presença, D7T e integridade por ausência de aba. É um sistema avançado e interessante, mas com alto risco de parecer separado do loop principal.

## 5. O Que Está Funcionando Bem Para Engajamento

- Visual forte, com identidade própria e sensação ritual.
- Entrada cinematográfica cria expectativa e marca de produto.
- Jornada A-E é simples, compreensível e escalável.
- Tempo oficial progressivo é elegante: 1 a 5 minutos, baixo atrito inicial.
- Fluxo de prática tem começo, meio e fim.
- Palavra final dá autoria e memória ao jogador.
- Códice cria registro simbólico das ações.
- Recompensas múltiplas geram sensação de abundância.
- Áudio e rádio ajudam a criar ambiente.
- Reinício por falha adiciona tensão real, desde que comunicado com cuidado.
- Biblioteca tem material suficiente para virar metagame de longo prazo.
- Selos e Roda já apontam para retenção pós-prática.
- O app comunica bem que D7T não tem valor financeiro, reduzindo risco de interpretação errada.

## 6. Pontos Fracos Atuais da Gameplay

### O jogador sabe exatamente o que fazer?

Parcialmente. O CTA da Home aponta para a Prática, mas há muitas áreas disputando atenção: Biblioteca, Códice, Rádio, Roda, Ranking, Sala, Planos, Acompanhamento e Admin. O objetivo diário deveria aparecer como comando central absoluto.

### Há motivação suficiente para voltar amanhã?

Existe motivação por streak, avanço A-E e risco de reinício. Porém, o retorno poderia ser mais emocional: hoje o jogador entende que deve voltar, mas talvez não sinta uma antecipação clara do que será desbloqueado amanhã.

### A recompensa é clara?

Dentro da prática, sim. No ecossistema geral, há muitas moedas e símbolos: XP, centelhas, D7T, score, cartas, códigos, selos, portais, títulos, marcos 21/108. A recompensa existe, mas a hierarquia não está totalmente clara.

### A progressão é emocionalmente forte?

A jornada A-E tem boa estrutura, mas os dias intermediários ainda podem parecer marcadores. A progressão emocional precisa de mais narrativa por semana, viradas de fase e sensação de portal evoluindo.

### A falha/reinício está bem explicada?

A regra está implementada e explicada com boa linguagem: “não é punição; é compromisso renovado”. Ainda assim, é uma mecânica dura. Precisa de ritual de retorno mais elaborado para evitar abandono após falha.

### Existe tensão, conquista e desejo de avançar?

Existe tensão pelo streak e reinício, conquista por medalha/portais, e desejo de avanço pelo mapa A-E. Falta transformar cada dia em promessa concreta: “complete hoje para revelar X amanhã”.

### A Home guia bem para a prática?

Guia, mas pode ser mais diretiva. A Home é bonita e informativa, mas ainda tem densidade de dashboard. O CTA “Entrar no Nada” deve dominar mais a tomada de decisão.

### A Jornada cria vontade de completar os 35 dias?

Cria uma base boa. Porém, os 35 dias podem ganhar mais peso com checkpoints semanais, prévias de recompensa, narrativa de fase e uma visualização mais explícita do “portal final”.

### A prática é divertida ou só funcional?

Ela é ritualística e bem conduzida, mas ainda é mais funcional/contemplativa do que lúdica. A diversão aqui deve ser sutil: antecipação, feedback sensorial, surpresa simbólica, evolução visual e sensação de domínio.

### A comunidade tem papel real?

Ainda não. Sala e Círculos são protótipos locais. Eles comunicam ambição comunitária, mas não afetam o coração da experiência solo.

### A rádio ajuda ou distrai?

Ajuda como ambientação. Pode distrair se competir com a prática oficial ou se parecer uma área paralela. Melhor papel: ambiente desbloqueável, trilha de foco ou recompensa contextual.

### Existem mecânicas demais sem conexão?

Sim. O projeto já tem muitos sistemas: prática, jornada, respiração, biblioteca, códice, selos, mapas, rádio, ranking, círculos, sala, roda, planos, admin, relatórios, D7T. A maior fragilidade de design é a conexão entre eles.

## 7. Oportunidades de Melhoria de Gameplay

### Missões diárias melhores

Transformar missões em “ritual do dia” com 3 objetivos claros:

- Prática oficial.
- Palavra final.
- Um gesto opcional de integração: estudar card, ouvir rádio, abrir códice ou girar roda quando elegível.

### Sistema de rituais

Criar um “Ritual Diário Maiindy” com estado visual único:

- Preparar.
- Silenciar.
- Nomear.
- Integrar.
- Retornar amanhã.

### Feedback após prática

Melhorar a tela final com:

- Antes/depois do estado do jogador.
- Recompensas principais destacadas.
- Próximo desbloqueio.
- Frase narrativa do dia.
- “Amanhã você entra em A2/B3/etc.”

### Recompensas visuais

Evolução do portal, aura, selo, mapa, avatar ou chama de streak. A recompensa visual deve ser mais memorável que números.

### Diário de palavras

O `wordLog` já existe. Pode virar um Diário de Palavras com:

- Palavra do dia.
- Sequência de palavras da semana.
- Padrões emocionais.
- Carta associada.
- Síntese semanal.

### Streak com emoção

O `StreakFire` já existe. Pode virar uma mecânica central:

- Fogo frio/morno/vivo.
- Brasa protegida.
- Ritual de retorno após falha.
- Chama semanal ao completar 7 dias.

### Evolução do portal

Cada prática poderia iluminar visualmente o portal da categoria. No 7º dia, o portal abre com uma animação/recompensa mais forte.

### Desbloqueio por categoria

Cada categoria A-E pode ter identidade emocional:

- A: chamado.
- B: permanência.
- C: observação.
- D: integração.
- E: culminação.

Isso já aparece nos dados, mas pode ser mais usado na UI e recompensas.

### Medalhas parciais

Além da medalha final, criar medalhas semanais:

- Selo A7.
- Selo B7.
- Selo C7.
- Selo D7.
- Selo E7 / Medalha de Honra.

### Narrativa por semana

Adicionar uma pequena narrativa progressiva a cada semana, desbloqueada em dias 1, 4 e 7.

### Desafios leves

Desafios sem atrito:

- “Respire antes de tocar no timer.”
- “Registre uma palavra de uma sílaba.”
- “Volte ao mesmo horário amanhã.”
- “Estude o card revelado.”

### Check-in emocional

Antes/depois da prática:

- Estado antes: agitado, neutro, cansado, focado.
- Estado depois: calmo, claro, leve, presente.

Isso fortaleceria a percepção de valor real.

### Progressão do avatar

O avatar já tem símbolos e temas. Pode evoluir com streak, categorias, selos e biblioteca.

### Melhorar ranking

Ranking pode ter ligas locais ou categorias:

- Presença da semana.
- Biblioteca.
- Selos.
- Streak.
- Retorno após falha.

Evitar que score total vire número opaco.

### Rádio como recompensa/ambiente

Usar rádio como:

- Trilha de foco antes da prática.
- Faixas desbloqueadas por semana.
- Ambiente pós-prática.
- Recompensa de portal.

### Roda como mecânica de retorno

Dar giro gratuito em momentos específicos:

- Primeiro login.
- Completar A7/B7/C7/D7/E7.
- Retornar após falha.
- Streak de 3/7 dias.

### Comunidade sem complexidade

Antes de backend, usar comunidade de forma assíncrona/local:

- Frases coletivas mockadas.
- Círculo de intenção semanal.
- Mural local de palavras.
- Desafios cooperativos simulados.

## 8. Prioridades Para Próximo Desenvolvimento

### Fase 1 — Core gameplay

Objetivo: deixar o jogo principal mais claro e mais emocional.

Prioridades:

- Reforçar na Home o “objetivo de hoje” como bloco dominante.
- Melhorar a tela final da prática com recompensas, próxima meta e narrativa.
- Criar destaque visual para “próximo desbloqueio”.
- Tornar o Diário de Palavras uma consequência visível da prática.
- Simplificar a leitura de recompensas: separar recompensa principal, bônus e desbloqueios.

### Fase 2 — Retenção diária

Objetivo: fazer o jogador querer voltar amanhã.

Prioridades:

- Criar promessa explícita do próximo dia.
- Fortalecer Streak Fire como centro emocional.
- Criar ritual de retorno para falha, sem sensação de punição seca.
- Adicionar check-in emocional antes/depois.
- Criar mini narrativa por semana/categoria.

### Fase 3 — Recompensas e progressão

Objetivo: dar sensação de conquista visível.

Prioridades:

- Evolução visual do portal por categoria.
- Medalhas semanais A7-E7.
- Avatar evolutivo por marcos.
- Melhorar a Roda como recompensa contextual.
- Usar rádio/faixas/ambientes como desbloqueios.
- Organizar códigos, selos, cartas e portais em uma hierarquia mais legível.

### Fase 4 — Comunidade

Objetivo: adicionar social sem atrapalhar o solo.

Prioridades:

- Mural local de palavras/intenção.
- Círculos com desafios semanais simples.
- Ranking por categorias, não só score total.
- Sala como pós-prática ou encontro agendado, não como distração permanente.
- Backend/realtime apenas depois de validar loop solo.

## 9. Recomendações Técnicas

### Arquivos que provavelmente serão alterados em próximas fases

- `src/App.jsx`: Home, composição de views, handlers e passagem de dados.
- `src/App.css`: hierarquia visual, feedback, portal, prática e responsividade.
- `src/data/game.js`: novas missões, narrativas semanais, medalhas, recompensas.
- `src/utils/gameState.js`: novas regras de recompensa, diário, streak e desbloqueios.
- `src/components/D7PlayablePractice.jsx`: feedback final, check-in, palavra e card.
- `src/components/D7Wheel.jsx`: gatilhos de giro e comunicação de recompensa.
- `src/components/D7RadioPlayer.jsx`: se rádio virar recompensa/desbloqueio.
- `src/components/UserAvatar.jsx` e `src/services/avatarService.js`: se avatar evoluir.
- `src/i18n/translations.js`: textos PT/EN de toda nova UX.

### Arquivos que devem ser mexidos com muito cuidado

- `src/services/localProgress.js`: preserva progresso por usuário.
- `src/utils/gameState.js`: central para migração e normalização; qualquer mudança precisa manter compatibilidade com estados antigos.
- `src/services/localAuth.js`: login local e sessão.
- `src/utils/storageSafe.js`: base de segurança da persistência.
- `src/services/sealEngine.js`: lógica de integridade, timers e recompensas dos selos.
- `src/services/wheelService.js`: economia D7T e histórico de giros.
- `src/services/subscriptionLocal.js`: gates locais de plano.
- `src/services/adminLocal.js` e serviços admin: dados locais sensíveis de administração.

### Onde criar dados novos

Preferência:

- `src/data/game.js` para missões, narrativa de jornada, medalhas e definições centrais.
- Novo arquivo em `src/data/` para narrativas semanais ou evolução visual se ficar volumoso.
- `src/data/breathingTechniques.js` apenas para técnicas respiratórias.
- `src/data/initiationLibrary.js` apenas para estudo/biblioteca.

### Onde criar componentes novos

Sugestões:

- `src/components/DailyRitualPanel.jsx`
- `src/components/PracticeCompletionSummary.jsx`
- `src/components/WordJournal.jsx`
- `src/components/StreakRitual.jsx`
- `src/components/PortalProgress.jsx`
- `src/components/NextUnlockCard.jsx`

### Riscos técnicos

- `App.jsx` já concentra responsabilidades demais. Novas features podem aumentar acoplamento.
- O estado local é grande e precisa de normalização cuidadosa.
- Qualquer mudança em `completePractice()` pode afetar XP, streak, D7T, cartas, sessões e progressão oficial.
- O reinício oficial é sensível: erro pode punir indevidamente o jogador.
- Muitas features usam `localStorage`; conflitos de chave ou migrações mal feitas podem quebrar progresso.
- A UI tem muitas telas; mudanças visuais precisam ser testadas em mobile.

### Como preservar login, progresso e localStorage

- Não renomear chaves existentes sem migração.
- Não limpar `d7_progress_by_user`, `d7_local_users` ou `d7_current_session`.
- Sempre passar estados antigos por `normalizeState()`.
- Adicionar campos novos com fallback em `makeInitialState()` e `normalizeState()`.
- Manter `migrationVersion` e criar migrações explícitas quando necessário.
- Evitar reset automático de progresso.
- Nunca usar dados reais/sensíveis em relatórios ou logs exportáveis sem sanitização.

## 10. Proposta de Gameplay Ideal Para o Maiindy Game

### Objetivo do jogador

Completar a Primeira Fase Maiindy: 35 dias de presença progressiva, atravessando cinco categorias simbólicas e abrindo os portais A-E até receber a Medalha de Honra.

### Loop diário ideal

1. Entrar.
2. Ver o Ritual de Hoje.
3. Fazer check-in rápido.
4. Respirar.
5. Cumprir silêncio oficial.
6. Registrar palavra final.
7. Receber símbolo/recompensa.
8. Ver portal/chama/avatar evoluir.
9. Entender claramente o que será desbloqueado amanhã.

### Recompensa imediata

- XP/centelhas/D7T em segundo plano.
- Palavra registrada.
- Feedback sensorial.
- Carta ou frase simbólica.
- Evolução visual pequena.

### Recompensa semanal

- Portal da categoria aberto.
- Selo semanal.
- Nova faixa de rádio ou ambiente.
- Carta rara.
- Capítulo narrativo da semana.

### Recompensa da fase

- Medalha de Honra.
- Portal E aberto.
- Síntese das 35 palavras.
- Título/avatar especial.
- Liberação de próxima fase ou modo avançado.

### Narrativa emocional

O Maiindy Game deve ser menos “ganhe pontos por meditar” e mais “atravesse um ciclo de retorno ao centro”. A emoção central é constância, não performance.

### Mecânica de retorno

O retorno deve ter ritual próprio. Se falhou, o jogador não deve sentir que perdeu tudo; deve sentir que encontrou uma porta de reentrada:

- Selo do Retorno.
- Palavra de retorno.
- Brasa preservada.
- Recomeço em A1 com histórico honrado.

### Papel do silêncio

O silêncio é o boss diário. É simples, mas deve ser tratado como ato principal do jogo.

### Papel da respiração

Respiração é preparação e ponte corporal. Ela reduz atrito e coloca o jogador em estado, mas não deve competir com o timer oficial.

### Papel da palavra final

A palavra final é a assinatura do jogador. Ela transforma uma prática invisível em memória, diário e material narrativo.

### Papel da rádio

A rádio deve ser ambiente e recompensa, não objetivo principal. Idealmente, faixas/ambientes podem ser desbloqueados por categorias, portais e streak.

### Papel do códice

O Códice deve explicar e preservar símbolos desbloqueados. Ele é memória do caminho, não apenas biblioteca estática.

### Papel da comunidade

A comunidade deve ampliar pertencimento sem quebrar introspecção. Primeiro, comunidade leve e assíncrona; depois, salas reais, desafios de grupo e presença compartilhada.

## 11. Perguntas Estratégicas Para o Dono do Projeto

- Qual é o público principal: iniciantes em meditação, jogadores contemplativos, comunidade espiritual, usuários de wellness ou fãs de simbologia?
- O Maiindy Game deve parecer mais espiritual, wellness, RPG contemplativo ou app de hábito gamificado?
- Quanto tempo por dia o jogador ideal deve passar no app?
- A prática principal deve continuar de 1 a 5 minutos na Primeira Fase ou crescer depois?
- Quais recompensas emocionais são mais importantes: paz, conquista, mistério, pertencimento, disciplina ou autoconhecimento?
- Qual é o limite entre jogo e prática real?
- O reinício em A1 é regra inegociável ou deve haver mecânicas de proteção/recuperação?
- Quão forte deve ser a narrativa simbólica?
- As tradições hebraica/sânscrita são estética, estudo introdutório, ponte simbólica ou eixo central do produto?
- O que as centelhas devem comprar/desbloquear?
- D7T deve continuar como moeda simbólica principal?
- Qual será o papel dos planos pagos?
- O que será Free e o que será Premium sem ferir o core espiritual/contemplativo?
- A comunidade deve ser central ou opcional?
- Ranking deve incentivar competição ou presença gentil?
- O admin é ferramenta interna do dono ou feature para facilitadores/professores?

## 12. Resumo Executivo Final

O estado atual do Maiindy Game é avançado para um MVP local. Já existe uma experiência completa com entrada cinematográfica, login local, jornada A-E de 35 dias, prática oficial com timer, respiração, palavra final, Códice, Biblioteca, Rádio, Ranking, Roda, Sala, Planos, Perfil, Admin, PT/EN e persistência por usuário.

O maior problema de gameplay não é falta de sistemas. É excesso de sistemas ainda pouco hierarquizados. O jogo tem muitas mecânicas boas, mas o jogador precisa sentir com mais força que o centro de tudo é o ritual diário: entrar, respirar, permanecer, nomear e voltar amanhã.

A maior oportunidade é transformar a prática diária em uma experiência emocionalmente memorável, com feedback pós-prática mais forte, evolução visual do portal, diário de palavras e promessa clara do próximo desbloqueio.

Próxima implementação recomendada: reforçar o core gameplay antes de expandir comunidade ou monetização. Começar por Home + final da Prática + Diário de Palavras + Próximo Desbloqueio. Isso deve aumentar clareza, retenção e sensação de conquista sem mexer na base de localStorage ou adicionar complexidade técnica desnecessária.
