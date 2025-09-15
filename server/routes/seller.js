import express from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase-client.js";
import { protectRoute, validateInput, commonValidations } from "../middleware/security.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware de autenticação específico para vendedores
const authenticateSeller = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';
    const decoded = jwt.verify(token, jwtSecret);
    
    console.log('🔐 Autenticando vendedor:', decoded.userId);
    
    // Buscar dados do usuário e verificar se é vendedor
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        sellers(
          id,
          storeName,
          storeSlug,
          plan,
          isActive,
          rating,
          totalSales,
          commission
        )
      `)
      .eq('id', decoded.userId)
      .eq('type', 'SELLER')
      .single();

    if (error) {
      console.error('❌ Erro ao buscar usuário vendedor:', error);
      return res.status(403).json({ error: 'Erro ao validar vendedor' });
    }

    if (!user) {
      console.log('❌ Usuário não encontrado ou não é vendedor:', decoded.userId);
      return res.status(403).json({ error: 'Usuário não encontrado ou não é vendedor' });
    }

    // Verificar se o usuário tem dados de vendedor
    const sellerData = Array.isArray(user.sellers) ? user.sellers[0] : user.sellers;
    if (!sellerData) {
      console.log('❌ Dados de vendedor não encontrados para:', decoded.userId);
      return res.status(403).json({ error: 'Dados de vendedor não encontrados' });
    }

    req.user = user;
    req.seller = sellerData;
    console.log('✅ Vendedor autenticado:', sellerData.storeName);
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação do vendedor:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(401).json({ error: 'Falha na autenticação' });
  }
};

// GET /api/seller/stats - Estatísticas do vendedor
router.get('/stats', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    console.log('📊 Buscando stats para vendedor:', sellerId);
    
    // Buscar estatísticas dos produtos com tratamento de erro
    const { data: productStats, error: productError } = await supabase
      .from('Product')
      .select('id, stock, viewCount, salesCount, rating')
      .eq('sellerId', sellerId);

    if (productError) {
      console.error('❌ Erro ao buscar produtos:', productError);
    }

    // Buscar estatísticas dos pedidos com tratamento de erro
    const { data: orderStats, error: orderError } = await supabase
      .from('Order')
      .select('id, total, status, createdAt')
      .eq('sellerId', sellerId);

    if (orderError) {
      console.error('❌ Erro ao buscar pedidos:', orderError);
    }

    // Garantir arrays vazios se não houver dados
    const products = productStats || [];
    const orders = orderStats || [];

    // Buscar reviews apenas se houver produtos
    let reviewStats = [];
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const { data: reviews, error: reviewError } = await supabase
        .from('Review')
        .select('rating')
        .in('productId', productIds);

      if (reviewError) {
        console.error('❌ Erro ao buscar reviews:', reviewError);
      } else {
        reviewStats = reviews || [];
      }
    }

    // Calcular receita do mês atual
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const currentMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= currentMonth && 
             (order.status === 'DELIVERED' || order.status === 'COMPLETED');
    });

    const monthlyRevenue = currentMonthOrders.reduce((sum, order) => {
      const total = parseFloat(order.total) || 0;
      return sum + total;
    }, 0);

    // Contar produtos com estoque baixo (menos de 5)
    const lowStockProducts = products.filter(p => (p.stock || 0) <= 5).length;

    // Contar pedidos pendentes
    const pendingOrders = orders.filter(order => 
      order.status === 'PENDING' || order.status === 'CONFIRMED'
    ).length;

    // Calcular avaliação média
    const averageRating = reviewStats.length > 0 ? 
      reviewStats.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewStats.length : 
      0;

    // Total de visualizações da loja
    const storeViews = products.reduce((sum, product) => sum + (product.viewCount || 0), 0);

    const stats = {
      totalProducts: products.length,
      totalOrders: orders.length,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      storeViews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviewStats.length,
      pendingOrders,
      lowStockProducts,
    };

    console.log('✅ Stats calculadas:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas do vendedor:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// GET /api/seller/recent-orders - Pedidos recentes
router.get('/recent-orders', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const limit = parseInt(req.query.limit) || 10;
    console.log('📦 Buscando pedidos recentes para vendedor:', sellerId, 'limit:', limit);

    // Buscar pedidos com dados básicos primeiro
    const { data: orders, error } = await supabase
      .from('Order')
      .select('id, total, status, createdAt, buyerId')
      .eq('sellerId', sellerId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      // Retornar array vazio em caso de erro ao invés de falhar
      return res.json({
        success: true,
        data: []
      });
    }

    // Se não há pedidos, retornar array vazio
    if (!orders || orders.length === 0) {
      console.log('ℹ️ Nenhum pedido encontrado para o vendedor');
      return res.json({
        success: true,
        data: []
      });
    }

    // Buscar dados dos compradores
    const buyerIds = [...new Set(orders.map(order => order.buyerId).filter(Boolean))];
    let buyerData = [];
    
    if (buyerIds.length > 0) {
      const { data: buyers, error: buyerError } = await supabase
        .from('buyers')
        .select(`
          id,
          users!inner(name, email)
        `)
        .in('id', buyerIds);

      if (buyerError) {
        console.error('❌ Erro ao buscar compradores:', buyerError);
      } else {
        buyerData = buyers || [];
      }
    }

    // Buscar itens dos pedidos
    const orderIds = orders.map(order => order.id);
    let orderItems = [];
    
    if (orderIds.length > 0) {
      const { data: items, error: itemError } = await supabase
        .from('OrderItem')
        .select(`
          orderId,
          quantity,
          productId,
          Product!inner(name, price)
        `)
        .in('orderId', orderIds);

      if (itemError) {
        console.error('❌ Erro ao buscar itens dos pedidos:', itemError);
      } else {
        orderItems = items || [];
      }
    }

    // Formatar dados para o frontend
    const formattedOrders = orders.map(order => {
      const buyer = buyerData.find(b => b.id === order.buyerId);
      const items = orderItems.filter(item => item.orderId === order.id);
      const mainProduct = items[0]?.Product;
      const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      return {
        id: `#${order.id.toString().slice(-4)}`,
        customer: buyer?.users?.name || 'Cliente',
        product: mainProduct?.name || 'Produto',
        value: parseFloat(order.total) || 0,
        status: order.status?.toLowerCase() || 'pending',
        time: getTimeAgo(order.createdAt),
        totalItems
      };
    });

    console.log('✅ Pedidos formatados:', formattedOrders.length);

    res.json({
      success: true,
      data: formattedOrders
    });

  } catch (error) {
    console.error('❌ Erro ao buscar pedidos recentes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// GET /api/seller/top-products - Produtos mais vendidos
router.get('/top-products', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const limit = parseInt(req.query.limit) || 5;
    console.log('🏆 Buscando produtos mais vendidos para vendedor:', sellerId, 'limit:', limit);

    const { data: products, error } = await supabase
      .from('Product')
      .select('id, name, salesCount, stock, price')
      .eq('sellerId', sellerId)
      .order('salesCount', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      return res.json({
        success: true,
        data: []
      });
    }

    // Se não há produtos, retornar array vazio
    if (!products || products.length === 0) {
      console.log('ℹ️ Nenhum produto encontrado para o vendedor');
      return res.json({
        success: true,
        data: []
      });
    }

    const formattedProducts = products.map(product => {
      const salesCount = product.salesCount || 0;
      const price = parseFloat(product.price) || 0;
      const revenue = salesCount * price;
      
      return {
        id: product.id,
        name: product.name || 'Produto sem nome',
        sales: salesCount,
        revenue: Math.round(revenue * 100) / 100,
        stock: product.stock || 0
      };
    });

    console.log('✅ Produtos formatados:', formattedProducts.length);

    res.json({
      success: true,
      data: formattedProducts
    });

  } catch (error) {
    console.error('❌ Erro ao buscar produtos mais vendidos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// GET /api/seller/analytics - Análise detalhada
router.get('/analytics', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const period = req.query.period || '30'; // dias
    console.log('📈 Buscando analytics para vendedor:', sellerId, 'período:', period, 'dias');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Buscar dados de analytics
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('data->sellerId', sellerId)
      .gte('created_at', startDate.toISOString());

    if (analyticsError) {
      console.error('❌ Erro ao buscar analytics:', analyticsError);
    }

    // Buscar pedidos no período
    const { data: periodOrders, error: ordersError } = await supabase
      .from('Order')
      .select('total, status, createdAt')
      .eq('sellerId', sellerId)
      .gte('createdAt', startDate.toISOString());

    if (ordersError) {
      console.error('❌ Erro ao buscar pedidos do período:', ordersError);
    }

    // Garantir arrays vazios se não houver dados
    const analytics = analyticsData || [];
    const orders = periodOrders || [];

    // Calcular métricas
    const completedOrders = orders.filter(o => 
      o.status === 'DELIVERED' || o.status === 'COMPLETED'
    );

    const totalRevenue = completedOrders.reduce((sum, order) => {
      const total = parseFloat(order.total) || 0;
      return sum + total;
    }, 0);

    const totalVisits = analytics.filter(event => 
      event.type === 'page_view' || event.type === 'view_item'
    ).length;

    const conversionRate = totalVisits > 0 ? 
      (orders.length / totalVisits * 100) : 0;

    const averageOrderValue = orders.length > 0 ? 
      totalRevenue / orders.length : 0;

    const analyticsResult = {
      period: parseInt(period),
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: orders.length,
      visits: totalVisits,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100
    };

    console.log('✅ Analytics calculadas:', analyticsResult);

    res.json({
      success: true,
      data: analyticsResult
    });

  } catch (error) {
    console.error('❌ Erro ao buscar analytics:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Função auxiliar para calcular tempo decorrido
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seg atrás`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
  return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
}

// GET /api/seller/store - Buscar dados da loja do vendedor autenticado
router.get('/store', authenticateSeller, async (req, res) => {
  try {
    const user = req.user;
    const sellerData = Array.isArray(user.sellers) ? user.sellers[0] : user.sellers;
    
    if (!sellerData) {
      return res.status(404).json({
        error: 'Dados do vendedor não encontrados'
      });
    }

    console.log('🏪 Buscando dados da loja para vendedor:', sellerData.id);

    // Buscar dados completos do seller e da store correspondente
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', sellerData.id)
      .single();

    if (sellerError || !seller) {
      console.error('❌ Erro ao buscar seller:', sellerError);
      return res.status(404).json({
        error: 'Vendedor não encontrado'
      });
    }

    // Buscar store correspondente ao seller
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('sellerId', seller.id)
      .single();

    if (storeError) {
      console.error('⚠️ Store não encontrada para seller:', seller.id, storeError);
      // Se não há store, criar uma baseada nos dados do seller
      const { data: newStore, error: createError } = await supabase
        .from('stores')
        .insert({
          sellerId: seller.id,
          name: seller.storeName || '',
          slug: seller.storeSlug || seller.storeName?.toLowerCase().replace(/\s+/g, '-') || 'store',
          description: seller.storeDescription || '',
          logo: seller.logo || '',
          banner: seller.banner || '',
          category: seller.category || 'eletronicos',
          address: seller.address || '',
          city: seller.city || 'Não informado',
          state: seller.state || 'Não informado',
          zipCode: seller.zipCode || '',
          phone: seller.phone || '',
          email: seller.email || '',
          website: seller.website || '',
          isActive: true,
          isVerified: false,
          rating: 0,
          reviewCount: 0,
          productCount: 0,
          salesCount: 0,
          plan: seller.plan || 'GRATUITO'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar store:', createError);
        return res.status(500).json({
          error: 'Erro ao criar loja'
        });
      }

      console.log('✅ Store criada automaticamente:', newStore.id);
      
      // Estruturar dados usando a store recém-criada
      const storeData = {
        id: newStore.id, // Use store.id, não seller.id
        sellerId: seller.id,
        name: newStore.name,
        description: newStore.description,
        logo: newStore.logo,
        banner: newStore.banner,
        category: newStore.category,
        address: {
          street: newStore.address ? newStore.address.split(',')[0] || '' : '',
          number: '',
          neighborhood: '',
          city: newStore.address ? newStore.address.split(',')[1] || '' : '',
          state: newStore.address ? newStore.address.split(',')[2] || '' : '',
          zipCode: newStore.zipCode || seller.zipCode || '',
        },
        contact: {
          phone: newStore.phone || '',
          whatsapp: newStore.whatsapp || seller.whatsapp || '',
          email: newStore.email || user.email || '',
          website: newStore.website || '',
        }
      };

      return res.json({
        success: true,
        data: storeData
      });
    }

    // Estruturar dados para o frontend usando a store existente
    const storeData = {
      id: store.id, // Use store.id, não seller.id
      sellerId: seller.id,
      name: store.name || seller.storeName || '',
      description: store.description || seller.storeDescription || '',
      logo: store.logo || seller.logo || '',
      banner: store.banner || seller.banner || '',
      category: store.category || seller.category || 'eletronicos',
      address: {
        street: store.address ? store.address.split(',')[0] || '' : '',
        number: '',
        neighborhood: '',
        city: store.address ? store.address.split(',')[1] || '' : '',
        state: store.address ? store.address.split(',')[2] || '' : '',
        zipCode: store.zipCode || seller.zipCode || '',
      },
      contact: {
        phone: store.phone || seller.phone || '',
        whatsapp: store.whatsapp || seller.whatsapp || '',
        email: store.email || user.email || '',
        website: store.website || seller.website || '',
      }
    };

    console.log('✅ Dados da loja encontrados - Store ID:', store.id, 'Nome:', store.name);

    res.json({
      success: true,
      data: storeData
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dados da loja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// PUT /api/seller/store - Atualizar dados da loja do vendedor autenticado
router.put('/store', authenticateSeller, async (req, res) => {
  try {
    const user = req.user;
    const seller = req.seller;
    
    const {
      name,
      description,
      category,
      address,
      contact,
      logo,
      banner,
      phone,
      whatsapp,
      website,
      email,
      storeName,
      storeDescription
    } = req.body;

    console.log('🏪 PUT /api/seller/store - Atualizando dados da loja');
    console.log('📦 Dados recebidos:', { name, description, category, address, logo, banner });
    console.log('📞 Dados de contato recebidos:', { contact, phone, whatsapp, website, email });

    // Buscar store correspondente ao seller
    let { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('sellerId', seller.id)
      .single();

    // Se não existe store, criar uma
    if (storeError && storeError.code === 'PGRST116') {
      console.log('🆕 Criando nova store para seller:', seller.id);
      
      const { data: newStore, error: createError } = await supabase
        .from('stores')
        .insert({
          sellerId: seller.id,
          name: name || storeName || seller.storeName || '',
          description: description || storeDescription || seller.storeDescription || '',
          logo: logo || seller.logo || '',
          banner: banner || seller.banner || '',
          category: category || seller.category || 'eletronicos',
          address: typeof address === 'string' ? address : 
                   (address ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''}` : ''),
          phone: phone || seller.phone || '',
          website: website || seller.website || '',
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar store:', createError);
        return res.status(500).json({
          error: 'Erro ao criar loja',
          details: createError.message
        });
      }

      store = newStore;
      console.log('✅ Store criada:', store.id);
    } else if (storeError) {
      console.error('❌ Erro ao buscar store:', storeError);
      return res.status(500).json({
        error: 'Erro ao buscar loja',
        details: storeError.message
      });
    }

    // Extrair dados de contato estruturados
    const contactPhone = contact?.phone || phone || store.phone;
    const contactWhatsapp = contact?.whatsapp || whatsapp || store.whatsapp;  
    const contactEmail = contact?.email || email || user.email;
    const contactWebsite = contact?.website || website || store.website;

    // Processar endereço completo
    let fullAddress = store.address;
    let addressZipCode = store.zipCode;
    
    if (address && typeof address === 'object') {
      // Endereço estruturado - manter informações completas
      const addressParts = [];
      if (address.street) addressParts.push(address.street);
      if (address.number) addressParts.push(`nº ${address.number}`);
      if (address.neighborhood) addressParts.push(address.neighborhood);
      if (address.city) addressParts.push(address.city);
      if (address.state) addressParts.push(address.state);
      
      fullAddress = addressParts.join(', ');
      addressZipCode = address.zipCode || store.zipCode;
    } else if (typeof address === 'string') {
      fullAddress = address;
    }

    // Atualizar dados da store
    const updateData = {
      name: name || storeName || store.name,
      description: description || storeDescription || store.description,
      category: category || store.category,
      address: fullAddress,
      zipCode: addressZipCode,
      logo: logo || store.logo,
      banner: banner || store.banner,
      phone: contactPhone,
      whatsapp: contactWhatsapp,
      email: contactEmail,
      website: contactWebsite,
      updatedAt: new Date().toISOString()
    };

    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', store.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar store:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar loja',
        details: updateError.message
      });
    }

    // Também atualizar dados do seller se necessário
    const sellerUpdateData = {
      storeName: name || storeName || seller.storeName,
      storeDescription: description || storeDescription || seller.storeDescription,
      category: category || seller.category,
      logo: logo || seller.logo,
      banner: banner || seller.banner,
      phone: contactPhone || seller.phone,
      whatsapp: contactWhatsapp || seller.whatsapp,
      website: contactWebsite || seller.website,
      zipCode: addressZipCode || seller.zipCode
    };

    const { error: sellerUpdateError } = await supabase
      .from('sellers')
      .update(sellerUpdateData)
      .eq('id', seller.id);

    if (sellerUpdateError) {
      console.warn('⚠️ Aviso ao atualizar seller:', sellerUpdateError);
      // Não falhar se apenas o seller não foi atualizado
    }

    // Fazer parse do endereço para retornar estruturado
    const parseAddress = (addressString) => {
      if (!addressString) return { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' };
      
      const parts = addressString.split(',').map(part => part.trim());
      const result = { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: updatedStore.zipCode || '' };
      
      // Tentar extrair informações do endereço
      if (parts.length > 0) {
        // Primeiro item pode conter rua e número
        const firstPart = parts[0];
        if (firstPart.includes('nº ')) {
          const streetParts = firstPart.split('nº ');
          result.street = streetParts[0].trim();
          result.number = streetParts[1].trim();
        } else {
          result.street = firstPart;
        }
      }
      
      // Tentar identificar bairro, cidade, estado
      if (parts.length > 1) result.neighborhood = parts[1];
      if (parts.length > 2) result.city = parts[2];
      if (parts.length > 3) result.state = parts[3];
      
      // Se foi passado o endereço original estruturado, preservar
      if (address && typeof address === 'object') {
        return {
          street: address.street || result.street,
          number: address.number || result.number,
          neighborhood: address.neighborhood || result.neighborhood,
          city: address.city || result.city,
          state: address.state || result.state,
          zipCode: address.zipCode || updatedStore.zipCode || ''
        };
      }
      
      return result;
    };

    // Retornar dados atualizados estruturados
    const storeData = {
      id: updatedStore.id,
      sellerId: seller.id,
      name: updatedStore.name,
      description: updatedStore.description,
      logo: updatedStore.logo,
      banner: updatedStore.banner,
      category: updatedStore.category,
      address: parseAddress(updatedStore.address),
      contact: {
        phone: updatedStore.phone || '',
        whatsapp: updatedStore.whatsapp || '',
        email: updatedStore.email || user.email || '',
        website: updatedStore.website || '',
      }
    };

    console.log('✅ Loja atualizada com sucesso:', updatedStore.id);

    res.json({
      success: true,
      data: storeData,
      message: 'Loja atualizada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar loja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

export default router;