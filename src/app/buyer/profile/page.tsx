"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { User, Mail, Phone, MapPin, Calendar, Camera, Save, Edit3, Package, Heart, ShoppingCart } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  avatar?: string;
  createdAt: string;
  addresses: Address[];
  stats: {
    totalOrders: number;
    favoriteProducts: number;
    totalSpent: number;
  };
}

interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export default function BuyerProfile() {
  const { user, token } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "buyer") {
      window.location.href = "/";
      return;
    }

    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);

      // Buscar perfil e estatísticas em paralelo
      const [profileResponse, statsResponse] = await Promise.all([
        fetch("/api/users/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/users/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();

        // Adicionar estatísticas reais se disponíveis
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          profileData.profile.stats = {
            totalOrders: statsData.stats.totalOrders,
            favoriteProducts: statsData.stats.favoriteProducts,
            totalSpent: statsData.stats.totalSpent,
          };
        }

        setProfile(profileData.profile);
      } else {
        console.error("Error loading profile");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          city: profile.city,
          state: profile.state,
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        // Atualizar dados do usuário no store
        // useAuthStore.getState().updateUser({
        //   name: profile.name,
        //   phone: profile.phone,
        //   city: profile.city,
        //   state: profile.state
        // });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/users/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => (prev ? { ...prev, avatar: data.avatarUrl } : null));
      } else {
        const errorData = await response.json();
        console.error("Erro no upload:", errorData.error);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
  };

  if (!user || user.userType !== "buyer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
              <p className="text-gray-600">Gerencie suas informações pessoais</p>
            </div>
            <div className="flex items-center space-x-4">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Editar</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? "Salvando..." : "Salvar"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Informações Pessoais</h3>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700">
                        <Camera className="h-3 w-3" />
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Foto do perfil</p>
                    <p className="text-xs text-gray-500">JPG, PNG até 5MB</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Nome completo
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile?.name || ""}
                        onChange={(e) => setProfile((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg">{profile?.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      E-mail
                    </label>
                    <p className="p-3 bg-gray-50 rounded-lg text-gray-600">{profile?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">E-mail não pode ser alterado</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Telefone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profile?.phone || ""}
                        onChange={(e) => setProfile((prev) => (prev ? { ...prev, phone: e.target.value } : null))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(00) 00000-0000"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg">{profile?.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Cidade
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile?.city || ""}
                        onChange={(e) => setProfile((prev) => (prev ? { ...prev, city: e.target.value } : null))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg">{profile?.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile?.state || ""}
                        onChange={(e) => setProfile((prev) => (prev ? { ...prev, state: e.target.value } : null))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg">{profile?.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Membro desde
                    </label>
                    <p className="p-3 bg-gray-50 rounded-lg">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses Section */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Endereços Salvos</h3>
                <button className="text-blue-600 hover:text-blue-700 font-medium">+ Adicionar endereço</button>
              </div>

              {profile?.addresses && profile.addresses.length > 0 ? (
                <div className="space-y-4">
                  {profile.addresses.map((address) => (
                    <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{address.label}</h4>
                        {address.isDefault && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Padrão</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {address.street}, {address.number}
                        {address.complement && `, ${address.complement}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.neighborhood}, {address.city} - {address.state}
                      </p>
                      <p className="text-sm text-gray-600">CEP: {address.zipCode}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum endereço cadastrado</p>
                  <button className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
                    Adicionar primeiro endereço
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Estatísticas</h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Pedidos</p>
                    <p className="font-medium">{profile?.stats.totalOrders || 0}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Heart className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Produtos Favoritos</p>
                    <p className="font-medium">{profile?.stats.favoriteProducts || 0}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Gasto</p>
                    <p className="font-medium">
                      R$ {(profile?.stats.totalSpent || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Ações Rápidas</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => (window.location.href = "/buyer/orders")}
                    className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Ver meus pedidos
                  </button>
                  <button
                    onClick={() => (window.location.href = "/buyer/wishlist")}
                    className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Lista de desejos
                  </button>
                  <button
                    onClick={() => (window.location.href = "/buyer/settings")}
                    className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
