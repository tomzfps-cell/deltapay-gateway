import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Products from "./pages/Products";
import Withdrawals from "./pages/Withdrawals";
import Webhooks from "./pages/Webhooks";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/products" element={<Products />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/webhooks" element={<Webhooks />} />
              <Route path="/api-keys" element={<ApiKeys />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
