# Etapa 3 - Auditoria de frontend (React + stores)

## Problemas cr�ticos observados

- src/app/seller/settings/page.tsx:182-185 assume que /api/seller/settings devolve payment, shipping e plan, mas o backend s� envia paymentMethods, shippingOptions, etc.; a tela nunca exibe dados reais
- src/app/seller/settings/page.tsx:203-227 envia { payment } ou { shipping } para PUT /api/seller/settings, enquanto a API espera campos de primeiro n�vel (paymentMethods, shippingOptions), logo nenhuma altera��o chega ao servidor
- src/app/seller/settings/page.tsx:242-250 l� data.plans, por�m /api/plans devolve { success, data }; a lista de planos fica sempre vazia e m�tricas dependentes permanecem zeradas
- src/app/seller/settings/page.tsx:261 usa user?.id como sellerId ao consultar /api/products; o endpoint espera o ID do seller (por exemplo user?.seller?.id), resultando em contagens sempre 0
- src/app/seller/plans/page.tsx:96-107 reaproveita objetos de plano sem normalizar eatures; como Prisma guarda eatures em texto, o .map em src/app/seller/plans/page.tsx:326-331 quebra ou lista caracteres em vez de benef�cios
- src/app/seller/plans/page.tsx:131-136 trata upgrades pagos abrindo paymentUrl, mas server/routes/seller.js monta a URL com process.env.APP_URL; se a env n�o estiver definida no build do frontend o link vem undefined/...

## Outros pontos relevantes

- Diversas telas usam etch direto sem passar pelo piRequest, perdendo retry/timeout e carregando Authorization: Bearer null quando o token expira (ex.: src/app/seller/settings/page.tsx:173)
- TrackingScripts (src/components/TrackingScripts.tsx) depende de /api/tracking/configs, que hoje s� devolve mocks; qualquer ID salvo pelo admin n�o � refletido
- Rotas protegidas (ex.: seller/admin) s� fazem redirect client-side; usu�rios n�o autenticados ainda baixam bundles completos, expondo UI sens�vel

## Impacto pr�tico nas jornadas

- Seller Settings mostra valores default e confirma��es "salvas" mesmo sem persistir, levando o cliente a acreditar que integra��es de pagamento/frete est�o prontas
- Dashboard de planos n�o carrega limites/recursos corretamente; tentativa de upgrade pode abrir URL inv�lida ou manter o plano antigo
- M�tricas de uso (produtos, fotos, consumo de plano) sempre exibem zero, prejudicando decis�o sobre upgrade e health-check com o cliente
- Scripts de tracking nunca entram em produ��o (IDs ficam vazios), comprometendo analytics prometidos no escopo

## Recomenda��es de corre��o

1. Ajustar adapta��o de payloads em Seller Settings (normalizar resposta da API e enviar campos esperados pelo backend) removendo uso de mocks
2. Corrigir carregamento de planos e parsing de eatures antes de renderizar (JSON.parse no cliente ou resposta corrigida server-side)
3. Revisar todos os etch diretos para usar piRequest ou pelo menos validar oken e tratar erros 401 com logout/redirect
4. Validar process.env.APP_URL no build ou gerar URL relativa a partir de window.location.origin para a��es de upgrade
5. Definir fonte �nica para configs de tracking e sincronizar admin UI com API real antes de liberar deploy

## Pr�ximos passos sugeridos

- Exercitar fluxos completos (settings, upgrade de plano, m�tricas seller) ap�s ajustar integra��es
- Adicionar testes e2e r�pidos cobrindo mudan�a de settings, cria��o de produto e upgrade para evitar regress�es semelhantes
