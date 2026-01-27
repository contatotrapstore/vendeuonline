/**
 * SCRIPT DE VERIFICAÇÃO DO DATABASE
 * Mostra quantos registros existem em cada tabela
 *
 * USO: node scripts/check-database-status.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseStatus() {
  console.log('\n📊 VERIFICANDO ESTADO DO DATABASE...\n');

  try {
    // Check stores
    const { count: storeCount, data: stores } = await supabase
      .from('stores')
      .select('id, name, productCount', { count: 'exact' });

    console.log(`🏪 Stores: ${storeCount || 0} registros`);
    if (stores && stores.length > 0) {
      stores.forEach(s => console.log(`   - ${s.name} (ID: ${s.id}, Products: ${s.productCount})`));
    }

    // Check products
    const { count: productCount, data: products } = await supabase
      .from('Product')
      .select('id, name, isActive', { count: 'exact' });

    console.log(`\n📦 Products: ${productCount || 0} registros`);
    if (products && products.length > 0) {
      products.forEach(p => console.log(`   - ${p.name} (ID: ${p.id}, Active: ${p.isActive})`));
    }

    // Check ProductImage
    const { count: imageCount } = await supabase
      .from('ProductImage')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📸 ProductImage: ${imageCount || 0} registros`);

    // Check sellers
    const { count: sellerCount, data: sellers } = await supabase
      .from('sellers')
      .select('id, storeName, userId', { count: 'exact' });

    console.log(`\n👨‍💼 Sellers: ${sellerCount || 0} registros`);
    if (sellers && sellers.length > 0) {
      sellers.forEach(s => console.log(`   - ${s.storeName} (ID: ${s.id})`));
    }

    // Check SELLER users
    const { count: userCount, data: users } = await supabase
      .from('users')
      .select('id, email, type', { count: 'exact' })
      .eq('type', 'SELLER');

    console.log(`\n👤 Users SELLER: ${userCount || 0} registros`);
    if (users && users.length > 0) {
      users.forEach(u => console.log(`   - ${u.email} (ID: ${u.id})`));
    }

    console.log('\n✅ VERIFICAÇÃO COMPLETA!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    process.exit(1);
  }
}

checkDatabaseStatus();
