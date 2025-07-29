'use client';

import { Suspense } from 'react';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductCard } from '@/components/ui/ProductCard';
import HeroSection from '../components/ui/HeroSection';
import { FeaturedStores } from '@/components/ui/FeaturedStores';
import { useProductStore } from '@/store/productStore';



const mockStores = [
  {
    id: '1',
    name: 'Eletrônicos Erechim',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20electronics%20store%20logo%20erechim%20rs&image_size=square',
    products: 156,
    rating: 4.7,
    location: 'Erechim, RS'
  },
  {
    id: '2',
    name: 'Móveis & Decoração',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=furniture%20store%20logo%20modern%20design&image_size=square',
    products: 89,
    rating: 4.5,
    location: 'Erechim, RS'
  }
];

export default function HomePage() {
  const { products } = useProductStore();
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 12);
  const allProducts = products.slice(0, 20);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection />
      

        
      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Produtos em Destaque</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Descubra os produtos mais populares e bem avaliados da nossa plataforma</p>
          </div>
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Carregando produtos...</div>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Suspense>
        </div>
      </section>

      {/* All Products */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Todos os Produtos</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Navegue por nossa ampla seleção de produtos de qualidade</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Lojas Parceiras</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Conheça as melhores lojas da nossa plataforma</p>
          </div>
          <FeaturedStores stores={mockStores} />
        </div>
      </section>
    </div>
  );
}