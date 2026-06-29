# Freemium/Premium D7 - Roadmap local

## Modo local atual

O D7 agora possui uma arquitetura Freemium/Premium local para testes de produto. O estado do plano fica no LocalStorage, na chave `d7_user_plans`, mapeando `userId` para um `planId`.

Este modo nao representa assinatura real, nao coleta pagamento, nao executa checkout e nao deve ser tratado como seguranca de assinatura. Qualquer pessoa com acesso ao navegador pode alterar LocalStorage manualmente.

## Planos

### Free: Caminhante D7

- id: `free`
- mensagem: "Voce entrou no caminho. O primeiro chamado e permanecer."
- recursos: `jornada_basica`, `pratica_diaria`, `timer_ritual`, `mantra_padrao`, `radio_basica`, `codice_inicial`, `perfil_simples`, `uma_sala_local`, `avatar_basico`, `progresso_local`

### Premium: Guardiao D7

- id: `premium`
- mensagem: "Voce nao esta apenas praticando. Voce esta guardando o fogo da presenca."
- inclui tudo do Free
- recursos adicionais: `mantras_especiais`, `trilhas_avancadas`, `codice_avancado`, `selos_raros`, `rituais_semanais`, `estatisticas_detalhadas`, `salas_tematicas`, `avatares_simbolicos`, `ranking_premium`, `desafios_de_grupo`, `historico_ampliado`

### Founder/Admin: Administrador Pleno D7

- id: `founder`
- mensagem: "Somente o guardiao do sistema local pode administrar este ambiente."
- inclui tudo do Premium
- recursos adicionais: `painel_admin`, `usuarios_acompanhamento`, `auditoria_local`, `bloquear_usuarios`, `exportar_backups`, `resetar_ambiente_local`, `preparar_conteudos_premium`

## Implementacao local

- Servico: `src/services/subscriptionLocal.js`
- Componente de planos: `src/components/D7Plans.jsx`
- Gate de premium: `src/components/PremiumGate.jsx`
- Mensagem padrao: "Este recurso pertence ao Circulo dos Guardioes D7."
- Subtitulo padrao: "Continue sua jornada como Caminhante ou ative a previa local Premium para testar este recurso."

A ativacao Premium no app e apenas uma previa local de teste. O botao "Ativar Premium local de teste" grava `premium` em `d7_user_plans` para o usuario atual.

O admin local pode alterar o plano de usuarios locais pelo painel de gerenciamento. A alteracao registra `user_plan_changed` em `auditLogLocal` sem senha, PIN, hash, salt ou segredo.

## Backend futuro necessario

Para assinaturas reais, o D7 precisara substituir a confianca em LocalStorage por backend seguro:

- tabela `users`
- tabela `subscriptions`
- tabela `plans`
- tabela `feature_flags`
- pagamentos seguros com provedor adequado
- webhooks para confirmar pagamento, renovacao, cancelamento e falhas
- RLS/Supabase para regras por usuario e por plano
- validacao server-side de acesso a recursos premium
- trilha de auditoria sem dados sensiveis

## Aviso de seguranca

LocalStorage nao e seguranca real de assinatura. Ele serve apenas para prototipagem local, QA e desenho de experiencia. Qualquer liberacao comercial deve validar plano e feature flags no backend.

## Checklist de validacao visual

- Aba Planos: cards Caminhante D7, Guardiao D7 e Administrador Pleno D7 claros em desktop e mobile.
- PremiumGate: mensagem elegante, sem promessa de assinatura real, cura ou beneficio financeiro.
- Ranking Premium: usuario Caminhante ve bloqueio local; usuario Premium acessa o ranking.
- Circulos Premium: usuario Caminhante ve bloqueio local; usuario Premium acessa as salas tematicas.
- Alteracao de plano pelo Admin: seletor local claro, com Founder/Admin marcado como opcao administrativa.
- Avisos de plano local: interface informa que a previa vale apenas neste navegador.
- Limitacoes sem backend: roadmap deixa claro que assinaturas reais exigem backend, pagamento seguro e validacao server-side.

## Nota de UX

Missões diárias agora funcionam como atalhos internos de navegação para orientar o usuário até a ação correspondente.

