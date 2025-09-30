# 🔐 INSTRUÇÕES: Configurar Senha PostgreSQL e Deploy no Vercel

## ⚠️ PASSO CRÍTICO: Resetar Senha do PostgreSQL

Como você **NÃO SABE** a senha atual do PostgreSQL, siga estes passos:

### 1. Acesse o Painel Supabase

```
https://app.supabase.com
```

### 2. Selecione seu Projeto

- Nome: **grupomaboon@gmail.com's Project**
- ID: **dycsfnbqgojhttnjbndp**
- Região: **eu-west-1**

### 3. Resetar a Senha

1. No menu lateral, clique em: **Settings**
2. Depois clique em: **Database**
3. Na seção **Database password**, clique em: **Reset database password**
4. **Uma nova senha será gerada automaticamente**
5. **🔴 COPIE E GUARDE A SENHA IMEDIATAMENTE** - Ela só aparece uma vez!

A senha será algo como:

```
Xk9#mP2$qR7&nL4@wS5
```

### 4. Anotar a Senha

**ANOTE AQUI SUA NOVA SENHA:**

```
Minha senha PostgreSQL: ___________________________________
```

---

## 📋 PASSO 2: Configurar Variáveis no Vercel

Agora que você tem a senha, vá para o Vercel Dashboard:

### 1. Acesse o Vercel

```
https://vercel.com/dashboard
```

### 2. Selecione seu Projeto

- Nome do projeto: **vendeuonline-main** (ou nome do seu deploy)

### 3. Vá em Settings > Environment Variables

### 4. Adicione TODAS as Variáveis Abaixo

**IMPORTANTE**: Substitua `[SUA_SENHA_POSTGRES]` pela senha que você copiou do Supabase!

---

## 🔑 VARIÁVEIS PARA COPIAR NO VERCEL

### ✅ DATABASE_URL

```
postgresql://postgres.dycsfnbqgojhttnjbndp:[SUA_SENHA_POSTGRES]@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

**⚠️ Substitua [SUA_SENHA_POSTGRES] pela senha real!**

---

### ✅ JWT_SECRET

```
7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653
```

---

### ✅ SUPABASE_URL

```
https://dycsfnbqgojhttnjbndp.supabase.co
```

---

### ✅ SUPABASE_ANON_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

---

### ✅ SUPABASE_SERVICE_ROLE_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw
```

---

### ✅ VITE_SUPABASE_URL

```
https://dycsfnbqgojhttnjbndp.supabase.co
```

---

### ✅ VITE_SUPABASE_ANON_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

---

### ✅ NEXT_PUBLIC_SUPABASE_URL

```
https://dycsfnbqgojhttnjbndp.supabase.co
```

---

### ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

---

### ✅ NODE_ENV

```
production
```

---

### ✅ APP_ENV

```
production
```

---

## 📝 CHECKLIST DE CONFIGURAÇÃO

- [ ] Resetei a senha do PostgreSQL no Supabase
- [ ] Copiei e guardei a nova senha
- [ ] Acessei Vercel Dashboard
- [ ] Fui em Settings > Environment Variables
- [ ] Adicionei DATABASE_URL (com senha substituída)
- [ ] Adicionei JWT_SECRET
- [ ] Adicionei SUPABASE_URL
- [ ] Adicionei SUPABASE_ANON_KEY
- [ ] Adicionei SUPABASE_SERVICE_ROLE_KEY
- [ ] Adicionei VITE_SUPABASE_URL
- [ ] Adicionei VITE_SUPABASE_ANON_KEY
- [ ] Adicionei NEXT_PUBLIC_SUPABASE_URL
- [ ] Adicionei NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Adicionei NODE_ENV
- [ ] Adicionei APP_ENV
- [ ] Salvei todas as variáveis no Vercel

---

## 🚀 PASSO 3: Fazer Deploy

### 1. Push do Código

```bash
git push origin main
```

### 2. Aguardar Deploy Automático

O Vercel fará deploy automaticamente após o push.

### 3. Ou Fazer Redeploy Manual

No Vercel Dashboard:

1. Vá em **Deployments**
2. Clique nos 3 pontinhos (...) do último deploy
3. Clique em **Redeploy**

---

## ✅ PASSO 4: Validar

Após o deploy, teste:

### Teste 1: Health Check

```bash
curl https://www.vendeu.online/api/health/check
```

**Deve retornar:**

```json
{
  "status": "READY",
  "message": "Sistema pronto para produção",
  "database": {
    "prisma": "✅ CONECTADO"
  }
}
```

### Teste 2: Acessar o Site

```
https://www.vendeu.online
```

### Teste 3: Testar Login

Tente fazer login ou registro no site.

---

## 🆘 TROUBLESHOOTING

### Se ainda der erro 500:

1. Verifique se a DATABASE_URL tem a senha CORRETA
2. Confirme que todas as variáveis foram salvas no Vercel
3. Aguarde 2-3 minutos após resetar a senha (pode levar um tempo para propagar)
4. Faça redeploy manual no Vercel

### Se o erro persistir:

1. Vá em Vercel > Deployments > Clique no deploy > Function Logs
2. Procure por erros específicos
3. Me envie os logs para análise

---

## 📚 Referências

- Documentação Supabase Database: https://supabase.com/dashboard/project/dycsfnbqgojhttnjbndp/settings/database
- Vercel Environment Variables: https://vercel.com/docs/environment-variables

---

**Última atualização**: 30/09/2025
**Autor**: Claude Code
**Status**: ⚠️ Aguardando você resetar a senha do PostgreSQL
