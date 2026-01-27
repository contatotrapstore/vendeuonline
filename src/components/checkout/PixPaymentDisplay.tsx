import { useState, useEffect } from "react";
import { Copy, CheckCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PaymentStatusPolling } from "./PaymentStatusPolling";

interface PixPaymentDisplayProps {
  pixCode: string;
  pixQrCode: string;
  amount: number;
  onSuccess: () => void;
}

export function PixPaymentDisplay({
  pixCode,
  pixQrCode,
  amount,
  onSuccess,
}: PixPaymentDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [copied, setCopied] = useState(false);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Pagamento via PIX</h2>
        <p className="text-3xl font-bold text-blue-600">
          R$ {amount.toFixed(2)}
        </p>
      </div>

      {/* Timer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center gap-2 text-yellow-800">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">
            Tempo restante: {formatTime(timeLeft)}
          </span>
        </div>
        <p className="text-sm text-yellow-700 text-center mt-2">
          O código PIX expira em 10 minutos
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <p className="text-center text-sm text-gray-600 mb-4">
          1. Abra o app do seu banco
        </p>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <img
            src={pixQrCode}
            alt="QR Code PIX"
            className="w-64 h-64 mx-auto"
            onError={(e) => {
              // Fallback if QR code image fails
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <p className="text-center text-sm text-gray-600">
          2. Escaneie o QR Code acima
        </p>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 text-gray-500">ou</span>
        </div>
      </div>

      {/* Copia e Cola */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          3. Copie o código PIX:
        </label>
        <div className="flex gap-2">
          <input
            readOnly
            value={pixCode}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            onClick={copyToClipboard}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              copied
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          4. Cole no app do seu banco e confirme o pagamento
        </p>
      </div>

      {/* Status Polling */}
      <PaymentStatusPolling onConfirmed={onSuccess} />

      {/* Help */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Dica:</strong> Após pagar, a confirmação é automática e
          instantânea. Não feche esta página.
        </p>
      </div>
    </div>
  );
}
