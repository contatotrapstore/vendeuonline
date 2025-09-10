import bcrypt from 'bcryptjs';
import { supabase } from '../src/lib/supabase.js';

console.log('🔧 Atualizando senha do admin...');

async function updateAdminPassword() {
  try {
    // Hash da nova senha
    console.log('📊 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('✅ Senha hasheada:', hashedPassword.substring(0, 20) + '...');

    // Buscar usuário admin existente
    console.log('🔍 Procurando usuário admin...');
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@test.com')
      .eq('type', 'ADMIN');

    if (searchError) {
      console.error('❌ Erro ao buscar usuário:', searchError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ Usuário admin não encontrado. Criando novo...');
      
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
        console.error('❌ Erro ao criar usuário:', createError);
        return;
      }
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@test.com');
      console.log('🔑 Senha: admin123');
      
    } else {
      console.log('✅ Usuário admin encontrado. Atualizando senha...');
      
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
        console.error('❌ Erro ao atualizar senha:', updateError);
        return;
      }

      console.log('✅ Senha do admin atualizada com sucesso!');
      console.log('📧 Email: admin@test.com');
      console.log('🔑 Nova senha: admin123');
    }

    console.log('');
    console.log('🎉 Pronto! Agora você pode fazer login com:');
    console.log('   📧 Email: admin@test.com');
    console.log('   🔑 Senha: admin123');

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

updateAdminPassword();