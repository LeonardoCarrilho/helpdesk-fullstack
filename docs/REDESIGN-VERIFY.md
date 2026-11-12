# Verificação da interface

Rodada de novembro de 2026, sobre a branch do PR de segurança existente. A referência anterior foi capturada em `main`; ela não representa a base exata do diff deste PR.

## Telas e estados

Login e cadastro; lista e filtros; painel; novo chamado; detalhe e edição; equipe; categorias e edição. A apresentação também cobre mensagens de carregamento, erro e ausência de resultados. Os diálogos nativos de confirmação continuam sob controle dos componentes existentes.

O navegador verificou todas essas rotas do demo em 390 e 1440 px, cadastro com validação, busca vazia, edição de chamado e categoria, tema escuro e restrição de administração para solicitante. A suíte responsiva também cobre 320 e 768 px. O demo já existia; não foi criado um modo de autenticação alternativo para produção. Falhas de rede e todos os estados transitórios não receberam capturas individuais.

## Evidência

- Build de produção e build do demo passaram; lint passou.
- 40 testes do servidor e 81 do cliente passaram. Cobertura de linhas: 92,58% no servidor e 64,92% no cliente.
- 10 testes de navegador passaram novamente após a correção de foco e da hierarquia do login móvel.
- `npm audit`: nenhuma vulnerabilidade. Overrides restritos de cobertura e atualização compatível do Sentry preservam os gates existentes.
- [CI da implementação](https://github.com/LeonardoCarrilho/helpdesk-fullstack/actions/runs/43127463837): passou. Os testes locais do servidor usam o repositório em memória; o demo não comprova persistência MySQL.

As imagens abaixo usam os dados fictícios do demo existente.

![Lista no desktop](preview.png)

![Novo chamado no celular](preview-mobile.png)

## Checker visual

O checker isolado de layout terminou com erro interno (`r.sections is not iterable`); não foi tratado como aprovação nem repetido. O gate completo apontou 20 achados na primeira rodada. Foco removido do conteúdo e títulos móveis de tamanho igual foram corrigidos; o segundo gate confirmou a remoção desses dois achados e os testes de navegador passaram novamente.

Resultado final: `GATE: OPEN 13 (rounds used up)`, com cinco justificativas específicas, sem alegação de PASS. As exceções documentam o hash router funcional, os botões de contas demo classificados como cards/CTA, a ausência de efeito de rolagem e o uso do grid existente sem `.wrap`. Os achados abertos tratam de hero, altura/estrutura de seções, hierarquia de conteúdo exigida pelo template, bordas do container, título de categoria e ausência de imagem decorativa no seletor de contas. O [registro detalhado](evidence/gate-summary.json) preserva cada achado e motivo. Nenhum checker foi alterado.

O aplicativo mantém formulários e tabelas na mesma tela. Não foram inseridos heróis de uma tela inteira, fotografias ou efeitos de rolagem nas tarefas de atendimento apenas para satisfazer critérios de landing page. Logs, perfis e capturas extensas ficam em `.taste-skill/`, fora do Git.

## Antes e depois

| Medida observada | Antes (`main`) | Depois (branch do PR) |
| --- | --- | --- |
| Captura do login desktop | 1440 × 922 px | 1440 × 942 px |
| Captura de área autenticada | Não capturada | Lista 1440 × 1285 px; novo chamado móvel 390 × 1634 px |
| Larguras verificadas por testes | Não medidas nesta rodada | 320, 390, 768 e 1440 px |
| Testes no baseline | Não executados nesta comparação | Resultado da implementação listado acima |

[Login anterior](evidence/before-1440.png) e [login atual](evidence/after-1440.png) mostram o mesmo estado do demo no tema escuro. As prévias autenticadas acima mostram tarefas diferentes e não substituem essa comparação. A diferença de altura total não é uma pontuação de qualidade. O baseline é `main`, enquanto a implementação preserva o trabalho anterior do PR de segurança; não se atribui toda diferença exclusivamente a esta rodada.
