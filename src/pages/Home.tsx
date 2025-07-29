'use client';

import { Suspense } from 'react';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductCard } from '@/components/ui/ProductCard';
import HeroSection from '@/components/ui/HeroSection';
import { FeaturedStores } from '@/components/ui/FeaturedStores';
import { useProductStore } from '@/store/productStore';
import { Star, Users, ShoppingBag, TrendingUp, Quote, ArrowRight, Shield, Truck, CreditCard, Smartphone, Shirt, Home as HomeIcon, Zap, Book, Sparkles } from 'lucide-react';
const mockStores = [
  {
    id: '1',
    name: 'TechStore',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20tech%20store%20logo%20minimalist%20design&image_size=square',
    products: 156,
    rating: 4.7,
    location: 'São Paulo, SP'
  },
  {
    id: '2',
    name: 'SportShop',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=sports%20store%20logo%20athletic%20design&image_size=square',
    products: 89,
    rating: 4.5,
    location: 'Rio de Janeiro, RJ'
  }
];

const categories = [
  { name: 'Eletrônicos', icon: Smartphone, count: 1250 },
  { name: 'Moda', icon: Shirt, count: 890 },
  { name: 'Casa & Jardim', icon: HomeIcon, count: 650 },
  { name: 'Esportes', icon: Zap, count: 420 },
  { name: 'Livros', icon: Book, count: 380 },
  { name: 'Beleza', icon: Sparkles, count: 320 }
];

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Compradora',
    content: 'Encontrei produtos incríveis de vendedores locais. A entrega foi super rápida!',
    rating: 5
  },
  {
    name: 'João Santos',
    role: 'Vendedor',
    content: 'Consegui expandir meu negócio e alcançar muito mais clientes através da plataforma.',
    rating: 5
  },
  {
    name: 'Ana Costa',
    role: 'Compradora',
    content: 'Adoro apoiar os comerciantes locais. A variedade de produtos é impressionante!',
    rating: 5
  }
];

const stats = [
  { label: 'Produtos', value: '10.000+', icon: ShoppingBag },
  { label: 'Vendedores', value: '500+', icon: Users },
  { label: 'Pedidos', value: '25.000+', icon: TrendingUp },
  { label: 'Avaliação', value: '4.8', icon: Star }
];

export default function Home() {
  const { products } = useProductStore();
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 8);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Search and Filters */}
      <section className="bg-white shadow-sm border-b">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchBar placeholder="Buscar produtos, lojas ou categorias..." />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-12 text-center">Explore por Categoria</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div key={index} className="group cursor-pointer">
                  <div className="bg-gray-50 rounded-lg p-6 text-center hover:bg-blue-50 transition-all duration-200 border border-gray-200 hover:border-blue-200">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.count} produtos</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Lojas em Destaque</h2>
            <p className="text-gray-600">Descubra as melhores lojas da nossa plataforma</p>
          </div>
          <FeaturedStores stores={mockStores} />
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Produtos em Destaque</h2>
            <p className="text-gray-600">Os produtos mais populares da semana</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-8">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Ver Todos os Produtos
            </button>
          </div>
        </div>
      </section>

      {/* Seller CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Venda seus produtos em Erechim
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de vendedores locais e alcance milhares de clientes em sua região.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
              Começar a vender <ArrowRight className="h-4 w-4" />
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-md font-medium hover:bg-white hover:text-blue-600 transition-colors">
              Saiba mais
            </button>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Compra Protegida</h3>
              <p className="text-gray-600">Seus dados e pagamentos estão sempre seguros</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Entrega Rápida</h3>
              <p className="text-gray-600">Receba seus produtos rapidamente em Erechim</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagamento Fácil</h3>
              <p className="text-gray-600">PIX, cartão ou boleto - você escolhe</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-12 text-center">O que nossos usuários dizem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-medium text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Fique por dentro das novidades
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Receba ofertas exclusivas, novos produtos e atualizações das suas lojas favoritas.
          </p>
          <div className="max-w-md mx-auto flex gap-3">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="flex-1 px-4 py-3 rounded-md border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors">
              Inscrever
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}