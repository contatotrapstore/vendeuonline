# Etapa 2 - Auditoria de backend (APIs e servicos)

## Principais achados cr�ticos

- server/routes/seller.js:81 retorna categorias mockadas; nao ha origem real no banco para vendedores
- server/routes/seller.js:965 e server/routes/seller.js:1027 fornecem apenas configuracoes padrao e salvam mock (server/routes/seller.js:1035), entao ajustes de seller nao sao persistidos
- server/routes/products.js:502 cria produtos com storeId sintetico e aceita mock em caso de erro (server/routes/products.js:552), permitindo sucesso falso sem gravar no banco
- server/routes/payments.js:143 grava transacoes em tabela inexistente Payment, repetido em todas as operacoes posteriores (server/routes/payments.js:359)
- server/middleware/notifications.js:14 insere colunas snake_case (user_id, is_read) incompat�veis com schema Prisma (camelCase), quebrando notificacoes automaticas
- server/routes/orders.js:116 referencia item.Product quando o Postgrest devolve products, causando dados indefinidos em listagem de pedidos
- server/routes/tracking.js:89 devolve configuracoes de tracking totalmente mockadas; nao ha persistencia nem leitura real
- pi/plans.js:4 usa mockPlans como fallback silencioso, mascarando falhas de banco em ambiente serverless (deploy Vercel)

## Outros pontos relevantes

- server/lib/supabase-client.js:31 chama process.exit(1) se variaveis faltarem; em Vercel isso derruba cada execucao em vez de falhar graciosamente
- Muitas rotas carregam chaves ASAAS e Cloudinary mas nao validam disponibilidade; retorno generico 500 sem tratamento
- server/routes/stores.js:220 retorna dados mockados para usuarios de teste, sem flag consistente em producao
- server/routes/products.js mistura Prisma e Supabase; leitura usa Supabase mas detalhes (GET /:id) usam Prisma, exigindo sincronizacao perfeita entre bancos distintos
- server/routes/payments.js assume integracao ASAAS funcional, mas createSubscriptionPayment retorna mock quando ASAAS_API_KEY falta, gerando respostas de sucesso sem cobranca real

## Consequencias pr�ticas

- Vendedores nao conseguem salvar configuracoes reais (pagamentos, fretes, politicas), e nao conseguem evoluir plano com dados consistentes
- Criacao de produtos pode retornar sucesso mesmo sem registro ? dashboard exibe itens que nao existem
- Notificacoes autom�ticas falham silenciosamente, removendo feedback de eventos (login, pedidos, estoque baixo)
- Pagamentos/assinaturas nao ficam registrados; webhooks ASAAS procuram tabela inexistente, logo ativacao de planos nao acontece
- Painel de analytics/tracking entrega dados default, prejudicando validacao com cliente
- Deploy serverless pode mascarar problemas de banco ao retornar mock (planos) ou travar por falta de credenciais

## Recomendacoes iniciais

1. Unificar acesso ao banco (escolher Prisma ou Supabase) e remover mocks; garantir que
   pm run api usa a mesma fonte de dados em todas as rotas
2. Criar tabela real para configuracoes de sellers ou remover endpoints ate que existam; bloquear respostas mock em producao
3. Ajustar integracao de produtos para usar storeId real e falhar explicitamente caso insercao nao ocorra
4. Modelar entidade payments (ou ajustar nome) e atualizar rotas e webhooks ASAAS para usar a estrutura correta
5. Revisar camada de notificacoes para usar nomes de colunas coerentes (userId, isRead, etc.) e adicionar testes unitarios que validem inserts
6. Revisar ordens supabase (orders.js) para garantir aliases corretos (products ao inves de Product) e cobrir com testes de integracao
7. Eliminar process.exit em bibliotecas compartilhadas; substituir por erros tratados e logs

## Acoes sugeridas para a proxima etapa

- Mapear chamadas frontend que dependem dos endpoints acima para avaliar impacto funcional
- Priorizar correcao de persistencia (products/seller settings/payments) antes de testar flows completos
- Planejar migra��es Prisma ou scripts Supabase para suportar entidades ausentes (seller_settings, payments, notifications ajustes)
