# Etapa 4 - Valida??o de build/deploy (Vercel)

## Principais riscos de deploy

- ercel.json:18-27 define Access-Control-Allow-Origin: \* junto com Access-Control-Allow-Credentials: true; navegadores bloqueiam essa combina??o, derrubando chamadas autenticadas via fetch
- ercel.json:37-43 exp?? VITE_SUPABASE_SERVICE_ROLE_KEY para o bundle do frontend; o service role da Supabase fica acess�vel ao cliente, permitindo acesso irrestrito ao banco em produ??o
- VERCEL_ENV_VARS.md:73-80 publica as chaves reais (URL/anon/service role) do projeto Supabase; o reposit??rio j?? vaza credenciais de produ??o
- server/lib/supabase-client.js:31 executa process.exit(1) se qualquer vari??vel Supabase faltar; em fun??es serverless da Vercel isso vira 502 gen??rico em vez de erro controlado
- Depend??ncias que usam process.env.APP_URL (server/routes/seller.js:1273, server/routes/account.js:310, server/lib/asaas.js:194) n??o t??m vari??vel definida no ercel.json; links de checkout/payments ficam undefined/... a menos que o operador adicione manualmente

## Observa??es adicionais

- ercel.json reescreve todo /api/\* para pi/server.js; isso ignora fun??es isoladas (pi/index.js, pi/plans.js) e faz upload de um Express monol??tico gigante (50k+ linhas), aumentando cold start e limite de bundle
- installCommand roda
  pm install && npx prisma generate, mas postinstall j?? gera Prisma; builds no Vercel repetem trabalho e aumentam tempo
- ercel.json n??o declara APP*ENV, APP_URL, ASAAS_API_KEY, SMTP*\*; dependemos de configura??o manual (sujeito a esquecimento) apesar de o c??digo exigir essas vari??veis
- dist/ est?? commitado; n??o quebra o deploy, mas causa diverg??ncia entre build local e resultado do Vercel se o diret??rio ficar desatualizado

## Recomenda??es

1. Ajustar CORS para usar origem espec??fica (https://www.vendeu.online) ou desativar Access-Control-Allow-Credentials quando usar \*
2. Remover completamente o service role de qualquer vari??vel VITE\_\* e manter apenas no backend; revogar a chave exposta na doc e gerar uma nova
3. Substituir process.exit por throw controlado nos clientes Supabase/ASAAS para evitar falhas silenciosas em ambiente serverless
4. Garantir que APP_URL, APP_ENV, ASAAS_API_KEY, SMTP e demais secrets estejam definidos via ercel.json ou no painel antes do deploy
5. Avaliar se vale continuar com rewrite total para Express; caso precise dos handlers individuais em /api, remover o rewrite ou usar @vercel/node com handler dedicado
6. Limpar dist/ do versionamento e confiar apenas no build do Vite durante o deploy

## Pend??ncias sugeridas

- Regenerar as chaves Supabase comprometidas e atualizar o documento de envs sem expor valores reais
- Validar CORS e APP_URL em um deploy de staging antes de publicar ao cliente
