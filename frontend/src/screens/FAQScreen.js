import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './FAQScreen.css';

const FAQS = [
  {
    id: 'f1',
    icon: '🔍',
    question: 'What is WedMangal?',
    answer: (
      <p>WedMangal is Tamil Nadu's wedding vendor marketplace. It connects engaged couples with trusted local wedding service providers — photographers, makeup artists, caterers, decorators, mehandi artists, DJs, event planners, pandits, jewellers, and more — all in one place.</p>
    ),
  },
  {
    id: 'f2',
    icon: '💰',
    question: 'Is WedMangal free for customers?',
    answer: (
      <p>Yes. Browsing vendor profiles, reading reviews, and booking services on WedMangal is completely free for customers. You pay the vendor directly for their service — WedMangal does not charge any booking fee.</p>
    ),
  },
  {
    id: 'f3',
    icon: '📅',
    question: 'How do I book a wedding vendor?',
    answer: (
      <ol>
        <li>Browse by category or search by name / city on the homepage.</li>
        <li>Open a vendor's profile to view their services, pricing, and reviews.</li>
        <li>Select a service, pick your wedding date and time slot.</li>
        <li>Click <strong>Book Now</strong> — the vendor is notified instantly via WhatsApp.</li>
        <li>The vendor confirms the booking directly with you.</li>
      </ol>
    ),
  },
  {
    id: 'f4',
    icon: '📍',
    question: 'Which cities and areas does WedMangal cover?',
    answer: (
      <>
        <p>WedMangal currently covers Tamil Nadu, India — including:</p>
        <p><strong>Chennai, Coimbatore, Madurai, Salem, Trichy (Tiruchirappalli), Tirunelveli, Vellore, Thanjavur, Erode, Tiruppur</strong> and surrounding towns.</p>
        <p>New vendors from other cities are welcome to <Link to="/owner-register">register here</Link>.</p>
      </>
    ),
  },
  {
    id: 'f5',
    icon: '✅',
    question: 'Are vendors on WedMangal verified?',
    answer: (
      <p>Yes. All vendor listings go through a review and approval process before they appear on the platform. Customer reviews and ratings on each profile are from real bookings.</p>
    ),
  },
  {
    id: 'f6',
    icon: '🟢',
    question: 'What is the "Available Today" feature?',
    answer: (
      <p>"Available Today" shows vendors who are free and available for same-day or next-day bookings. Vendors toggle their availability in real time, so if a date opens up, you can book instantly. <Link to="/available-today">See who's available now →</Link></p>
    ),
  },
  {
    id: 'f7',
    icon: '🏪',
    question: 'How do I register as a vendor on WedMangal?',
    answer: (
      <>
        <p>Click <Link to="/owner-register">Register as Vendor</Link> and fill in your business details. Once your listing is reviewed and approved, it goes live on the platform and customers can start booking you.</p>
        <p>Listing your business on WedMangal is free.</p>
      </>
    ),
  },
  {
    id: 'f8',
    icon: '💳',
    question: 'Do I pay in advance when booking?',
    answer: (
      <p>No advance payment is made through WedMangal. Bookings are confirmed via WhatsApp between you and the vendor. Payment terms (advance, full payment, etc.) are agreed directly with the vendor. Do <strong>not</strong> make any payment until the vendor confirms your booking.</p>
    ),
  },
  {
    id: 'f9',
    icon: '❌',
    question: 'How do I cancel a booking?',
    answer: (
      <p>Contact the vendor directly via the phone number or WhatsApp on their profile to cancel or reschedule. Cancellation policies vary by vendor — please review the vendor's terms before confirming. See our <Link to="/RefundAndCancellation">Refund & Cancellation Policy</Link> for more details.</p>
    ),
  },
  {
    id: 'f10',
    icon: '⭐',
    question: 'How do I leave a review for a vendor?',
    answer: (
      <p>Open the vendor's profile page and scroll to the service you booked. You'll find a <strong>Write a Review</strong> section where you can leave a star rating and comment. You must be logged in to submit a review.</p>
    ),
  },
  {
    id: 'f11',
    icon: '📞',
    question: 'How do I contact WedMangal support?',
    answer: (
      <p>You can reach us through the <Link to="/ContactUs">Contact Us</Link> page. We'll get back to you as soon as possible.</p>
    ),
  },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
      <button className="faq-question" onClick={() => onToggle(faq.id)} aria-expanded={isOpen}>
        <span className="faq-icon">{faq.icon}</span>
        <span className="faq-question-text">{faq.question}</span>
        <svg
          className={`faq-chevron${isOpen ? ' faq-chevron--open' : ''}`}
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="faq-answer" style={{ maxHeight: isOpen ? '600px' : '0' }}>
        <div className="faq-answer-inner">{faq.answer}</div>
      </div>
    </div>
  );
}

export default function FAQScreen() {
  const [openId, setOpenId] = useState('f3');
  const toggle = (id) => setOpenId(prev => prev === id ? null : id);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: typeof f.answer === 'string' ? f.answer : f.question,
      },
    })),
  };

  return (
    <div className="faq-page">
      <Helmet>
        <title>Frequently Asked Questions | WedMangal</title>
        <meta name="description" content="Got questions about booking wedding vendors in Tamil Nadu? Find answers about how WedMangal works, vendor registration, payments, cancellations and more." />
        <link rel="canonical" href="https://www.wedmangal.com/faq" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="faq-hero">
        <h1 className="faq-hero-title">Frequently Asked Questions</h1>
        <p className="faq-hero-sub">Everything you need to know about booking wedding vendors on WedMangal</p>
      </div>

      <div className="faq-container">
        {FAQS.map(faq => (
          <FAQItem
            key={faq.id}
            faq={faq}
            isOpen={openId === faq.id}
            onToggle={toggle}
          />
        ))}

        <div className="faq-contact-cta">
          <p>Still have questions?</p>
          <Link to="/ContactUs" className="faq-contact-btn">Contact Us →</Link>
        </div>
      </div>
    </div>
  );
}
