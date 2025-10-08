# Atualização de Variáveis de Ambiente no Vercel

## Problema Identificado

O login em produção está falhando porque as variáveis de ambiente do Vercel estão desatualizadas. O projeto Supabase correto é `dycsfnbqgojhttnjbndp`, não o antigo.

## Credenciais Corretas

```bash
# Supabase Project: dycsfnbqgojhttnjbndp
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw

# Database URL
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:Q1XVu4DgLQRsup5E@db.dycsfnbqgojhttnjbndp.supabase.co:6543/postgres
```

## Passo a Passo para Atualizar no Vercel

1. Acesse o dashboard do Vercel: https://vercel.com/dashboard
2. Selecione o projeto "vendeuonline"
3. Vá em **Settings** > **Environment Variables**
4. Atualize as seguintes variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://dycsfnbqgojhttnjbndp.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw`
   - `DATABASE_URL` = `postgresql://postgres.dycsfnbqgojhttnjbndp:Q1XVu4DgLQRsup5E@db.dycsfnbqgojhttnjbndp.supabase.co:6543/postgres`

5. Certifique-se de aplicar as variáveis em **Production**, **Preview**, e **Development**
6. Clique em "Save"
7. Faça um novo deploy:
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push
   ```

## Credenciais de Teste

Após o redeploy, teste com:

```
Email: admin@vendeuonline.com
Senha: Test123!@#
```

## Verificação

Após o deploy, verifique:

1. https://www.vendeu.online/api/vercel-check - deve retornar status OK
2. Login no painel admin deve funcionar
