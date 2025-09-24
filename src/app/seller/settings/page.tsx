import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import {
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  CreditCard,
  Truck,
  DollarSign,
  Package,
  Settings as SettingsIcon,
  Save,
  AlertTriangle,
  Crown,
  Zap,
  Star,
} from "lucide-react";


interface ShippingSettings {
  freeShippingMinValue: number;
  shippingTime: {
    min: number;
    max: number;
  };
  shippingMethods: {
    correios: boolean;
    localDelivery: boolean;
    pickup: boolean;
  };
}

interface PaymentSettings {
  pixKey: string;
  bankAccount: {
    bank: string;
    agency: string;
    account: string;
    accountType: "checking" | "savings";
  };
  paymentMethods: {
    pix: boolean;
    boleto: boolean;
    creditCard: boolean;
  };
  freeShippingMinValue?: number;
}

interface NotificationSettings {
  newOrders: boolean;
  lowStock: boolean;
  paymentReceived: boolean;
  customerMessages: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
}

interface PlanInfo {
  current: {
    id?: string;
    name: string;
    price: number;
    features: string[];
    productsLimit?: number;
    photosPerProduct?: number;
    maxProducts?: number;
    maxPhotos?: number;
  } | null;
  usage: {
    productsUsed: number;
    photosUsed: number;
  };
}

// Plans will be loaded from API

export default function SellerSettings() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("payment");
  const [isLoading, setIsLoading] = useState(false);

  // Payment Settings
  const [payment, setPayment] = useState<PaymentSettings>({
    pixKey: "",
    bankAccount: {
      bank: "",
      agency: "",
      account: "",
      accountType: "checking",
    },
    paymentMethods: {
      pix: true,
      boleto: true,
      creditCard: false,
    },
  });

  // Shipping Settings
  const [shipping, setShipping] = useState<ShippingSettings>({
    freeShippingMinValue: 100,
    shippingTime: {
      min: 1,
      max: 3,
    },
    shippingMethods: {
      correios: true,
      localDelivery: false,
      pickup: true,
    },
  });

  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newOrders: true,
    lowStock: true,
    paymentReceived: true,
    customerMessages: true,
    weeklyReport: false,
    monthlyReport: true,
  });

  // Plans State
  const [plans, setPlans] = useState<any[]>([]);

  // Plan Info
  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    current: plans[0] || null,
    usage: {
      productsUsed: 3,
      photosUsed: 8,
    },
  });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "seller") {
      navigate("/");
      return;
    }

    loadSettings();
  }, [user]);

  // Atualizar planInfo quando plans são carregados
  useEffect(() => {
    if (plans.length > 0) {
      setPlanInfo((prev) => ({
        ...prev,
        current: prev.current || plans[0],
      }));
      loadUsageData();
    }
  }, [plans]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // Carregar planos primeiro
      await loadPlans();

      const response = await fetch("/api/seller/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          // Map backend format to frontend format
          setPayment({
            pixKey: data.pixKey || payment.pixKey,
            bankAccount: data.bankAccount || payment.bankAccount,
            paymentMethods: {
              pix: data.paymentMethods?.pix ?? payment.paymentMethods.pix,
              boleto: data.paymentMethods?.boleto ?? payment.paymentMethods.boleto,
              creditCard: data.paymentMethods?.creditCard ?? payment.paymentMethods.creditCard,
            },
          });
          setShipping({
            freeShippingMinValue: data.shippingOptions?.freeShippingMin ?? shipping.freeShippingMinValue,
            shippingTime: {
              min: data.shippingOptions?.deliveryDays ? Math.max(1, Math.floor(data.shippingOptions.deliveryDays / 2)) : shipping.shippingTime.min,
              max: data.shippingOptions?.deliveryDays ?? shipping.shippingTime.max,
            },
            shippingMethods: {
              correios: true, // Default enabled
              localDelivery: data.shippingOptions?.pickupAvailable ?? shipping.shippingMethods.localDelivery,
              pickup: data.shippingOptions?.pickupAvailable ?? shipping.shippingMethods.pickup,
            },
          });
          setNotifications({
            newOrders: data.notifications?.emailNotifications ?? notifications.newOrders,
            lowStock: notifications.lowStock,
            paymentReceived: data.notifications?.emailNotifications ?? notifications.paymentReceived,
            customerMessages: notifications.customerMessages,
            weeklyReport: notifications.weeklyReport,
            monthlyReport: notifications.monthlyReport,
          });
        }
      }
    } catch (error) {
      logger.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/seller/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethods: {
            pix: payment.paymentMethods.pix,
            creditCard: payment.paymentMethods.creditCard,
            debitCard: payment.paymentMethods.creditCard, // Map creditCard to debitCard for backend
            boleto: payment.paymentMethods.boleto,
          },
          // Add other payment fields if backend supports them
          pixKey: payment.pixKey,
          bankAccount: payment.bankAccount,
        }),
      });

      if (response.ok) {
        alert("Configurações de pagamento salvas!");
      }
    } catch (error) {
      logger.error("Error saving payment settings:", error);
      alert("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShippingSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/seller/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingOptions: {
            freeShippingMin: shipping.freeShippingMinValue,
            shippingFee: 10.0, // Default shipping fee
            deliveryDays: shipping.shippingTime.max,
            pickupAvailable: shipping.shippingMethods.pickup,
          },
        }),
      });

      if (response.ok) {
        alert("Configurações de envio salvas!");
      }
    } catch (error) {
      logger.error("Error saving shipping settings:", error);
      alert("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await fetch("/api/plans", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPlans(result.plans || []);
      }
    } catch (error) {
      logger.error("Erro ao carregar planos:", error);
    }
  };

  const loadUsageData = async () => {
    try {
      // Buscar dados reais de uso do vendedor
      const [productsRes, subscriptionRes] = await Promise.all([
        fetch("/api/seller/products", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/seller/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const productsData = productsRes.ok ? await productsRes.json() : { data: [] };
      const subData = subscriptionRes.ok ? await subscriptionRes.json() : null;

      if (subData?.success && subData.data && plans.length > 0) {
        const currentPlan = plans.find((p) => p.id === subData.data.planId) || plans[0];
        setPlanInfo({
          current: currentPlan,
          usage: {
            productsUsed: productsData.data?.length || 0,
            photosUsed: productsData.data?.reduce((acc, p) => acc + (p.images?.length || 0), 0) || 0,
          },
        });
      }
    } catch (error) {
      logger.error("Erro ao carregar dados de uso:", error);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/seller/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notifications: {
            emailNotifications: notifications.newOrders || notifications.paymentReceived,
            smsNotifications: false, // Not supported in frontend yet
          },
        }),
      });

      if (response.ok) {
        alert("Configurações de notificação salvas!");
      }
    } catch (error) {
      logger.error("Error saving notification settings:", error);
      alert("Erro ao salvar configurações");
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
      const response = await fetch("/api/users/change-password", {
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

  const handlePlanUpgrade = async (planId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/seller/upgrade", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const newPlan = plans.find((p) => p.id === planId);
          if (newPlan) {
            setPlanInfo((prev) => ({
              ...prev,
              current: newPlan,
            }));
            alert(result.message || "Plano atualizado com sucesso!");
          }
        } else {
          alert(result.error || "Erro ao atualizar plano");
        }
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || "Erro ao atualizar plano");
      }
    } catch (error) {
      logger.error("Error upgrading plan:", error);
      alert("Erro ao atualizar plano");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.userType !== "seller") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "payment", label: "Pagamento", icon: CreditCard },
    { id: "shipping", label: "Envio", icon: Truck },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "plan", label: "Plano", icon: Crown },
    { id: "security", label: "Segurança", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
              <p className="text-gray-600">Gerencie as configurações da sua loja</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {/* Payment Tab */}
              {activeTab === "payment" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações de Pagamento</h3>

                  <div className="space-y-8">
                    {/* Payment Methods */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Métodos de Pagamento Aceitos</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Zap className="h-5 w-5 text-purple-500" />
                            <span>PIX (Instantâneo)</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={payment.paymentMethods.pix}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                paymentMethods: { ...prev.paymentMethods, pix: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Package className="h-5 w-5 text-orange-500" />
                            <span>Boleto Bancário</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={payment.paymentMethods.boleto}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                paymentMethods: { ...prev.paymentMethods, boleto: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CreditCard className="h-5 w-5 text-green-500" />
                            <span>Cartão de Crédito</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={payment.paymentMethods.creditCard}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                paymentMethods: { ...prev.paymentMethods, creditCard: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    {/* PIX Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chave PIX</label>
                      <input
                        type="text"
                        value={payment.pixKey}
                        onChange={(e) => setPayment((prev) => ({ ...prev, pixKey: e.target.value }))}
                        className="w-full max-w-md p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="CPF, CNPJ, e-mail ou telefone"
                      />
                    </div>

                    {/* Bank Account */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Conta Bancária</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Banco</label>
                          <input
                            type="text"
                            value={payment.bankAccount.bank}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                bankAccount: { ...prev.bankAccount, bank: e.target.value },
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nome do banco"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Agência</label>
                          <input
                            type="text"
                            value={payment.bankAccount.agency}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                bankAccount: { ...prev.bankAccount, agency: e.target.value },
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Conta</label>
                          <input
                            type="text"
                            value={payment.bankAccount.account}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                bankAccount: { ...prev.bankAccount, account: e.target.value },
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="00000-0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tipo de Conta</label>
                          <select
                            value={payment.bankAccount.accountType}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                bankAccount: {
                                  ...prev.bankAccount,
                                  accountType: e.target.value as "checking" | "savings",
                                },
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="checking">Corrente</option>
                            <option value="savings">Poupança</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePaymentSave}
                      disabled={isLoading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isLoading ? "Salvando..." : "Salvar Configurações"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Shipping Tab */}
              {activeTab === "shipping" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações de Envio</h3>

                  <div className="space-y-8">
                    {/* Shipping Methods */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Métodos de Entrega</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span>Correios</span>
                          <input
                            type="checkbox"
                            checked={shipping.shippingMethods.correios}
                            onChange={(e) =>
                              setShipping((prev) => ({
                                ...prev,
                                shippingMethods: { ...prev.shippingMethods, correios: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Entrega Local</span>
                          <input
                            type="checkbox"
                            checked={shipping.shippingMethods.localDelivery}
                            onChange={(e) =>
                              setShipping((prev) => ({
                                ...prev,
                                shippingMethods: { ...prev.shippingMethods, localDelivery: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Retirada na Loja</span>
                          <input
                            type="checkbox"
                            checked={shipping.shippingMethods.pickup}
                            onChange={(e) =>
                              setShipping((prev) => ({
                                ...prev,
                                shippingMethods: { ...prev.shippingMethods, pickup: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Free Shipping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frete Grátis a partir de (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={shipping.freeShippingMinValue}
                        onChange={(e) =>
                          setShipping((prev) => ({ ...prev, freeShippingMinValue: Number(e.target.value) }))
                        }
                        className="w-full max-w-xs p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Shipping Time */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Prazo de Entrega (dias úteis)</h4>
                      <div className="flex items-center space-x-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Mínimo</label>
                          <input
                            type="number"
                            min="1"
                            value={shipping.shippingTime.min}
                            onChange={(e) =>
                              setShipping((prev) => ({
                                ...prev,
                                shippingTime: { ...prev.shippingTime, min: Number(e.target.value) },
                              }))
                            }
                            className="w-20 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <span className="text-gray-500 mt-6">a</span>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Máximo</label>
                          <input
                            type="number"
                            min="1"
                            value={shipping.shippingTime.max}
                            onChange={(e) =>
                              setShipping((prev) => ({
                                ...prev,
                                shippingTime: { ...prev.shippingTime, max: Number(e.target.value) },
                              }))
                            }
                            className="w-20 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <span className="text-gray-500 mt-6">dias úteis</span>
                      </div>
                    </div>

                    <button
                      onClick={handleShippingSave}
                      disabled={isLoading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isLoading ? "Salvando..." : "Salvar Configurações"}</span>
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
                      <h4 className="font-medium text-gray-800">Notificações de Vendas</h4>

                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span>Novos pedidos</span>
                          <input
                            type="checkbox"
                            checked={notifications.newOrders}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, newOrders: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Estoque baixo</span>
                          <input
                            type="checkbox"
                            checked={notifications.lowStock}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, lowStock: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Pagamento recebido</span>
                          <input
                            type="checkbox"
                            checked={notifications.paymentReceived}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, paymentReceived: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Mensagens de clientes</span>
                          <input
                            type="checkbox"
                            checked={notifications.customerMessages}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, customerMessages: e.target.checked }))
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Relatórios</h4>

                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span>Relatório semanal</span>
                          <input
                            type="checkbox"
                            checked={notifications.weeklyReport}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, weeklyReport: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Relatório mensal</span>
                          <input
                            type="checkbox"
                            checked={notifications.monthlyReport}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, monthlyReport: e.target.checked }))}
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

              {/* Plan Tab */}
              {activeTab === "plan" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Gerenciar Plano</h3>

                  <div className="space-y-8">
                    {/* Current Plan */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-blue-800">
                          Plano Atual: {planInfo.current?.name || "Carregando..."}
                        </h4>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            R$ {planInfo.current?.price?.toFixed(2) || "0.00"}
                          </p>
                          <p className="text-sm text-blue-600">/mês</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-blue-700 mb-1">Produtos Utilizados</p>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(planInfo.usage.productsUsed / (planInfo.current?.maxProducts || planInfo.current?.productsLimit || 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {planInfo.usage.productsUsed} de{" "}
                            {(planInfo.current?.maxProducts || planInfo.current?.productsLimit) === 999999 ? "∞" : (planInfo.current?.maxProducts || planInfo.current?.productsLimit)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-blue-700 mb-1">Fotos Utilizadas</p>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(planInfo.usage.photosUsed / ((planInfo.current?.maxPhotos || planInfo.current?.photosPerProduct || 1) * (planInfo.current?.maxProducts || planInfo.current?.productsLimit || 1))) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">{planInfo.usage.photosUsed} fotos utilizadas</p>
                        </div>
                      </div>

                      <ul className="text-sm text-blue-700">
                        {(Array.isArray(planInfo.current?.features)
                          ? planInfo.current.features
                          : typeof planInfo.current?.features === 'string'
                            ? (() => {
                                try {
                                  return JSON.parse(planInfo.current.features || '[]');
                                } catch {
                                  return [];
                                }
                              })()
                            : []
                        ).map((feature, index) => (
                          <li key={index} className="flex items-center mb-1">
                            <Star className="h-3 w-3 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Available Plans */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Planos Disponíveis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`border rounded-lg p-4 relative ${
                              plan.id === planInfo.current?.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            } ${plan.popular ? "ring-2 ring-yellow-400" : ""}`}
                          >
                            {plan.popular && (
                              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                <span className="bg-yellow-400 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                                  Mais Popular
                                </span>
                              </div>
                            )}

                            <div className="text-center mb-4">
                              <h5 className="font-medium text-gray-900">{plan.name}</h5>
                              <div className="mt-2">
                                <span className="text-2xl font-bold">R$ {plan.price.toFixed(2)}</span>
                                <span className="text-gray-600">/mês</span>
                              </div>
                            </div>

                            <ul className="text-sm text-gray-600 mb-4 space-y-1">
                              {(Array.isArray(plan.features)
                                ? plan.features
                                : typeof plan.features === 'string'
                                  ? (() => {
                                      try {
                                        return JSON.parse(plan.features || '[]');
                                      } catch {
                                        return [];
                                      }
                                    })()
                                  : []
                              ).map((feature, index) => (
                                <li key={index} className="flex items-center">
                                  <Star className="h-3 w-3 mr-2 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>

                            {plan.id !== planInfo.current?.id && (
                              <button
                                onClick={() => handlePlanUpgrade(plan.id)}
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {plan.price > (planInfo.current?.price || 0) ? "Fazer Upgrade" : "Escolher Plano"}
                              </button>
                            )}

                            {plan.id === planInfo.current?.id && (
                              <div className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded text-center">
                                Plano Atual
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Segurança</h3>

                  <div className="space-y-8">
                    {/* Password Change */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Alterar Senha</h4>
                      <div className="space-y-4 max-w-md">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Senha Atual</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                              }
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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
                          <label className="block text-sm text-gray-600 mb-1">Nova Senha</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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
                          <label className="block text-sm text-gray-600 mb-1">Confirmar Nova Senha</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                              }
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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

                    {/* Account Info */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-800 mb-4">Informações da Conta</h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>E-mail:</strong> {user.email}
                        </p>
                        <p className="text-sm">
                          <strong>Nome:</strong> {user?.name || "Não informado"}
                        </p>
                        <p className="text-sm">
                          <strong>Tipo de Conta:</strong> Vendedor
                        </p>
                        <p className="text-sm">
                          <strong>Membro desde:</strong>{" "}
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </p>
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
