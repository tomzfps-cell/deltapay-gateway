import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

// Auth Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Dashboard Pages
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Products from "./pages/Products";
import Withdrawals from "./pages/Withdrawals";
import Webhooks from "./pages/Webhooks";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import CheckoutAppearance from "./pages/CheckoutAppearance";
import CheckoutTemplates from "./pages/CheckoutTemplates";
import CheckoutTemplateEditor from "./pages/CheckoutTemplateEditor";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminWithdrawals from "./pages/AdminWithdrawals";

// Public Pages
import Checkout from "./pages/checkout/Checkout";
import EcommerceCheckout from "./pages/checkout/EcommerceCheckout";
import OrderThanks from "./pages/checkout/OrderThanks";
import ProductLanding from "./pages/checkout/ProductLanding";
import CheckoutPreview from "./pages/checkout/CheckoutPreview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public checkout routes - Legacy (Wallet Brick) */}
              <Route path="/pay/:paymentId" element={<Checkout />} />

              {/* Public checkout routes - Ecommerce (Card Form) */}
              <Route path="/p/:productSlug" element={<ProductLanding />} />
              <Route path="/checkout/:orderId" element={<EcommerceCheckout />} />
              <Route path="/order/:orderId/thanks" element={<OrderThanks />} />
              <Route path="/checkout-preview" element={<CheckoutPreview />} />

              {/* Protected dashboard routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/products" element={<Products />} />
                <Route path="/withdrawals" element={<Withdrawals />} />
                <Route path="/webhooks" element={<Webhooks />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/checkout-appearance" element={<CheckoutAppearance />} />
                <Route path="/checkout-templates" element={<CheckoutTemplates />} />
                <Route path="/checkout-templates/:templateId" element={<CheckoutTemplateEditor />} />

                {/* Admin routes (inside dashboard layout, protected by AdminRoute) */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawals /></AdminRoute>} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
