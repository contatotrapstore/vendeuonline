"use client";

import { Suspense, useEffect } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { ProductCard } from "@/components/ui/ProductCard";
import HeroSection from "../components/ui/HeroSection";
import { FeaturedStores } from "@/components/ui/FeaturedStores";
import { useProductStore } from "@/store/productStore";
import { useStoreStore } from "@/stores/storeStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuthStore } from "@/store/authStore";
import { Product } from "@/types";
import { toast } from "sonner";

export default function HomePage() {
  const { products, fetchProducts } = useProductStore();
  const { stores, fetchStores, loading: storesLoading } = useStoreStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 12);
  const allProducts = products.slice(0, 20);
  const featuredStores = stores.slice(0, 6).map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug, // ✅ FIX: Adicionar slug para URLs amigáveis
    logo: store.logo,
    products: store.productCount || 0,
    rating: store.rating,
    city: store.city,
    description: store.description,
    category: store.category,
    isVerified: store.isVerified,
  })); // Mostrar até 6 lojas em destaque

  useEffect(() => {
    fetchProducts();
    fetchStores();
  }, [fetchProducts, fetchStores]);

  const handleToggleWishlist = async (product: Product) => {
    if (!isAuthenticated) {
      toast.error("Faça login para adicionar produtos aos favoritos");
      return;
    }

    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
        toast.success("Produto removido dos favoritos");
      } else {
        await addToWishlist(product.id);
        toast.success("Produto adicionado aos favoritos");
      }
    } catch (error) {
      toast.error("Erro ao atualizar lista de favoritos");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Produtos em Destaque</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubra os produtos mais populares e bem avaliados da nossa plataforma
            </p>
          </div>
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Carregando produtos...</div>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  store={{
                    id: product.store?.id || "",
                    name: product.store?.name || "Loja",
                    whatsapp: product.store?.whatsapp || null,
                    phone: product.store?.phone || null,
                  }}
                  onToggleWishlist={handleToggleWishlist}
                  isInWishlist={isInWishlist(product.id)}
                />
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Navegue por nossa ampla seleção de produtos de qualidade
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {allProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                store={{
                  id: product.store?.id || "",
                  name: product.store?.name || "Loja",
                  whatsapp: product.store?.whatsapp || null,
                  phone: product.store?.phone || null,
                }}
                onToggleWishlist={handleToggleWishlist}
                isInWishlist={isInWishlist(product.id)}
              />
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
          {storesLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando lojas...</div>
          ) : (
            <FeaturedStores stores={featuredStores} />
          )}
        </div>
      </section>
    </div>
  );
}
