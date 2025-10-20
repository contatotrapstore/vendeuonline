import { supabaseAdmin } from '../server/lib/supabase-client.js';
import { logger } from '../server/lib/logger.js';

/**
 * Script para verificar e criar buckets necessários no Supabase Storage
 * Execute com: node scripts/check-supabase-storage.js
 */

async function checkStorageBuckets() {
  logger.info('🔍 Verificando buckets do Supabase Storage...\n');

  const requiredBuckets = [
    { name: 'products', public: true, fileSizeLimit: 5242880 }, // 5MB
    { name: 'stores', public: true, fileSizeLimit: 5242880 },   // 5MB
    { name: 'avatars', public: true, fileSizeLimit: 2097152 }   // 2MB
  ];

  try {
    // Listar buckets existentes
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      logger.error('❌ Erro ao listar buckets:', listError);
      process.exit(1);
    }

    logger.info(`📦 Buckets existentes: ${buckets.map(b => b.name).join(', ')}\n`);

    // Verificar e criar buckets necessários
    for (const bucketConfig of requiredBuckets) {
      const { name, public: isPublic, fileSizeLimit } = bucketConfig;
      const exists = buckets.find(b => b.name === name);

      if (!exists) {
        logger.info(`🆕 Criando bucket: ${name}`);

        const { data, error: createError } = await supabaseAdmin.storage.createBucket(name, {
          public: isPublic,
          fileSizeLimit: fileSizeLimit,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });

        if (createError) {
          logger.error(`❌ Erro ao criar ${name}:`, createError);
        } else {
          logger.info(`✅ Bucket ${name} criado com sucesso`);
          logger.info(`   - Público: ${isPublic}`);
          logger.info(`   - Tamanho máximo: ${(fileSizeLimit / 1024 / 1024).toFixed(2)}MB\n`);
        }
      } else {
        logger.info(`✅ Bucket ${name} já existe`);
        logger.info(`   - Público: ${exists.public}`);
        logger.info(`   - ID: ${exists.id}\n`);
      }
    }

    // Testar upload em cada bucket
    logger.info('\n🧪 Testando upload em cada bucket...\n');

    for (const bucketConfig of requiredBuckets) {
      const { name } = bucketConfig;
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = 'Test file created by check-supabase-storage script';

      logger.info(`📤 Testando upload em: ${name}`);

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(name)
        .upload(testFileName, Buffer.from(testContent), {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        logger.error(`❌ Erro ao fazer upload em ${name}:`, uploadError);
      } else {
        logger.info(`✅ Upload bem-sucedido em ${name}: ${uploadData.path}`);

        // Deletar arquivo de teste
        const { error: deleteError } = await supabaseAdmin.storage
          .from(name)
          .remove([testFileName]);

        if (deleteError) {
          logger.warn(`⚠️  Erro ao deletar arquivo de teste: ${deleteError.message}`);
        } else {
          logger.info(`🗑️  Arquivo de teste deletado\n`);
        }
      }
    }

    logger.info('\n✨ Verificação completa!\n');
    logger.info('📋 Resumo:');
    logger.info(`   - Buckets necessários: ${requiredBuckets.length}`);
    logger.info(`   - Buckets existentes: ${buckets.length}`);
    logger.info(`   - Status: ${buckets.length >= requiredBuckets.length ? '✅ OK' : '⚠️  Faltam buckets'}\n`);

  } catch (error) {
    logger.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar verificação
checkStorageBuckets()
  .then(() => {
    logger.info('✅ Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Erro ao executar script:', error);
    process.exit(1);
  });
