import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider, useStore } from "@/lib/store";
import { NotificationProvider } from "@/lib/notifications";
import { TopBar, BottomNav } from "@/components/shell";
import { GlassLoadingScreen } from "@/components/glass-loading-screen";
import { HomePage } from "@/pages/HomePage";
import { SearchPage } from "@/pages/SearchPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { StudioPage } from "@/pages/StudioPage";
import { CartPage } from "@/pages/CartPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { AdminPage } from "@/pages/AdminPage";
import { RiderPage } from "@/pages/RiderPage";

function MainLayout() {
  const { productsLoading } = useStore();
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener("gmp-quota-exceeded", handleQuota);
    return () => {
      window.removeEventListener("gmp-quota-exceeded", handleQuota);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Glass Loading Screen with Blurry Background Video */}
      <GlassLoadingScreen isLoading={productsLoading} minDurationMs={1200} />

      {/* Google Maps Quota Defense Sticky Banner */}
      {quotaExceeded && (
        <div className="sticky top-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-semibold text-center shadow-md flex items-center justify-center gap-2">
          <span>
            Google Maps Platform quota exceeded or billing is not enabled. Map features are temporarily unavailable.
            Set up your own Google Cloud project with billing enabled to restore full functionality.
          </span>
          <a
            href="https://console.cloud.google.com/google/maps-apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-amber-100 hover:text-white shrink-0 ml-1"
          >
            Google Cloud Console &rarr;
          </a>
        </div>
      )}
      <TopBar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin-login" element={<AuthPage />} />
          <Route path="/rider" element={<RiderPage />} />
          <Route path="/rider-login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <StoreProvider>
            <MainLayout />
          </StoreProvider>
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}
