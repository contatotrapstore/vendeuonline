"use client";

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  User,
  ShoppingCart,
  Store,
  Settings,
  LogOut,
  Search,
  Bell,
  Heart,
  Package,
  BarChart3,
  Users,
  Shield,
  Activity,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";
import NotificationBell from "@/components/ui/NotificationBell";
import GlobalSearch from "@/components/ui/GlobalSearch";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  // Links de navegação baseados no tipo de usuário
  const getNavigationLinks = () => {
    if (!isAuthenticated || !user) {
      return [
        { to: "/", label: "Início", icon: null },
        { to: "/produtos", label: "Produtos", icon: null },
        { to: "/lojas", label: "Lojas", icon: null },
        { to: "/sobre", label: "Sobre", icon: null },
      ];
    }

    switch (user.userType) {
      case "admin":
        return [
          { to: "/admin", label: "Dashboard", icon: BarChart3 },
          { to: "/admin/users", label: "Usuários", icon: Users },
          { to: "/admin/stores", label: "Lojas", icon: Store },
          { to: "/admin/products", label: "Produtos", icon: Package },
          { to: "/admin/tracking", label: "Tracking Pixels", icon: Activity },
          { to: "/admin/plans", label: "Configurar Planos", icon: Settings },
        ];

      case "seller":
        return [
          { to: "/seller", label: "Dashboard", icon: BarChart3 },
          { to: "/seller/products", label: "Produtos", icon: Package },
          { to: "/seller/orders", label: "Pedidos", icon: ShoppingCart },
          { to: "/seller/store", label: "Minha Loja", icon: Store },
          { to: "/seller/plans", label: "Planos", icon: CreditCard },
          { to: "/seller/analytics", label: "Analytics", icon: BarChart3 },
        ];

      case "buyer":
      default:
        return [
          { to: "/", label: "Início", icon: null },
          { to: "/products", label: "Produtos", icon: null },
          { to: "/stores", label: "Lojas", icon: null },
          { to: "/buyer/wishlist", label: "Favoritos", icon: Heart },
          { to: "/buyer/orders", label: "Pedidos", icon: Package },
        ];
    }
  };

  const navigationLinks = getNavigationLinks();

  const getUserTypeIcon = () => {
    switch (user?.userType) {
      case "admin":
        return Shield;
      case "seller":
        return Store;
      case "buyer":
      default:
        return User;
    }
  };

  const getUserTypeLabel = () => {
    switch (user?.userType) {
      case "admin":
        return "Administrador";
      case "seller":
        return "Vendedor";
      case "buyer":
        return "Comprador";
      default:
        return "Usuário";
    }
  };

  const getUserTypeColor = () => {
    switch (user?.userType) {
      case "admin":
        return "from-red-600 to-red-700";
      case "seller":
        return "from-green-600 to-green-700";
      case "buyer":
      default:
        return "from-blue-600 to-blue-700";
    }
  };

  const getUserTypeBadge = () => {
    if (!user) return null;

    const badgeColors = {
      admin: "bg-red-100 text-red-800 border-red-200",
      seller: "bg-green-100 text-green-800 border-green-200",
      buyer: "bg-blue-100 text-blue-800 border-blue-200",
    };

    const badgeIcons = {
      admin: Shield,
      seller: Store,
      buyer: User,
    };

    const Icon = badgeIcons[user.userType as keyof typeof badgeIcons] || User;
    const colorClass = badgeColors[user.userType as keyof typeof badgeColors] || badgeColors.buyer;

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        <Icon className="h-3 w-3 mr-1" />
        {getUserTypeLabel()}
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 group">
              <Logo size="sm" showText={true} className="group-hover:scale-105 transition-transform duration-200" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center space-x-1">
            {navigationLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  } ${link.to === "/admin/tracking" && isActive ? "ring-2 ring-blue-200" : ""}`}
                  title={link.to === "/admin/tracking" ? "Configurar Google Analytics, Meta Pixel e TikTok Pixel" : ""}
                >
                  {Icon && (
                    <Icon className={`h-4 w-4 ${link.to === "/admin/tracking" && isActive ? "animate-pulse" : ""}`} />
                  )}
                  <span>{link.label}</span>
                  {link.to === "/admin/tracking" && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      NEW
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Central Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-3">
            {(!isAuthenticated || user?.userType === "buyer") && (
              <GlobalSearch className="w-full" placeholder="Buscar produtos, lojas..." />
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Notifications (apenas para usuários autenticados) */}
            {isAuthenticated && <NotificationBell />}

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                >
                  <div
                    className={`h-7 w-7 bg-gradient-to-br ${getUserTypeColor()} rounded-full flex items-center justify-center ring-2 ring-white shadow-sm`}
                  >
                    {(() => {
                      const Icon = getUserTypeIcon();
                      return <Icon className="h-4 w-4 text-white" />;
                    })()}
                  </div>
                  <span className="hidden lg:block text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-200 max-w-24 truncate">
                    {user.name}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 backdrop-blur-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        {getUserTypeBadge()}
                      </div>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    {user.userType !== "admin" && (
                      <Link
                        to={user.userType === "seller" ? "/seller/account" : "/buyer/profile"}
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 font-medium"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>{user.userType === "seller" ? "Minha Conta" : "Meu Perfil"}</span>
                      </Link>
                    )}

                    {user.userType === "seller" && (
                      <Link
                        to="/seller/store"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 font-medium"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Store className="h-4 w-4" />
                        <span>Gerenciar Loja</span>
                      </Link>
                    )}

                    {user.userType !== "admin" && (
                      <Link
                        to={user.userType === "seller" ? "/seller/settings" : "/buyer/settings"}
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 font-medium"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Configurações</span>
                      </Link>
                    )}

                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-all duration-200 font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link
                  to="/auth/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Entrar
                </Link>
                <Link
                  to="/auth/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Cadastrar
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="lg:hidden px-4 py-3 bg-gray-50 border-t border-gray-200">
        {(!isAuthenticated || user?.userType === "buyer") && (
          <GlobalSearch className="w-full" placeholder="Buscar produtos, lojas..." />
        )}
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 bg-white">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navigationLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  } ${link.to === "/admin/tracking" && isActive ? "ring-2 ring-blue-200" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {Icon && (
                    <Icon className={`h-5 w-5 ${link.to === "/admin/tracking" && isActive ? "animate-pulse" : ""}`} />
                  )}
                  <div className="flex items-center space-x-2 flex-1">
                    <span>{link.label}</span>
                    {link.to === "/admin/tracking" && (
                      <Badge variant="secondary" className="text-xs">
                        NEW
                      </Badge>
                    )}
                  </div>
                  {link.to === "/admin/tracking" && <div className="text-xs text-gray-500">GA4 • Meta • TikTok</div>}
                </Link>
              );
            })}

            {!isAuthenticated && (
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <Link
                  to="/auth/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  to="/auth/register"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700 text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
