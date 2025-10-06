import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/config/api";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { User, Mail, Phone, MapPin, Calendar, Camera, Save, Edit3, Shield, Key, Bell, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface SellerAccountData {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  avatar?: string;
  bio?: string;
  cpf?: string;
  birthDate?: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    showProfile: boolean;
    showContact: boolean;
  };
}

export default function SellerAccountPage() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuthStore();
  const [accountData, setAccountData] = useState<SellerAccountData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "seller") {
      navigate("/login");
      return;
    }

    loadAccountData();
  }, [user, navigate]);

  const loadAccountData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(buildApiUrl("/api/account/profile"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccountData(data.profile);
      } else {
        // Se não encontrar dados, use dados do usuário logado
        setAccountData({
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          city: user.city || "",
          state: user.state || "",
          avatar: user.avatar,
          bio: "",
          cpf: "",
          birthDate: "",
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
          privacy: {
            showProfile: true,
            showContact: false,
          },
        });
      }
    } catch (error) {
      logger.error("Error loading account data:", error);
      // Usar dados do usuário como fallback
      setAccountData({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        city: user?.city || "",
        state: user?.state || "",
        avatar: user?.avatar,
        bio: "",
        cpf: "",
        birthDate: "",
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        privacy: {
          showProfile: true,
          showContact: false,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountData) return;

    try {
      setIsSaving(true);
      const response = await fetch(buildApiUrl("/api/account/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountData),
      });

      if (response.ok) {
        const updatedData = await response.json();

        // Atualizar dados do usuário no store
        updateUser({
          ...user,
          name: accountData.name,
          phone: accountData.phone,
          city: accountData.city,
          state: accountData.state,
          avatar: accountData.avatar,
        });

        setIsEditing(false);
        toast.success("Dados atualizados com sucesso!");
      } else {
        toast.error("Erro ao salvar dados. Tente novamente.");
      }
    } catch (error) {
      logger.error("Error saving account data:", error);
      toast.error("Erro interno. Tente novamente mais tarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (!accountData) return;

    if (field.includes(".")) {
      const [section, key] = field.split(".");
      setAccountData({
        ...accountData,
        [section]: {
          ...accountData[section],
          [key]: value,
        },
      });
    } else {
      setAccountData({
        ...accountData,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Erro ao carregar dados</h2>
          <p className="text-gray-600 mt-2">Não foi possível carregar suas informações.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Informações Pessoais", icon: User },
    { id: "security", label: "Segurança", icon: Shield },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "privacy", label: "Privacidade", icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
              <p className="text-gray-600">Gerencie suas informações pessoais e preferências</p>
            </div>
            <div className="flex items-center space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveAccount}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? "Salvando..." : "Salvar"}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Editar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar com tabs */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo principal */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tab: Informações Pessoais */}
              {activeTab === "profile" && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Informações Pessoais</h3>

                  {/* Avatar */}
                  <div className="mb-8">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        {accountData.avatar ? (
                          <img
                            src={accountData.avatar}
                            alt={accountData.name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        {isEditing && (
                          <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors">
                            <Camera className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{accountData.name}</h4>
                        <p className="text-sm text-gray-600">Vendedor verificado</p>
                      </div>
                    </div>
                  </div>

                  {/* Campos do formulário */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                      <input
                        type="text"
                        value={accountData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
                      <input
                        type="email"
                        value={accountData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                      <input
                        type="tel"
                        value={accountData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                      <input
                        type="text"
                        value={accountData.cpf || ""}
                        onChange={(e) => handleInputChange("cpf", e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
                      <input
                        type="text"
                        value={accountData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
                      <input
                        type="text"
                        value={accountData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                      <textarea
                        value={accountData.bio || ""}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                        disabled={!isEditing}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="Conte um pouco sobre você..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Notificações */}
              {activeTab === "notifications" && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Preferências de Notificação</h3>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Notificações por E-mail</h4>
                        <p className="text-sm text-gray-600">Receba notificações importantes por e-mail</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={accountData.notifications.email}
                        onChange={(e) => handleInputChange("notifications.email", e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Notificações Push</h4>
                        <p className="text-sm text-gray-600">Receba notificações no navegador</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={accountData.notifications.push}
                        onChange={(e) => handleInputChange("notifications.push", e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">SMS</h4>
                        <p className="text-sm text-gray-600">Receba notificações urgentes por SMS</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={accountData.notifications.sms}
                        onChange={(e) => handleInputChange("notifications.sms", e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Privacidade */}
              {activeTab === "privacy" && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações de Privacidade</h3>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Perfil Público</h4>
                        <p className="text-sm text-gray-600">Permitir que outros vejam seu perfil</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={accountData.privacy.showProfile}
                        onChange={(e) => handleInputChange("privacy.showProfile", e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Mostrar Informações de Contato</h4>
                        <p className="text-sm text-gray-600">Exibir telefone e e-mail publicamente</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={accountData.privacy.showContact}
                        onChange={(e) => handleInputChange("privacy.showContact", e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Segurança */}
              {activeTab === "security" && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Segurança da Conta</h3>

                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Alterar Senha</h4>
                          <p className="text-sm text-gray-600">Recomendamos trocar sua senha periodicamente</p>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Alterar
                        </button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Autenticação de Dois Fatores</h4>
                          <p className="text-sm text-gray-600">Adicione uma camada extra de segurança</p>
                        </div>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          Configurar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
