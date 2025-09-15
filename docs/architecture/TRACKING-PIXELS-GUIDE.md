# 📊 Guia de Configuração de Tracking Pixels

## 🎯 Como Acessar a Configuração de Pixels

### 1. **Login como Administrador**

- Acesse `/admin/login` ou `/login`
- Use credenciais de administrador

### 2. **Navegar para Tracking Pixels**

No cabeçalho do site, quando logado como admin, você verá:

```
Dashboard | Usuários | Lojas | Produtos | [🔥 Tracking Pixels] | Configurar Planos
```

- Clique em **"Tracking Pixels"** no menu de navegação principal
- Ou acesse diretamente: `/admin/tracking`

### 3. **Interface de Configuração**

A página de tracking pixels possui seções para:

#### 📈 Google Analytics 4

- **Campo**: `google_analytics_id`
- **Formato**: `G-XXXXXXXXXX`
- **Exemplo**: `G-ABC1234567`

#### 🏷️ Google Tag Manager

- **Campo**: `google_tag_manager_id`
- **Formato**: `GTM-XXXXXXX`
- **Exemplo**: `GTM-ABC1234`

#### 📘 Meta/Facebook Pixel

- **Campo**: `meta_pixel_id`
- **Formato**: 15-16 dígitos
- **Exemplo**: `123456789012345`

## ✨ Funcionalidades Especiais

### 🎨 Destaques Visuais

- **Badge "NEW"**: Indica nova funcionalidade
- **Ícone pulsante**: Quando a página está ativa
- **Ring azul**: Destaque visual quando selecionado
- **Tooltip**: Informações ao passar o mouse

### 📱 Menu Mobile

No menu mobile, a opção tracking mostra:

- **Tracking Pixels**
- **GA4 • Meta** (indicação dos pixels suportados)

## 🔧 Eventos Rastreados Automaticamente

### 🛍️ E-commerce

- **ViewContent**: Visualização de produtos
- **AddToCart**: Adicionar ao carrinho
- **Purchase**: Compras completadas
- **Search**: Buscas no site

### 📊 Conversões

- Todos os eventos são enviados para todos os pixels configurados
- Mapeamento automático entre formatos (GA4 ↔ Meta)
- Parâmetros padronizados (currency: BRL, content_ids, etc.)

## 🚀 Como Usar

1. **Configure os IDs** dos pixels desejados
2. **Salve** as configurações
3. **Teste** navegando pelo site
4. **Verifique** nos consoles dos pixels se os eventos estão chegando

## 🔍 Validação Automática

- IDs são validados em tempo real
- Formatos incorretos são rejeitados
- Preview do código gerado disponível

## 📈 Monitoramento

Os eventos podem ser monitorados em:

- **Google Analytics**: Eventos em tempo real
- **Meta Events Manager**: Atividade do pixel
- **Console do navegador**: Logs de debug

---

**💡 Dica**: Use o console do navegador (F12) para ver os logs dos eventos sendo disparados em tempo real!
