// src/components/sendBookingWhatsApp.js
// Call this after a successful booking is placed

/**
 * Opens WhatsApp with a pre-filled booking confirmation message
 * to the vendor's phone number.
 *
 * @param {Object} booking - booking details
 * @param {string} booking.vendorName
 * @param {string} booking.vendorPhone  - vendor WhatsApp number (with country code, e.g. 919876543210)
 * @param {string} booking.serviceName
 * @param {string} booking.bookingDate
 * @param {string} booking.customerName
 * @param {string} booking.orderId
 */
export const sendBookingWhatsApp = (booking) => {
  const {
    vendorName,
    vendorPhone,
    serviceName,
    bookingDate,
    customerName,
    orderId,
  } = booking;

  const message = `
🎊 *New Booking Request — WedMangal*

Hello ${vendorName},

You have received a new booking request on WedMangal.

📋 *Booking Details:*
• Service: ${serviceName}
• Date: ${bookingDate}
• Customer: ${customerName}
• Order ID: ${orderId}

⚠️ *Action Required:*
Please reply to this message to CONFIRM or DECLINE this booking.
The customer will only consider this booking confirmed after receiving your reply.

📌 Manage your bookings at: https://wedmangal.com/vendor/bookings

— WedMangal Team
`.trim();

  const url = `https://wa.me/${vendorPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};


/**
 * Opens WhatsApp with a confirmation message to the CUSTOMER
 * (use this when vendor confirms — or send automatically as receipt)
 */
export const sendCustomerConfirmation = (booking) => {
  const {
    customerPhone,
    customerName,
    vendorName,
    serviceName,
    bookingDate,
    orderId,
  } = booking;

  const message = `
🎊 *Booking Request Received — WedMangal*

Hi ${customerName},

Your booking request has been sent to the vendor.

📋 *Your Booking Summary:*
• Vendor: ${vendorName}
• Service: ${serviceName}
• Requested Date: ${bookingDate}
• Order ID: ${orderId}

⚠️ *Important:*
Your booking is PENDING until the vendor confirms directly.
You will receive a WhatsApp message from the vendor to confirm.

Do NOT make any advance payment until you receive vendor confirmation.

Need help? Contact us: https://wedmangal.com/ContactUs

— WedMangal Team 💐
`.trim();

  const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};