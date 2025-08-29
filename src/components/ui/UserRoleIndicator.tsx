'use client';

import { User, Store, Shield, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface UserRoleIndicatorProps {
  userType: 'admin' | 'seller' | 'buyer';
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserRoleIndicator({ 
  userType, 
  showTooltip = true, 
  size = 'md',
  className = '' 
}: UserRoleIndicatorProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const getRoleConfig = () => {
    switch (userType) {
      case 'admin':
        return {
          icon: Shield,
          label: 'Administrador',
          color: 'bg-red-100 text-red-800 border-red-200',
          description: 'Controle total da plataforma, gerencia usuários, lojas e configurações',
          capabilities: [
            'Gerenciar todos os usuários',
            'Moderar conteúdo',
            'Configurar planos e preços',
            'Visualizar relatórios globais',
            'Controlar configurações do sistema'
          ]
        };
      case 'seller':
        return {
          icon: Store,
          label: 'Vendedor',
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Venda produtos, gerencie sua loja e acompanhe vendas',
          capabilities: [
            'Criar e gerenciar produtos',
            'Processar pedidos',
            'Personalizar loja',
            'Acompanhar analytics',
            'Comunicar com clientes'
          ]
        };
      case 'buyer':
      default:
        return {
          icon: User,
          label: 'Comprador',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Explore produtos, faça compras e gerencie seus pedidos',
          capabilities: [
            'Navegar e comprar produtos',
            'Gerenciar lista de desejos',
            'Acompanhar pedidos',
            'Avaliar produtos',
            'Favoritar lojas'
          ]
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
      tooltip: 'w-64 text-xs'
    },
    md: {
      container: 'px-3 py-1 text-xs',
      icon: 'h-3 w-3',
      tooltip: 'w-72 text-sm'
    },
    lg: {
      container: 'px-4 py-2 text-sm',
      icon: 'h-4 w-4',
      tooltip: 'w-80 text-sm'
    }
  };

  const sizes = sizeClasses[size];

  if (!showTooltip) {
    return (
      <div className={`inline-flex items-center ${sizes.container} rounded-full font-medium border ${config.color} ${className}`}>
        <Icon className={`${sizes.icon} mr-1`} />
        {config.label}
      </div>
    );
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <div className={`inline-flex items-center ${sizes.container} rounded-full font-medium border ${config.color} cursor-help transition-all duration-200 hover:scale-105 ${className}`}>
        <Icon className={`${sizes.icon} mr-1`} />
        {config.label}
        <HelpCircle className="h-3 w-3 ml-1 opacity-60" />
      </div>
      
      {isTooltipVisible && (
        <div className={`absolute z-50 ${sizes.tooltip} p-4 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 left-1/2 transform -translate-x-1/2`}>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"></div>
          
          <div className="flex items-center mb-2">
            <Icon className={`${sizes.icon} mr-2 ${config.color.includes('red') ? 'text-red-600' : config.color.includes('green') ? 'text-green-600' : 'text-blue-600'}`} />
            <h4 className="font-semibold text-gray-900">{config.label}</h4>
          </div>
          
          <p className="text-gray-600 mb-3">{config.description}</p>
          
          <div className="space-y-1">
            <p className="font-medium text-gray-900 text-xs mb-2">Principais funcionalidades:</p>
            {config.capabilities.map((capability, index) => (
              <div key={index} className="flex items-start text-xs text-gray-600">
                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {capability}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserRoleIndicator;