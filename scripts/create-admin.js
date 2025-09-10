import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Criando/atualizando usuário admin...');

console.log('🔍 Verificando variáveis de ambiente...');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  try {
    console.log('📊 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('✅ Senha hasheada com sucesso');

    console.log('📡 Conectando ao Supabase...');
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
      console.error('❌ Erro ao criar/atualizar admin:', error);
      process.exit(1);
    } else {
      console.log('✅ Usuário admin criado/atualizado com sucesso!');
      console.log('📧 Email: admin@test.com');
      console.log('🔑 Senha: admin123');
      console.log('👤 Tipo: ADMIN');
      console.log('');
      console.log('🎉 Agora você pode fazer login no sistema!');
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    process.exit(1);
  }
}

createAdmin();