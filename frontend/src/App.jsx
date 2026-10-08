import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, AuthProvider, CartProvider, useAuth } from './store';
import { Footer, MobileCartBar, Navbar, Spinner, Toasts, EmptyState } from './components';
import Home from './pages/Home';
import { Categories, Explore, ProductDetail } from './pages/Catalog';
import PackageBuilder from './pages/PackageBuilder';
import { Cart, Checkout, CheckoutSuccess } from './pages/Cart';
import { BookingDetail, BookingsList } from './pages/Bookings';
import { ProductForm, SellerDashboard, SellerEarnings, SellerOrders, SellerProducts, SellerTabs } from './pages/Seller';
import { Login, Profile, Register } from './pages/Auth';
import Admin from './pages/Admin';
import { useApp } from './store';

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="container page"><Spinner big /></div>;
  if (!user) return <Navigate to={`/kirish?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user, ready } = useAuth();
  const { t } = useApp();
  const loc = useLocation();
  if (!ready) return <div className="container page"><Spinner big /></div>;
  if (!user) return <Navigate to={`/kirish?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== role && !(role === 'seller' && user.role === 'admin')) {
    return <div className="container page"><EmptyState icon="🚫" title={t('common.error')} text={t('profile.roles.' + user.role)} /></div>;
  }
  return children;
}

function NotFound() {
  const { t } = useApp();
  return <div className="container page"><EmptyState icon="🧭" title="404" text={t('common.notFound')} /></div>;
}

function SellerShell({ children }) {
  return (
    <div className="container page">
      <SellerTabs />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/katalog" element={<Explore />} />
                <Route path="/kategoriyalar" element={<Categories />} />
                <Route path="/mahsulot/:id" element={<ProductDetail />} />
                <Route path="/paket" element={<PackageBuilder />} />
                <Route path="/savat" element={<Cart />} />
                <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
                <Route path="/checkout/muvaffaqiyat" element={<CheckoutSuccess />} />
                <Route path="/buyurtmalarim" element={<RequireAuth><BookingsList /></RequireAuth>} />
                <Route path="/buyurtma/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
                <Route path="/kirish" element={<Login />} />
                <Route path="/royxatdan-otish" element={<Register />} />
                <Route path="/profil" element={<RequireAuth><Profile /></RequireAuth>} />

                <Route path="/sotuvchi" element={<RequireRole role="seller"><SellerShell><SellerDashboard /></SellerShell></RequireRole>} />
                <Route path="/sotuvchi/mahsulotlar" element={<RequireRole role="seller"><SellerShell><SellerProducts /></SellerShell></RequireRole>} />
                <Route path="/sotuvchi/mahsulot-qoshish" element={<RequireRole role="seller"><SellerShell><ProductForm /></SellerShell></RequireRole>} />
                <Route path="/sotuvchi/mahsulot/:id" element={<RequireRole role="seller"><SellerShell><ProductForm /></SellerShell></RequireRole>} />
                <Route path="/sotuvchi/buyurtmalar" element={<RequireRole role="seller"><SellerShell><SellerOrders /></SellerShell></RequireRole>} />
                <Route path="/sotuvchi/daromad" element={<RequireRole role="seller"><SellerShell><SellerEarnings /></SellerShell></RequireRole>} />

                <Route path="/admin" element={<RequireRole role="admin"><Admin /></RequireRole>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <MobileCartBar />
            <Footer />
            <Toasts />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </AppProvider>
  );
}
