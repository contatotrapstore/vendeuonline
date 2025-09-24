import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { Save, Upload, MapPin, Clock, Phone, Mail, Globe, Camera, Star, Shield, Truck } from "lucide-react";
import { toast } from "sonner";
import { get, put } from "@/lib/api-client";

interface StoreSettings {
  id?: string;
  name: string;
  description: string;
  logo: string;
  banner: string;
  category: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    website: string;
  };
}

const initialSettings: StoreSettings = {
  name: "",
  description: "",
  logo: "",
  banner: "",
  category: "eletronicos",
  address: {
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  },
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
  },
};

const categories = [
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "roupas", label: "Roupas e Acessórios" },
  { value: "casa", label: "Casa e Jardim" },
  { value: "veiculos", label: "Veículos" },
  { value: "imoveis", label: "Imóveis" },
  { value: "servicos", label: "Serviços" },
  { value: "emprego", label: "Emprego" },
  { value: "moveis", label: "Móveis" },
];

export default function SellerStorePage() {
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Função para buscar dados da loja
  const fetchStoreData = async () => {
    try {
      const data = await get("/api/seller/store");
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (error: any) {
      logger.error("Erro ao carregar dados da loja:", error);
      toast.error("Erro ao carregar dados da loja: " + error.message);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchStoreData();
  }, []);

  // Função para salvar alterações
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const data = await put("/api/seller/store", settings);
      
      if (data.success) {
        toast.success("Configurações salvas com sucesso!");
        // Atualizar o estado com os dados retornados
        if (data.data) {
          setSettings(data.data);
        }
      }
    } catch (error: any) {
      logger.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para fazer upload de imagem
  const handleImageUpload = async (file: File, type: "store-logo" | "store-banner") => {
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        toast.error("Token de autenticação não encontrado");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro no upload");
      }

      const data = await response.json();
      if (data.success && data.url) {
        // Atualizar a URL da imagem no estado
        if (type === "store-logo") {
          updateSettings("logo", data.url);
        } else {
          updateSettings("banner", data.url);
        }
        toast.success("Imagem enviada com sucesso!");
      }
    } catch (error: any) {
      logger.error("Erro no upload:", error);
      toast.error("Erro no upload: " + error.message);
    }
  };

  // Função para aplicar máscara de telefone
  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  // Função para aplicar máscara de CEP
  const maskCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const updateSettings = (path: string, value: any) => {
    // Aplicar máscaras conforme o campo
    if (path.includes('phone') || path.includes('whatsapp')) {
      value = maskPhone(value);
    } else if (path.includes('zipCode')) {
      value = maskCEP(value);
    }

    setSettings((prev) => {
      const keys = path.split(".");
      const newSettings = { ...prev };
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const tabs = [
    { id: "general", label: "Geral", icon: <Globe className="h-4 w-4" /> },
    { id: "contact", label: "Contato", icon: <Phone className="h-4 w-4" /> },
  ];

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados da loja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações da Loja</h1>
            <p className="text-gray-600">Gerencie as informações e configurações da sua loja</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>

        {/* Store Preview Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview da Loja</h3>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-gray-50">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo da loja" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">{settings.name || "Nome da Loja"}</h4>
              <p className="text-gray-600 mb-2">{settings.description || "Descrição da loja"}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {settings.address.city && settings.address.state 
                      ? `${settings.address.city}, ${settings.address.state}`
                      : "Cidade, Estado"
                    }
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Nova loja</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* General Tab */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Loja</label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => updateSettings("name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o nome da sua loja"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria Principal</label>
                    <select
                      value={settings.category}
                      onChange={(e) => updateSettings("category", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição da Loja</label>
                  <textarea
                    value={settings.description}
                    onChange={(e) => updateSettings("description", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descreva sua loja, produtos e diferenciais"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo da Loja</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-gray-50">
                        {settings.logo ? (
                          <img src={settings.logo} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                        ) : (
                          <Camera className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "store-logo");
                        }}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                        Alterar Logo
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banner da Loja</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-12 rounded border flex items-center justify-center bg-gray-50">
                        {settings.banner ? (
                          <img src={settings.banner} alt="Banner" className="w-24 h-12 rounded object-cover" />
                        ) : (
                          <Camera className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "store-banner");
                        }}
                        className="hidden"
                        id="banner-upload"
                      />
                      <label
                        htmlFor="banner-upload"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <Camera className="h-4 w-4" />
                        Alterar Banner
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === "contact" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={settings.contact.phone}
                      onChange={(e) => updateSettings("contact.phone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={settings.contact.whatsapp}
                      onChange={(e) => updateSettings("contact.whatsapp", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                    <input
                      type="email"
                      value={settings.contact.email}
                      onChange={(e) => updateSettings("contact.email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contato@loja.com"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">E-mail da conta (não pode ser alterado)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={settings.contact.website}
                      onChange={(e) => updateSettings("contact.website", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://www.minhaoja.com"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rua</label>
                      <input
                        type="text"
                        value={settings.address.street}
                        onChange={(e) => updateSettings("address.street", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Rua das Flores"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                      <input
                        type="text"
                        value={settings.address.number}
                        onChange={(e) => updateSettings("address.number", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                      <input
                        type="text"
                        value={settings.address.neighborhood}
                        onChange={(e) => updateSettings("address.neighborhood", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Centro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                      <input
                        type="text"
                        value={settings.address.city}
                        onChange={(e) => updateSettings("address.city", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="São Paulo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                      <input
                        type="text"
                        value={settings.address.state}
                        onChange={(e) => updateSettings("address.state", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="SP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                      <input
                        type="text"
                        value={settings.address.zipCode}
                        onChange={(e) => updateSettings("address.zipCode", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="01234-567"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}