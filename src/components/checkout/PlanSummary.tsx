import { Check } from "lucide-react";

interface Plan {
  name: string;
  price: number;
  maxProducts: number;
  maxAds: number;
  maxPhotos: number;
  description?: string;
}

interface PlanSummaryProps {
  plan: Plan;
}

export function PlanSummary({ plan }: PlanSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Resumo do Plano
      </h3>

      {/* Plan Name and Price */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Plano:</span>
          <span className="font-semibold text-lg">{plan.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Valor:</span>
          <span className="font-bold text-2xl text-blue-600">
            R$ {plan.price.toFixed(2)}
            <span className="text-sm font-normal text-gray-500">/mês</span>
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Recursos incluídos:
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-sm text-gray-700">
            <strong>{plan.maxProducts}</strong>{" "}
            {plan.maxProducts === 1 ? "produto" : "produtos"} cadastrados
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-sm text-gray-700">
            <strong>{plan.maxAds}</strong>{" "}
            {plan.maxAds === 1 ? "anúncio" : "anúncios"} por mês
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-sm text-gray-700">
            <strong>{plan.maxPhotos}</strong>{" "}
            {plan.maxPhotos === 1 ? "foto" : "fotos"} por produto
          </span>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">{plan.description}</p>
        </div>
      )}
    </div>
  );
}
