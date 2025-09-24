import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  orderUpdates: boolean;
  promotionalEmails: boolean;
  weeklyNewsletter: boolean;
  priceDropAlerts: boolean;
}

interface PrivacySettings {
  profileVisibility: "public" | "private";
  showPurchaseHistory: boolean;
  allowRecommendations: boolean;
  shareDataWithPartners: boolean;
}

export default function BuyerSettings() {
  const { user, token, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("password");
  const [isLoading, setIsLoading] = useState(false);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    promotionalEmails: false,
    weeklyNewsletter: false,
    priceDropAlerts: true,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: "private",
    showPurchaseHistory: false,
    allowRecommendations: true,
    shareDataWithPartners: false,
  });

  // Delete Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "buyer") {
      window.location.href = "/";
      return;
    }

    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const settings = data.settings;

        // Mapear configurações para os estados locais
        setNotifications({
          emailNotifications: settings.emailNotifications ?? notifications.emailNotifications,
          smsNotifications: settings.smsNotifications ?? notifications.smsNotifications,
          orderUpdates: settings.orderUpdates ?? notifications.orderUpdates,
          promotionalEmails: settings.marketingEmails ?? notifications.promotionalEmails,
          weeklyNewsletter: settings.newsletter ?? notifications.weeklyNewsletter,
          priceDropAlerts: settings.promotions ?? notifications.priceDropAlerts,
        });

        setPrivacy({
          profileVisibility: settings.profileVisibility ?? privacy.profileVisibility,
          showPurchaseHistory: settings.showEmail ?? privacy.showPurchaseHistory,
          allowRecommendations: settings.showPhone ?? privacy.allowRecommendations,
          shareDataWithPartners: privacy.shareDataWithPartners, // Manter valor local
        });
      }
    } catch (error) {
      logger.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/users/password", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        alert("Senha alterada com sucesso!");
      } else {
        const error = await response.json();
        alert(error.message || "Erro ao alterar senha");
      }
    } catch (error) {
      logger.error("Error changing password:", error);
      alert("Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailNotifications: notifications.emailNotifications,
          smsNotifications: notifications.smsNotifications,
          orderUpdates: notifications.orderUpdates,
          marketingEmails: notifications.promotionalEmails,
          newsletter: notifications.weeklyNewsletter,
          promotions: notifications.priceDropAlerts,
        }),
      });

      if (response.ok) {
        alert("Configurações de notificação salvas!");
      }
    } catch (error) {
      logger.error("Error saving notifications:", error);
      alert("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacySave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileVisibility: privacy.profileVisibility,
          showEmail: privacy.showPurchaseHistory,
          showPhone: privacy.allowRecommendations,
        }),
      });

      if (response.ok) {
        alert("Configurações de privacidade salvas!");
      }
    } catch (error) {
      logger.error("Error saving privacy:", error);
      alert("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") {
      alert('Digite "EXCLUIR" para confirmar');
      return;
    }

    const password = prompt("Digite sua senha para confirmar a exclusão da conta:");
    if (!password) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        logout();
        window.location.href = "/";
      } else {
        alert("Erro ao excluir conta");
      }
    } catch (error) {
      logger.error("Error deleting account:", error);
      alert("Erro ao excluir conta");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.userType !== "buyer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "password", label: "Senha", icon: Lock },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "privacy", label: "Privacidade", icon: Shield },
    { id: "account", label: "Conta", icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
              <p className="text-gray-600">Gerencie suas preferências e configurações de conta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Password Tab */}
              {activeTab === "password" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Alterar Senha</h3>

                  <div className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Senha Atual</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          placeholder="Digite sua senha atual"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          placeholder="Digite sua nova senha"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          placeholder="Confirme sua nova senha"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      disabled={
                        isLoading ||
                        !passwordForm.currentPassword ||
                        !passwordForm.newPassword ||
                        !passwordForm.confirmPassword
                      }
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isLoading ? "Salvando..." : "Alterar Senha"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações de Notificação</h3>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Canais de Notificação</h4>

                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={notifications.emailNotifications}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, emailNotifications: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>Notificações por E-mail</span>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={notifications.smsNotifications}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, smsNotifications: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>Notificações por SMS</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Tipos de Notificação</h4>

                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span>Atualizações de Pedidos</span>
                          <input
                            type="checkbox"
                            checked={notifications.orderUpdates}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, orderUpdates: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>E-mails Promocionais</span>
                          <input
                            type="checkbox"
                            checked={notifications.promotionalEmails}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, promotionalEmails: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Newsletter Semanal</span>
                          <input
                            type="checkbox"
                            checked={notifications.weeklyNewsletter}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, weeklyNewsletter: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Alertas de Desconto</span>
                          <input
                            type="checkbox"
                            checked={notifications.priceDropAlerts}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, priceDropAlerts: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleNotificationSave}
                      disabled={isLoading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isLoading ? "Salvando..." : "Salvar Configurações"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === "privacy" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações de Privacidade</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Visibilidade do Perfil</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value="public"
                            checked={privacy.profileVisibility === "public"}
                            onChange={(e) =>
                              setPrivacy((prev) => ({
                                ...prev,
                                profileVisibility: e.target.value as "public" | "private",
                              }))
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Público - Outros usuários podem ver seu perfil</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value="private"
                            checked={privacy.profileVisibility === "private"}
                            onChange={(e) =>
                              setPrivacy((prev) => ({
                                ...prev,
                                profileVisibility: e.target.value as "public" | "private",
                              }))
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Privado - Apenas você pode ver seu perfil</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Compartilhamento de Dados</h4>

                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span>Mostrar histórico de compras</span>
                          <input
                            type="checkbox"
                            checked={privacy.showPurchaseHistory}
                            onChange={(e) => setPrivacy((prev) => ({ ...prev, showPurchaseHistory: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Permitir recomendações personalizadas</span>
                          <input
                            type="checkbox"
                            checked={privacy.allowRecommendations}
                            onChange={(e) =>
                              setPrivacy((prev) => ({ ...prev, allowRecommendations: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Compartilhar dados com parceiros</span>
                          <input
                            type="checkbox"
                            checked={privacy.shareDataWithPartners}
                            onChange={(e) =>
                              setPrivacy((prev) => ({ ...prev, shareDataWithPartners: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handlePrivacySave}
                      disabled={isLoading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isLoading ? "Salvando..." : "Salvar Configurações"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Gerenciar Conta</h3>

                  <div className="space-y-8">
                    {/* Account Info */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-800 mb-4">Informações da Conta</h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>E-mail:</strong> {user.email}
                        </p>
                        <p className="text-sm">
                          <strong>Nome:</strong> {user.name}
                        </p>
                        <p className="text-sm">
                          <strong>Tipo de Conta:</strong> Comprador
                        </p>
                        <p className="text-sm">
                          <strong>Membro desde:</strong>{" "}
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </p>
                      </div>
                    </div>

                    {/* Delete Account */}
                    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-800 mb-2">Excluir Conta</h4>
                          <p className="text-sm text-red-700 mb-4">
                            Esta ação é irreversível. Todos os seus dados, pedidos e histórico serão permanentemente
                            removidos.
                          </p>

                          {!showDeleteConfirm ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Excluir Minha Conta
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-red-800 mb-2">
                                  Digite "EXCLUIR" para confirmar:
                                </label>
                                <input
                                  type="text"
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  className="w-48 p-2 border border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                  placeholder="EXCLUIR"
                                />
                              </div>
                              <div className="space-x-3">
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={isLoading || deleteConfirmText !== "EXCLUIR"}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                  {isLoading ? "Excluindo..." : "Confirmar Exclusão"}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText("");
                                  }}
                                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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
