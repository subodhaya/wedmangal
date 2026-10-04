import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
// The vendor page is where most visitors land from Google, so it stays in the main bundle.
import ProductScreen from './screens/ProductScreen';
import lazyRoute from './utils/lazyRoute';
import RouteFallback from './components/RouteFallback';
import { HelmetProvider } from 'react-helmet-async';
import { trackSessionStart } from './utils/analytics';

// Every other screen is loaded on first visit.
const SplashScreen = lazyRoute(() => import('./screens/SplashScreen'));
const HomeScreen = lazyRoute(() => import('./screens/HomeScreen'));
const LoginScreen = lazyRoute(() => import('./screens/LoginScreen'));
const AddPhoneScreen = lazyRoute(() => import('./screens/AddPhoneScreen'));
const ProfileScreen = lazyRoute(() => import('./screens/ProfileScreen'));
const RegisterScreen = lazyRoute(() => import('./screens/RegisterScreen'));
const OwnerRegisterScreen = lazyRoute(() => import('./screens/OwnerRegisterScreen'));
const CartScreen = lazyRoute(() => import('./screens/CartScreen'));
const WishlistScreen = lazyRoute(() => import('./screens/WishlistScreen'));
const ShippingScreen = lazyRoute(() => import('./screens/ShippingScreen'));
const PaymentScreen = lazyRoute(() => import('./screens/PaymentScreen'));
const PlaceOrderScreen = lazyRoute(() => import('./screens/PlaceOrderScreen'));
const OrderScreen = lazyRoute(() => import('./screens/OrderScreen'));
const InviteForm = lazyRoute(() => import('./components/InviteForm'));
const NotFoundScreen = lazyRoute(() => import('./screens/NotFoundScreen'));
const SearchResultScreen = lazyRoute(() => import('./screens/SearchResultScreen'));
const BudgetScreen = lazyRoute(() => import('./screens/BudgetScreen'));
const UserListScreen = lazyRoute(() => import('./screens/UserListScreen'));
const UserEditScreen = lazyRoute(() => import('./screens/UserEditScreen'));
const ProductListScreen = lazyRoute(() => import('./screens/ProductListScreen'));
const ProductEditScreen = lazyRoute(() => import('./screens/ProductEditScreen'));
const OrderListScreen = lazyRoute(() => import('./screens/OrderListScreen'));
const ProductApprovalScreen = lazyRoute(() => import('./screens/ProductApprovalScreen'));
const ManagePage = lazyRoute(() => import('./components/ManagePage'));
const ServicePage = lazyRoute(() => import('./components/ServicePage'));
const ServiceScreen = lazyRoute(() => import('./screens/ServiceScreen'));
const TermsAndCondition = lazyRoute(() => import('./screens/TermsAndCondition'));
const RefundAndCancellation = lazyRoute(() => import('./screens/RefundAndCancellation'));
const ContactUs = lazyRoute(() => import('./screens/ContactUs'));
const PaymentSuccessScreen = lazyRoute(() => import('./screens/PaymentSuccessScreen'));
const PlanScreen = lazyRoute(() => import('./screens/PlanScreen'));
const GoogleLoginCallback = lazyRoute(() => import('./screens/GoogleLoginCallback'));
const MyAppointmentScreen = lazyRoute(() => import('./screens/MyAppointmentScreen'));
const AvailableTodayScreen = lazyRoute(() => import('./screens/AvailableTodayScreen'));
const CategoryScreen = lazyRoute(() => import('./screens/CategoryScreen'));
const FAQScreen = lazyRoute(() => import('./screens/FAQScreen'));
const BlogListScreen = lazyRoute(() => import('./screens/BlogListScreen'));
const BlogPostScreen = lazyRoute(() => import('./screens/BlogPostScreen'));

// Only show splash when launched as installed PWA
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

function App() {
  const [showSplash, setShowSplash] = useState(isStandalone);

  useEffect(() => { trackSessionStart(); }, []);

  if (showSplash) {
    return <Suspense fallback={null}><SplashScreen onDone={() => setShowSplash(false)} /></Suspense>;
  }

  return (
    <HelmetProvider>
    <Router>
      <Header />
      <main className="py-0">
        <Container fluid>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/add-phone" element={<PrivateRoute roles={['customer', 'admin', 'service-owner', 'product-manager']} element={<AddPhoneScreen />} />} />
            <Route path="/accounts/google/login/callback" element={<GoogleLoginCallback />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/owner-register" element={<OwnerRegisterScreen />} />
            <Route path="/product/:id" element={<ProductScreen />} />
            <Route path="/product/service/:id" element={<ServiceScreen />} />
            <Route path="/cart/:id?" element={<CartScreen />} />
            <Route path="/wishlist/:id?" element={<WishlistScreen />} />
            <Route path="/location" element={<ShippingScreen />} />
            <Route path="/payment" element={<PaymentScreen />} />
            <Route path="/placeorder" element={<PlaceOrderScreen />} />
            <Route path="/order/:id" element={<OrderScreen />} />
            <Route path="/available-today" element={<AvailableTodayScreen />} />
            <Route path="/services" element={<ServicePage />} />
            <Route path="/invite" element={<PrivateRoute roles={['customer']} element={<InviteForm />} />} />
            <Route path="/search/" element={<SearchResultScreen />} />
            <Route path="/budget/" element={<BudgetScreen />} />
            <Route path="/admin/productapproval" element={<ProductApprovalScreen />} />
            <Route path="/category/:category" element={<CategoryScreen />} />
            <Route path="/profile" element={<PrivateRoute roles={['customer', 'admin', 'service-owner', 'product-manager']} element={<ProfileScreen />} />} />
            <Route path="/payment-success" element={<PaymentSuccessScreen />} />
            <Route path="/userlist/" element={<PrivateRoute roles={['admin']} element={<UserListScreen />} />} />
            <Route path="/productlist/" element={<PrivateRoute roles={['admin']} element={<ProductListScreen />} />} />
            <Route path="/manage-my-page" element={<PrivateRoute roles={['admin', 'service-owner']} element={<ManagePage />} />} />
            <Route path="/product/:id/edit" element={<PrivateRoute roles={['admin', 'service-owner']} element={<ProductEditScreen />} />} />
            <Route path="/user/:id/edit" element={<PrivateRoute roles={['admin', 'service-owner']} element={<UserEditScreen />} />} />
            <Route path="/orderlist/" element={<PrivateRoute roles={['admin', 'service-owner']} element={<OrderListScreen />} />} />
            <Route path="/TermsAndCondition" element={<TermsAndCondition />} />
            <Route path="/RefundAndCancellation" element={<RefundAndCancellation />} />
            <Route path="/ContactUs" element={<ContactUs />} />
            <Route path="/faq" element={<FAQScreen />} />
            <Route path="/blog" element={<BlogListScreen />} />
            <Route path="/blog/:slug" element={<BlogPostScreen />} />
            <Route path="/my-appointment/" element={<MyAppointmentScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
          </Suspense>
        </Container>
      </main>
      <Footer />
    </Router>
    </HelmetProvider>
  );
}

export default App;