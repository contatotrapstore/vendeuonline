import { useState, useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface PaymentStatusPollingProps {
  onConfirmed: () => void;
}

export function PaymentStatusPolling({ onConfirmed }: PaymentStatusPollingProps) {
  const { token } = useAuthStore();
  const [checks, setChecks] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const maxChecks = 120; // 10 minutes (5s interval)

  useEffect(() => {
    if (!isPolling) return;

    logger.info("[PAYMENT POLLING] Iniciando verificação de status de pagamento");

    const interval = setInterval(async () => {
      try {
        logger.info(`[PAYMENT POLLING] Verificação ${checks + 1}/${maxChecks}`);

        const response = await apiRequest("/api/sellers/subscription", {
          method: "GET",
          token,
          headers: { "Content-Type": "application/json" },
        });

        if (response?.success && response?.data?.subscription) {
          const status = response.data.subscription.status?.toLowerCase();
          logger.info(`[PAYMENT POLLING] Status atual: ${status}`);

          if (status === "active") {
            clearInterval(interval);
            setIsPolling(false);
            logger.info("[PAYMENT POLLING] ✅ Pagamento confirmado!");
            toast.success("Pagamento confirmado! Redirecionando...");

            // Wait 2 seconds before redirecting
            setTimeout(() => {
              onConfirmed();
            }, 2000);
            return;
          }
        }

        setChecks((prev) => {
          const newCount = prev + 1;
          if (newCount >= maxChecks) {
            clearInterval(interval);
            setIsPolling(false);
            logger.warn("[PAYMENT POLLING] ⏱️ Tempo limite atingido");
            toast.info(
              "Ainda aguardando confirmação. Você será notificado por email quando o pagamento for confirmado."
            );
          }
          return newCount;
        });
      } catch (error) {
        logger.error("[PAYMENT POLLING] ❌ Erro ao verificar status:", error);
        // Don't stop polling on error, continue trying
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [checks, token, onConfirmed, isPolling]);

  if (!isPolling && checks >= maxChecks) {
    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Aguardando confirmação</p>
            <p>
              Você pode fechar esta página. Enviaremos um email assim que o
              pagamento for confirmado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <div className="text-sm">
          <p className="font-semibold text-gray-800">
            Aguardando confirmação do pagamento...
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Verificação {checks}/{maxChecks} • Próxima em 5 segundos
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(checks / maxChecks) * 100}%` }}
        />
      </div>
    </div>
  );
}
