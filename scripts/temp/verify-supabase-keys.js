import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Verificando chaves do Supabase...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key (primeiros 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');
console.log('Service Key (primeiros 20 chars):', supabaseServiceKey?.substring(0, 20) + '...');

// Verificar se as chaves têm o formato JWT correto
function isValidJWT(token) {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3;
}

console.log('\n🧪 Validação das chaves:');
console.log('Anon Key válida:', isValidJWT(supabaseAnonKey) ? '✅' : '❌');
console.log('Service Key válida:', isValidJWT(supabaseServiceKey) ? '✅' : '❌');

// Tentar decodificar as chaves para ver o payload
function decodeJWT(token) {
  if (!isValidJWT(token)) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (e) {
    return null;
  }
}

const anonPayload = decodeJWT(supabaseAnonKey);
const servicePayload = decodeJWT(supabaseServiceKey);

if (anonPayload) {
  console.log('\n📋 Anon Key info:');
  console.log('  Role:', anonPayload.role);
  console.log('  Ref:', anonPayload.ref);
  console.log('  Exp:', new Date(anonPayload.exp * 1000).toISOString());
}

if (servicePayload) {
  console.log('\n📋 Service Key info:');
  console.log('  Role:', servicePayload.role);
  console.log('  Ref:', servicePayload.ref);
  console.log('  Exp:', new Date(servicePayload.exp * 1000).toISOString());
}

// Verificar se as chaves estão expiradas
const now = Math.floor(Date.now() / 1000);

if (anonPayload && anonPayload.exp < now) {
  console.log('\n⚠️ AVISO: Anon Key está expirada!');
}

if (servicePayload && servicePayload.exp < now) {
  console.log('\n⚠️ AVISO: Service Key está expirada!');
}

console.log('\n💡 Se as chaves estiverem expiradas ou inválidas:');
console.log('1. Acesse https://supabase.com/dashboard');
console.log('2. Vá para seu projeto');
console.log('3. Em Settings > API, copie as novas chaves');
console.log('4. Atualize o arquivo .env');