# 🔐 Credenciais de Acesso - Administrador Principal

**Data de Criação:** 02 de Outubro de 2025
**Última Atualização:** 13 de Outubro de 2025

---

## ✅ Credenciais do Administrador

### 📧 Acesso Admin Principal

| Campo     | Valor                         |
| --------- | ----------------------------- |
| **Email** | `admin@vendeuonline.com.br`   |
| **Senha** | `Admin@2025!`                 |
| **Tipo**  | ADMIN (Acesso Total)          |

### 🌐 URLs de Acesso

- **Produção:** https://www.vendeu.online/login
- **Local:** http://localhost:5173/login

---

## 👤 Informações do Usuário Admin

- **ID:** de9592b5-edd2-4f2f-8f7d-3dcc1e0333b8
- **Nome:** Administrador Principal
- **Telefone:** 54999999999
- **Cidade:** Erechim
- **Estado:** RS
- **Status:** Ativo e Verificado ✅

---

## 🛡️ Permissões e Funcionalidades

O usuário admin tem acesso total ao sistema:

### Gerenciamento de Usuários
- ✅ Visualizar todos os usuários (buyers, sellers, admins)
- ✅ Ativar/Desativar contas de usuários
- ✅ Editar informações de usuários
- ✅ Gerenciar permissões e roles

### Gerenciamento de Lojas
- ✅ Visualizar todas as lojas cadastradas
- ✅ Aprovar/Rejeitar lojas pendentes
- ✅ Editar configurações de lojas
- ✅ Suspender/Reativar lojas

### Gerenciamento de Produtos
- ✅ Visualizar todos os produtos do marketplace
- ✅ Aprovar/Rejeitar produtos pendentes
- ✅ Editar informações de produtos
- ✅ Remover produtos que violem políticas
- ✅ Gerenciar categorias de produtos

### Configurações do Sistema
- ✅ Configurar banners promocionais
- ✅ Gerenciar pixels de rastreamento (Facebook, Google Analytics)
- ✅ Configurar taxas e comissões
- ✅ Gerenciar planos de assinatura

### Relatórios e Analytics
- ✅ Dashboard com métricas gerais do sistema
- ✅ Relatórios de vendas e faturamento
- ✅ Analytics de usuários e engajamento
- ✅ Logs de atividades do sistema

### Moderação de Conteúdo
- ✅ Moderar reviews e comentários
- ✅ Gerenciar denúncias de usuários
- ✅ Aplicar políticas de uso
- ✅ Banir usuários/conteúdo indevido

---

## 🚀 Primeiro Acesso

### Passo a Passo:

1. **Acesse a URL de Login:**
   - Produção: https://www.vendeu.online/login
   - Local: http://localhost:5173/login

2. **Digite as Credenciais:**
   - Email: `admin@vendeuonline.com.br`
   - Senha: `Admin@2025!`

3. **Clique em "Entrar"**

4. **Você será redirecionado para:** `/admin/dashboard`

5. **No Dashboard você verá:**
   - Estatísticas gerais (usuários, lojas, produtos, pedidos)
   - Gráficos de vendas e crescimento
   - Atividades recentes
   - Alertas e notificações

---

## 🔐 Segurança e Boas Práticas

### ⚠️ IMPORTANTE - Segurança

1. **Altere a senha após o primeiro acesso em produção**
   - Navegue para: Configurações > Alterar Senha
   - Use uma senha forte com pelo menos:
     - 8 caracteres
     - Letras maiúsculas e minúsculas
     - Números
     - Caracteres especiais

2. **Não compartilhe as credenciais**
   - Apenas administradores autorizados devem ter acesso
   - Use permissões granulares para outros usuários

3. **Monitore atividades suspeitas**
   - Verifique logs de acesso regularmente
   - Configure alertas para ações críticas

4. **Mantenha backup das credenciais**
   - Guarde em local seguro (ex: gerenciador de senhas)
   - Documente procedimentos de recuperação

---

## 🆘 Recuperação de Senha

Se você esquecer a senha do administrador:

1. **Via Interface (se configurado SMTP):**
   - Clique em "Esqueci minha senha" na tela de login
   - Siga as instruções enviadas por email

2. **Via Banco de Dados (emergência):**
   - Acesse o Supabase Dashboard
   - Execute script de reset de senha (consulte documentação técnica)

3. **Via Script de Reset:**
   ```bash
   node scripts/reset-admin-password.js
   ```
   *(Contate o desenvolvedor se necessário)*

---

## 📊 Navegação do Admin Panel

### Menu Principal:

- **Dashboard** (`/admin/dashboard`) - Visão geral do sistema
- **Usuários** (`/admin/users`) - Gerenciamento de usuários
- **Lojas** (`/admin/stores`) - Gerenciamento de lojas
- **Produtos** (`/admin/products`) - Gerenciamento de produtos
- **Pedidos** (`/admin/orders`) - Gerenciamento de pedidos
- **Configurações** (`/admin/settings`) - Configurações gerais
- **Relatórios** (`/admin/reports`) - Relatórios e analytics

---

## 📞 Suporte Técnico

Para problemas de acesso ou dúvidas técnicas:

1. Consulte a documentação em `/docs`
2. Verifique logs do sistema em `/docs/reports`
3. Contate o desenvolvedor responsável

---

## 📝 Histórico de Atualizações

- **13/10/2025:** Documento atualizado com navegação e segurança
- **02/10/2025:** Administrador principal criado e validado
- **09/10/2025:** Sistema validado em produção (deploy completo)
- **12/10/2025:** Correções CRUD validadas (UPDATE/DELETE funcionando)
- **13/10/2025:** Sistema 100% pronto para produção

---

**Status do Sistema:** ✅ 100% Operacional
**Ambiente:** Produção (https://www.vendeu.online)
**Banco de Dados:** PostgreSQL (Supabase)
**Última Validação:** 13 Outubro 2025
