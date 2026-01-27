/**
 * SCRIPT DE VERIFICAÇÃO DE PRODUTOS DA LOJA
 * Investiga por que produtos dão 404 na loja especificada
 *
 * USO: node scripts/check-store-products.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStoreProducts(storeSlug = 'loja-user_176') {
  console.log('\n🔍 VERIFICANDO LOJA E PRODUTOS...\n');
  console.log(`📋 Store Slug: ${storeSlug}\n`);

  try {
    // 1. Buscar loja pelo slug
    console.log('🏪 Buscando loja...');
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, sellerId, productCount, isActive')
      .eq('slug', storeSlug)
      .single();

    if (storeError || !store) {
      console.error('❌ Loja não encontrada:', storeError);
      return;
    }

    console.log('✅ Loja encontrada:');
    console.log(`   - ID: ${store.id}`);
    console.log(`   - Nome: ${store.name}`);
    console.log(`   - Slug: ${store.slug}`);
    console.log(`   - Seller ID: ${store.sellerId}`);
    console.log(`   - Product Count: ${store.productCount}`);
    console.log(`   - Ativa: ${store.isActive}\n`);

    // 2. Buscar produtos do seller
    console.log('📦 Buscando produtos do seller...');
    const { data: products, error: productsError } = await supabase
      .from('Product')
      .select(`
        id,
        name,
        slug,
        isActive,
        status,
        price,
        images:ProductImage(id, url, isMain, order)
      `)
      .eq('sellerId', store.sellerId)
      .order('createdAt', { ascending: false });

    if (productsError) {
      console.error('❌ Erro ao buscar produtos:', productsError);
      return;
    }

    console.log(`✅ Produtos encontrados: ${products?.length || 0}\n`);

    if (!products || products.length === 0) {
      console.log('⚠️  Nenhum produto encontrado para este seller!');
      console.log('   - Store mostra produtos mas não existem no banco');
      console.log('   - Possível cache desatualizado no frontend\n');
      return;
    }

    // 3. Analisar cada produto
    products.forEach((product, index) => {
      console.log(`\n📦 Produto ${index + 1}:`);
      console.log(`   - ID: ${product.id}`);
      console.log(`   - Nome: ${product.name}`);
      console.log(`   - Slug: ${product.slug || 'NULL'}`);
      console.log(`   - Ativo: ${product.isActive}`);
      console.log(`   - Status: ${product.status || 'NULL'}`);
      console.log(`   - Preço: R$ ${product.price}`);
      console.log(`   - Imagens: ${product.images?.length || 0}`);

      if (product.images && product.images.length > 0) {
        product.images.forEach((img, imgIndex) => {
          console.log(`      ${imgIndex + 1}. ${img.url} (Main: ${img.isMain})`);
        });
      } else {
        console.log('      ⚠️  SEM IMAGENS');
      }

      // Verificar possíveis problemas
      const issues = [];
      if (!product.isActive) issues.push('INATIVO');
      if (product.status !== 'APPROVED' && product.status !== null) issues.push(`STATUS: ${product.status}`);
      if (!product.slug) issues.push('SEM SLUG');
      if (!product.images || product.images.length === 0) issues.push('SEM IMAGENS');

      if (issues.length > 0) {
        console.log(`   ⚠️  PROBLEMAS: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ Produto OK`);
      }
    });

    // 4. Gerar URLs de teste
    console.log('\n\n🔗 URLs DE TESTE:\n');
    products.forEach((product) => {
      const url = `https://www.vendeu.online/produto/${product.id}`;
      console.log(`   ${product.name}:`);
      console.log(`   ${url}\n`);
    });

    // 5. Diagnóstico final
    console.log('\n📊 DIAGNÓSTICO:\n');

    const activeProducts = products.filter(p => p.isActive);
    const approvedProducts = products.filter(p => !p.status || p.status === 'APPROVED');
    const withImages = products.filter(p => p.images && p.images.length > 0);

    console.log(`Total de produtos: ${products.length}`);
    console.log(`Produtos ativos: ${activeProducts.length}`);
    console.log(`Produtos aprovados: ${approvedProducts.length}`);
    console.log(`Produtos com imagens: ${withImages.length}\n`);

    if (activeProducts.length === 0) {
      console.log('🔴 PROBLEMA IDENTIFICADO: Todos os produtos estão INATIVOS');
      console.log('   Solução: Store page deve filtrar apenas produtos ativos\n');
    }

    if (approvedProducts.length < products.length) {
      console.log('🟡 AVISO: Alguns produtos não estão aprovados');
      console.log('   Produtos PENDING/REJECTED não devem aparecer na loja pública\n');
    }

    if (withImages.length < products.length) {
      console.log('🟡 AVISO: Alguns produtos não têm imagens');
      console.log('   Imagens vazias aparecem como placeholder\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

// Executar
const storeSlug = process.argv[2] || 'loja-user_176';
checkStoreProducts(storeSlug);
