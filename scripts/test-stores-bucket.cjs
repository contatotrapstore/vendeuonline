#!/usr/bin/env node

/**
 * Script para testar a configuração do bucket "stores" no Supabase Storage
 *
 * Este script verifica:
 * 1. Se o bucket "stores" existe
 * 2. Se o bucket está configurado como público
 * 3. Se é possível listar arquivos (mesmo vazio)
 * 4. Se as políticas RLS estão configuradas
 *
 * Uso: node scripts/test-stores-bucket.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   Certifique-se de que .env contém:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (opcional para testes admin)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

console.log('🧪 Teste de Configuração do Bucket "stores"');
console.log('='.repeat(50));
console.log();

async function testBucketExists() {
  console.log('📦 Teste 1: Verificar se bucket "stores" existe...');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Erro ao listar buckets:', error.message);
      return false;
    }

    const storesBucket = buckets.find(b => b.id === 'stores');

    if (!storesBucket) {
      console.error('❌ Bucket "stores" NÃO EXISTE');
      console.log();
      console.log('📝 AÇÃO NECESSÁRIA:');
      console.log('   1. Acesse o Supabase Dashboard');
      console.log('   2. Vá em Storage > Buckets');
      console.log('   3. Clique em "New bucket"');
      console.log('   4. Nome: "stores", marque "Public bucket"');
      console.log('   5. Ou siga o guia: scripts/setup-stores-bucket.md');
      return false;
    }

    console.log('✅ Bucket "stores" encontrado!');
    console.log('   - ID:', storesBucket.id);
    console.log('   - Nome:', storesBucket.name);
    console.log('   - Público:', storesBucket.public ? 'SIM ✅' : 'NÃO ❌');
    console.log('   - Criado em:', new Date(storesBucket.created_at).toLocaleString('pt-BR'));

    if (!storesBucket.public) {
      console.warn('⚠️  ATENÇÃO: Bucket não está marcado como público!');
      console.log('   URLs de imagens podem não funcionar.');
      console.log('   Execute no SQL Editor:');
      console.log('   UPDATE storage.buckets SET public = true WHERE id = \'stores\';');
      return false;
    }

    console.log();
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function testBucketListing() {
  console.log('📂 Teste 2: Verificar permissões de listagem...');

  try {
    const { data, error } = await supabase.storage.from('stores').list('', {
      limit: 10,
      offset: 0,
    });

    if (error) {
      console.error('❌ Erro ao listar arquivos:', error.message);
      console.log('   Código:', error.statusCode || error.status);

      if (error.message.includes('not found')) {
        console.log('   Causa provável: Bucket não existe');
      } else if (error.message.includes('permission') || error.message.includes('denied')) {
        console.log('   Causa provável: Políticas RLS não configuradas');
        console.log('   Solução: Execute as políticas RLS do guia setup-stores-bucket.md');
      }

      return false;
    }

    console.log('✅ Permissões de listagem OK!');

    if (data && data.length > 0) {
      console.log(`   Encontrados ${data.length} item(ns) no bucket:`);
      data.slice(0, 5).forEach(item => {
        console.log(`   - ${item.name} (${(item.metadata?.size / 1024).toFixed(2)} KB)`);
      });
      if (data.length > 5) {
        console.log(`   ... e mais ${data.length - 5} arquivo(s)`);
      }
    } else {
      console.log('   Bucket está vazio (isso é OK se ainda não houve uploads)');
    }

    console.log();
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function testPublicUrl() {
  console.log('🔗 Teste 3: Verificar geração de URL pública...');

  try {
    // Gerar URL pública para um caminho fictício (não precisa existir)
    const testPath = 'logos/test-image.jpg';
    const { data } = supabase.storage.from('stores').getPublicUrl(testPath);

    if (!data || !data.publicUrl) {
      console.error('❌ Não foi possível gerar URL pública');
      return false;
    }

    console.log('✅ Geração de URL pública funciona!');
    console.log('   Exemplo de URL:');
    console.log('   ' + data.publicUrl);

    // Verificar se a URL tem o formato correto
    const urlPattern = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/stores\//;
    if (!urlPattern.test(data.publicUrl)) {
      console.warn('⚠️  ATENÇÃO: URL gerada não parece estar correta');
      console.log('   Formato esperado: https://PROJECT.supabase.co/storage/v1/object/public/stores/...');
    }

    console.log();
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function testAdminAccess() {
  if (!supabaseAdmin) {
    console.log('⏭️  Teste 4: Acesso admin PULADO (SUPABASE_SERVICE_ROLE_KEY não configurada)');
    console.log('   Isso é OK. O teste admin é opcional.');
    console.log();
    return true;
  }

  console.log('🔑 Teste 4: Verificar acesso admin ao bucket...');

  try {
    const { data, error } = await supabaseAdmin.storage.from('stores').list('', {
      limit: 1,
    });

    if (error) {
      console.error('❌ Erro ao acessar bucket com admin:', error.message);
      return false;
    }

    console.log('✅ Acesso admin ao bucket funciona!');
    console.log('   Uploads via backend funcionarão corretamente.');
    console.log();
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function testUploadEndpoint() {
  console.log('🚀 Teste 5: Verificar se endpoint de upload está ativo...');

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vendeuonline-uqkk.onrender.com';
    const healthUrl = `${apiUrl}/health`;

    console.log('   Testando:', healthUrl);

    const response = await fetch(healthUrl);

    if (!response.ok) {
      console.error(`❌ Servidor API não está respondendo (status: ${response.status})`);
      return false;
    }

    const data = await response.json();
    console.log('✅ API backend está ativa!');
    console.log('   Status:', data.status);
    console.log('   Timestamp:', new Date(data.timestamp).toLocaleString('pt-BR'));
    console.log();
    console.log('   Endpoint de upload disponível em:');
    console.log('   POST ' + apiUrl + '/api/upload');
    console.log();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com API:', error.message);
    console.log('   Verifique se a API está rodando:');
    console.log('   - Local: npm run api');
    console.log('   - Produção: https://vendeuonline-uqkk.onrender.com');
    return false;
  }
}

async function runAllTests() {
  console.log('Iniciando testes...');
  console.log();

  const results = {
    bucketExists: await testBucketExists(),
    bucketListing: await testBucketListing(),
    publicUrl: await testPublicUrl(),
    adminAccess: await testAdminAccess(),
    uploadEndpoint: await testUploadEndpoint(),
  };

  console.log('='.repeat(50));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(50));
  console.log();

  const tests = [
    { name: 'Bucket "stores" existe', passed: results.bucketExists },
    { name: 'Permissões de listagem OK', passed: results.bucketListing },
    { name: 'URL pública funciona', passed: results.publicUrl },
    { name: 'Acesso admin OK', passed: results.adminAccess },
    { name: 'API backend ativa', passed: results.uploadEndpoint },
  ];

  tests.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });

  console.log();

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log();
    console.log('✅ O bucket "stores" está configurado corretamente.');
    console.log('✅ Upload de logo/banner de loja deve funcionar.');
    console.log();
    console.log('📝 Próximo passo:');
    console.log('   1. Faça login como vendedor em /login');
    console.log('   2. Vá em /seller/store (Configurações da Loja)');
    console.log('   3. Teste fazer upload de logo e banner');
    console.log();
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM');
    console.log();
    console.log('📝 Siga o guia de configuração:');
    console.log('   scripts/setup-stores-bucket.md');
    console.log();
    process.exit(1);
  }
}

// Executar testes
runAllTests().catch(error => {
  console.error('❌ Erro fatal ao executar testes:', error);
  process.exit(1);
});
