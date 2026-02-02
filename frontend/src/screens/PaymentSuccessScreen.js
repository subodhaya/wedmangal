import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import api from '../utils/api';  

const PaymentSuccessScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");

  const [loadingPay, setLoadingPay] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Move `refreshToken` outside `useEffect`
  const refreshToken = async () => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo || !userInfo.refresh) {
      console.error("No refresh token found. User must log in again.");
      localStorage.removeItem("userInfo"); // ❌ Remove invalid token
      navigate("/login");
      return null;
    }

    try {
      const { data } = await api.post("/api/token/refresh/", {
        refresh: userInfo.refresh,
      });

      userInfo.token = data.access;
      localStorage.setItem("userInfo", JSON.stringify(userInfo));

      return data.access;
    } catch (error) {
      console.error("Token refresh failed. Redirecting to login...");
      localStorage.removeItem("userInfo");
      navigate("/login");
      return null;
    }
  };

  useEffect(() => {
    const updateOrderStatus = async () => {
      let userInfo = JSON.parse(localStorage.getItem("userInfo")) || {};

      if (!userInfo.token) {
        console.error("Missing authentication token. Redirecting to login...");
        navigate("/login");
        return;
      }

      try {
        setLoadingPay(true);
        await api.put(
          `/api/orders/${orderId}/pay/`,
          {},
          {
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          }
        );

        setLoadingPay(false);
        navigate(`/order/${orderId}`);

      } catch (error) {
        setLoadingPay(false);

        if (error.response?.data?.code === "token_not_valid") {
          console.warn("Token expired. Attempting to refresh...");

          const newToken = await refreshToken();
          if (newToken) {
            try {
              setLoadingPay(true);
              await api.put(
                `/api/orders/${orderId}/pay/`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${newToken}`,
                  },
                }
              );
              setLoadingPay(false);
              navigate(`/order/${orderId}`);

            } catch (retryError) {
              setLoadingPay(false);
              console.error("Retry failed after token refresh:", retryError);
              setError("Payment update failed. Please try again.");
              navigate("/login");
            }
          } else {
            console.error("Refresh token invalid. Redirecting to login...");
            navigate("/login");
          }
        } else {
          setError("Payment update failed. Please try again.");
          console.error("Error updating order status:", error.response?.data || error.message);
        }
      }
    };

    if (orderId) {
      updateOrderStatus();
    }
  }, [orderId, navigate]);

  return (
    <div>
      <h1>Payment Successful! Redirecting...</h1>
      {loadingPay && <p>Updating order status...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default PaymentSuccessScreen;
