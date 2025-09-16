"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import {
  Store,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Save,
  Edit3,
  Star,
  Clock,
  Globe,
  Facebook,
  Instagram,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

interface StoreProfile {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  owner: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    email: string;
    whatsapp?: string;
    website?: string;
  };
  social: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  businessHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  policies: {
    returnPolicy: string;
    shippingPolicy: string;
    termsOfService: string;
  };
  images: {
    logo?: string;
    banner?: string;
    gallery: string[];
  };
  stats: {
    rating: number;
    reviewCount: number;
    totalSales: number;
    memberSince: string;
  };
}

const daysOfWeek = [
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export default function SellerProfile() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "seller") {
      navigate("/login");
      return;
    }

    loadStoreProfile();
  }, [user, navigate]);

  const loadStoreProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stores/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        console.error("Error loading store profile");
      }
    } catch (error) {
      console.error("Error loading store profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/stores/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving store profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (type: "logo" | "banner", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("type", type);

      const response = await fetch("/api/stores/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                images: {
                  ...prev.images,
                  [type]: data.imageUrl,
                },
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "Informações Básicas" },
    { id: "contact", label: "Contato" },
    { id: "hours", label: "Horário de Funcionamento" },
    { id: "policies", label: "Políticas" },
    { id: "images", label: "Imagens" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Perfil da Loja</h1>
              <p className="text-gray-600">Gerencie as informações da sua loja</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => (window.location.href = `/loja/${profile?.slug || "minha-loja"}`)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <Globe className="h-4 w-4" />
                <span>Ver loja pública</span>
              </button>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Store Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">Estatísticas</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-2" />
                    <span className="text-sm text-gray-600">Avaliação</span>
                  </div>
                  <span className="font-medium">{profile?.stats.rating || 0}/5.0</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avaliações</span>
                  <span className="font-medium">{profile?.stats.reviewCount || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vendas</span>
                  <span className="font-medium">{profile?.stats.totalSales || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Desde</span>
                  </div>
                  <span className="font-medium text-sm">
                    {profile?.stats.memberSince ? new Date(profile.stats.memberSince).getFullYear() : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Basic Information Tab */}
              {activeTab === "basic" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Informações Básicas</h3>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Store className="h-4 w-4 inline mr-2" />
                          Nome da Loja
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                        {isEditing ? (
                          <select
                            value={profile?.category || ""}
                            onChange={(e) =>
                              setProfile((prev) => (prev ? { ...prev, category: e.target.value } : null))
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione uma categoria</option>
                            <option value="Eletrônicos">Eletrônicos</option>
                            <option value="Roupas">Roupas</option>
                            <option value="Casa e Jardim">Casa e Jardim</option>
                            <option value="Esportes">Esportes</option>
                            <option value="Livros">Livros</option>
                            <option value="Outros">Outros</option>
                          </select>
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{profile?.category}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descrição da Loja</label>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={profile?.description || ""}
                          onChange={(e) =>
                            setProfile((prev) => (prev ? { ...prev, description: e.target.value } : null))
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Descreva sua loja e produtos..."
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg min-h-[100px]">{profile?.description}</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Endereço</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Rua</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profile?.address.street || ""}
                              onChange={(e) =>
                                setProfile((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        address: { ...prev.address, street: e.target.value },
                                      }
                                    : null
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded text-sm">{profile?.address.street}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Número</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profile?.address.number || ""}
                              onChange={(e) =>
                                setProfile((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        address: { ...prev.address, number: e.target.value },
                                      }
                                    : null
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded text-sm">{profile?.address.number}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Cidade</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profile?.address.city || ""}
                              onChange={(e) =>
                                setProfile((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        address: { ...prev.address, city: e.target.value },
                                      }
                                    : null
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded text-sm">{profile?.address.city}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Estado</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profile?.address.state || ""}
                              onChange={(e) =>
                                setProfile((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        address: { ...prev.address, state: e.target.value },
                                      }
                                    : null
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded text-sm">{profile?.address.state}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === "contact" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Informações de Contato</h3>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="h-4 w-4 inline mr-2" />
                          Telefone
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={profile?.contact.phone || ""}
                            onChange={(e) =>
                              setProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      contact: { ...prev.contact, phone: e.target.value },
                                    }
                                  : null
                              )
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{profile?.contact.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="h-4 w-4 inline mr-2" />
                          E-mail
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={profile?.contact.email || ""}
                            onChange={(e) =>
                              setProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      contact: { ...prev.contact, email: e.target.value },
                                    }
                                  : null
                              )
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{profile?.contact.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={profile?.contact.whatsapp || ""}
                            onChange={(e) =>
                              setProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      contact: { ...prev.contact, whatsapp: e.target.value },
                                    }
                                  : null
                              )
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{profile?.contact.whatsapp || "-"}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Globe className="h-4 w-4 inline mr-2" />
                          Website
                        </label>
                        {isEditing ? (
                          <input
                            type="url"
                            value={profile?.contact.website || ""}
                            onChange={(e) =>
                              setProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      contact: { ...prev.contact, website: e.target.value },
                                    }
                                  : null
                              )
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{profile?.contact.website || "-"}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Redes Sociais</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">
                            <Facebook className="h-4 w-4 inline mr-2" />
                            Facebook
                          </label>
                          {isEditing ? (
                            <input
                              type="url"
                              value={profile?.social.facebook || ""}
                              onChange={(e) =>
                                setProfile((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        social: { ...prev.social, facebook: e.target.value },
                                      }
                                    : null
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="https://facebook.com/sua-loja"
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded text-sm">{profile?.social.facebook || "-"}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-2">
                            <Instagram className="h-4 w-4 inline mr-2" />
                            Instagram
                          </label>
                          {isEditing ? (
                            <input
                              type="url"
                              value={profile?.social.instagram || ""}
                              onChange={(e) =>
                                setProfile((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        social: { ...prev.social, instagram: e.target.value },
                                      }
                                    : null
                                )
                              }
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="https://instagram.com/sua-loja"
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded text-sm">{profile?.social.instagram || "-"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Hours Tab */}
              {activeTab === "hours" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Horário de Funcionamento</h3>

                  <div className="space-y-4">
                    {daysOfWeek.map((day) => (
                      <div
                        key={day.key}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 w-24">{day.label}</span>
                        </div>

                        <div className="flex items-center space-x-4">
                          {isEditing && (
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={
                                  profile?.businessHours[day.key as keyof typeof profile.businessHours]?.closed || false
                                }
                                onChange={(e) =>
                                  setProfile((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          businessHours: {
                                            ...prev.businessHours,
                                            [day.key]: {
                                              ...prev.businessHours[day.key as keyof typeof prev.businessHours],
                                              closed: e.target.checked,
                                            },
                                          },
                                        }
                                      : null
                                  )
                                }
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm text-red-600">Fechado</span>
                            </label>
                          )}

                          {!profile?.businessHours[day.key as keyof typeof profile.businessHours]?.closed && (
                            <div className="flex items-center space-x-2">
                              {isEditing ? (
                                <>
                                  <input
                                    type="time"
                                    value={
                                      profile?.businessHours[day.key as keyof typeof profile.businessHours]?.open ||
                                      "09:00"
                                    }
                                    onChange={(e) =>
                                      setProfile((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              businessHours: {
                                                ...prev.businessHours,
                                                [day.key]: {
                                                  ...prev.businessHours[day.key as keyof typeof prev.businessHours],
                                                  open: e.target.value,
                                                },
                                              },
                                            }
                                          : null
                                      )
                                    }
                                    className="p-1 border border-gray-300 rounded text-sm"
                                  />
                                  <span className="text-gray-500">às</span>
                                  <input
                                    type="time"
                                    value={
                                      profile?.businessHours[day.key as keyof typeof profile.businessHours]?.close ||
                                      "18:00"
                                    }
                                    onChange={(e) =>
                                      setProfile((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              businessHours: {
                                                ...prev.businessHours,
                                                [day.key]: {
                                                  ...prev.businessHours[day.key as keyof typeof prev.businessHours],
                                                  close: e.target.value,
                                                },
                                              },
                                            }
                                          : null
                                      )
                                    }
                                    className="p-1 border border-gray-300 rounded text-sm"
                                  />
                                </>
                              ) : (
                                <span className="text-sm text-gray-600">
                                  {profile?.businessHours[day.key as keyof typeof profile.businessHours]?.closed
                                    ? "Fechado"
                                    : `${profile?.businessHours[day.key as keyof typeof profile.businessHours]?.open || "09:00"} às ${profile?.businessHours[day.key as keyof typeof profile.businessHours]?.close || "18:00"}`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies Tab */}
              {activeTab === "policies" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Políticas da Loja</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Política de Troca e Devolução
                      </label>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={profile?.policies.returnPolicy || ""}
                          onChange={(e) =>
                            setProfile((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    policies: { ...prev.policies, returnPolicy: e.target.value },
                                  }
                                : null
                            )
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Descreva sua política de troca e devolução..."
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg min-h-[100px]">
                          {profile?.policies.returnPolicy || "Não definida"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Política de Envio</label>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={profile?.policies.shippingPolicy || ""}
                          onChange={(e) =>
                            setProfile((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    policies: { ...prev.policies, shippingPolicy: e.target.value },
                                  }
                                : null
                            )
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Descreva sua política de envio..."
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg min-h-[100px]">
                          {profile?.policies.shippingPolicy || "Não definida"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Termos de Serviço</label>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={profile?.policies.termsOfService || ""}
                          onChange={(e) =>
                            setProfile((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    policies: { ...prev.policies, termsOfService: e.target.value },
                                  }
                                : null
                            )
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Descreva seus termos de serviço..."
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg min-h-[100px]">
                          {profile?.policies.termsOfService || "Não definidos"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Images Tab */}
              {activeTab === "images" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Imagens da Loja</h3>

                  <div className="space-y-8">
                    {/* Logo */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Logo da Loja</h4>
                      <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {profile?.images.logo ? (
                            <img src={profile.images.logo} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Store className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        {isEditing && (
                          <div>
                            <label className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                              <Upload className="h-4 w-4" />
                              <span>Alterar Logo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload("logo", e)}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG até 2MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Banner */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Banner da Loja</h4>
                      <div className="space-y-4">
                        <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {profile?.images.banner ? (
                            <img src={profile.images.banner} alt="Banner" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-16 w-16 text-gray-400" />
                          )}
                        </div>
                        {isEditing && (
                          <div>
                            <label className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                              <Upload className="h-4 w-4" />
                              <span>Alterar Banner</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload("banner", e)}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB - Recomendado: 1200x400px</p>
                          </div>
                        )}
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
