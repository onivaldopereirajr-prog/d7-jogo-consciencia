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
