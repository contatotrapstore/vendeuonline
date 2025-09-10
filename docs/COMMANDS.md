# 📋 Comandos Úteis - Vendeu Online

## 🛠️ Desenvolvimento Local

### Setup Inicial

```bash
# Instalar dependências
npm install

# Configurar Prisma
npx prisma generate
npx prisma db push

# Iniciar desenvolvimento
npm run dev
```

### Scripts Principais

```bash
npm run dev           # Servidor completo (API + Frontend)
npm run dev:client    # Apenas frontend (Vite)
npm run api          # Apenas backend (Express)
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Linting
npm run check        # Type checking
```

## 🗄️ Banco de Dados (Prisma)

### Desenvolvimento

```bash
npx prisma db push          # Sincronizar schema sem migrations
npx prisma studio           # Interface visual do banco
npx prisma generate         # Regenerar cliente Prisma
npx prisma db seed          # Popular banco com dados iniciais
```

### Produção

```bash
npx prisma migrate deploy   # Aplicar migrations em produção
npx prisma migrate reset    # Resetar banco (CUIDADO!)
```

## 🚀 Deploy e Vercel

### Deploy Manual

```bash
# Instalar CLI do Vercel
npm install -g vercel

# Login
vercel login

# Deploy de preview
vercel

# Deploy de produção
vercel --prod
```

### Comandos Vercel

```bash
vercel env ls               # Listar variáveis de ambiente
vercel env add JWT_SECRET   # Adicionar variável
vercel logs --follow        # Ver logs em tempo real
vercel domains ls           # Listar domínios
vercel --help               # Ajuda completa
```

## 🔧 Troubleshooting

### Limpar Cache

```bash
# Limpar node_modules
rm -rf node_modules package-lock.json
npm install

# Limpar build
rm -rf dist .next

# Limpar Vercel
vercel --prod --force
```

### Verificar Conexões

```bash
# Testar API local
curl http://localhost:3001/api/health

# Testar API produção
curl https://seu-app.vercel.app/api/health

# Testar banco (Supabase)
npx prisma studio
```

### Debug Common Issues

```bash
# TypeScript errors
npm run check

# Build errors
npm run build --verbose

# Database connection
echo "SELECT current_database();" | psql $DATABASE_URL
```

## 📊 Monitoramento

### Performance

```bash
# Analisar bundle
npm run build -- --analyze

# Lighthouse
npx lighthouse https://seu-app.vercel.app

# Core Web Vitals
npx @web/dev-server --node-resolve
```

### Logs

```bash
# Logs do Vercel
vercel logs seu-projeto --limit=100

# Logs em tempo real
vercel logs seu-projeto --follow

# Filtrar por função
vercel logs seu-projeto --since=1h
```

## 🔐 Segurança

### Variáveis de Ambiente

```bash
# Verificar variáveis locais
echo $JWT_SECRET

# Listar variáveis Vercel
vercel env ls

# Adicionar variável segura
vercel env add DATABASE_URL production
```

### Testes de Segurança

```bash
# Verificar dependências vulneráveis
npm audit

# Fix automático
npm audit fix

# Security headers
curl -I https://seu-app.vercel.app
```

## 🧪 Testes

### Setup de Testes (Futuro)

```bash
# Jest + Testing Library
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Cypress
npm install --save-dev cypress

# Playwright
npm install --save-dev @playwright/test
```

### Comandos de Teste

```bash
npm test              # Rodar testes unitários
npm run test:e2e      # Testes end-to-end
npm run test:coverage # Coverage report
```

## 🔄 Git e CI/CD

### Git Flow

```bash
git checkout -b feature/nova-funcionalidade
git add .
git commit -m "feat: adicionar nova funcionalidade"
git push origin feature/nova-funcionalidade

# Criar PR no GitHub
gh pr create --title "Nova funcionalidade" --body "Descrição"
```

### Hooks Úteis

```bash
# Pre-commit hook
npm run lint && npm run check

# Pre-push hook
npm run build && npm test
```

## 📦 Produção

### Health Checks

```bash
# API funcionando?
curl https://seu-app.vercel.app/api/health

# Frontend carregando?
curl -I https://seu-app.vercel.app

# Banco conectado?
curl https://seu-app.vercel.app/api/admin/stats
```

### Backup

```bash
# Backup do banco (se necessário)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20231130.sql
```

## 🎯 Otimização

### Bundle Size

```bash
# Analisar tamanho
npm run build -- --analyze

# Tree shaking
npm run build -- --minify

# Compressão
gzip -k dist/assets/*.js
```

### Performance

```bash
# Minificar imagens
npx imagemin src/assets/* --out-dir=src/assets/optimized

# Otimizar CSS
npx postcss src/styles/*.css --use autoprefixer -d dist/css
```

---

## 🆘 Comandos de Emergência

### Site Fora do Ar

```bash
# 1. Verificar status
vercel logs seu-projeto --since=10m

# 2. Rollback rápido
vercel rollback seu-projeto

# 3. Deploy fresh
vercel --prod --force
```

### Banco Corrompido

```bash
# 1. Backup atual
pg_dump $DATABASE_URL > emergency-backup.sql

# 2. Reset schema
npx prisma migrate reset --force

# 3. Recriar
npx prisma db push
```

### Performance Critical

```bash
# 1. Verificar bundle
npm run build -- --analyze

# 2. Otimizar build
npm run build -- --minify esbuild

# 3. CDN cache clear
# (Vercel faz automaticamente)
```

---

**💡 Dica**: Salve este arquivo nos favoritos para acesso rápido aos comandos!
