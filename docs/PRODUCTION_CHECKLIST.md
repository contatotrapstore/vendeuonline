# 🚀 CHECKLIST DE PRODUÇÃO - Vendeu Online

Este documento contém todas as instruções para preparar o sistema para produção com banco limpo.

## 📋 **PRÉ-DEPLOY CHECKLIST**

### ✅ **1. LIMPEZA DO BANCO DE DADOS**

**Para zerar completamente o banco:**

```bash
# Executar script de limpeza
node scripts/clear-database.js

# O script irá:
# ✅ Mostrar dados atuais
# ✅ Pedir confirmação
# ✅ Limpar todas as tabelas
# ✅ Manter estrutura (schema)
# ✅ Criar admin padrão (opcional)
```

**Credenciais do admin padrão criado:**

- **Email:** admin@vendeuonline.com
- **ID:** admin-default-001
- **Tipo:** ADMIN

### ✅ **2. CONFIGURAÇÃO DO AMBIENTE**

⚠️ **IMPORTANTE**: Nunca commitar credenciais reais. Use placeholders na documentação.

**Variáveis obrigatórias para produção:**

```env
# ===== BANCO DE DADOS =====
DATABASE_URL="postgresql://postgres.xxx:xxx@db.xxx.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# ===== SEGURANÇA =====
JWT_SECRET="[GERAR NOVA CHAVE FORTE]"

# ===== PAGAMENTOS (CRÍTICO) =====
ASAAS_API_KEY="$aact_prod_YOUR_ASAAS_KEY_HERE"  # OBRIGATÓRIO para produção
ASAAS_BASE_URL="https://api.asaas.com/v3"
ASAAS_WEBHOOK_TOKEN="[TOKEN_SEGURO]"
ASAAS_WEBHOOK_URL="https://seudominio.com/api/payments/webhook"

# ===== APLICAÇÃO =====
APP_NAME="Vendeu Online"
APP_URL="https://seudominio.com"
APP_ENV="production"
```

### ✅ **3. VERIFICAÇÃO DO SISTEMA**

**Comandos de validação:**

```bash
# Testar build de produção
npm run build

# Verificar tipos TypeScript
npm run check

# Executar testes
npm test

# Verificar linting
npm run lint
```

### ✅ **4. ESTRUTURA LIMPA**

**Arquivos removidos:**

- ❌ `validate-admin-apis.js`
- ❌ `validate-admin-apis.cjs`
- ❌ `validate-admin-apis-complete.js`
- ❌ `validate-apis.js`
- ❌ `validate-plans-subscriptions.js`
- ❌ `scripts/temp/` (pasta completa)

**Arquivos criados:**

- ✅ `scripts/clear-database.js`
- ✅ `CHANGELOG.md`
- ✅ `docs/PRODUCTION_CHECKLIST.md`

## 🔧 **DEPLOY NO VERCEL**

### **1. Configurar Variáveis de Ambiente**

No dashboard do Vercel:

1. Ir em **Project Settings** > **Environment Variables**
2. Adicionar todas as variáveis do `.env.example`
3. **CRÍTICO:** Configurar `ASAAS_API_KEY` com chave de produção
4. **CRÍTICO:** Gerar novo `JWT_SECRET` forte

### **2. Gerar JWT_SECRET Forte**

```bash
# Gerar chave JWT segura
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **3. Deploy Automático**

```bash
# Commit das mudanças
git add .
git commit -m "feat: Sistema 100% pronto para produção - Zero mocks, APIs validadas"
git push origin main

# Vercel fará deploy automático
```

## 📊 **PÓS-DEPLOY VALIDAÇÃO**

### **Testes Essenciais:**

1. **✅ Acesso ao sistema**
   - [ ] Frontend carrega: `https://seudominio.com`
   - [ ] API responde: `https://seudominio.com/api/health`

2. **✅ Autenticação**
   - [ ] Login admin: `admin@vendeuonline.com`
   - [ ] Criar conta nova funciona
   - [ ] JWT tokens sendo gerados

3. **✅ Pagamentos ASAAS**
   - [ ] Webhook configurado
   - [ ] Sandbox funcionando
   - [ ] API key válida

4. **✅ Banco limpo**
   - [ ] Sem dados de teste
   - [ ] Estrutura íntegra
   - [ ] Admin padrão criado

## 🔒 **SEGURANÇA**

### **Verificações obrigatórias:**

- [ ] **JWT_SECRET** diferente do desenvolvimento
- [ ] **ASAAS_API_KEY** em produção (não sandbox)
- [ ] **Webhook token** seguro
- [ ] **Database URL** protegida
- [ ] **Service role key** correta

### **Rate Limiting:**

```env
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"  # 15 minutos
```

## 📞 **SUPORTE PÓS-DEPLOY**

### **Monitoramento:**

1. **Logs Vercel:** Monitor de erros e performance
2. **Supabase Dashboard:** Métricas de banco de dados
3. **ASAAS Dashboard:** Status de pagamentos

### **Contatos:**

- **Email:** suporte@vendeu.online
- **Dashboard:** https://seudominio.com/admin
- **Status:** https://status.vendeu.online

## 🎯 **MÉTRICAS DE SUCESSO**

### **KPIs Principais:**

- **Uptime:** > 99.9%
- **Response Time:** < 500ms
- **Error Rate:** < 0.1%
- **Payment Success:** > 95%

### **Monitoramento Contínuo:**

- [ ] Health checks automáticos
- [ ] Alertas de erro configurados
- [ ] Backup automático do banco
- [ ] Logs centralizados

---

## ✅ **CONCLUSÃO**

Com este checklist, o sistema **Vendeu Online** estará:

1. ✅ **100% limpo** - Sem dados de teste
2. ✅ **100% seguro** - Configurações de produção
3. ✅ **100% funcional** - Todas as APIs operacionais
4. ✅ **100% monitoreado** - Logs e métricas configurados

**🎉 Sistema pronto para receber usuários reais!**

---

**📅 Documento criado em:** 22 de Setembro de 2025
**🔧 Versão:** 2.3.0 - Production Ready
**👨‍💻 Responsável:** Claude Code Analysis Team
