# D7: O Jogo da Consciência

D7 é um game web experimental de presença, foco, disciplina diária e progressão simbólica. O jogador percorre uma jornada de A1 até D7, usando práticas curtas, ranking, missões, portais, recompensas e um Códice Dual inspirado em hebraico e sânscrito.

## Visão geral

O jogo funciona como uma jornada progressiva de 4 semanas. Cada semana possui 7 dias, formando o caminho completo de A1 até D7.

- Semana A: 1 minuto
- Semana B: 2 minutos
- Semana C: 3 minutos
- Semana D: 4 minutos

A regra central é a constância. O jogador pratica diariamente e avança um dia por vez. Se esquecer um dia, a jornada retorna para A1, reforçando a ideia de recomeço consciente e disciplina diária.

## Funcionalidades principais

- Jornada A1 até D7
- Modo Nada com timer
- Sistema de XP e Centelhas
- Códice Dual D7
- Trilha hebraica com letras, palavras e valores simbólicos
- Trilha sânscrita com sons, mantras e estados de consciência
- Portais A, B, C e D
- Sala dos Códigos
- Missões diárias e semanais
- Ranking local com score expandido
- Perfil do jogador
- Persistência via LocalStorage por usuário local

## Códice Dual D7

O Códice Dual D7 é uma criação simbólica do jogo. Ele usa o hebraico como trilha de letras, números, palavras e códigos, e o sânscrito como trilha de sons, mantras e estados simbólicos.

Essa união é apresentada de forma lúdica, contemplativa e respeitosa. O projeto não afirma equivalência histórica direta entre as tradições, nem sugere que hebraico e sânscrito tenham a mesma origem ou o mesmo sistema espiritual. No D7, elas funcionam como linguagens simbólicas distintas dentro de uma mecânica de jogo sobre presença, foco e progressão interior.

## Biblioteca Iniciática D7

A Biblioteca Iniciática D7 organiza resumos originais, glossário, missões curtas e cartões educativos sobre sânscrito, Cabala, sefirot, letras hebraicas, Devanagari, fonologia, morfologia, sonhos, visualização e pontes simbólicas do Códice. O conteúdo é narrativo e educativo, não é reprodução extensa de livros nem substitui estudo acadêmico, religioso ou linguístico formal.

A biblioteca se conecta diretamente com a Jornada, a Prática, a Sala dos Selos, o Mapa Simbólico D7, o Ranking, o Perfil, o Acompanhamento e o sistema de D7 Tokens. Cada card estudado pode liberar recompensas únicas, módulos completos, fases da trilha e títulos simbólicos do jogador.

## Fontes de inspiração

A biblioteca usa inspirações gerais de estudo, sem copiar capítulos ou páginas completas:

- Manual de Sânscrito, de G. de Vasconcellos Abreu
- A Cabala Prática, de Charles Fielding
- Materiais gerais sobre Sefirot, Árvore da Vida e as 22 letras hebraicas

O jogo transforma essas inspirações em resumos curtos, missões, cartas e interpretações próprias do universo D7.


## Camada profissional local

A versão atual adiciona uma camada profissional ainda baseada em LocalStorage:

- Rodapé curto com copyright KATHBOT.
- Alternância inicial de idioma `pt-BR` / `en-US`, salva em `d7_language`.
- Painel Admin Local com PIN/senha local em hash/salt, sem expor senha, hash ou salt na interface.
- Métricas locais em `d7_local_events_by_user`.
- Sala D7 local com chat de demonstração, solicitações de fala/câmera e moderação transparente.
- Roda D7 com D7T simbólico, custo local, limite diário e ledger em `d7_wheel_events_by_user`.

A internacionalização cobre menus principais, login/cadastro/recuperação, rodapé e novas áreas. Conteúdo profundo da Biblioteca, Códice e textos narrativos longos permanecem majoritariamente em português nesta etapa, com estrutura preparada para tradução incremental.

## Privacidade, Admin e Sala D7

O Painel Admin Local não é administração remota real. Ele mostra apenas dados disponíveis neste navegador/dispositivo, incluindo usuários locais, progresso, métricas agregadas e eventos recentes. Ele não mostra senha, hash, salt nem tokens técnicos.

A Sala D7 é um MVP local. Ela não cria chat multiusuário real entre dispositivos, não grava áudio/vídeo, não ativa câmera ou microfone automaticamente e não coleta dados sensíveis. O Modo Observador é transparente: quando ativo, a sala mostra aviso de moderação. Recursos reais de sala ao vivo exigirão backend, realtime, sinalização WebRTC, permissões claras e consentimento dos usuários.

## Roda D7 e D7T

D7T continua sendo token simbólico interno do jogo. Não é criptomoeda, não possui valor financeiro, não pode ser comprado, vendido, sacado, convertido ou transferido. A Roda D7 usa D7T apenas como recurso lúdico educativo, sem aposta real e sem promessa de prêmio financeiro.

Regras locais atuais:

- 1 giro custa 3 D7T.
- Limite de 3 giros por dia por usuário local.
- Recompensas são simbólicas: XP, centelhas, cartas cosméticas, títulos, temas, missões, dicas e selos visuais.
- Cada giro é registrado em ledger local para evitar duplicação automática ao recarregar.

## Tecnologias utilizadas

- React
- Vite
- JavaScript
- CSS puro
- LocalStorage

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois, acesse a URL local indicada pelo Vite no terminal.

## Como gerar build

```bash
npm run build
```

O build de produção será gerado na pasta `dist`.

## Deploy

O projeto está preparado para deploy na Vercel como app estático Vite.

- buildCommand: `npm run build`
- outputDirectory: `dist`
- framework: `vite`


## Autenticação local

O D7 possui um login local de MVP para testes, demonstração e acompanhamento no mesmo navegador/dispositivo. As contas ficam em `LocalStorage`; a sessão ativa fica em `d7_current_session`.

- O cadastro pede nome, apelido/e-mail local, senha e confirmação.
- A senha não é salva em texto puro.
- O app usa Web Crypto API para gerar hash SHA-256 com salt local quando disponível.
- Se Web Crypto não estiver disponível, há um fallback simples documentado no código, apenas para manter o MVP funcionando.
- Não use senhas pessoais reais em testes.

## Limitações do MVP local

Este login local não é segurança real de produção. Os dados ficam no navegador do usuário e podem ser apagados ao limpar dados do navegador. Para acompanhamento real de vários usuários em dispositivos diferentes será necessário backend futuro com autenticação, banco de dados e regras de autorização.

## Múltiplos usuários no mesmo navegador

Para testar vários usuários, crie contas diferentes pelo cadastro local. Cada usuário tem progresso próprio: XP, centelhas, práticas, cartas, códigos, portais e sequência. O ranking local inclui usuários cadastrados naquele navegador/dispositivo.

## Limpar progresso local

No Perfil, o botão de reset reinicia apenas o progresso do usuário logado e pede confirmação. Ele não apaga a conta local nem os demais usuários. Para apagar tudo, limpe manualmente os dados do navegador.

## Exportar relatório local

A área `Acompanhamento` permite copiar ou exportar um relatório JSON com usuários locais, etapa, XP, centelhas, práticas, cartas, medalhas/códigos e histórico. O relatório não inclui senha, hash ou salt.


## Sala dos Selos, Ranking e D7 Tokens

A Sala dos Selos expande o Códice Dual D7 com oito selos progressivos. Cada selo possui timer de presença, requisito, cooldown, desafio e recompensa. Os selos liberam cartas, XP, centelhas, pontos de ranking e D7 Tokens simbólicos.

- Cada selo exige presença ativa durante o timer.
- Cada selo exige um desafio textual, confirmação, escolha ou prática concluída.
- A liberação usa pontuação de presença, cooldown, selo anterior e histórico do jogador.
- O ranking local considera XP, centelhas, cartas, selos, desafios, D7T, sequência e tempo em selos.
- O sistema mantém ledger local para evitar recompensa duplicada por selo.

D7T é um token simbólico interno do MVP. Não é criptomoeda, não usa blockchain, não possui valor financeiro, não pode ser sacado, vendido, comprado, convertido ou transferido. Ele existe apenas como recurso de gamificação local e preparação conceitual para uma futura integração com login real e banco de dados.

Como o MVP ainda usa LocalStorage, a proteção anti-burla dificulta apenas manipulação casual. Segurança robusta exigirá backend, autenticação real, banco de dados e validação no servidor.

## Timer Ritual D7

O D7 usa um timer visual premium inspirado na ideia geral de contadores meditativos, com identidade própria: escura, gamer, ritualística e tecnológica. Ele aparece na Prática e na Sala dos Selos como um contador central grande, com anel de progresso, núcleo pulsante e animação de batimento cardíaco enquanto a contagem está ativa.

- O timer reaproveita a lógica já existente de prática e selos.
- A animação reduz o impacto visual quando o usuário prefere menos movimento.
- O contador de presença `108` é simbólico e local nesta versão MVP.
- O histórico local registra timers concluídos sem duplicar recompensas.
- A versão atual continua funcionando apenas com LocalStorage no navegador.

## Mapa Simbólico D7

O Mapa Simbólico D7 abre uma nova área do Códice para calcular uma leitura lúdica a partir de nome, data de nascimento, horário de nascimento e contexto textual opcional. Ele é uma experiência narrativa e gamificada: não é mapa astral profissional, previsão científica, diagnóstico espiritual, tradução perfeita ou verdade religiosa definitiva.

- O nome é normalizado, sem acentos, e convertido por aproximações fonéticas simples.
- A gematria simbólica usa valores tradicionais básicos de letras hebraicas dentro de uma mecânica de jogo.
- A trilha sânscrita simbólica usa sons e sílabas em Devanagari como inspiração fonética, sem afirmar numerologia tradicional absoluta.
- Data e hora entram como ciclos narrativos D7 e são reduzidas para números de 1 a 7.
- O resultado revela Núcleo D7, Eixo D7, Portal D7, sefirá simbólica, som dominante, arquétipo, carta, selo e desafio recomendado.
- O primeiro mapa salvo concede uma recompensa única: XP, centelhas, D7T, pontos de ranking e a carta "Mapa do Nome".
- Mapas seguintes podem ser salvos no histórico local, mas não repetem a recompensa principal.

As recompensas usam o mesmo ledger local de D7T e a mesma verificação de recompensa concedida para evitar duplicação ao recarregar a página ou salvar novamente.

## Referências culturais usadas como inspiração

O D7 usa referências culturais de forma simbólica, respeitosa e não definitiva.

- Gematria é tratada como atribuição numérica de letras hebraicas para fins de estudo e jogo.
- Cabala é citada como tradição mística judaica associada a letras, símbolos e sefirot, sem substituir estudo religioso ou orientação de autoridades da tradição.
- Sânscrito e Devanagari aparecem como referências linguísticas e sonoras para a trilha simbólica do Códice.
- A transliteração do nome é uma aproximação lúdica, não uma tradução perfeita nem análise linguística profissional.


## Plano de Backend Real

Para transformar o MVP local em uma plataforma real com administração, métricas entre dispositivos, chat, áudio/vídeo e moderação operacional, será necessário implementar backend com privacidade e consentimento desde a arquitetura.

Arquitetura futura sugerida:

- Vercel para o front-end estático React/Vite.
- Supabase Auth ou alternativa equivalente para login real.
- Postgres para progresso, perfis, eventos e permissões.
- Row Level Security para restringir cada usuário aos próprios dados.
- Painel admin com papéis explícitos e trilha de auditoria.
- Logs consentidos e minimizados.
- Realtime/chat para salas.
- WebRTC com servidor de sinalização para áudio/vídeo.
- Permissões claras de câmera e microfone, sempre após ação explícita do usuário.
- Política de privacidade e termos de uso.

Tabelas planejadas:

- `profiles`
- `user_progress`
- `admin_roles`
- `events`
- `chat_rooms`
- `chat_messages`
- `room_permissions`
- `token_ledger`
- `wheel_events`

O backend real deve validar recompensas, limites diários, permissões de sala e ledger de tokens no servidor. Nenhuma chave privilegiada deve ser exposta no front-end.

## Plano de Backend Seguro

Quando o MVP local evoluir para acompanhamento real em múltiplos dispositivos, o projeto deve migrar para um backend com validação no servidor.

- Supabase Auth para login real.
- Supabase Postgres para persistir progresso.
- Row Level Security em todas as tabelas de usuário.
- Tabelas planejadas: `profiles`, `user_progress`, `practice_events`, `symbolic_maps`, `token_ledger` e `seal_events`.
- Validação de recompensas, selos, timers e tokens no servidor.
- Chaves públicas em variáveis de ambiente quando necessário.
- Nunca expor `service_role_key` no front-end.
- Confirmação de e-mail, CAPTCHA e proteção básica contra abuso.
- Painel administrativo protegido, separado da experiência do jogador.

Nenhuma chave real deve ser colocada no repositório. O front-end atual continua estático na Vercel e usa LocalStorage apenas como MVP local.

## Status do projeto

O D7 está em fase de protótipo/MVP em evolução. A versão atual valida a experiência principal no navegador, com progressão local, timer, recompensas, missões, portais, Códice Dual e ranking local por usuário no navegador.

## Próximos passos planejados

- Melhorar onboarding
- Criar sistema de temporadas
- Melhorar animações
- Evoluir checklist de produção na Vercel
- Evoluir a experiência de prática
- Criar mais conteúdos para o Códice

## Observação ética

O D7 é um protótipo educativo e experimental. Ele não substitui acompanhamento psicológico, médico ou terapêutico. As práticas propostas são curtas, simbólicas e voltadas para uma experiência lúdica de foco e presença.
