"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentFailurePage() {
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const paymentId = searchParams.get("payment_id");
  const externalReference = searchParams.get("external_reference");
  const status = searchParams.get("status");
  const statusDetail = searchParams.get("status_detail");

  const getErrorMessage = (statusDetail: string | null) => {
    switch (statusDetail) {
      case "cc_rejected_insufficient_amount":
        return "Cartão sem limite suficiente";
      case "cc_rejected_bad_filled_card_number":
        return "Número do cartão inválido";
      case "cc_rejected_bad_filled_date":
        return "Data de vencimento inválida";
      case "cc_rejected_bad_filled_security_code":
        return "Código de segurança inválido";
      case "cc_rejected_call_for_authorize":
        return "Pagamento rejeitado pelo banco. Entre em contato com seu banco.";
      case "cc_rejected_card_disabled":
        return "Cartão desabilitado";
      case "cc_rejected_duplicated_payment":
        return "Pagamento duplicado";
      case "cc_rejected_high_risk":
        return "Pagamento rejeitado por segurança";
      case "cc_rejected_max_attempts":
        return "Muitas tentativas de pagamento. Tente novamente mais tarde.";
      default:
        return "Pagamento não pôde ser processado. Tente novamente ou use outro método de pagamento.";
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    navigate("/pricing");
  };

  const handleGoBack = () => {
    navigate("/pricing");
  };

  const handleContactSupport = () => {
    // Redirecionar para página de contato ou abrir chat
    navigate("/contato");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-700">Pagamento Não Aprovado</CardTitle>
          <CardDescription>Houve um problema ao processar seu pagamento</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{getErrorMessage(statusDetail)}</AlertDescription>
          </Alert>

          {paymentId && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-gray-800">Detalhes</h4>
              <p className="text-sm text-gray-600">ID do Pagamento: {paymentId}</p>
              {status && <p className="text-sm text-gray-600">Status: {status}</p>}
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full bg-red-600 hover:bg-red-700" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>

            <Button variant="outline" onClick={handleGoBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Planos
            </Button>

            <Button variant="ghost" onClick={handleContactSupport} className="w-full text-muted-foreground">
              Precisa de Ajuda? Fale Conosco
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Dicas para resolver:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Verifique os dados do cartão</li>
              <li>• Confirme se há limite disponível</li>
              <li>• Tente usar outro cartão</li>
              <li>• Use PIX como alternativa</li>
            </ul>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Nenhum valor foi cobrado.</p>
            <p>Você pode tentar novamente a qualquer momento.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
