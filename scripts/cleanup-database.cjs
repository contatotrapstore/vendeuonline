/**
 * SCRIPT DE LIMPEZA COMPLETA DO DATABASE
 * Remove TODOS os dados de teste: lojas, produtos, sellers, usuários SELLER
 *
 * USO: node scripts/cleanup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDatabase() {
  console.log('\n🧹 INICIANDO LIMPEZA COMPLETA DO DATABASE...\n');

  try {
    // 1. Delete all ProductImage records
    console.log('📸 Deletando ProductImage records...');
    const { error: imgError, count: imgCount } = await supabase
      .from('ProductImage')
      .delete()
      .not('id', 'is', null); // Delete all

    if (imgError) {
      console.error('❌ Erro ao deletar ProductImage:', imgError);
    } else {
      console.log(`✅ ProductImage deletados: ${imgCount || 0} registros\n`);
    }

    // 2. Delete all ProductSpecification records
    console.log('📋 Deletando ProductSpecification records...');
    const { error: specError, count: specCount } = await supabase
      .from('ProductSpecification')
      .delete()
      .not('id', 'is', null);

    if (specError) {
      console.error('❌ Erro ao deletar ProductSpecification:', specError);
    } else {
      console.log(`✅ ProductSpecification deletados: ${specCount || 0} registros\n`);
    }

    // 3. Delete all Products (hard delete)
    console.log('📦 Deletando Products...');
    const { error: prodError, count: prodCount } = await supabase
      .from('Product')
      .delete()
      .not('id', 'is', null);

    if (prodError) {
      console.error('❌ Erro ao deletar Product:', prodError);
    } else {
      console.log(`✅ Products deletados: ${prodCount || 0} registros\n`);
    }

    // 4. Delete all Stores
    console.log('🏪 Deletando Stores...');
    const { error: storeError, count: storeCount } = await supabase
      .from('stores')
      .delete()
      .not('id', 'is', null);

    if (storeError) {
      console.error('❌ Erro ao deletar stores:', storeError);
    } else {
      console.log(`✅ Stores deletadas: ${storeCount || 0} registros\n`);
    }

    // 5. Delete all Sellers
    console.log('👨‍💼 Deletando Sellers...');
    const { error: sellerError, count: sellerCount } = await supabase
      .from('sellers')
      .delete()
      .not('id', 'is', null);

    if (sellerError) {
      console.error('❌ Erro ao deletar sellers:', sellerError);
    } else {
      console.log(`✅ Sellers deletados: ${sellerCount || 0} registros\n`);
    }

    // 6. Delete all SELLER type users (keep ADMIN and BUYER)
    console.log('👤 Deletando users SELLER...');
    const { error: userError, count: userCount } = await supabase
      .from('users')
      .delete()
      .eq('type', 'SELLER');

    if (userError) {
      console.error('❌ Erro ao deletar users SELLER:', userError);
    } else {
      console.log(`✅ Users SELLER deletados: ${userCount || 0} registros\n`);
    }

    console.log('✅ LIMPEZA COMPLETA FINALIZADA COM SUCESSO!\n');
    console.log('📊 Resumo:');
    console.log(`   - ProductImage: ${imgCount || 0} deletados`);
    console.log(`   - ProductSpecification: ${specCount || 0} deletados`);
    console.log(`   - Products: ${prodCount || 0} deletados`);
    console.log(`   - Stores: ${storeCount || 0} deletados`);
    console.log(`   - Sellers: ${sellerCount || 0} deletados`);
    console.log(`   - Users SELLER: ${userCount || 0} deletados\n`);

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error);
    process.exit(1);
  }
}

cleanupDatabase();
