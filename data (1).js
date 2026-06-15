/**
 * data.js — Waypoint
 * Edit this file to update affiliate IDs, blog links and experience cards.
 * Everything else lives in app.js.
 */

/* ============================================================
   AFFILIATE IDs
   Replace each placeholder with your real ID.
   ============================================================ */
const AFFILIATES = {
  // GetYourGuide — sign up at partner.getyourguide.com
  // Your ID is a number e.g. 12345
  GYG_PARTNER_ID: 'YOUR_GYG_PARTNER_ID',

  // Booking.com — sign up at booking.com/affiliate-program
  // Your ID looks like: 1234567
  BOOKING_AID: 'YOUR_BOOKING_AID',

  // Amazon Associates UK — sign up at affiliate-program.amazon.co.uk
  // Your ID looks like: waypointtravel-21
  AMAZON_TAG: 'YOUR_AMAZON_TAG',
};

/* ============================================================
   AFFILIATE LINK BUILDERS — used throughout app.js
   ============================================================ */
const AffiliateLinks = {
  booking(destination, checkIn, checkOut, guests) {
    const q  = encodeURIComponent(destination);
    const ci = checkIn  ? `&checkin=${checkIn}`   : '';
    const co = checkOut ? `&checkout=${checkOut}` : '';
    const g  = guests   ? `&group_adults=${guests}` : '';
    const aid = AFFILIATES.BOOKING_AID !== 'YOUR_BOOKING_AID'
      ? `&aid=${AFFILIATES.BOOKING_AID}` : '';
    return `https://www.booking.com/searchresults.html?ss=${q}${ci}${co}${g}${aid}`;
  },

  // Expedia — no affiliate program needed, deep link works for referral
  expedia(destination, checkIn, checkOut, guests) {
    const q  = encodeURIComponent(destination);
    const ci = checkIn  ? `&startDate=${checkIn}`  : '';
    const co = checkOut ? `&endDate=${checkOut}`   : '';
    const g  = guests   ? `&adults=${guests}` : '';
    return `https://www.expedia.co.uk/Hotel-Search?destination=${q}${ci}${co}${g}`;
  },

  gyg(destination) {
    const q = encodeURIComponent(destination);
    const pid = AFFILIATES.GYG_PARTNER_ID !== 'YOUR_GYG_PARTNER_ID'
      ? `&partner_id=${AFFILIATES.GYG_PARTNER_ID}` : '';
    return `https://www.getyourguide.com/s/?q=${q}${pid}`;
  },

  gygActivity(activityName, destination) {
    const q = encodeURIComponent(`${activityName} ${destination}`);
    const pid = AFFILIATES.GYG_PARTNER_ID !== 'YOUR_GYG_PARTNER_ID'
      ? `&partner_id=${AFFILIATES.GYG_PARTNER_ID}` : '';
    return `https://www.getyourguide.com/s/?q=${q}${pid}`;
  },

  amazon(searchTerm) {
    const q   = encodeURIComponent(searchTerm);
    const tag = AFFILIATES.AMAZON_TAG !== 'YOUR_AMAZON_TAG'
      ? `&tag=${AFFILIATES.AMAZON_TAG}` : '';
    return `https://www.amazon.co.uk/s?k=${q}${tag}`;
  },
};

/* ============================================================
   FIREBASE CONFIG
   1. Go to console.firebase.google.com
   2. Create a project → Add a web app
   3. Copy the config object shown and paste it below
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

/* ============================================================
   BLOG / LINKTREE LINKS — update with your real URLs
   ============================================================ */
const BLOG_LINKS = [
  { emoji: '📍', label: 'Latest post — 7 Days in Kyoto', href: '#' },
  { emoji: '🎒', label: 'Packing guides',                 href: '#' },
  { emoji: '🏨', label: 'Hotel reviews',                  href: '#' },
  { emoji: '🎟️', label: 'Best GetYourGuide experiences',  href: '#' },
  { emoji: '📸', label: 'Instagram',                      href: '#' },
  { emoji: '🎥', label: 'YouTube — travel vlogs',         href: '#' },
  { emoji: '✉️', label: 'Join the newsletter',            href: '#' },
];
