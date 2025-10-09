"use client";

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to products page with a message
    // TODO: Implement full edit functionality
    alert("Funcionalidade de edição em desenvolvimento. Use a opção de deletar e recriar o produto por enquanto.");
    navigate("/seller/products");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
          Edição em Desenvolvimento
        </h1>
        <p className="text-gray-600 text-center mb-6">
          A funcionalidade de edição de produtos está em desenvolvimento.
          Por enquanto, você pode deletar e recriar o produto.
        </p>
        <p className="text-sm text-gray-500 text-center">
          ID do Produto: {id}
        </p>
        <p className="text-sm text-gray-500 text-center mt-2">
          Redirecionando para a lista de produtos...
        </p>
      </div>
    </div>
  );
}
