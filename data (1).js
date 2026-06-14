/**
 * data.js — Waypoint static content
 *
 * All hardcoded content lives here so you only need to edit one file
 * to change text, links, affiliate IDs, and experience cards.
 *
 * ─────────────────────────────────────────────────────────────────
 * HOW TO ADD YOUR REAL AFFILIATE IDs
 * ─────────────────────────────────────────────────────────────────
 * 1. Sign up at each program (links below each entry)
 * 2. Replace the placeholder value with your real ID
 * 3. Save — the whole site picks it up automatically
 * ─────────────────────────────────────────────────────────────────
 */

/* ============================================================
   AFFILIATE IDs — REPLACE THESE WITH YOUR REAL IDs
   ============================================================ */

const AFFILIATES = {
  /**
   * GetYourGuide
   * Sign up: https://partner.getyourguide.com
   * Your partner ID looks like: partner_id=12345
   */
  GYG_PARTNER_ID: 'YOUR_GYG_PARTNER_ID',

  /**
   * Booking.com
   * Sign up: https://www.booking.com/affiliate-program/v2/index.html
   * Your affiliate ID looks like: aid=XXXXXXX
   */
  BOOKING_AID: 'YOUR_BOOKING_AID',

  /**
   * Amazon Associates (UK)
   * Sign up: https://affiliate-program.amazon.co.uk
   * Your tracking ID looks like: waypointtravel-21
   */
  AMAZON_TAG: 'YOUR_AMAZON_TAG-21',
};


/* ============================================================
   AFFILIATE LINK BUILDERS
   Call these anywhere in app.js to get a properly tracked URL
   ============================================================ */

const AffiliateLinks = {
  /** GetYourGuide search for a destination */
  gyg(destination) {
    const q = encodeURIComponent(destination);
    const partner = AFFILIATES.GYG_PARTNER_ID !== 'YOUR_GYG_PARTNER_ID'
      ? `&partner_id=${AFFILIATES.GYG_PARTNER_ID}`
      : '';
    return `https://www.getyourguide.com/s/?q=${q}${partner}`;
  },

  /** GetYourGuide link for a specific activity URL slug */
  gygActivity(slug) {
    const partner = AFFILIATES.GYG_PARTNER_ID !== 'YOUR_GYG_PARTNER_ID'
      ? `?partner_id=${AFFILIATES.GYG_PARTNER_ID}`
      : '';
    return `https://www.getyourguide.com/${slug}${partner}`;
  },

  /** Booking.com hotel search */
  booking(destination) {
    const q = encodeURIComponent(destination);
    const aid = AFFILIATES.BOOKING_AID !== 'YOUR_BOOKING_AID'
      ? `&aid=${AFFILIATES.BOOKING_AID}`
      : '';
    return `https://www.booking.com/searchresults.html?ss=${q}${aid}`;
  },

  /** Amazon product search */
  amazon(searchTerm) {
    const q = encodeURIComponent(searchTerm);
    const tag = AFFILIATES.AMAZON_TAG !== 'YOUR_AMAZON_TAG-21'
      ? `&tag=${AFFILIATES.AMAZON_TAG}`
      : '';
    return `https://www.amazon.co.uk/s?k=${q}${tag}`;
  },
};


/* ============================================================
   NAV LINKS
   Add, remove or rename pages here
   ============================================================ */

const NAV_LINKS = [
  { label: 'AI Planner',       href: '#planner'     },
  { label: 'Book',             href: '#book'         },
  { label: 'Experiences',      href: '#experiences'  },
  { label: 'Travel Notes',     href: '#blog'         },
  { label: 'Earn With Us',     href: '#monetize', className: 'btn ghost' },
];


/* ============================================================
   PARTNER CARDS (Compare & Book section)
   Remove any you're not using; only keep affiliates you've joined
   ============================================================ */

const PARTNERS = [
  {
    name: 'GetYourGuide',
    category: 'Tours & Activities',
    href: AffiliateLinks.gyg(''),
  },
  {
    name: 'Booking.com',
    category: 'Hotels & Stays',
    href: AffiliateLinks.booking(''),
  },
  {
    name: 'Amazon',
    category: 'Travel Gear',
    href: AffiliateLinks.amazon('travel accessories'),
  },
];


/* ============================================================
   FEATURED EXPERIENCES (static GYG cards on the homepage)
   Replace slugs with real GYG activity slugs from their partner dashboard
   ============================================================ */

const FEATURED_EXPERIENCES = [
  {
    id: 'EXP/01',
    title: 'Skip-the-line Temple & Garden Tour',
    description: "Guided half-day tour of Kyoto's most iconic temples with a local historian.",
    gygSlug: 'kyoto-l151/',   // replace with your real GYG activity slug
    sponsored: true,
  },
  {
    id: 'EXP/02',
    title: 'Evening Food & Market Walk',
    description: 'Small-group street food crawl through Nishiki Market with tastings included.',
    gygSlug: 'kyoto-l151/',
    sponsored: false,
  },
  {
    id: 'EXP/03',
    title: 'Day Trip: Arashiyama Bamboo & Hills',
    description: 'Full-day countryside escape with a scenic train ride and guided hike.',
    gygSlug: 'kyoto-l151/',
    sponsored: false,
  },
];


/* ============================================================
   BLOG / LINKTREE LINKS
   Update these with your real social + blog URLs
   ============================================================ */

const BLOG_LINKS = [
  { emoji: '📍', label: 'Latest blog post — 7 Days in Kyoto', href: '#' },
  { emoji: '🎒', label: 'Packing guides & gear picks',         href: '#' },
  { emoji: '🏨', label: 'Hotel reviews',                       href: '#' },
  { emoji: '🎟️', label: 'Best GetYourGuide experiences',       href: '#' },
  { emoji: '📸', label: 'Instagram',                           href: '#' },
  { emoji: '🎥', label: 'YouTube — travel vlogs',              href: '#' },
  { emoji: '✉️', label: 'Join the newsletter',                 href: '#' },
];


/* ============================================================
   MONETIZATION ITEMS (shown in the "Earn With Us" section)
   ============================================================ */

const MONETIZE_ITEMS = [
  { num: '01', title: 'GetYourGuide affiliate',      tag: 'Passive',     desc: "Earn 8% commission on every experience booked through your GetYourGuide partner links. Applied automatically to every itinerary the AI generates." },
  { num: '02', title: 'Booking.com affiliate',       tag: 'Passive',     desc: "Earn 25-40% of Booking.com's commission (typically 4% of booking value) every time a user books a hotel through your affiliate link." },
  { num: '03', title: 'Amazon Associates',           tag: 'Passive',     desc: "Earn 1-5% on every packing list item bought through your Amazon link. The AI generates a custom list for every destination automatically." },
  { num: '04', title: 'Trip planning fee',           tag: 'High-margin', desc: 'Charge £25/person as a one-time concierge fee — customers pay you, you action the bookings using your affiliate links. You earn the fee + commissions.' },
  { num: '05', title: 'Premium subscription',        tag: 'Recurring',   desc: 'Free tier: 1 itinerary/month. Paid tier (£9/mo): unlimited regenerations, multi-city trips, PDF export, saved itineraries.' },
  { num: '06', title: 'Sponsored experience slots',  tag: 'B2B',         desc: 'Tour operators pay to have their GetYourGuide listing appear as "Recommended by Waypoint AI" on relevant destination pages. Labelled as sponsored.' },
  { num: '07', title: 'Group trip tool',             tag: 'Growth',      desc: 'Charge a small fee for shared itineraries where a group can all vote on activities. Great viral mechanic — every user invites their travel companions.' },
];


/* ============================================================
   BOOKING FEE CONFIG
   Change the per-person fee here — reflected everywhere in the app
   ============================================================ */

const BOOKING_FEE_PER_PERSON_GBP = 25;


/* ============================================================
   BACKEND URL
   Once your Firebase backend is live, paste the base URL here.
   Leave as empty string ('') to use the direct Anthropic API (prototype mode).
   ============================================================ */

const BACKEND_URL = ''; // e.g. 'https://us-central1-your-project.cloudfunctions.net'
