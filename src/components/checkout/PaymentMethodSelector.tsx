import { QrCode, CreditCard } from "lucide-react";

interface PaymentMethodSelectorProps {
  onSelect: (method: "PIX" | "CREDIT_CARD") => void;
}

export function PaymentMethodSelector({ onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-6 text-center">
        Escolha a forma de pagamento
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PIX */}
        <button
          onClick={() => onSelect("PIX")}
          className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <QrCode className="w-8 h-8 text-blue-600" />
          </div>
          <p className="font-semibold text-lg mb-2">PIX</p>
          <p className="text-sm text-gray-600 text-center">
            Pagamento instantâneo
          </p>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Aprovação imediata
          </p>
        </button>

        {/* Cartão de Crédito */}
        <button
          onClick={() => onSelect("CREDIT_CARD")}
          className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <CreditCard className="w-8 h-8 text-purple-600" />
          </div>
          <p className="font-semibold text-lg mb-2">Cartão</p>
          <p className="text-sm text-gray-600 text-center">
            Parcelamento disponível
          </p>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Até 12x sem juros
          </p>
        </button>
      </div>
    </div>
  );
}
