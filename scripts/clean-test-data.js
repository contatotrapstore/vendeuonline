/**
 * Script para limpar dados de teste do banco
 * Preserva apenas o usuário admin@vendeuonline.com
 *
 * Uso: node scripts/clean-test-data.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ID do admin a preservar
const ADMIN_USER_ID = 'admin_2f6a0607b86a40abb2b3d684414b7166';

async function cleanTestData() {
  console.log('🧹 Iniciando limpeza de dados de teste...\n');

  try {
    // 1. Buscar sellers a deletar
    console.log('1️⃣ Identificando sellers de teste...');
    const { data: sellersToDelete, error: sellersError } = await supabase
      .from('sellers')
      .select('id, userId')
      .neq('userId', ADMIN_USER_ID);

    if (sellersError) throw sellersError;
    const sellerIds = sellersToDelete?.map(s => s.id) || [];
    console.log(`   ✅ ${sellerIds.length} sellers encontrados para deletar`);

    // 2. Deletar produtos (CASCADE deleta images/specs)
    if (sellerIds.length > 0) {
      console.log('\n2️⃣ Deletando produtos...');
      const { error: productsError } = await supabase
        .from('Product')
        .delete()
        .in('sellerId', sellerIds);

      if (productsError) throw productsError;
      console.log('   ✅ Produtos deletados com sucesso');
    }

    // 3. Deletar stores
    if (sellerIds.length > 0) {
      console.log('\n3️⃣ Deletando stores...');
      const { error: storesError } = await supabase
        .from('stores')
        .delete()
        .in('sellerId', sellerIds);

      if (storesError) throw storesError;
      console.log('   ✅ Stores deletadas com sucesso');
    }

    // 4. Deletar sellers
    if (sellerIds.length > 0) {
      console.log('\n4️⃣ Deletando sellers...');
      const { error: sellersDeleteError } = await supabase
        .from('sellers')
        .delete()
        .in('id', sellerIds);

      if (sellersDeleteError) throw sellersDeleteError;
      console.log('   ✅ Sellers deletados com sucesso');
    }

    // 5. Deletar buyers
    console.log('\n5️⃣ Deletando buyers...');
    const { error: buyersError } = await supabase
      .from('buyers')
      .delete()
      .neq('userId', ADMIN_USER_ID); // Safety check

    if (buyersError) throw buyersError;
    console.log('   ✅ Buyers deletados com sucesso');

    // 6. Deletar admins extras
    console.log('\n6️⃣ Deletando admins extras...');
    const { error: adminsError } = await supabase
      .from('admins')
      .delete()
      .neq('userId', ADMIN_USER_ID);

    if (adminsError) throw adminsError;
    console.log('   ✅ Admins extras deletados');

    // 7. Deletar users de teste
    console.log('\n7️⃣ Deletando users de teste...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', ADMIN_USER_ID);

    if (usersError) throw usersError;
    console.log('   ✅ Users de teste deletados');

    // 8. Verificação final
    console.log('\n📊 VERIFICAÇÃO FINAL:\n');

    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: sellersCount } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });

    const { count: storesCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });

    const { count: productsCount } = await supabase
      .from('Product')
      .select('*', { count: 'exact', head: true });

    const { count: buyersCount } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    const { count: adminsCount } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    console.log(`   users:    ${usersCount} (esperado: 1 admin)`);
    console.log(`   sellers:  ${sellersCount} (esperado: 0)`);
    console.log(`   stores:   ${storesCount} (esperado: 0)`);
    console.log(`   products: ${productsCount} (esperado: 0)`);
    console.log(`   buyers:   ${buyersCount} (esperado: 0)`);
    console.log(`   admins:   ${adminsCount} (esperado: 1)`);

    if (usersCount === 1 && sellersCount === 0 && storesCount === 0 && productsCount === 0) {
      console.log('\n✅ LIMPEZA COMPLETA! Banco está limpo para testes novos.');
      console.log('👤 Usuário admin preservado: admin@vendeuonline.com');
    } else {
      console.log('\n⚠️ Alguns dados ainda existem. Verificar manualmente.');
    }

  } catch (error) {
    console.error('\n❌ Erro durante a limpeza:', error);
    process.exit(1);
  }
}

// Executar
cleanTestData();
