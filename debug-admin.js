// Script para testar login admin
console.log('🔍 Testando login admin...');

async function testAdminLogin() {
  try {
    // 1. Testar login
    console.log('1. Fazendo login...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: '123456',
        userType: 'admin'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.token) {
      console.error('❌ Login falhou');
      return;
    }

    // 2. Salvar token
    console.log('2. Token salvo:', loginData.token.substring(0, 50) + '...');
    
    // 3. Verificar dados do usuário
    console.log('3. Dados do usuário:');
    console.log('- ID:', loginData.user.id);
    console.log('- Nome:', loginData.user.name);
    console.log('- Email:', loginData.user.email);
    console.log('- Tipo:', loginData.user.userType);
    console.log('- Admin data:', loginData.user.admin);

    // 4. Verificar token JWT
    const tokenPayload = JSON.parse(atob(loginData.token.split('.')[1]));
    console.log('4. Token payload:', tokenPayload);

    console.log('✅ Login admin funcionando!');
    console.log('🔗 Acesse: http://localhost:5173/admin/test');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testAdminLogin();