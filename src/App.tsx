import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import Stores from "@/pages/Stores";
import About from "@/pages/About";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Lazy loading das páginas
const PricingPage = lazy(() => import("@/app/pricing/page"));
const ContactPage = lazy(() => import("@/app/contact/page"));
const FAQPage = lazy(() => import("@/app/faq/page"));
const PrivacyPage = lazy(() => import("@/app/privacy/page"));
const TermsPage = lazy(() => import("@/app/terms/page"));
const LoginPage = lazy(() => import("@/app/(auth)/login/page"));
const RegisterPage = lazy(() => import("@/app/(auth)/register/page"));
const CartPage = lazy(() => import("@/app/cart/page"));
const CheckoutPage = lazy(() => import("@/app/checkout/page"));

// Admin Pages
const AdminDashboard = lazy(() => import("@/app/admin/page"));
const AdminUsers = lazy(() => import("@/app/admin/users/page"));
const AdminBanners = lazy(() => import("@/app/admin/banners/page"));
const AdminPricing = lazy(() => import("@/app/admin/pricing/page"));

// Seller Pages
const SellerDashboard = lazy(() => import("@/app/seller/page"));
const SellerProducts = lazy(() => import("@/app/seller/products/page"));
const SellerOrders = lazy(() => import("@/app/seller/orders/page"));
const SellerStore = lazy(() => import("@/app/seller/store/page"));
const SellerAnalytics = lazy(() => import("@/app/seller/analytics/page"));

// Buyer Pages
const BuyerDashboard = lazy(() => import("@/app/buyer/page"));
const BuyerOrders = lazy(() => import("@/app/buyer/orders/page"));
const BuyerWishlist = lazy(() => import("@/app/buyer/wishlist/page"));
const BuyerHistory = lazy(() => import("@/app/buyer/history/page"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              
              {/* Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Shopping Routes */}
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />
              
              {/* Seller Routes */}
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/seller/products" element={<SellerProducts />} />
              <Route path="/seller/orders" element={<SellerOrders />} />
              <Route path="/seller/store" element={<SellerStore />} />
              <Route path="/seller/analytics" element={<SellerAnalytics />} />
              
              {/* Buyer Routes */}
              <Route path="/buyer" element={<BuyerDashboard />} />
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="/buyer/orders" element={<BuyerOrders />} />
              <Route path="/orders" element={<BuyerOrders />} />
              <Route path="/buyer/wishlist" element={<BuyerWishlist />} />
              <Route path="/favorites" element={<BuyerWishlist />} />
              <Route path="/buyer/history" element={<BuyerHistory />} />
              
              {/* 404 Route */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Página não encontrada</p>
                  <a href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Voltar ao Início
                  </a>
                </div>
              } />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
