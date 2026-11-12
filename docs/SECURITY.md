# Segurança e operação

## Publicação

Toda mudança passa por issue e PR (AGENTS.md). Verificar CI, npm audit, testes, build e comportamento no domínio real. Reverter o PR para rollback; não fazer downgrade que reintroduza vulnerabilidade.

## API

Em produção, PUBLIC_ORIGIN deve ser a origem HTTPS canônica; CORS_ORIGIN aceita somente origens HTTPS explícitas. TRUSTED_PROXIES deve conter apenas IPs/CIDRs do proxy da hospedagem; o proxy deve sobrescrever headers Forwarded/X-Forwarded-* e bloquear acesso direto ao servidor. Redirecionamento 308 usa origem configurada e não o Host do cliente. Testar no edge antes de publicar. JWT_SECRET precisa ser aleatório, com ao menos 32 caracteres; DB_PASSWORD deve ser próprio. Limites por IP são locais ao processo (120/min global, 20/15min autenticação). Múltiplas instâncias exigem limiter compartilhado ou no edge. TLS e bloqueio de acesso direto precisam ser confirmados na hospedagem.

SENTRY_DSN habilita somente eventos de erro genéricos, sem contexto do request. Configurar alertas e validar um evento de teste após conectar a conta. Não há replay, captura de corpos ou instrumentação automática.

## Site

GitHub Pages fornece HTTPS; verificar Enforce HTTPS em Settings > Pages. CSP via meta limita recursos carregados. GitHub Pages não aplica o arquivo _headers: headers como frame-ancestors/HSTS/Permissions-Policy exigem hospedagem/edge compatível. O arquivo public/_headers prepara esse cenário, sem afirmar que está ativo no Pages. Publicar apenas dist (web/dist no Helpdesk), jamais a raiz do projeto.

VITE_SENTRY_DSN é um identificador público de ingestão, não um segredo. Para ativar, incluir a origem HTTPS exata do endpoint Sentry em connect-src na CSP e no _headers, configurar o DSN no build e verificar um evento sanitizado. Tokens administrativos ficam somente nos secrets. Integração desativada por padrão, sem dados de formulários, URLs, usuário ou session replay. Configurar quota e origens permitidas no Sentry.

Formulários de demonstração e cálculos locais não armazenam dados em servidor; não representam autorização/validação de um backend futuro. Não usar dados pessoais reais no demo. APIs externas de clima/câmbio são públicas e não exigem chave.

## Qualidade

npm run lint, npm test, npm run test:coverage e, para interfaces, npm run build seguido de npm run test:e2e:security. Codecov preparado no workflow; ativar variável CODECOV_ENABLED=true e secret CODECOV_TOKEN depois de conectar a conta. Relatórios de cobertura permanecem nos artifacts. Dependabot verifica dependências semanalmente. O lint inicial bloqueia erros estruturais; expandir regras com correções verificadas.

## Pendências externas

Ativar Sentry e Codecov após criar/conectar contas. Confirmar TLS/proxy/headers no domínio real, proteção de branch e política de deploy. Não considerar essas etapas concluídas apenas por existir configuração no repositório.

## Sessão do Helpdesk

Produção usa cookie Secure, HttpOnly e SameSite=Strict, sem devolver JWT no JSON. Hospedar SPA e API na mesma origem (proxy /api). Mutações exigem Origin presente em CORS_ORIGIN, incluindo login/logout, para reduzir CSRF. Tokens de desenvolvimento não são persistidos no navegador; valores legados em localStorage são removidos. O demo mantém apenas dados fictícios e não autentica o backend.

Docker Compose exige JWT_SECRET, DB_PASSWORD, MYSQL_ROOT_PASSWORD, CORS_ORIGIN e PUBLIC_ORIGIN. Crie .env na raiz para interpolação do Compose (não versionar); configure proxy TLS e TRUSTED_PROXIES antes de expor. Portas do host estão limitadas a loopback. Senhas históricas sinalizadas pelo scanner eram placeholders literais de exemplo; foram removidas dos manifestos atuais. Não foram tratadas como credenciais reais verificadas.
