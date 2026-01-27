import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowLeft, Info } from "lucide-react";

export default function SellerOrdersPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para dashboard após 5 segundos
    const timer = setTimeout(() => {
      navigate("/seller");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <MessageSquare className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Sistema de Vendas via WhatsApp
        </h1>

        {/* Mensagem Informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-blue-900 mb-2">
                Vendas Diretas via WhatsApp
              </h2>
              <p className="text-blue-800 mb-3">
                Este marketplace utiliza <strong>vendas diretas via WhatsApp</strong>. Não há
                sistema de pedidos online integrado.
              </p>
              <p className="text-blue-800 mb-3">
                <strong>Como funciona:</strong>
              </p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Seus produtos são exibidos como catálogo online</li>
                <li>Compradores clicam no botão "Comprar via WhatsApp"</li>
                <li>São redirecionados para conversar diretamente com você</li>
                <li>Você negocia, confirma e finaliza a venda pelo WhatsApp</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card de Gerenciamento */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            📱 Gerenciando suas Vendas
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>
                <strong>WhatsApp Business:</strong> Recomendamos usar WhatsApp Business para
                melhor organização
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>
                <strong>Catálogo:</strong> Seus produtos ficam visíveis 24/7 em www.vendeu.online
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span>
                <strong>Flexibilidade:</strong> Você controla preços, estoque e negocia condições via WhatsApp
              </span>
            </li>
          </ul>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate("/seller")}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar ao Dashboard
          </button>
          <button
            onClick={() => navigate("/seller/products")}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Ver Meus Produtos
          </button>
        </div>

        {/* Redirecionamento automático */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Redirecionando para o dashboard em 5 segundos...
        </p>
      </div>
    </div>
  );
}
