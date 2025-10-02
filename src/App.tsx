import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { usePageTracking } from "@/hooks/useAnalytics";
import TrackingScripts from "@/components/TrackingScripts";

// Lazy loading das páginas principais
const HomePage = lazy(() => import("@/app/page"));
const ProductsPage = lazy(() => import("@/app/products/page"));
const StoresPage = lazy(() => import("@/app/stores/page"));
const AboutPage = lazy(() => import("@/app/about/page"));

// Lazy loading das páginas
const PricingPage = lazy(() => import("@/app/pricing/page"));
const ContactPage = lazy(() => import("@/app/contact/page"));
const FAQPage = lazy(() => import("@/app/faq/page"));
const PrivacyPage = lazy(() => import("@/app/privacy/page"));
const TermsPage = lazy(() => import("@/app/terms/page"));
const LoginPage = lazy(() => import("@/app/(auth)/login/page"));
const RegisterPage = lazy(() => import("@/app/(auth)/register/page"));

// Dynamic pages
const ProductPage = lazy(() => import("@/app/produto/[id]/page"));
const StorePage = lazy(() => import("@/app/stores/[id]/page"));

// Admin Pages
const AdminDashboard = lazy(() => import("@/app/admin/page"));
const AdminUsers = lazy(() => import("@/app/admin/users/page"));
const AdminBanners = lazy(() => import("@/app/admin/banners/page"));
const AdminPricing = lazy(() => import("@/app/admin/pricing/page"));
const AdminSubscriptions = lazy(() => import("@/app/admin/subscriptions/page"));
const AdminStores = lazy(() => import("@/app/admin/stores/page"));
const AdminProducts = lazy(() => import("@/app/admin/products/page"));
const AdminPlans = lazy(() => import("@/app/admin/plans/page"));
const AdminTest = lazy(() => import("@/app/admin/test/page"));
const AdminTracking = lazy(() => import("@/app/admin/tracking/page"));
const DebugAdmin = lazy(() => import("@/app/debug-admin"));

// Seller Pages
const SellerDashboard = lazy(() => import("@/app/seller/page"));
const SellerProducts = lazy(() => import("@/app/seller/products/page"));
const SellerOrders = lazy(() => import("@/app/seller/orders/page"));
const SellerStore = lazy(() => import("@/app/seller/store/page"));
const SellerAnalytics = lazy(() => import("@/app/seller/analytics/page"));
const SellerProfile = lazy(() => import("@/app/seller/profile/page"));
const SellerAccount = lazy(() => import("@/app/seller/account/page"));
const SellerPlans = lazy(() => import("@/app/seller/plans/page"));
const SellerSettings = lazy(() => import("@/app/seller/settings/page"));

// Buyer Pages
const BuyerDashboard = lazy(() => import("@/app/buyer/page"));
const BuyerOrders = lazy(() => import("@/app/buyer/orders/page"));
const BuyerWishlist = lazy(() => import("@/app/buyer/wishlist/page"));
const BuyerHistory = lazy(() => import("@/app/buyer/history/page"));
const BuyerProfile = lazy(() => import("@/app/buyer/profile/page"));
const BuyerSettings = lazy(() => import("@/app/buyer/settings/page"));
const BuyerNotifications = lazy(() => import("@/app/buyer/notifications/page"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Componente interno para usar hooks do Router
function AppContent() {
  // Inicializar tracking de páginas
  usePageTracking();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary showDetails={import.meta.env.MODE === "development"}>
        <TrackingScripts />
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/produto/:id" element={<ProductPage />} />
              <Route path="/lojas" element={<StoresPage />} />
              <Route path="/stores" element={<StoresPage />} />
              <Route path="/lojas/:id" element={<StorePage />} />
              <Route path="/stores/:id" element={<StorePage />} />
              <Route path="/planos" element={<PricingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/sobre" element={<AboutPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contato" element={<ContactPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/perguntas-frequentes" element={<FAQPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/termos" element={<TermsPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/entrar" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/cadastrar" element={<RegisterPage />} />

              {/* Shopping Routes */}

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/stores" element={<AdminStores />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/test" element={<AdminTest />} />
              <Route path="/admin/tracking" element={<AdminTracking />} />

              {/* Debug Routes */}
              <Route path="/debug-admin" element={<DebugAdmin />} />

              {/* Seller Routes */}
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/seller/products" element={<SellerProducts />} />
              <Route path="/seller/orders" element={<SellerOrders />} />
              <Route path="/seller/store" element={<SellerStore />} />
              <Route path="/seller/analytics" element={<SellerAnalytics />} />
              <Route path="/seller/profile" element={<SellerProfile />} />
              <Route path="/seller/account" element={<SellerAccount />} />
              <Route path="/seller/plans" element={<SellerPlans />} />
              <Route path="/seller/settings" element={<SellerSettings />} />

              {/* Buyer Routes */}
              <Route path="/buyer" element={<BuyerDashboard />} />
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="/buyer/orders" element={<BuyerOrders />} />
              <Route path="/orders" element={<BuyerOrders />} />
              <Route path="/buyer/wishlist" element={<BuyerWishlist />} />
              <Route path="/favorites" element={<BuyerWishlist />} />
              <Route path="/buyer/history" element={<BuyerHistory />} />
              <Route path="/buyer/profile" element={<BuyerProfile />} />
              <Route path="/profile" element={<BuyerProfile />} />
              <Route path="/buyer/settings" element={<BuyerSettings />} />
              <Route path="/settings" element={<BuyerSettings />} />
              <Route path="/buyer/notifications" element={<BuyerNotifications />} />

              {/* 404 Route */}
              <Route
                path="*"
                element={
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-8">Página não encontrada</p>
                    <a
                      href="/"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Voltar ao Início
                    </a>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
