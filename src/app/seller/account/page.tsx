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
}

export default function SellerAccountPage() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuthStore();
  const [accountData, setAccountData] = useState<SellerAccountData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Estados para modal de alteração de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Estados para validação do formulário de informações pessoais
  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
  });

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
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateProfileForm = (): boolean => {
    if (!accountData) return false;

    const errors = {
      name: "",
      email: "",
      phone: "",
      city: "",
      state: "",
    };

    let isValid = true;

    // Validar nome
    if (!accountData.name || accountData.name.trim().length === 0) {
      errors.name = "Nome é obrigatório";
      isValid = false;
    } else if (accountData.name.trim().length < 3) {
      errors.name = "Nome deve ter no mínimo 3 caracteres";
      isValid = false;
    }

    // Validar email
    if (!accountData.email || accountData.email.trim().length === 0) {
      errors.email = "E-mail é obrigatório";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountData.email)) {
      errors.email = "E-mail inválido";
      isValid = false;
    }

    // Validar telefone
    if (!accountData.phone || accountData.phone.trim().length === 0) {
      errors.phone = "Telefone é obrigatório";
      isValid = false;
    }

    // Validar cidade
    if (!accountData.city || accountData.city.trim().length === 0) {
      errors.city = "Cidade é obrigatória";
      isValid = false;
    }

    // Validar estado
    if (!accountData.state || accountData.state.trim().length === 0) {
      errors.state = "Estado é obrigatório";
      isValid = false;
    } else if (accountData.state.length > 2) {
      errors.state = "Estado deve ter no máximo 2 caracteres";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSaveAccount = async () => {
    if (!accountData) return;

    // Validar formulário antes de salvar
    if (!validateProfileForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

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
        setFormErrors({
          name: "",
          email: "",
          phone: "",
          city: "",
          state: "",
        });
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

    // Limpar erro do campo ao digitar
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [field]: "",
      });
    }

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

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm({ ...passwordForm, [field]: value });
    setPasswordErrors({ ...passwordErrors, [field]: "" });
  };

  const validatePasswordForm = (): boolean => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    let isValid = true;

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Senha atual é obrigatória";
      isValid = false;
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "Nova senha é obrigatória";
      isValid = false;
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "A senha deve ter no mínimo 8 caracteres";
      isValid = false;
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = "A nova senha deve ser diferente da atual";
      isValid = false;
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Confirmação de senha é obrigatória";
      isValid = false;
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "As senhas não coincidem";
      isValid = false;
    }

    setPasswordErrors(errors);
    return isValid;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await fetch(buildApiUrl("/api/users/change-password"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Senha alterada com sucesso!");
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordErrors({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        if (response.status === 401) {
          setPasswordErrors({
            ...passwordErrors,
            currentPassword: "Senha atual incorreta",
          });
        } else {
          toast.error(data.error || "Erro ao alterar senha. Tente novamente.");
        }
      }
    } catch (error) {
      logger.error("Error changing password:", error);
      toast.error("Erro interno. Tente novamente mais tarde.");
    } finally {
      setIsChangingPassword(false);
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
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.name ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
                      <input
                        type="email"
                        value={accountData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.email ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                      <input
                        type="tel"
                        value={accountData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.phone ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
                      )}
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
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.city ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {formErrors.city && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
                      <input
                        type="text"
                        value={accountData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.state ? "border-red-500" : "border-gray-300"
                        }`}
                        maxLength={2}
                      />
                      {formErrors.state && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.state}</p>
                      )}
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
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Alterar
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

      {/* Modal de Alteração de Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Alterar Senha</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setPasswordErrors({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Senha Atual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Atual <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    passwordErrors.currentPassword ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Digite sua senha atual"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-500 mt-1">{passwordErrors.currentPassword}</p>
                )}
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    passwordErrors.newPassword ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Digite sua nova senha (mín. 8 caracteres)"
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-500 mt-1">{passwordErrors.newPassword}</p>
                )}
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    passwordErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Digite novamente a nova senha"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setPasswordErrors({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                disabled={isChangingPassword}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isChangingPassword ? "Salvando..." : "Salvar Nova Senha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
