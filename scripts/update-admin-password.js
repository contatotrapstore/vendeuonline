import bcrypt from 'bcryptjs';
import { supabase } from '../src/lib/supabase.js';
import { logger } from "../lib/logger.js";


logger.info('🔧 Atualizando senha do admin...');

async function updateAdminPassword() {
  try {
    // Hash da nova senha
    logger.info('📊 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    logger.info('✅ Senha hasheada:', hashedPassword.substring(0, 20) + '...');

    // Buscar usuário admin existente
    logger.info('🔍 Procurando usuário admin...');
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@test.com')
      .eq('type', 'ADMIN');

    if (searchError) {
      logger.error('❌ Erro ao buscar usuário:', searchError);
      return;
    }

    if (!users || users.length === 0) {
      logger.info('❌ Usuário admin não encontrado. Criando novo...');
      
      // Criar novo usuário admin
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: 'admin@test.com',
          password: hashedPassword,
          name: 'Admin User',
          type: 'ADMIN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .select();

      if (createError) {
        logger.error('❌ Erro ao criar usuário:', createError);
        return;
      }
      
      logger.info('✅ Usuário admin criado com sucesso!');
      logger.info('📧 Email: admin@test.com');
      logger.info('🔑 Senha: admin123');
      
    } else {
      logger.info('✅ Usuário admin encontrado. Atualizando senha...');
      
      // Atualizar senha do usuário existente
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        })
        .eq('email', 'admin@test.com')
        .eq('type', 'ADMIN')
        .select();

      if (updateError) {
        logger.error('❌ Erro ao atualizar senha:', updateError);
        return;
      }

      logger.info('✅ Senha do admin atualizada com sucesso!');
      logger.info('📧 Email: admin@test.com');
      logger.info('🔑 Nova senha: admin123');
    }

    logger.info('');
    logger.info('🎉 Pronto! Agora você pode fazer login com:');
    logger.info('   📧 Email: admin@test.com');
    logger.info('   🔑 Senha: admin123');

  } catch (err) {
    logger.error('❌ Erro inesperado:', err);
  }
}

updateAdminPassword();