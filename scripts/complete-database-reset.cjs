/**
 * 🧹 LIMPEZA COMPLETA DO BANCO - MANTER APENAS ADMIN
 *
 * Este script remove:
 * - Todos os sellers
 * - Todos os buyers
 * - Todas as stores
 * - Todos os produtos (e relações: ProductImage, ProductSpecification)
 * - Todos os usuários EXCETO admin@vendeuonline.com
 *
 * Mantém:
 * - Admin (admin@vendeuonline.com)
 * - Categorias
 * - Planos
 * - Configurações do sistema
 */

// Carregar variáveis de ambiente do .env
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configurar Supabase com service role key (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dycsfnbqgojhttnjbndp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function resetDatabase() {
  console.log('🧹 Iniciando limpeza completa do banco...\n');

  try {
    // 1. Buscar admin para preservar
    console.log('1️⃣ Buscando admin...');
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'admin@vendeuonline.com')
      .single();

    if (adminError || !admin) {
      console.error('❌ Admin não encontrado!', adminError);
      return;
    }
    console.log(`✅ Admin encontrado: ${admin.email} (ID: ${admin.id})`);

    // 2. Buscar todos os usuários que NÃO são admin
    console.log('\n2️⃣ Buscando usuários não-admin...');
    const { data: nonAdminUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, type')
      .neq('id', admin.id);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }

    console.log(`📊 Encontrados ${nonAdminUsers?.length || 0} usuários não-admin`);

    // 3. Deletar em ordem correta (respeitando foreign keys)

    // 3.1. Deletar ProductSpecification (depende de Product)
    console.log('\n3️⃣.1 Deletando ProductSpecification...');
    const { error: specError } = await supabase
      .from('ProductSpecification')
      .delete()
      .neq('productId', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (specError) console.warn('⚠️ Erro ao deletar specs:', specError.message);
    else console.log('✅ ProductSpecification deletadas');

    // 3.2. Deletar ProductImage (depende de Product)
    console.log('\n3️⃣.2 Deletando ProductImage...');
    const { error: imgError } = await supabase
      .from('ProductImage')
      .delete()
      .neq('productId', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (imgError) console.warn('⚠️ Erro ao deletar imagens:', imgError.message);
    else console.log('✅ ProductImage deletadas');

    // 3.3. Deletar Product (depende de stores)
    console.log('\n3️⃣.3 Deletando Product...');
    const { error: prodError } = await supabase
      .from('Product')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (prodError) console.warn('⚠️ Erro ao deletar produtos:', prodError.message);
    else console.log('✅ Product deletados');

    // 3.4. Deletar seller_settings (depende de sellers)
    console.log('\n3️⃣.4 Deletando seller_settings...');
    const { error: settingsError } = await supabase
      .from('seller_settings')
      .delete()
      .neq('sellerId', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (settingsError) console.warn('⚠️ Erro ao deletar settings:', settingsError.message);
    else console.log('✅ seller_settings deletadas');

    // 3.5. Deletar stores (depende de sellers)
    console.log('\n3️⃣.5 Deletando stores...');
    const { error: storeError } = await supabase
      .from('stores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (storeError) console.warn('⚠️ Erro ao deletar stores:', storeError.message);
    else console.log('✅ stores deletadas');

    // 3.6. Deletar sellers (depende de users)
    console.log('\n3️⃣.6 Deletando sellers...');
    const { error: sellerError } = await supabase
      .from('sellers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (sellerError) console.warn('⚠️ Erro ao deletar sellers:', sellerError.message);
    else console.log('✅ sellers deletados');

    // 3.7. Deletar buyers (depende de users)
    console.log('\n3️⃣.7 Deletando buyers...');
    const { error: buyerError } = await supabase
      .from('buyers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    if (buyerError) console.warn('⚠️ Erro ao deletar buyers:', buyerError.message);
    else console.log('✅ buyers deletados');

    // 3.8. Deletar admins NÃO admin@vendeuonline.com (se houver)
    console.log('\n3️⃣.8 Deletando admins extras...');
    const { error: adminExtraError } = await supabase
      .from('admins')
      .delete()
      .neq('userId', admin.id);
    if (adminExtraError) console.warn('⚠️ Erro ao deletar admins extras:', adminExtraError.message);
    else console.log('✅ admins extras deletados');

    // 3.9. Deletar users não-admin
    console.log('\n3️⃣.9 Deletando users não-admin...');
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .neq('id', admin.id);
    if (userError) console.warn('⚠️ Erro ao deletar users:', userError.message);
    else console.log('✅ users não-admin deletados');

    // 4. Verificar estado final
    console.log('\n4️⃣ Verificando estado final do banco...');

    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: sellerCount } = await supabase.from('sellers').select('*', { count: 'exact', head: true });
    const { count: buyerCount } = await supabase.from('buyers').select('*', { count: 'exact', head: true });
    const { count: storeCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
    const { count: productCount } = await supabase.from('Product').select('*', { count: 'exact', head: true });

    console.log('\n📊 ESTADO FINAL DO BANCO:');
    console.log(`   users:      ${userCount || 0} (deve ser 1 - apenas admin)`);
    console.log(`   sellers:    ${sellerCount || 0} (deve ser 0)`);
    console.log(`   buyers:     ${buyerCount || 0} (deve ser 0)`);
    console.log(`   stores:     ${storeCount || 0} (deve ser 0)`);
    console.log(`   Product:    ${productCount || 0} (deve ser 0)`);

    if (userCount === 1 && sellerCount === 0 && buyerCount === 0 && storeCount === 0 && productCount === 0) {
      console.log('\n✅ ✅ ✅ LIMPEZA COMPLETA REALIZADA COM SUCESSO! ✅ ✅ ✅');
      console.log(`\n🎯 Banco limpo - apenas admin@vendeuonline.com preservado`);
    } else {
      console.log('\n⚠️ Alguns registros ainda permanecem. Verifique manualmente.');
    }

  } catch (error) {
    console.error('\n❌ ERRO DURANTE LIMPEZA:', error);
  }
}

// Executar
resetDatabase().then(() => {
  console.log('\n🏁 Script finalizado.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
