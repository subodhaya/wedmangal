import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import Footer from './components/Footer';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import RegisterScreen from './screens/RegisterScreen';
import OwnerRegisterScreen from './screens/OwnerRegisterScreen';
import PrivateRoute from './components/PrivateRoute';
import ProductScreen from './screens/ProductScreen';
import CartScreen from './screens/CartScreen';
import WishlistScreen from './screens/WishlistScreen';
import ShippingScreen from './screens/ShippingScreen';
import PaymentScreen from './screens/PaymentScreen';
import PlaceOrderScreen from './screens/PlaceOrderScreen';
import OrderScreen from './screens/OrderScreen';
import InviteForm from './components/InviteForm';
import NotFoundScreen from './screens/NotFoundScreen';
import SearchResultScreen from './screens/SearchResultScreen';
import BudgetScreen from './screens/BudgetScreen';
import UserListScreen from './screens/UserListScreen';
import UserEditScreen from './screens/UserEditScreen';
import ProductListScreen from './screens/ProductListScreen';
import ProductEditScreen from './screens/ProductEditScreen';
import OrderListScreen from './screens/OrderListScreen';
import ProductApprovalScreen from './screens/ProductApprovalScreen';
import ManagePage from './components/ManagePage';
import ServicePage from './components/ServicePage';
import ServiceScreen from './screens/ServiceScreen';
import TermsAndCondition from './screens/TermsAndCondition';
import RefundAndCancellation from './screens/RefundAndCancellation';
import ContactUs from './screens/ContactUs';
import PaymentSuccessScreen from './screens/PaymentSuccessScreen';
import PlanScreen from './screens/PlanScreen';
import GoogleLoginCallback from './screens/GoogleLoginCallback';
import MyAppointmentScreen from './screens/MyAppointmentScreen';
import AvailableTodayScreen from './screens/AvailableTodayScreen';
import CategoryScreen from './screens/CategoryScreen';
import { HelmetProvider } from 'react-helmet-async';

// Only show splash when launched as installed PWA
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

function App() {
  const [showSplash, setShowSplash] = useState(isStandalone);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <HelmetProvider>
    <Router>
      <Header />
      <main className="py-0">
        <Container fluid>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/login" element={<LoginScreen />} />
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
            <Route path="/my-appointment/" element={<MyAppointmentScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </Container>
      </main>
      <Footer />
    </Router>
    </HelmetProvider>
  );
}

export default App;