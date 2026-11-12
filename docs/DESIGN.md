# Direção visual

Central de atendimento em azul e cinza, com navegação compacta e filas legíveis. A entrada apresenta o produto; as telas autenticadas dão prioridade aos chamados, responsáveis e prazos.

A rodada de novembro usa superfícies claras, bordas discretas, raios de 5 e 8 px e tipografia local. A cor identifica ações e a seleção atual. Status mantêm suas cores sem depender delas para comunicar o significado. O tema escuro acompanha a preferência do sistema.

`web/src/editorial.css` concentra a apresentação e é carregado depois dos estilos funcionais. Os componentes existentes continuam responsáveis pelos formulários, validação, permissões e estados de carregamento. Preserve controles de pelo menos 44 px, foco visível e a versão em cartões das tabelas no celular.

Verifique login, cadastro, lista, novo chamado, detalhe e edição, painel, equipe, categorias e edição nas larguras de 320, 390, 768 e 1440 px. Confira o tema escuro, movimento reduzido e estados vazios e de erro. Os testes do demo não substituem a validação da API com MySQL.

Mudanças seguem issue, branch e PR. Deploy depende dos checks e da integração do PR. A rodada atual referencia a issue #6.
