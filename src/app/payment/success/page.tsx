import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown para redirecionamento
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/seller/plans");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Ícone de Sucesso */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <CheckCircle className="w-24 h-24 text-green-500 animate-bounce" />
            <div className="absolute inset-0 w-24 h-24 bg-green-500/20 rounded-full animate-ping" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Pagamento Recebido!
        </h1>

        {/* Descrição */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          Seu pagamento foi processado com sucesso pelo ASAAS.
          <br />
          Sua assinatura está sendo ativada.
        </p>

        {/* Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Verificando status da assinatura...</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-sm text-gray-500">
          Redirecionando em <span className="font-bold text-gray-900">{countdown}</span> segundo{countdown !== 1 && "s"}...
        </div>

        {/* Botão Manual */}
        <button
          onClick={() => navigate("/seller/plans")}
          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Ir para Meus Planos
        </button>

        {/* Informação Adicional */}
        <p className="mt-6 text-xs text-gray-400">
          Se sua assinatura não for ativada automaticamente em alguns segundos, recarregue a página.
        </p>
      </div>
    </div>
  );
}
