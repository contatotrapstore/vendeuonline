import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🛠️ Criando tabelas no Supabase...\n');

// SQL para criar as tabelas necessárias
const createTablesSQL = `
-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    phone VARCHAR,
    city VARCHAR,
    state VARCHAR,
    type VARCHAR DEFAULT 'BUYER' CHECK (type IN ('BUYER', 'SELLER', 'ADMIN')),
    "isVerified" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    avatar VARCHAR,
    "lastLogin" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de vendedores
CREATE TABLE IF NOT EXISTS sellers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    rating DECIMAL(3,2) DEFAULT 0,
    "totalSales" INTEGER DEFAULT 0,
    "isVerified" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de lojas
CREATE TABLE IF NOT EXISTS stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "sellerId" UUID REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR,
    address VARCHAR,
    city VARCHAR,
    state VARCHAR,
    "zipCode" VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    website VARCHAR,
    logo VARCHAR,
    banner VARCHAR,
    "socialMedia" JSONB DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT true,
    "isVerified" BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0,
    "salesCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR,
    color VARCHAR,
    "isActive" BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Criar algumas categorias padrão
INSERT INTO categories (name, slug, description, icon, color, "order") VALUES
    ('Eletrônicos', 'eletronicos', 'Celulares, computadores e eletrônicos', 'smartphone', '#3B82F6', 1),
    ('Moda', 'moda', 'Roupas, calçados e acessórios', 'shirt', '#EC4899', 2),
    ('Casa', 'casa', 'Móveis e decoração', 'home', '#10B981', 3),
    ('Veículos', 'veiculos', 'Carros, motos e acessórios', 'car', '#F59E0B', 4),
    ('Esportes', 'esportes', 'Equipamentos e roupas esportivas', 'dumbbell', '#8B5CF6', 5)
ON CONFLICT (slug) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores("isActive");
CREATE INDEX IF NOT EXISTS idx_stores_verified ON stores("isVerified");
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories("isActive");

-- Habilitar RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir leitura para usuários autenticados)
CREATE POLICY IF NOT EXISTS "Allow read access to authenticated users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow read access to stores" ON stores
    FOR SELECT USING ("isActive" = true);

CREATE POLICY IF NOT EXISTS "Allow read access to categories" ON categories
    FOR SELECT USING ("isActive" = true);

-- Permitir acesso via service role
CREATE POLICY IF NOT EXISTS "Allow service role full access users" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Allow service role full access sellers" ON sellers
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Allow service role full access stores" ON stores
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Allow service role full access categories" ON categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
`;

async function createTables() {
  try {
    console.log('📋 Executando SQL para criar tabelas...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: createTablesSQL
    });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error.message);
      
      // Tentar uma abordagem alternativa - criar tabelas uma por uma
      console.log('\n🔄 Tentando abordagem alternativa...');
      
      // Tentar criar usuário de teste diretamente
      const { data: testUser, error: userError } = await supabase
        .from('users')
        .insert([{
          name: 'Admin Teste',
          email: 'admin@teste.com',
          password: '$2a$12$LQv3c1yqBWVHxkd0LQ4YNu3PEFf4L1Z8.9JK4ELF5TKvq8JrBN2uC', // senha: 123456
          phone: '11999999999',
          city: 'São Paulo',
          state: 'SP',
          type: 'ADMIN',
          isVerified: true,
          isActive: true
        }])
        .select()
        .single();

      if (userError) {
        console.error('❌ Erro ao criar usuário teste:', userError.message);
        console.log('\n💡 Possíveis soluções:');
        console.log('1. Verifique se o projeto Supabase está ativo');
        console.log('2. Acesse o painel do Supabase e crie as tabelas manualmente');
        console.log('3. Execute as migrations SQL no SQL Editor do Supabase');
        
        return false;
      } else {
        console.log('✅ Usuário de teste criado com sucesso!');
      }
    } else {
      console.log('✅ Tabelas criadas com sucesso!');
    }

    // Testar inserção de loja de exemplo
    console.log('\n🏪 Criando loja de exemplo...');
    
    const { data: testStore, error: storeError } = await supabase
      .from('stores')
      .insert([{
        name: 'Loja Teste',
        slug: 'loja-teste',
        description: 'Uma loja de teste para demonstração',
        category: 'eletronicos',
        city: 'São Paulo',
        state: 'SP',
        phone: '11999999999',
        email: 'loja@teste.com',
        isActive: true,
        isVerified: true
      }])
      .select()
      .single();

    if (storeError) {
      console.error('⚠️ Erro ao criar loja teste:', storeError.message);
    } else {
      console.log('✅ Loja de teste criada!');
    }

    return true;

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

createTables().then(success => {
  if (success) {
    console.log('\n🎉 Setup do banco concluído!');
    console.log('\n💡 Próximos passos:');
    console.log('1. Execute: npm run dev');
    console.log('2. Teste o login com: admin@teste.com / 123456');
    console.log('3. Verifique se as lojas aparecem na página');
  } else {
    console.log('\n❌ Falha no setup. Verifique as mensagens de erro acima.');
  }
  process.exit(success ? 0 : 1);
});