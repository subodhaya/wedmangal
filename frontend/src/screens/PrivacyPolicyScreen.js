import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './RemovalRequestScreen.css';   // shared policy-page styles (rrp-)

const EMAIL = 'subodhayas@gmail.com';

const SECTIONS = [
  { id: 'collect', title: 'What we collect', body: (
    <>
      <p><strong>When you use an account:</strong> your name, email address, mobile number, a scrambled (hashed) password if you set one, and your wedding date if you add it. If you continue with Google, we receive your name and verified email address from Google. We never receive your Google password.</p>
      <p><strong>When you plan or book:</strong> bookings, dates and address details you enter, wishlist, cart, budget, saved requirements, reviews, and enquiries (your name, mobile number, event date and message).</p>
      <p><strong>When you list a business:</strong> business name, category, phone numbers, address, prices, description, links, photos and videos.</p>
      <p><strong>When you ask us to remove or correct a listing:</strong> your contact details, your message and any file you attach.</p>
      <p><strong>When you browse:</strong> pages viewed, searches, taps such as Call or WhatsApp, the type of device (mobile, tablet or desktop) and a random session number kept on your device. If you are logged in, this activity is linked to your account. We do not store your IP address with this activity. Our web server may keep standard technical logs that include IP addresses, for security. We use your IP address for a moment to suggest a city; that lookup happens on our own server.</p>
      <p>Photos you add to the wedding invitation maker stay on your device and are not uploaded. The Android app does not ask for your location, contacts, microphone or phone storage. We do not process card or bank details on WedMangal.</p>
    </>
  ) },
  { id: 'use', title: 'How we use it', body: (
    <ul>
      <li>To run your account, log you in and send login codes by WhatsApp or SMS.</li>
      <li>To send your enquiry or booking to the vendor you chose.</li>
      <li>To show listings and reviews, and to verify who owns a listing.</li>
      <li>To answer you, prevent misuse and improve search and the site.</li>
      <li>To show vendors how many people viewed or contacted their listing. These counts do not name visitors.</li>
    </ul>
  ) },
  { id: 'share', title: 'Who we share it with', body: (
    <>
      <p>We do not sell your personal data and we do not show third-party advertising.</p>
      <ul>
        <li><strong>Vendors you contact or book:</strong> the details in your enquiry or booking. When you tap Call or WhatsApp, you contact the vendor directly.</li>
        <li><strong>Message delivery:</strong> Fast2SMS, WhatsApp and our email provider, to deliver codes and enquiry messages.</li>
        <li><strong>Google:</strong> for Google login, and for the fonts used on our pages. Icons load from Cloudflare’s cdnjs. These services receive your IP address when your device loads them.</li>
        <li><strong>Our hosting provider:</strong> stores the website and database for us.</li>
        <li><strong>Authorities:</strong> only when the law requires it.</li>
      </ul>
      <p>Business listings, photos, videos and reviews are public. Some listings are created from publicly available business information.</p>
      <p><strong>Business owners:</strong> if you don’t want your business listed, or something on your listing is wrong or uses your photos without permission, <Link to="/removal-request">send a request</Link>, call or WhatsApp +91 72001 52906, or email {EMAIL}. We take a listing down as soon as we confirm the request comes from the business. You don’t need an account.</p>
    </>
  ) },
  { id: 'keep', title: 'How long we keep it, and deletion', body: (
    <>
      <p>We keep account data until you delete your account. You can do that yourself at any time on the <Link to="/delete-account">delete your account</Link> page, which lists what is erased and what stays without your name.</p>
      <p>Enquiries sent without logging in are not linked to an account. Email us the number you used and we will erase them after checking it is yours. Copies in backups are kept only for recovery and are removed as backups are replaced.</p>
    </>
  ) },
  { id: 'rights', title: 'Your choices', body: (
    <ul>
      <li>See and change your details in <Link to="/profile">your profile</Link>.</li>
      <li>Ask us for a copy of your data, a correction or erasure, or withdraw consent, by email.</li>
      <li>Clear WedMangal’s saved data in your browser or phone settings. We use this storage to keep you logged in and remember your city and cart.</li>
    </ul>
  ) },
  { id: 'security', title: 'Security and children', body: (
    <>
      <p>Data is sent over encrypted (HTTPS) connections and access is limited to people who need it. No system is perfectly secure; if a breach affects you, we will tell you as the law requires.</p>
      <p>WedMangal is for adults. It is not meant for anyone under 18, and we do not knowingly collect their data.</p>
    </>
  ) },
  { id: 'contact', title: 'Contact', body: (
    <p>Privacy questions and complaints: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>, or WedMangal, 11/49, Thiru-Vi-Ka Street, Postal Audit Colony, Saligramam, Chennai, Tamil Nadu 600093, India. If this policy changes, we will update this page and its date.</p>
  ) },
];

export default function PrivacyPolicyScreen() {
  return (
    <div className="rrp-page">
      <Helmet>
        <title>Privacy Policy | WedMangal</title>
        <meta name="description" content="What personal data the WedMangal website and Android app collect, how we use and share it, and how to delete it." />
        <link rel="canonical" href="https://www.wedmangal.com/privacy-policy" />
      </Helmet>
      <div className="rrp-header">
        <h1 className="rrp-title">Privacy Policy</h1>
        <p className="rrp-sub">For the WedMangal website and Android app. Last updated 26 November 2026.</p>
      </div>
      <nav className="rrp-toc" aria-label="On this page">
        {SECTIONS.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
      </nav>
      {SECTIONS.map(s => (
        <section key={s.id} id={s.id} className="rrp-card" aria-labelledby={`${s.id}-h`}>
          <h2 className="rrp-h2" id={`${s.id}-h`}>{s.title}</h2>
          {s.body}
        </section>
      ))}
    </div>
  );
}
