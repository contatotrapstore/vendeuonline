require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function invalidateCache() {
  console.log('🧹 Invalidando cache do backend...');
  console.log('API URL:', API_BASE);

  try {
    // Trigger backend reload forçando request em endpoints críticos
    const endpoints = [
      '/api/products',
      '/api/stores',
      '/api/categories',
    ];

    for (const endpoint of endpoints) {
      const url = `${API_BASE}${endpoint}?_cache_bust=${Date.now()}`;
      console.log(`\n📡 GET ${url}`);

      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const data = await response.json();
      console.log(`✅ ${endpoint}: ${response.status} - ${data.data?.length || 0} items`);
    }

    console.log('\n✅ Cache invalidado! Deploy deve estar completo agora.');
    console.log('⚠️ Se produtos ainda aparecem, faça HARD REFRESH no navegador (Ctrl+Shift+R)');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n⚠️ Possíveis causas:');
    console.log('1. Deploy ainda processando (aguarde 2-3 minutos)');
    console.log('2. API offline (verifique Render.com dashboard)');
    console.log('3. URL incorreta no .env (NEXT_PUBLIC_API_URL)');
  }
}

invalidateCache();
