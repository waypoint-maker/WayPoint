/**
 * app.js — Waypoint application logic
 *
 * Depends on: data.js (must be loaded first in index.html)
 *
 * Sections:
 *   1. Nav toggle (hamburger menu)
 *   2. Profile panel (save / load traveller profile)
 *   3. Itinerary generation (calls Claude AI)
 *   4. Itinerary rendering (day cards, packing list, booking links)
 *   5. PDF export
 *   6. Checkout flow
 *   7. Page build (renders nav, partners, experiences, monetize, blog from data.js)
 */

/* ============================================================
   UTILITY
   ============================================================ */

/** Safely escape any string before inserting into HTML */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}


/* ============================================================
   1. NAV TOGGLE
   ============================================================ */

const burgerBtn  = document.getElementById('burgerBtn');
const navLinks   = document.getElementById('navLinks');

burgerBtn.addEventListener('click', () => {
  burgerBtn.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// Close menu when any nav link is clicked (except the profile trigger)
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    if (a.id === 'profileTrigger') return;
    burgerBtn.classList.remove('open');
    navLinks.classList.remove('open');
  });
});


/* ============================================================
   2. PROFILE PANEL
   ============================================================ */

const PROFILE_KEY     = 'waypoint_traveller_profile';
const profileOverlay  = document.getElementById('profileOverlay');
const profileTrigger  = document.getElementById('profileTrigger');
const savedToast      = document.getElementById('savedToast');

function openProfile() {
  profileOverlay.classList.add('open');
  burgerBtn.classList.remove('open');
  navLinks.classList.remove('open');
}
function closeProfilePanel() { profileOverlay.classList.remove('open'); }

profileTrigger.addEventListener('click', openProfile);
document.getElementById('closeProfile').addEventListener('click', closeProfilePanel);
profileOverlay.addEventListener('click', e => { if (e.target === profileOverlay) closeProfilePanel(); });

// Chip toggle behaviour
document.querySelectorAll('.chip-group').forEach(group => {
  const multi = group.dataset.multi === 'true';
  group.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!multi) {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      } else {
        chip.classList.toggle('active');
      }
    });
  });
});

/** Load profile from localStorage */
function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/** Apply a saved profile object back to the form inputs */
function applyProfileToForm(profile) {
  if (!profile) return;

  document.getElementById('p-name').value          = profile.name         || '';
  document.getElementById('p-airport').value       = profile.airport      || '';
  document.getElementById('p-currency').value      = profile.currency     || 'GBP — £';
  document.getElementById('p-accessibility').value = profile.accessibility || '';
  document.getElementById('p-loyalty').value       = profile.loyalty      || '';
  document.getElementById('p-notes').value         = profile.notes        || '';

  document.querySelectorAll('.chip-group').forEach(group => {
    const key   = group.dataset.group;
    const saved = profile[key];
    group.querySelectorAll('.chip').forEach(chip => {
      const active = group.dataset.multi === 'true'
        ? Array.isArray(saved) && saved.includes(chip.dataset.value)
        : saved === chip.dataset.value;
      chip.classList.toggle('active', active);
    });
  });

  updateProfileNavLabel(profile.name);
}

/** Update the avatar pill in the nav */
function updateProfileNavLabel(name) {
  const avatar = document.getElementById('avatarInitial');
  const label  = document.getElementById('profileLabel');
  if (name) {
    avatar.textContent = name.trim().charAt(0).toUpperCase();
    label.textContent  = name;
  } else {
    avatar.textContent = '?';
    label.textContent  = 'My travel profile';
  }
}

/** Read the current form state into a profile object */
function readProfileFromForm() {
  const profile = {
    name:          document.getElementById('p-name').value.trim(),
    airport:       document.getElementById('p-airport').value.trim(),
    currency:      document.getElementById('p-currency').value,
    accessibility: document.getElementById('p-accessibility').value.trim(),
    loyalty:       document.getElementById('p-loyalty').value.trim(),
    notes:         document.getElementById('p-notes').value.trim(),
  };
  document.querySelectorAll('.chip-group').forEach(group => {
    const key    = group.dataset.group;
    const active = [...group.querySelectorAll('.chip.active')].map(c => c.dataset.value);
    profile[key] = group.dataset.multi === 'true' ? active : (active[0] || '');
  });
  return profile;
}

document.getElementById('saveProfile').addEventListener('click', () => {
  const profile = readProfileFromForm();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  applyProfileToForm(profile);
  closeProfilePanel();
  savedToast.classList.add('show');
  setTimeout(() => savedToast.classList.remove('show'), 2400);
});

document.getElementById('clearProfile').addEventListener('click', () => {
  localStorage.removeItem(PROFILE_KEY);
  document.querySelectorAll('.profile-panel input, .profile-panel textarea')
    .forEach(el => el.value = '');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.getElementById('p-currency').value = 'GBP — £';
  updateProfileNavLabel(null);
});

// Restore on page load
applyProfileToForm(getProfile());


/* ============================================================
   3. ITINERARY GENERATION
   ============================================================ */

/** Build the profile bullet-points string to inject into the Claude prompt */
function buildProfileContext(profile) {
  if (!profile) return '';
  const bits = [];
  if (profile.name)          bits.push(`Traveller name: ${profile.name}`);
  if (profile.airport)       bits.push(`Home airport: ${profile.airport}`);
  if (profile.currency)      bits.push(`Preferred currency: ${profile.currency}`);
  if (profile.flightClass)   bits.push(`Preferred flight class: ${profile.flightClass}`);
  if (profile.pace)          bits.push(`Travel pace: ${profile.pace}`);
  if (profile.diet?.length)  bits.push(`Dietary needs: ${profile.diet.join(', ')}`);
  if (profile.accessibility) bits.push(`Accessibility: ${profile.accessibility}`);
  if (profile.loyalty)       bits.push(`Loyalty preferences: ${profile.loyalty}`);
  if (profile.notes)         bits.push(`Other notes: ${profile.notes}`);
  return bits.length ? `\n\nTraveller profile (always take this into account):\n- ${bits.join('\n- ')}` : '';
}

document.getElementById('generateBtn').addEventListener('click', async () => {
  const destination = document.getElementById('destination').value.trim() || 'Kyoto, Japan';
  const days        = document.getElementById('days').value        || 5;
  const travellers  = document.getElementById('travellers').value  || 1;
  const budget      = document.getElementById('budget').value;
  const interests   = document.getElementById('interests').value.trim();
  const notes       = document.getElementById('notes').value.trim();
  const profile     = getProfile();

  const resultEl = document.getElementById('result');
  resultEl.innerHTML = `<div class="loading"><span>Drafting your itinerary</span>
    <span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;

  const prompt = buildPrompt({ destination, days, travellers, budget, interests, notes, profile });

  try {
    const itinerary = await callClaude(prompt, { destination, travellers: +travellers, profile });
    window.__lastItinerary   = itinerary;
    window.__lastDestination = destination;
    window.__lastTravellers  = +travellers;
    renderItinerary(itinerary, destination, +travellers);
  } catch (err) {
    resultEl.innerHTML = `<div class="error-box"><strong>Couldn't generate the itinerary.</strong><br>
      Please try again in a moment. (${escapeHtml(err.message)})</div>`;
  }
});

/** Build the structured Claude prompt */
function buildPrompt({ destination, days, travellers, budget, interests, notes, profile }) {
  return `You are a travel planning assistant. Create a detailed ${days}-day itinerary for ${travellers} traveller(s) visiting ${destination}.
Budget level: ${budget || 'Mid-range'}.
Interests/style: ${interests || 'general sightseeing'}.
Additional notes: ${notes || 'none'}.${buildProfileContext(profile)}

Respond ONLY with valid JSON, no markdown fences, no commentary, matching exactly this schema:
{
  "tripTitle": "string",
  "summary": "1-2 sentence overview",
  "days": [
    {
      "dayNumber": 1,
      "title": "short theme for the day",
      "activities": [
        {"time": "09:00", "name": "activity name", "description": "1 sentence description", "category": "flight|hotel|food|activity|transport"}
      ]
    }
  ],
  "packingList": ["item 1", "item 2", "item 3"],
  "estimatedCostPerPerson": 0
}
Include 3-5 activities per day with real place names and neighbourhoods.
packingList: 6-10 items specific to the destination climate and activities.
estimatedCostPerPerson: realistic rough total in GBP for flights+stays+activities at the ${budget || 'Mid-range'} level for ${days} days (number only).`;
}

/**
 * Call Claude.
 * - If BACKEND_URL is set in data.js, calls your Firebase function (hides API key).
 * - Otherwise calls Anthropic directly (prototype/dev mode only).
 */
async function callClaude(prompt) {
  let rawText;

  if (BACKEND_URL) {
    // ── PRODUCTION: call your own backend ──
    const res = await fetch(`${BACKEND_URL}/generateItinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.itinerary; // backend already parses and returns the object
  } else {
    // ── PROTOTYPE: direct Anthropic call (API key handled by this environment) ──
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    rawText = data.content.map(b => b.text || '').join('').trim();
    const clean = rawText.replace(/^```json\s*|^```\s*|```$/gm, '').trim();
    return JSON.parse(clean);
  }
}


/* ============================================================
   4. ITINERARY RENDERING
   ============================================================ */

function renderItinerary(itinerary, destination, travellers) {
  const resultEl = document.getElementById('result');

  let html = `
    <h3 style="font-family:'Fraunces',serif;font-size:1.6rem;margin-bottom:6px;">
      ${escapeHtml(itinerary.tripTitle || 'Your Itinerary')}
    </h3>
    <p style="opacity:0.7;font-size:0.92rem;margin-bottom:24px;">
      ${escapeHtml(itinerary.summary || '')}
    </p>`;

  // Day cards
  (itinerary.days || []).forEach(day => {
    html += `
      <div class="day-card">
        <div class="day-head">
          <h4>${escapeHtml(day.title || 'Day')}</h4>
          <span class="day-num mono">DAY ${day.dayNumber}</span>
        </div>
        <div class="day-body">`;

    (day.activities || []).forEach(act => {
      html += `
          <div class="activity">
            <div class="time mono">${escapeHtml(act.time || '')}</div>
            <div class="desc">
              <strong>${escapeHtml(act.name || '')}</strong>
              <p>${escapeHtml(act.description || '')}</p>
            </div>
          </div>`;
    });

    html += `</div></div>`;
  });

  // Packing list with Amazon affiliate links
  if (itinerary.packingList?.length) {
    html += `
      <div class="packing-list">
        <h4>Packing list for ${escapeHtml(destination)}</h4>
        <div class="packing-grid">`;
    itinerary.packingList.forEach(item => {
      html += `<a href="${AffiliateLinks.amazon(item)}" target="_blank" rel="noopener">
        🧳 ${escapeHtml(item)} →</a>`;
    });
    html += `</div></div>`;
  }

  // Booking links — only the three affiliates we're using
  html += `
    <div style="margin-top:24px;">
      <h4 style="font-family:'Fraunces',serif;font-size:1.1rem;margin-bottom:12px;">Book this trip</h4>
      <div class="booking-actions">
        <a href="${AffiliateLinks.booking(destination)}" target="_blank" rel="noopener">
          Hotels — Booking.com →</a>
        <a href="${AffiliateLinks.gyg(destination)}" target="_blank" rel="noopener">
          Experiences — GetYourGuide →</a>
        <a href="${AffiliateLinks.amazon('travel accessories')}" target="_blank" rel="noopener">
          Gear — Amazon →</a>
      </div>
    </div>`;

  // PDF export button
  html += `
    <div style="margin-top:16px;">
      <button class="btn ghost" id="pdfExportBtn" type="button" style="font-size:0.85rem;">
        ⬇ Export itinerary as PDF (free)
      </button>
    </div>`;

  // Checkout CTA
  const cost       = itinerary.estimatedCostPerPerson || 0;
  const totalEst   = cost * travellers;
  const bookingFee = BOOKING_FEE_PER_PERSON_GBP * travellers;

  html += `
    <div class="checkout-cta">
      <div>
        <div class="price">£${bookingFee}
          <span>Waypoint planning &amp; concierge fee
            (${travellers > 1 ? 'group' : 'one traveller'}, one-time)</span>
        </div>
        <div style="font-size:0.85rem;opacity:0.7;margin-top:6px;">
          Estimated trip cost (flights+stays+activities): ~£${totalEst} for ${travellers} traveller(s).
          This is a rough guide — final prices are set by the airlines and hotels.
        </div>
      </div>
      <button class="btn" id="bookTripBtn" type="button">
        Book this trip with Waypoint
      </button>
    </div>`;

  resultEl.innerHTML = html;

  document.getElementById('pdfExportBtn').addEventListener('click', () =>
    exportPdf(itinerary, destination));
  document.getElementById('bookTripBtn').addEventListener('click', () =>
    openCheckout(itinerary, destination, travellers, bookingFee));
}


/* ============================================================
   5. PDF EXPORT
   ============================================================ */

function exportPdf(itinerary, destination) {
  const w = window.open('', '_blank');
  let body = `
    <h1 style="font-family:Georgia,serif;">${escapeHtml(itinerary.tripTitle || 'Your Itinerary')}</h1>
    <p>${escapeHtml(itinerary.summary || '')}</p>`;

  (itinerary.days || []).forEach(day => {
    body += `<h3>Day ${day.dayNumber}: ${escapeHtml(day.title || '')}</h3><ul>`;
    (day.activities || []).forEach(act => {
      body += `<li><strong>${escapeHtml(act.time || '')}</strong> — ${escapeHtml(act.name || '')}: ${escapeHtml(act.description || '')}</li>`;
    });
    body += `</ul>`;
  });

  if (itinerary.packingList?.length) {
    body += `<h3>Packing list</h3><ul>
      ${itinerary.packingList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  }

  body += `<p style="margin-top:40px;font-size:0.8rem;color:#999;">
    Generated by Waypoint AI. Always verify prices and availability before booking.
  </p>`;

  w.document.write(`<html><head><title>${escapeHtml(itinerary.tripTitle || 'Itinerary')}</title></head>
    <body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#0B1F2A;">
      ${body}
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}


/* ============================================================
   6. CHECKOUT FLOW
   ============================================================ */

const checkoutOverlay = document.getElementById('checkoutOverlay');
const checkoutContent = document.getElementById('checkoutContent');

document.getElementById('closeCheckout').addEventListener('click', () =>
  checkoutOverlay.classList.remove('open'));
checkoutOverlay.addEventListener('click', e => {
  if (e.target === checkoutOverlay) checkoutOverlay.classList.remove('open');
});

function openCheckout(itinerary, destination, travellers, bookingFee) {
  const profile = getProfile() || {};
  checkoutContent.innerHTML = `
    <h3>Book this trip</h3>
    <p class="sub">${escapeHtml(itinerary.tripTitle || destination)} · ${travellers} traveller(s)</p>

    <div class="checkout-summary">
      <div class="line">
        <span>Waypoint planning &amp; concierge fee</span>
        <span>£${bookingFee}.00</span>
      </div>
      <div class="line total">
        <span>Total due now</span>
        <span>£${bookingFee}.00</span>
      </div>
    </div>

    <label>Full name</label>
    <input id="co-name" value="${escapeHtml(profile.name || '')}" placeholder="Full name">

    <label>Email</label>
    <input id="co-email" type="email" placeholder="you@email.com">

    <label>Card details</label>
    <div class="checkout-row3">
      <input id="co-card" placeholder="Card number" maxlength="19">
      <input id="co-exp"  placeholder="MM / YY"     maxlength="7">
      <input id="co-cvc"  placeholder="CVC"          maxlength="4">
    </div>

    <button class="btn" id="payNowBtn" type="button" style="width:100%;margin-top:22px;">
      Pay £${bookingFee}.00 &amp; submit booking request
    </button>

    <p class="checkout-disclaimer">
      This charge covers Waypoint's planning &amp; concierge service — not the airline or hotel.
      After payment, our team finds and confirms the flights, stays and experiences from your
      itinerary and emails you the confirmations within 24 hours. We contact you before making
      any non-refundable booking if prices have changed.<br><br>
      <em>Demo notice: connect Stripe in your Firebase backend to accept real payments.</em>
    </p>`;

  checkoutOverlay.classList.add('open');

  document.getElementById('payNowBtn').addEventListener('click', () => {
    const name  = document.getElementById('co-name').value.trim();
    const email = document.getElementById('co-email').value.trim();
    if (!name || !email) {
      alert('Please enter your name and email so we can send your confirmation.');
      return;
    }
    showConfirmation(itinerary, destination, name, email, bookingFee);
  });
}

function showConfirmation(itinerary, destination, name, email, bookingFee) {
  const ref = 'WP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  checkoutContent.innerHTML = `
    <div class="confirmation-box">
      <div class="checkmark">✓</div>
      <h3>Booking request submitted</h3>
      <p>Thanks, ${escapeHtml(name)} — your payment of £${bookingFee}.00 has been received.</p>
      <div class="ref-code">Reference: ${ref}</div>
      <p>Our team will confirm the flights, stays and experiences for
        <strong>${escapeHtml(destination)}</strong>
        and email everything to <strong>${escapeHtml(email)}</strong> within 24 hours.
      </p>
      <p style="margin-top:10px;font-size:0.85rem;opacity:0.6;">
        We'll contact you before any non-refundable booking if prices have changed.
      </p>
      <button class="btn" type="button" style="margin-top:18px;"
        onclick="document.getElementById('checkoutOverlay').classList.remove('open')">
        Done
      </button>
    </div>`;
}


/* ============================================================
   7. PAGE BUILD — renders dynamic content from data.js
   ============================================================ */

/** Build the partner cards section */
function buildPartners() {
  const el = document.getElementById('partnerGrid');
  if (!el) return;
  el.innerHTML = PARTNERS.map(p => `
    <a class="partner-card" href="${escapeHtml(p.href)}" target="_blank" rel="noopener">
      <h4>${escapeHtml(p.name)}</h4>
      <span class="mono">${escapeHtml(p.category)}</span>
    </a>`).join('');
}

/** Build the featured experience cards */
function buildExperiences() {
  const el = document.getElementById('experiencesGrid');
  if (!el) return;
  el.innerHTML = FEATURED_EXPERIENCES.map(exp => `
    <div class="feature-card">
      ${exp.sponsored ? '<span class="sponsored-badge">Recommended by Waypoint AI · Sponsored</span><br>' : ''}
      <span class="num">${escapeHtml(exp.id)}</span>
      <h3>${escapeHtml(exp.title)}</h3>
      <p>${escapeHtml(exp.description)}</p>
      <div class="booking-actions">
        <a href="${AffiliateLinks.gygActivity(exp.gygSlug)}" target="_blank" rel="noopener">
          View on GetYourGuide →
        </a>
      </div>
    </div>`).join('');
}

/** Build the blog / linktree links */
function buildBlog() {
  const el = document.getElementById('blogLinks');
  if (!el) return;
  el.innerHTML = BLOG_LINKS.map(l => `
    <a class="lt-link" href="${escapeHtml(l.href)}" target="_blank" rel="noopener">
      ${l.emoji} ${escapeHtml(l.label)}
    </a>`).join('');
}

/** Build the monetization list */
function buildMonetize() {
  const el = document.getElementById('monetizeList');
  if (!el) return;
  el.innerHTML = MONETIZE_ITEMS.map(m => `
    <div class="monetize-item">
      <div class="icon-num">${escapeHtml(m.num)}</div>
      <div>
        <h4>${escapeHtml(m.title)}</h4>
        <p>${escapeHtml(m.desc)}</p>
      </div>
      <span class="tag">${escapeHtml(m.tag)}</span>
    </div>`).join('');
}

// Run page build on load
buildPartners();
buildExperiences();
buildBlog();
buildMonetize();
