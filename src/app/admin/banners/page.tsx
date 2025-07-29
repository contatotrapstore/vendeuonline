'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  position: 'hero' | 'sidebar' | 'footer' | 'category';
  status: 'active' | 'inactive' | 'scheduled';
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  createdAt: string;
}

const mockBanners: Banner[] = [
  {
    id: '1',
    title: 'Promoção de Eletrônicos',
    description: 'Até 50% de desconto em smartphones e tablets',
    imageUrl: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20electronics%20sale%20banner%20with%20smartphones%20and%20tablets&image_size=landscape_16_9',
    linkUrl: '/products?category=eletronicos',
    position: 'hero',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    clicks: 245,
    impressions: 5420,
    createdAt: '2024-01-10'
  },
  {
    id: '2',
    title: 'Imóveis em Erechim',
    description: 'Encontre sua casa dos sonhos em Erechim-RS',
    imageUrl: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20houses%20and%20apartments%20in%20small%20brazilian%20city&image_size=landscape_4_3',
    linkUrl: '/products?category=imoveis',
    position: 'sidebar',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    clicks: 89,
    impressions: 2150,
    createdAt: '2024-01-05'
  },
  {
    id: '3',
    title: 'Carros Seminovos',
    description: 'Veículos com garantia e financiamento facilitado',
    imageUrl: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=used%20cars%20dealership%20with%20quality%20vehicles&image_size=landscape_4_3',
    linkUrl: '/products?category=veiculos',
    position: 'category',
    status: 'scheduled',
    startDate: '2024-02-01',
    endDate: '2024-03-01',
    clicks: 0,
    impressions: 0,
    createdAt: '2024-01-20'
  }
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>(mockBanners);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const handleStatusToggle = (bannerId: string) => {
    setBanners(prev => prev.map(banner => 
      banner.id === bannerId 
        ? { ...banner, status: banner.status === 'active' ? 'inactive' : 'active' }
        : banner
    ));
    toast.success('Status do banner atualizado');
  };

  const handleDelete = (bannerId: string) => {
    if (confirm('Tem certeza que deseja excluir este banner?')) {
      setBanners(prev => prev.filter(banner => banner.id !== bannerId));
      toast.success('Banner excluído com sucesso');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      scheduled: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status === 'active' ? 'Ativo' : status === 'inactive' ? 'Inativo' : 'Agendado'}
      </span>
    );
  };

  const getPositionLabel = (position: string) => {
    const labels = {
      hero: 'Banner Principal',
      sidebar: 'Barra Lateral',
      footer: 'Rodapé',
      category: 'Categoria'
    };
    return labels[position as keyof typeof labels] || position;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Banners</h1>
            <p className="text-gray-600">Gerencie banners publicitários da plataforma</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Banner
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ImageIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Banners</p>
                <p className="text-2xl font-bold text-gray-900">{banners.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Banners Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {banners.filter(b => b.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ExternalLink className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Cliques</p>
                <p className="text-2xl font-bold text-gray-900">
                  {banners.reduce((sum, b) => sum + b.clicks, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Agendados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {banners.filter(b => b.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Banners Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Banner Image */}
              <div className="aspect-video bg-gray-100 relative">
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  {getStatusBadge(banner.status)}
                </div>
              </div>
              
              {/* Banner Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg">{banner.title}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {getPositionLabel(banner.position)}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{banner.description}</p>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cliques:</span>
                    <span className="font-medium ml-1">{banner.clicks}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Impressões:</span>
                    <span className="font-medium ml-1">{banner.impressions}</span>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="text-xs text-gray-500 mb-4">
                  <div>Início: {new Date(banner.startDate).toLocaleDateString('pt-BR')}</div>
                  <div>Fim: {new Date(banner.endDate).toLocaleDateString('pt-BR')}</div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingBanner(banner)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleStatusToggle(banner.id)}
                      className="text-green-600 hover:text-green-800 p-1"
                    >
                      {banner.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(banner.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {banner.status === 'active' && (
                    <div className="text-xs text-green-600 font-medium">
                      CTR: {banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(2) : 0}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {banners.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum banner encontrado</h3>
            <p className="text-gray-500 mb-4">Comece criando seu primeiro banner publicitário</p>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Banner
            </button>
          </div>
        )}

        {/* Form Modal Placeholder */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Novo Banner</h2>
              <p className="text-gray-600 mb-4">Formulário de criação de banner será implementado aqui.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}