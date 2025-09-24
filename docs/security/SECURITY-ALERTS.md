# 🚨 ALERTAS DE SEGURANÇA

## ⚠️ CREDENCIAIS QUE PRECISAM SER REGENERADAS ANTES DO DEPLOY

### 1. ASAAS API KEY (CRÍTICO)
```
ASAAS_API_KEY="$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6..."
```
- **Status**: 🔴 EXPOSTA NO REPOSITÓRIO
- **Ação**: Regenerar nova chave na plataforma ASAAS
- **Impacto**: Pagamentos em produção comprometidos

### 2. ASAAS WEBHOOK TOKEN
```
ASAAS_WEBHOOK_TOKEN="asaas-webhook-secret-2024"
```
- **Status**: 🔴 EXPOSTA NO REPOSITÓRIO
- **Ação**: Gerar novo token aleatório
- **Impacto**: Webhooks de pagamento vulneráveis

### 3. SUPABASE KEYS
```
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
- **Status**: 🟡 FUNCIONAIS MAS EXPOSTAS
- **Ação**: Considerar rotação no Supabase Dashboard
- **Impacto**: Acesso não autorizado ao banco de dados

## ✅ CREDENCIAIS SEGURAS

### 1. JWT_SECRET
- **Status**: ✅ REGENERADO EM 24/09/2025
- **Valor**: Nova chave de 128 caracteres criptograficamente segura

### 2. CREDENCIAIS DEMO/PLACEHOLDER
```
SMTP_PASS="demo-password"
CLOUDINARY_API_KEY="demo-key"
CLOUDINARY_API_SECRET="demo-secret"
```
- **Status**: ✅ VALORES PLACEHOLDER (SEGURO)

## 🔧 AÇÕES RECOMENDADAS

1. **ANTES DO DEPLOY**:
   - Regenerar ASAAS_API_KEY na plataforma
   - Criar novo ASAAS_WEBHOOK_TOKEN
   - Considerar rotação das chaves Supabase

2. **EM PRODUÇÃO**:
   - Usar variáveis de ambiente do Vercel
   - NUNCA committar arquivos .env
   - Implementar rotação automática de credenciais

3. **MONITORAMENTO**:
   - Alertas para uso suspeito de APIs
   - Logs de autenticação
   - Rate limiting em endpoints críticos

## 📅 HISTÓRICO DE REGENERAÇÃO
- **24/09/2025**: JWT_SECRET regenerado (auditoria de segurança)
- **28/05/2025**: Criação inicial das credenciais