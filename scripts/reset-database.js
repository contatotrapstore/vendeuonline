/**
 * 🧹 LIMPEZA COMPLETA DO BANCO - MANTER APENAS ADMIN
 *
 * USO: node scripts/reset-database.js
 */

import { supabaseAdmin } from '../server/lib/supabase-client.js';

async function resetDatabase() {
  console.log('\n🧹 INICIANDO LIMPEZA COMPLETA DO BANCO\n');

  try {
    // 1. Buscar admin
    console.log('1️⃣  Buscando admin...');
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', 'admin@vendeuonline.com')
      .single();

    if (adminError || !admin) {
      console.error('❌ Admin não encontrado!', adminError);
      process.exit(1);
    }
    console.log(`✅ Admin: ${admin.email} (${admin.id})\n`);

    // 2. Deletar em ordem (respeitando foreign keys)

    console.log('2️⃣  Deletando ProductSpecification...');
    await supabaseAdmin.from('ProductSpecification').delete().neq('id', '');
    console.log('✅ ProductSpecification deletadas\n');

    console.log('3️⃣  Deletando ProductImage...');
    await supabaseAdmin.from('ProductImage').delete().neq('id', '');
    console.log('✅ ProductImage deletadas\n');

    console.log('4️⃣  Deletando Product...');
    await supabaseAdmin.from('Product').delete().neq('id', '');
    console.log('✅ Product deletados\n');

    console.log('5️⃣  Deletando seller_settings...');
    await supabaseAdmin.from('seller_settings').delete().neq('id', '');
    console.log('✅ seller_settings deletadas\n');

    console.log('6️⃣  Deletando stores...');
    await supabaseAdmin.from('stores').delete().neq('id', '');
    console.log('✅ stores deletadas\n');

    console.log('7️⃣  Deletando sellers...');
    await supabaseAdmin.from('sellers').delete().neq('id', '');
    console.log('✅ sellers deletados\n');

    console.log('8️⃣  Deletando buyers...');
    await supabaseAdmin.from('buyers').delete().neq('id', '');
    console.log('✅ buyers deletados\n');

    console.log('9️⃣  Deletando admins extras...');
    await supabaseAdmin.from('admins').delete().neq('userId', admin.id);
    console.log('✅ admins extras deletados\n');

    console.log('🔟 Deletando users não-admin...');
    await supabaseAdmin.from('users').delete().neq('id', admin.id);
    console.log('✅ users não-admin deletados\n');

    // 3. Verificar estado final
    console.log('📊 VERIFICANDO ESTADO FINAL...\n');

    const { count: userCount } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: sellerCount } = await supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true });
    const { count: buyerCount } = await supabaseAdmin.from('buyers').select('*', { count: 'exact', head: true });
    const { count: storeCount } = await supabaseAdmin.from('stores').select('*', { count: 'exact', head: true });
    const { count: productCount } = await supabaseAdmin.from('Product').select('*', { count: 'exact', head: true });

    console.log('╔════════════════════════════════╗');
    console.log('║     ESTADO FINAL DO BANCO      ║');
    console.log('╠════════════════════════════════╣');
    console.log(`║  users:       ${(userCount || 0).toString().padStart(2)}              ║`);
    console.log(`║  sellers:     ${(sellerCount || 0).toString().padStart(2)}              ║`);
    console.log(`║  buyers:      ${(buyerCount || 0).toString().padStart(2)}              ║`);
    console.log(`║  stores:      ${(storeCount || 0).toString().padStart(2)}              ║`);
    console.log(`║  Product:     ${(productCount || 0).toString().padStart(2)}              ║`);
    console.log('╚════════════════════════════════╝\n');

    if (userCount === 1 && sellerCount === 0 && buyerCount === 0 && storeCount === 0 && productCount === 0) {
      console.log('✅ ✅ ✅ LIMPEZA COMPLETA REALIZADA COM SUCESSO! ✅ ✅ ✅\n');
      console.log('🎯 Banco limpo - apenas admin@vendeuonline.com preservado\n');
      console.log('💡 Próximos passos:');
      console.log('   1. Criar novo seller via /register');
      console.log('   2. Admin aprovar loja em /admin/stores');
      console.log('   3. Seller adicionar produtos');
      console.log('   4. Lojas aparecerão na home após aprovação\n');
    } else {
      console.log('⚠️  Alguns registros ainda permanecem. Verifique manualmente.\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO DURANTE LIMPEZA:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar
resetDatabase()
  .then(() => {
    console.log('🏁 Script finalizado.\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
  });
