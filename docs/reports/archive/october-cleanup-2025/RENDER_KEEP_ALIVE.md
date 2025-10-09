# 🔄 Render Keep-Alive Configuration

## Problema
O Render Free Tier coloca o servidor em "sleep mode" após 15 minutos de inatividade, causando cold start de 30+ segundos na primeira requisição.

## Solução
Implementamos um endpoint `/api/health/keep-alive` que pode ser pingado periodicamente para manter o servidor ativo.

## ✅ Endpoint Criado

**URL**: `https://vendeuonline-uqkk.onrender.com/api/health/keep-alive`

**Response**:
```json
{
  "status": "alive",
  "timestamp": "2025-10-08T19:30:00.000Z",
  "uptime": "3600s",
  "memory": {
    "used": "50MB",
    "total": "512MB"
  },
  "message": "Server is warm and ready"
}
```

## 🔧 Opções de Configuração

### Opção 1: cron-job.org (Recomendado - Grátis)

1. Acesse https://cron-job.org/
2. Crie uma conta gratuita
3. Crie um novo cron job:
   - **Title**: Vendeu Online Keep-Alive
   - **URL**: `https://vendeuonline-uqkk.onrender.com/api/health/keep-alive`
   - **Schedule**: Every 10 minutes (0,10,20,30,40,50 * * * *)
   - **Method**: GET
   - **Enabled**: Yes

### Opção 2: UptimeRobot (Grátis - 50 monitores)

1. Acesse https://uptimerobot.com/
2. Crie uma conta
3. Add New Monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Vendeu Online Keep-Alive
   - **URL**: `https://vendeuonline-uqkk.onrender.com/api/health/keep-alive`
   - **Monitoring Interval**: 5 minutes (free tier)

### Opção 3: GitHub Actions (Grátis - se já usa GitHub)

Crie `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Render Alive

on:
  schedule:
    # Runs every 10 minutes
    - cron: '*/10 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render Server
        run: |
          curl -X GET https://vendeuonline-uqkk.onrender.com/api/health/keep-alive
          echo "Ping sent at $(date)"
```

### Opção 4: Render Cron Job (Pago - $7/mês)

Se já tem plano pago no Render, pode criar um Cron Job nativo:

1. No Render Dashboard, crie novo Cron Job
2. Configure:
   - **Name**: keep-alive-cron
   - **Schedule**: `*/10 * * * *` (every 10 minutes)
   - **Command**: `curl https://vendeuonline-uqkk.onrender.com/api/health/keep-alive`

## 📊 Monitoramento

Após configurar, monitore em:
- **Render Logs**: Verá requisições GET /api/health/keep-alive
- **Response Time**: Deve ser < 500ms quando warm
- **Cold Starts**: Devem desaparecer completamente

## ⚠️ Importante

- O cron job deve rodar 24/7 para efetividade máxima
- Intervalo recomendado: 10-14 minutos (antes do timeout de 15min)
- Não usar intervalo menor que 5 minutos (desperdício de recursos)

## ✅ Verificação

Teste o endpoint manualmente:
```bash
curl https://vendeuonline-uqkk.onrender.com/api/health/keep-alive
```

Se retornar JSON com `"status": "alive"`, está funcionando!

## 🎯 Resultado Esperado

**Antes**:
- First request: 30s cold start
- Subsequent: < 500ms

**Depois**:
- All requests: < 500ms
- Zero cold starts
- 100% uptime

---

**Configurado em**: 08/10/2025
**Status**: ✅ Endpoint criado e testado
