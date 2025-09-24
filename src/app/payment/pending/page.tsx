import { logger } from "@/lib/logger";

"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, RefreshCw, Copy, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface PaymentStatus {
  subscription: {
    id: string;
    status: string;
    plan: {
      name: string;
      price: number;
    };
  };
  payment: {
    id: string;
    status: string;
    payment_method_id: string;
    transaction_amount: number;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    };
  } | null;
}

export default function PaymentPendingPage() {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const paymentId = searchParams.get("payment_id");
  const externalReference = searchParams.get("external_reference");

  useEffect(() => {
    if (paymentId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  // Auto-check a cada 10 segundos
  useEffect(() => {
    if (!autoCheck || !paymentId) return;

    const interval = setInterval(() => {
      checkPaymentStatus(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoCheck, paymentId]);

  const checkPaymentStatus = async (silent = false) => {
    if (!silent) setChecking(true);

    try {
      const response = await fetch(`/api/payments/status?payment_id=${paymentId}`);

      if (response.ok) {
        const data = await response.json();
        setPaymentStatus(data);

        // Se o pagamento foi aprovado, redirecionar para sucesso
        if (data.subscription.status === "active" || data.payment?.status === "approved") {
          setAutoCheck(false);
          toast.success("Pagamento aprovado!");
          navigate(`/payment/success?payment_id=${paymentId}`);
          return;
        }

        // Se foi rejeitado, redirecionar para falha
        if (data.payment?.status === "rejected" || data.payment?.status === "cancelled") {
          setAutoCheck(false);
          navigate(`/payment/failure?payment_id=${paymentId}&status=${data.payment.status}`);
          return;
        }
      } else {
        if (!silent) {
          toast.error("Erro ao verificar status do pagamento");
        }
      }
    } catch (error) {
      logger.error("Erro ao verificar pagamento:", error);
      if (!silent) {
        toast.error("Erro ao verificar status do pagamento");
      }
    } finally {
      setLoading(false);
      if (!silent) setChecking(false);
    }
  };

  const copyPixCode = () => {
    if (paymentStatus?.payment?.point_of_interaction?.transaction_data?.qr_code) {
      navigator.clipboard.writeText(paymentStatus.payment.point_of_interaction.transaction_data.qr_code);
      toast.success("Código PIX copiado!");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getPaymentMethodText = (methodId: string) => {
    switch (methodId) {
      case "pix":
        return "PIX";
      case "bolbradesco":
      case "boleto":
        return "Boleto Bancário";
      default:
        return methodId;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="h-8 w-8 animate-pulse mx-auto text-orange-500" />
          <p className="text-muted-foreground">Verificando status do pagamento...</p>
        </div>
      </div>
    );
  }

  const isPix = paymentStatus?.payment?.payment_method_id === "pix";
  const isBoleto =
    paymentStatus?.payment?.payment_method_id?.includes("boleto") ||
    paymentStatus?.payment?.payment_method_id?.includes("bol");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Clock className="h-16 w-16 text-orange-500 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-700">Pagamento Pendente</CardTitle>
          <CardDescription>
            {isPix
              ? "Aguardando confirmação do PIX"
              : isBoleto
                ? "Aguardando pagamento do boleto"
                : "Aguardando confirmação do pagamento"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {paymentStatus && (
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-orange-800">Plano: {paymentStatus.subscription.plan.name}</h3>
                <p className="text-sm text-orange-700">Valor: {formatPrice(paymentStatus.subscription.plan.price)}</p>
                {paymentStatus.payment && (
                  <p className="text-sm text-orange-700">
                    Método: {getPaymentMethodText(paymentStatus.payment.payment_method_id)}
                  </p>
                )}
              </div>

              {/* PIX QR Code */}
              {isPix && paymentStatus.payment?.point_of_interaction?.transaction_data && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-blue-800">Pague com PIX</h4>

                  {paymentStatus.payment.point_of_interaction.transaction_data.qr_code_base64 && (
                    <div className="text-center">
                      <img
                        src={`data:image/png;base64,${paymentStatus.payment.point_of_interaction.transaction_data.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="mx-auto max-w-48 h-auto"
                      />
                    </div>
                  )}

                  {paymentStatus.payment.point_of_interaction.transaction_data.qr_code && (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-700">Ou copie o código PIX:</p>
                      <div className="flex gap-2">
                        <code className="flex-1 p-2 bg-white rounded text-xs break-all">
                          {paymentStatus.payment.point_of_interaction.transaction_data.qr_code}
                        </code>
                        <Button size="sm" onClick={copyPixCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Boleto */}
              {isBoleto && paymentStatus.payment?.point_of_interaction?.transaction_data?.ticket_url && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-blue-800">Boleto Bancário</h4>
                  <Button
                    onClick={() =>
                      window.open(paymentStatus.payment?.point_of_interaction?.transaction_data?.ticket_url, "_blank")
                    }
                    className="w-full"
                  >
                    Visualizar Boleto
                  </Button>
                  <p className="text-sm text-blue-700">O boleto tem vencimento em 3 dias úteis.</p>
                </div>
              )}
            </div>
          )}

          <Alert className="border-orange-200 bg-orange-50">
            <AlertDescription className="text-orange-800">
              {isPix
                ? "Após realizar o PIX, a confirmação é automática e instantânea."
                : isBoleto
                  ? "Após o pagamento do boleto, a confirmação pode levar até 2 dias úteis."
                  : "Estamos aguardando a confirmação do seu pagamento."}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button onClick={() => checkPaymentStatus()} disabled={checking} className="w-full" variant="outline">
              {checking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Status
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={() => navigate("/pricing")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Planos
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Esta página atualiza automaticamente.</p>
            <p>Você será redirecionado quando o pagamento for confirmado.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
