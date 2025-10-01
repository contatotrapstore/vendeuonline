-- Script SQL para popular produtos em todas as lojas
-- Cada loja recebe 5 produtos relevantes à sua categoria

-- 1. MODA ELEGANTE (Moda e Vestuário)
INSERT INTO "Product" (id, "sellerId", "storeId", "categoryId", name, slug, description, price, "comparePrice", stock, "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES
(gen_random_uuid()::text, 'cc3c549d-e35f-4a39-8d33-3111ff6825bc', 'e6424476-a661-4f70-b87e-ece880853921', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Vestido Longo Floral Verão', 'vestido-longo-floral-verao',
 'Vestido longo em tecido leve, estampa floral delicada, perfeito para o verão',
 189.90, 249.90, 15, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'cc3c549d-e35f-4a39-8d33-3111ff6825bc', 'e6424476-a661-4f70-b87e-ece880853921', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Calça Jeans Skinny Masculina', 'calca-jeans-skinny-masculina',
 'Calça jeans stretch com modelagem skinny, conforto e estilo',
 149.90, 199.90, 20, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'cc3c549d-e35f-4a39-8d33-3111ff6825bc', 'e6424476-a661-4f70-b87e-ece880853921', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Blusa Social Feminina Branca', 'blusa-social-feminina-branca',
 'Blusa social em tecido premium, ideal para ambiente corporativo',
 89.90, null, 25, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'cc3c549d-e35f-4a39-8d33-3111ff6825bc', 'e6424476-a661-4f70-b87e-ece880853921', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Jaqueta Jeans Oversized', 'jaqueta-jeans-oversized',
 'Jaqueta jeans com lavagem especial, modelagem oversized moderna',
 219.90, 289.90, 12, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'cc3c549d-e35f-4a39-8d33-3111ff6825bc', 'e6424476-a661-4f70-b87e-ece880853921', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Conjunto Moletom Unissex', 'conjunto-moletom-unissex',
 'Conjunto de moletom confortável, blusa e calça, várias cores',
 169.90, 219.90, 30, true, false, NOW(), NOW());

-- 2. CASA & DECORAÇÃO
INSERT INTO "Product" (id, "sellerId", "storeId", "categoryId", name, slug, description, price, "comparePrice", stock, "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES
(gen_random_uuid()::text, 'f19c8273-8164-4b44-a376-51353d465443', '0e8777a3-9159-43fb-b64d-42653f3cf4ac', '3ddc4c6b-dcb8-485a-94fa-3741658b1a33',
 'Kit 4 Almofadas Decorativas', 'kit-4-almofadas-decorativas',
 'Kit com 4 almofadas decorativas em tecido suede, várias estampas',
 129.90, 179.90, 18, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'f19c8273-8164-4b44-a376-51353d465443', '0e8777a3-9159-43fb-b64d-42653f3cf4ac', '3ddc4c6b-dcb8-485a-94fa-3741658b1a33',
 'Tapete Sala 2x3m Felpudo', 'tapete-sala-2x3m-felpudo',
 'Tapete felpudo macio para sala, antialérgico, fácil limpeza',
 249.90, 329.90, 10, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'f19c8273-8164-4b44-a376-51353d465443', '0e8777a3-9159-43fb-b64d-42653f3cf4ac', '3ddc4c6b-dcb8-485a-94fa-3741658b1a33',
 'Jogo de Cama Casal 300 Fios', 'jogo-cama-casal-300-fios',
 'Jogo de cama queen 300 fios, algodão egípcio, 4 peças',
 299.90, 399.90, 15, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'f19c8273-8164-4b44-a376-51353d465443', '0e8777a3-9159-43fb-b64d-42653f3cf4ac', '3ddc4c6b-dcb8-485a-94fa-3741658b1a33',
 'Luminária de Mesa LED', 'luminaria-mesa-led',
 'Luminária de mesa com LED ajustável, design moderno',
 89.90, null, 22, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'f19c8273-8164-4b44-a376-51353d465443', '0e8777a3-9159-43fb-b64d-42653f3cf4ac', '3ddc4c6b-dcb8-485a-94fa-3741658b1a33',
 'Espelho Decorativo 60cm', 'espelho-decorativo-60cm',
 'Espelho redondo com moldura dourada, decoração sofisticada',
 199.90, 279.90, 8, true, false, NOW(), NOW());

-- 3. ESPORTES TOTAL
INSERT INTO "Product" (id, "sellerId", "storeId", "categoryId", name, slug, description, price, "comparePrice", stock, "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES
(gen_random_uuid()::text, 'b36f7945-6dae-4bbd-947e-da2c340249ce', 'fd7c76aa-b362-4290-952a-9ca955d0e020', '2a203aa6-a450-4455-9ec0-972c095d7c69',
 'Bola de Futebol Profissional', 'bola-futebol-profissional',
 'Bola oficial de futebol campo, costura reforçada, tamanho padrão',
 119.90, 159.90, 25, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'b36f7945-6dae-4bbd-947e-da2c340249ce', 'fd7c76aa-b362-4290-952a-9ca955d0e020', '2a203aa6-a450-4455-9ec0-972c095d7c69',
 'Kit 2 Halteres 5kg Cada', 'kit-2-halteres-5kg',
 'Par de halteres emborrachados 5kg, ideal para treino em casa',
 89.90, null, 30, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'b36f7945-6dae-4bbd-947e-da2c340249ce', 'fd7c76aa-b362-4290-952a-9ca955d0e020', '2a203aa6-a450-4455-9ec0-972c095d7c69',
 'Tênis de Corrida Performance', 'tenis-corrida-performance',
 'Tênis com tecnologia de amortecimento, ideal para corridas longas',
 329.90, 449.90, 18, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'b36f7945-6dae-4bbd-947e-da2c340249ce', 'fd7c76aa-b362-4290-952a-9ca955d0e020', '2a203aa6-a450-4455-9ec0-972c095d7c69',
 'Colchonete Yoga TPE 6mm', 'colchonete-yoga-tpe-6mm',
 'Colchonete para yoga e pilates, material ecológico, antiderrapante',
 79.90, 109.90, 40, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'b36f7945-6dae-4bbd-947e-da2c340249ce', 'fd7c76aa-b362-4290-952a-9ca955d0e020', '2a203aa6-a450-4455-9ec0-972c095d7c69',
 'Raquete de Tênis Carbono', 'raquete-tenis-carbono',
 'Raquete profissional em fibra de carbono, excelente controle',
 459.90, 599.90, 10, true, false, NOW(), NOW());

-- 4. BELEZA & SAÚDE
INSERT INTO "Product" (id, "sellerId", "storeId", "categoryId", name, slug, description, price, "comparePrice", stock, "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES
(gen_random_uuid()::text, 'eb79edd1-0d25-45b2-bd5b-aadaaa332191', 'f41b7d77-3a1f-4e49-967e-a3c2d10cba03', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Kit Skincare Hidratação Facial', 'kit-skincare-hidratacao-facial',
 'Kit completo com limpador, tônico e hidratante facial',
 159.90, 219.90, 35, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'eb79edd1-0d25-45b2-bd5b-aadaaa332191', 'f41b7d77-3a1f-4e49-967e-a3c2d10cba03', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Perfume Feminino 100ml', 'perfume-feminino-100ml',
 'Fragrância floral sofisticada, fixação prolongada',
 189.90, 259.90, 20, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'eb79edd1-0d25-45b2-bd5b-aadaaa332191', 'f41b7d77-3a1f-4e49-967e-a3c2d10cba03', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Escova Secadora Rotating', 'escova-secadora-rotating',
 'Escova rotativa 3 em 1, seca, modela e alisa os cabelos',
 249.90, 349.90, 15, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'eb79edd1-0d25-45b2-bd5b-aadaaa332191', 'f41b7d77-3a1f-4e49-967e-a3c2d10cba03', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Máscara Facial Argila Verde', 'mascara-facial-argila-verde',
 'Máscara purificante com argila verde, 200g',
 39.90, null, 50, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'eb79edd1-0d25-45b2-bd5b-aadaaa332191', 'f41b7d77-3a1f-4e49-967e-a3c2d10cba03', '09c72ad1-6535-4259-b06b-4d8bfc10d932',
 'Kit Maquiagem Profissional', 'kit-maquiagem-profissional',
 'Estojo completo com sombras, blushes e pincéis',
 279.90, 389.90, 12, true, true, NOW(), NOW());

-- 5. LIVRARIA SABER
INSERT INTO "Product" (id, "sellerId", "storeId", "categoryId", name, slug, description, price, "comparePrice", stock, "isActive", "isFeatured", "createdAt", "updatedAt")
VALUES
(gen_random_uuid()::text, 'f9d4a6f0-6499-4070-b6bf-b494f17ed9fb', 'e26062f2-0d0c-46aa-b47a-53f035419694', 'e09bfab6-88ec-43a0-bcc3-870a08ccf79c',
 'Livro "O Pequeno Príncipe"', 'livro-pequeno-principe',
 'Clássico da literatura mundial, edição especial ilustrada',
 34.90, 49.90, 45, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'f9d4a6f0-6499-4070-b6bf-b494f17ed9fb', 'e26062f2-0d0c-46aa-b47a-53f035419694', 'e09bfab6-88ec-43a0-bcc3-870a08ccf79c',
 'Caderno Universitário 200 Folhas', 'caderno-universitario-200-folhas',
 'Caderno espiral capa dura, 10 matérias, papel de qualidade',
 24.90, null, 100, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'f9d4a6f0-6499-4070-b6bf-b494f17ed9fb', 'e26062f2-0d0c-46aa-b47a-53f035419694', 'e09bfab6-88ec-43a0-bcc3-870a08ccf79c',
 'Kit Material Escolar Completo', 'kit-material-escolar-completo',
 'Kit com lápis, canetas, borracha, régua e mais',
 89.90, 119.90, 60, true, false, NOW(), NOW()),

(gen_random_uuid()::text, 'f9d4a6f0-6499-4070-b6bf-b494f17ed9fb', 'e26062f2-0d0c-46aa-b47a-53f035419694', 'e09bfab6-88ec-43a0-bcc3-870a08ccf79c',
 'Livro "1984" George Orwell', 'livro-1984-george-orwell',
 'Distopia clássica, edição de luxo com capa dura',
 44.90, 59.90, 30, true, true, NOW(), NOW()),

(gen_random_uuid()::text, 'f9d4a6f0-6499-4070-b6bf-b494f17ed9fb', 'e26062f2-0d0c-46aa-b47a-53f035419694', 'e09bfab6-88ec-43a0-bcc3-870a08ccf79c',
 'Agenda 2025 Executiva', 'agenda-2025-executiva',
 'Agenda anual executiva, capa couro sintético, planejamento mensal',
 69.90, null, 40, true, false, NOW(), NOW());
