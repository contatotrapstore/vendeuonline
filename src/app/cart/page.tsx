'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/store/cartStore';
import { toast } from 'sonner';

export default function CartPage() {
  const navigate = useNavigate();
  const {
    items,
    total,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    isEmpty
  } = useCart();
  
  const [isClearing, setIsClearing] = useState(false);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      toast.success('Item removido do carrinho');
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeItem(itemId);
    toast.success(`${itemName} removido do carrinho`);
  };

  const handleClearCart = async () => {
    setIsClearing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    clearCart();
    setIsClearing(false);
    toast.success('Carrinho limpo com sucesso');
  };

  const handleCheckout = () => {
    if (isEmpty) {
      toast.error('Adicione itens ao carrinho antes de finalizar a compra');
      return;
    }
    navigate('/checkout');
  };

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Carrinho de Compras</h1>
          
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seu carrinho está vazio</h2>
            <p className="text-gray-600 mb-8">Adicione produtos ao seu carrinho para continuar comprando</p>
            <button
              onClick={() => navigate('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Carrinho de Compras ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
          </h1>
          
          {!isEmpty && (
            <button
              onClick={handleClearCart}
              disabled={isClearing}
              className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Limpando...' : 'Limpar Carrinho'}
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=product%20placeholder&image_size=square';
                      }}
                    />
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.store}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id, item.name)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-50 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-50 transition-colors"
                          disabled={item.quantity >= (item.maxQuantity || 99)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-sm text-gray-600">
                            R$ {item.price.toFixed(2).replace('.', ',')} cada
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'}):</span>
                  <span className="text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frete:</span>
                  <span className="text-green-600 font-medium">Grátis</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 mb-4"
              >
                Finalizar Compra
                <ArrowRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => navigate('/products')}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Continuar Comprando
              </button>
              
              {/* Security Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Compra Segura</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Pagamento 100% seguro</li>
                  <li>✓ Frete grátis para todo Brasil</li>
                  <li>✓ Garantia de entrega</li>
                  <li>✓ Suporte 24/7</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recommended Products */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Você também pode gostar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mock recommended products */}
            {[
              {
                id: 'rec1',
                name: 'Smartphone Samsung Galaxy A54',
                price: 1299.99,
                image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20a54%20smartphone&image_size=square',
                store: 'TechStore'
              },
              {
                id: 'rec2',
                name: 'Fone Bluetooth JBL',
                price: 199.99,
                image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=jbl%20bluetooth%20headphones&image_size=square',
                store: 'AudioMax'
              },
              {
                id: 'rec3',
                name: 'Carregador Portátil 10000mAh',
                price: 89.99,
                image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=portable%20power%20bank%20charger&image_size=square',
                store: 'TechStore'
              },
              {
                id: 'rec4',
                name: 'Capa Protetora Premium',
                price: 39.99,
                image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20phone%20case%20protection&image_size=square',
                store: 'AccessoriesPro'
              }
            ].map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-medium text-gray-900 mb-1 text-sm">{product.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{product.store}</p>
                <p className="text-lg font-semibold text-gray-900 mb-3">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </p>
                <button
                  onClick={() => {
                    // Add to cart logic would go here
                    toast.success(`${product.name} adicionado ao carrinho`);
                  }}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}