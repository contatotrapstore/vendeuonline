import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from "../lib/logger.js";


dotenv.config();

logger.info('🔧 Criando/atualizando usuário admin...');

logger.info('🔍 Verificando variáveis de ambiente...');
logger.info('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
logger.info('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  try {
    logger.info('📊 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    logger.info('✅ Senha hasheada com sucesso');

    logger.info('📡 Conectando ao Supabase...');
    const { data, error } = await supabase
      .from('users')
      .upsert({
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Admin User',
        type: 'ADMIN',
        userType: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (error) {
      logger.error('❌ Erro ao criar/atualizar admin:', error);
      process.exit(1);
    } else {
      logger.info('✅ Usuário admin criado/atualizado com sucesso!');
      logger.info('📧 Email: admin@test.com');
      logger.info('🔑 Senha: admin123');
      logger.info('👤 Tipo: ADMIN');
      logger.info('');
      logger.info('🎉 Agora você pode fazer login no sistema!');
    }
  } catch (err) {
    logger.error('❌ Erro inesperado:', err);
    process.exit(1);
  }
}

createAdmin();