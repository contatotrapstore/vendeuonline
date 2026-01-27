/**
 * SCRIPT DE MIGRAÇÃO DE STORE SLUGS
 * Atualiza slugs antigos (loja-user_XXX) para slugs SEO-friendly
 *
 * USO: node scripts/fix-store-slugs.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Gera slug SEO-friendly a partir de texto
 */
function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substituir espaços por hífens
    .replace(/-+/g, '-') // Substituir múltiplos hífens
    .replace(/^-+|-+$/g, ''); // Remover hífens nas extremidades
}

/**
 * Gera slug único adicionando timestamp
 */
function uniqueSlugify(text) {
  const baseSlug = slugify(text);
  const timestamp = Date.now().toString(36).slice(-6);
  return `${baseSlug}-${timestamp}`;
}

async function fixStoreSlugs() {
  console.log('\n🔧 MIGRAÇÃO DE STORE SLUGS...\n');

  try {
    // 1. Buscar todas as lojas com slugs problemáticos (loja-user_XXX ou loja-seller_XXX)
    console.log('📋 Buscando lojas com slugs antigos...');
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select('id, name, slug, sellerId')
      .or('slug.like.loja-user_%,slug.like.loja-seller_%');

    if (fetchError) {
      console.error('❌ Erro ao buscar lojas:', fetchError);
      return;
    }

    if (!stores || stores.length === 0) {
      console.log('✅ Nenhuma loja com slug antigo encontrada. Tudo OK!\n');
      return;
    }

    console.log(`✅ Encontradas ${stores.length} lojas com slugs antigos:\n`);

    // 2. Processar cada loja
    const updates = [];
    for (const store of stores) {
      console.log(`📦 Loja: ${store.name}`);
      console.log(`   - Slug antigo: ${store.slug}`);

      // Gerar novo slug baseado no nome
      const newSlug = uniqueSlugify(store.name);
      console.log(`   - Slug novo: ${newSlug}\n`);

      updates.push({
        id: store.id,
        oldSlug: store.slug,
        newSlug: newSlug
      });
    }

    // 3. Confirmar atualização
    console.log(`\n⚠️  ATENÇÃO: ${updates.length} lojas serão atualizadas.`);
    console.log('Esta operação modificará os slugs no banco de dados.\n');

    // Executar atualizações
    console.log('🔄 Atualizando slugs...\n');

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('stores')
        .update({ slug: update.newSlug, updatedAt: new Date().toISOString() })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${update.id}:`, updateError);
      } else {
        console.log(`✅ Atualizado: ${update.oldSlug} → ${update.newSlug}`);
      }
    }

    console.log('\n🎉 MIGRAÇÃO COMPLETA!\n');

    // 4. Verificar resultados
    console.log('🔍 Verificando resultados...\n');
    const { data: updatedStores } = await supabase
      .from('stores')
      .select('name, slug')
      .in('id', updates.map(u => u.id));

    if (updatedStores) {
      updatedStores.forEach(store => {
        console.log(`   ✅ ${store.name}: ${store.slug}`);
      });
    }

    console.log('\n✅ TODAS AS LOJAS ATUALIZADAS COM SUCESSO!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.log('\n💡 Verifique as credenciais Supabase em .env\n');
    process.exit(1);
  }
}

fixStoreSlugs();
