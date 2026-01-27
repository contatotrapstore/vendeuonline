/**
 * Script para limpar banco de dados mantendo apenas login admin
 * Uso: node scripts/clean-database.cjs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debug - Variáveis de ambiente:');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30) + '...');
console.log('   supabaseUrl (final):', supabaseUrl?.substring(0, 30) + '...');
console.log('   supabaseServiceKey (final):', supabaseServiceKey?.substring(0, 30) + '...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanDatabase() {
  console.log('🧹 Iniciando limpeza do banco de dados...\n');

  try {
    // 1. Identificar admins
    console.log('1️⃣ Identificando admins...');
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, email, type')
      .eq('type', 'ADMIN');

    if (adminError) {
      throw new Error(`Erro ao buscar admins: ${adminError.message}`);
    }

    console.log(`   ✅ Encontrados ${admins.length} admin(s):`);
    admins.forEach(admin => console.log(`      - ${admin.email} (${admin.id})`));

    const adminIds = admins.map(a => a.id);

    // 2. Deletar relações de produtos (product_images, product_specifications)
    console.log('\n2️⃣ Deletando imagens e especificações de produtos...');

    const { error: imgError } = await supabase
      .from('product_images')
      .delete()
      .neq('productId', '00000000-0000-0000-0000-000000000000'); // Deleta tudo

    if (imgError) console.warn(`   ⚠️ Erro ao deletar imagens: ${imgError.message}`);
    else console.log('   ✅ Imagens deletadas');

    const { error: specError } = await supabase
      .from('product_specifications')
      .delete()
      .neq('productId', '00000000-0000-0000-0000-000000000000'); // Deleta tudo

    if (specError) console.warn(`   ⚠️ Erro ao deletar especificações: ${specError.message}`);
    else console.log('   ✅ Especificações deletadas');

    // 3. Deletar reviews
    console.log('\n3️⃣ Deletando reviews...');
    const { error: reviewError } = await supabase
      .from('reviews')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (reviewError) console.warn(`   ⚠️ Erro ao deletar reviews: ${reviewError.message}`);
    else console.log('   ✅ Reviews deletadas');

    // 4. Deletar produtos
    console.log('\n4️⃣ Deletando produtos...');
    const { data: deletedProducts, error: productError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (productError) {
      console.warn(`   ⚠️ Erro ao deletar produtos: ${productError.message}`);
    } else {
      console.log(`   ✅ ${deletedProducts?.length || 0} produto(s) deletado(s)`);
    }

    // 5. Deletar lojas
    console.log('\n5️⃣ Deletando lojas...');
    const { data: deletedStores, error: storeError } = await supabase
      .from('stores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (storeError) {
      console.warn(`   ⚠️ Erro ao deletar lojas: ${storeError.message}`);
    } else {
      console.log(`   ✅ ${deletedStores?.length || 0} loja(s) deletada(s)`);
    }

    // 6. Deletar subscriptions
    console.log('\n6️⃣ Deletando assinaturas...');
    const { error: subError } = await supabase
      .from('subscriptions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (subError) console.warn(`   ⚠️ Erro ao deletar assinaturas: ${subError.message}`);
    else console.log('   ✅ Assinaturas deletadas');

    // 7. Deletar sellers
    console.log('\n7️⃣ Deletando sellers...');
    const { data: deletedSellers, error: sellerError } = await supabase
      .from('sellers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (sellerError) {
      console.warn(`   ⚠️ Erro ao deletar sellers: ${sellerError.message}`);
    } else {
      console.log(`   ✅ ${deletedSellers?.length || 0} seller(s) deletado(s)`);
    }

    // 8. Deletar buyers
    console.log('\n8️⃣ Deletando buyers...');
    const { data: deletedBuyers, error: buyerError } = await supabase
      .from('buyers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (buyerError) {
      console.warn(`   ⚠️ Erro ao deletar buyers: ${buyerError.message}`);
    } else {
      console.log(`   ✅ ${deletedBuyers?.length || 0} buyer(s) deletado(s)`);
    }

    // 9. Deletar admins que não são necessários (manter apenas o primeiro)
    console.log('\n9️⃣ Deletando admins extras...');
    const { error: adminDelError } = await supabase
      .from('admins')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (adminDelError) console.warn(`   ⚠️ Erro ao deletar admins extras: ${adminDelError.message}`);
    else console.log('   ✅ Admins extras deletados');

    // 10. Deletar users que não são admin
    console.log('\n🔟 Deletando usuários não-admin...');
    const { data: deletedUsers, error: userError } = await supabase
      .from('users')
      .delete()
      .not('id', 'in', `(${adminIds.join(',')})`)
      .select('id, email');

    if (userError) {
      console.warn(`   ⚠️ Erro ao deletar usuários: ${userError.message}`);
    } else {
      console.log(`   ✅ ${deletedUsers?.length || 0} usuário(s) deletado(s)`);
      if (deletedUsers && deletedUsers.length > 0) {
        deletedUsers.forEach(u => console.log(`      - ${u.email}`));
      }
    }

    // 11. Verificar estado final
    console.log('\n📊 Verificando estado final do banco...');

    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: storeCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });

    console.log(`   👤 Usuários restantes: ${userCount}`);
    console.log(`   🏪 Lojas restantes: ${storeCount}`);
    console.log(`   📦 Produtos restantes: ${productCount}`);

    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('\n🔑 Login admin mantido:');
    admins.forEach(admin => console.log(`   - Email: ${admin.email}`));

  } catch (error) {
    console.error('\n❌ Erro durante limpeza:', error.message);
    process.exit(1);
  }
}

// Executar
cleanDatabase()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
