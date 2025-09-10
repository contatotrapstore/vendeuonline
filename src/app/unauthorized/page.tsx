"use client";

import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function UnauthorizedPage() {
  const { user, logout } = useAuthStore();

  const getRedirectPath = () => {
    if (!user) return "/";

    switch (user.userType) {
      case "admin":
        return "/admin";
      case "seller":
        return "/seller";
      case "buyer":
        return "/";
      default:
        return "/";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Ícone */}
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-8 w-8 text-red-600" />
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Acesso Negado</h1>

          {/* Descrição */}
          <p className="text-gray-600 mb-8">
            Você não tem permissão para acessar esta página.
            {user ? (
              <span className="block mt-2">
                Você está logado como{" "}
                <strong>
                  {user.userType === "buyer" ? "Comprador" : user.userType === "seller" ? "Vendedor" : "Administrador"}
                </strong>
                .
              </span>
            ) : (
              <span className="block mt-2">Faça login para continuar.</span>
            )}
          </p>

          {/* Ações */}
          <div className="space-y-4">
            {user ? (
              <>
                <Link
                  to={getRedirectPath()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar para minha área</span>
                </Link>

                <Link
                  to="/"
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Ir para página inicial</span>
                </Link>

                <button
                  onClick={logout}
                  className="w-full text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  Sair da conta
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
                >
                  Fazer Login
                </Link>

                <Link
                  to="/"
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Voltar ao início</span>
                </Link>
              </>
            )}
          </div>

          {/* Informações adicionais */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Precisa de ajuda?</h3>
            <p className="text-xs text-gray-600">
              Se você acredita que deveria ter acesso a esta página, entre em contato com o suporte.
            </p>
            <Link to="/contact" className="text-xs text-blue-600 hover:text-blue-500 mt-2 inline-block">
              Falar com suporte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
