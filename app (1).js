/**
 * app.js — Waypoint
 * Requires data.js to be loaded first.
 *
 * Architecture:
 *  - Firebase Auth (email/password) + Firestore (user profiles)
 *  - Claude AI chatbot handles the ENTIRE trip planning conversation
 *  - At the end Claude produces booking cards → user taps → redirected to
 *    Booking.com / GetYourGuide / Expedia to finalise payment
 *  - Amazon affiliate links on packing list items
 */

/* ============================================================
   UTILITY
   ============================================================ */
function esc(str) {
  return String(str || '').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ============================================================
   FIREBASE  — Auth + Firestore
   ============================================================ */

/**
 * SETUP STEPS (one-time, ~15 minutes):
 *
 * 1. Go to console.firebase.google.com
 * 2. Click "Add project" → give it a name → Create
 * 3. Inside the project, click the </> icon to add a Web App → Register it
 * 4. Copy the firebaseConfig object shown and paste it into FIREBASE_CONFIG in data.js
 * 5. In the left sidebar: Build → Authentication → Get started → Enable "Email/Password"
 * 6. In the left sidebar: Build → Firestore Database → Create database → Start in production mode
 *    → choose a region → Done
 * 7. In Firestore, click "Rules" tab and paste:
 *      rules_version = '2';
 *      service cloud.firestore {
 *        match /databases/{database}/documents {
 *          match /users/{userId} {
 *            allow read, write: if request.auth != null && request.auth.uid == userId;
 *          }
 *        }
 *      }
 *    Then click Publish
 * 8. Deploy your four files to GitHub — accounts now work
 */

import { initializeApp }          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, updateProfile }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let app, auth, db;
let currentUser  = null;
let userProfile  = {};

function firebaseReady() {
  return FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
}

if (firebaseReady()) {
  app  = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db   = getFirestore(app);

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
      // Load profile from Firestore
      const snap = await getDoc(doc(db, 'users', user.uid));
      userProfile = snap.exists() ? snap.data() : {};
      populateProfilePanel();
    } else {
      userProfile = {};
    }
    updateNavAuth();
  });
}

/* ── Helpers ── */
async function saveProfileToFirestore(data) {
  if (!currentUser || !db) return;
  await setDoc(doc(db, 'users', currentUser.uid), data, { merge: true });
}

/* ============================================================
   AUTH PANEL UI
   ============================================================ */
const authOverlay = document.getElementById('authOverlay');

function openAuth(startView) {
  showView(startView || (currentUser ? 'viewProfile' : 'viewSignIn'));
  authOverlay.classList.add('open');
}
function closeAuth() { authOverlay.classList.remove('open'); }

function showView(id) {
  ['viewSignIn','viewSignUp','viewProfile'].forEach(v =>
    document.getElementById(v).style.display = v === id ? '' : 'none');
}

document.getElementById('closeAuth').addEventListener('click', closeAuth);
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) closeAuth(); });
document.getElementById('goSignUp').addEventListener('click', () => showView('viewSignUp'));
document.getElementById('goSignIn').addEventListener('click', () => showView('viewSignIn'));
document.getElementById('continueGuest').addEventListener('click', closeAuth);

/* Sign in */
document.getElementById('signInBtn').addEventListener('click', async () => {
  const email = document.getElementById('siEmail').value.trim();
  const pass  = document.getElementById('siPassword').value;
  const err   = document.getElementById('siError');
  err.textContent = '';
  if (!firebaseReady()) {
    err.textContent = 'Firebase not configured yet — see setup steps in app.js.'; return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeAuth();
    showToast('✓ Signed in');
  } catch (e) {
    err.textContent = friendlyAuthError(e.code);
  }
});

/* Sign up */
document.getElementById('signUpBtn').addEventListener('click', async () => {
  const name  = document.getElementById('suName').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const pass  = document.getElementById('suPassword').value;
  const err   = document.getElementById('suError');
  err.textContent = '';
  if (!name || !email || !pass) { err.textContent = 'Please fill in all fields.'; return; }
  if (!firebaseReady()) {
    err.textContent = 'Firebase not configured yet — see setup steps in app.js.'; return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), { name }, { merge: true });
    closeAuth();
    showToast('✓ Account created — welcome to Waypoint!');
  } catch (e) {
    err.textContent = friendlyAuthError(e.code);
  }
});

/* Sign out */
document.getElementById('signOutBtn').addEventListener('click', async () => {
  if (auth) await signOut(auth);
  currentUser = null; userProfile = {};
  updateNavAuth();
  closeAuth();
  showToast('Signed out');
});

/* Save profile */
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const p = readProfileFromPanel();
  userProfile = { ...userProfile, ...p };
  if (currentUser) {
    await saveProfileToFirestore(p);
    showToast('✓ Profile saved to your account');
  } else {
    localStorage.setItem('wp_profile', JSON.stringify(p));
    showToast('✓ Profile saved to this browser');
  }
  closeAuth();
});

function readProfileFromPanel() {
  const p = {
    airport:       document.getElementById('pAirport').value.trim(),
    currency:      document.getElementById('pCurrency').value,
    flightClass:   document.getElementById('pFlight').value,
    notes:         document.getElementById('pNotes').value.trim(),
  };
  document.querySelectorAll('.chip-group').forEach(g => {
    const active = [...g.querySelectorAll('.chip.active')].map(c => c.dataset.value);
    p[g.dataset.group] = g.dataset.multi === 'true' ? active : (active[0] || '');
  });
  return p;
}

function populateProfilePanel() {
  const p = userProfile;
  if (p.airport)     document.getElementById('pAirport').value   = p.airport;
  if (p.currency)    document.getElementById('pCurrency').value  = p.currency;
  if (p.flightClass) document.getElementById('pFlight').value    = p.flightClass;
  if (p.notes)       document.getElementById('pNotes').value     = p.notes;
  document.querySelectorAll('.chip-group').forEach(g => {
    const saved = p[g.dataset.group];
    g.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active',
        g.dataset.multi === 'true'
          ? Array.isArray(saved) && saved.includes(c.dataset.value)
          : saved === c.dataset.value);
    });
  });
}

function updateNavAuth() {
  const avatar = document.getElementById('navAvatar');
  const label  = document.getElementById('navLabel');
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email || '';
    avatar.textContent = name.charAt(0).toUpperCase() || '?';
    label.textContent  = name.split(' ')[0] || 'Account';
    document.getElementById('profileAvatarLg').textContent = avatar.textContent;
    document.getElementById('profileName').textContent     = currentUser.displayName || '';
    document.getElementById('profileEmail').textContent    = currentUser.email || '';
  } else {
    avatar.textContent = '?';
    label.textContent  = 'Sign in';
  }
}

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/user-not-found':          'No account found with that email.',
    'auth/wrong-password':          'Incorrect password.',
    'auth/email-already-in-use':    'An account with that email already exists.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/too-many-requests':       'Too many attempts — please try again later.',
    'auth/invalid-credential':      'Email or password is incorrect.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// Chips
document.querySelectorAll('.chip-group').forEach(g => {
  const multi = g.dataset.multi === 'true';
  g.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      if (!multi) g.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      c.classList.toggle('active');
      if (!multi) c.classList.add('active');
    });
  });
});

// Load guest profile from localStorage if not signed in
try {
  const saved = localStorage.getItem('wp_profile');
  if (saved) userProfile = { ...JSON.parse(saved), ...userProfile };
} catch {}

/* ============================================================
   NAV + BURGER
   ============================================================ */
const burgerBtn = document.getElementById('burgerBtn');
const navLinks  = document.getElementById('navLinks');

burgerBtn.addEventListener('click', () => {
  burgerBtn.classList.toggle('open');
  navLinks.classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
  burgerBtn.classList.remove('open'); navLinks.classList.remove('open');
}));
document.getElementById('authBtn').addEventListener('click', () => {
  burgerBtn.classList.remove('open'); navLinks.classList.remove('open');
  openAuth();
});

/* ============================================================
   PAGE BUILDER
   ============================================================ */
(function buildPage() {
  // Experiences
  const expGrid = document.getElementById('experiencesGrid');
  if (expGrid) {
    const exps = [
      { id:'EXP/01', title:'Skip-the-line Temple Tour',      desc:'Guided half-day tour of the most iconic temples with a local historian.', search:'temple tour', dest:'Kyoto', sponsored:true },
      { id:'EXP/02', title:'Evening Food & Market Walk',      desc:'Small-group street food crawl with tastings included.',                   search:'food tour',   dest:'Kyoto', sponsored:false },
      { id:'EXP/03', title:'Arashiyama Bamboo Day Trip',      desc:'Full-day countryside escape with a scenic train ride and guided hike.',   search:'bamboo grove', dest:'Kyoto',sponsored:false },
    ];
    expGrid.innerHTML = exps.map(e => `
      <div class="feature-card">
        ${e.sponsored ? '<span class="sponsored-badge">Recommended · Sponsored</span><br>' : ''}
        <span class="step-num">${esc(e.id)}</span>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.desc)}</p>
        <div class="booking-actions">
          <a href="${AffiliateLinks.gygActivity(e.search, e.dest)}" target="_blank" rel="noopener">
            Book on GetYourGuide →</a>
        </div>
      </div>`).join('');
  }

  // Blog
  const blogEl = document.getElementById('blogLinks');
  if (blogEl) {
    blogEl.innerHTML = BLOG_LINKS.map(l =>
      `<a class="lt-link" href="${esc(l.href)}" target="_blank" rel="noopener">
        ${l.emoji} ${esc(l.label)}</a>`).join('');
  }
})();

/* ============================================================
   BOOKING REDIRECT MODAL
   ============================================================ */
const bookingModal = document.getElementById('bookingModal');
document.getElementById('closeBookingModal').addEventListener('click', () =>
  bookingModal.classList.remove('open'));
bookingModal.addEventListener('click', e => {
  if (e.target === bookingModal) bookingModal.classList.remove('open');
});

function openBookingRedirect({ platform, label, url, guests, checkIn, checkOut, destination }) {
  const platformName = platform === 'booking'  ? 'Booking.com'
                     : platform === 'expedia'   ? 'Expedia'
                     : platform === 'gyg'        ? 'GetYourGuide'
                     : platform === 'amazon'     ? 'Amazon'
                     : platform;

  document.getElementById('bookingModalContent').innerHTML = `
    <h3 style="font-family:'Fraunces',serif;font-size:1.45rem;margin-bottom:5px;">
      Book: ${esc(label)}</h3>
    ${destination ? `<p style="opacity:0.6;font-size:0.88rem;margin-bottom:18px;">${esc(destination)}</p>` : ''}
    <div class="booking-summary-box">
      <div class="booking-summary-line"><span>Platform</span><strong>${platformName}</strong></div>
      ${checkIn  ? `<div class="booking-summary-line"><span>Check-in</span><strong>${esc(checkIn)}</strong></div>` : ''}
      ${checkOut ? `<div class="booking-summary-line"><span>Check-out</span><strong>${esc(checkOut)}</strong></div>` : ''}
      ${guests   ? `<div class="booking-summary-line"><span>Guests</span><strong>${esc(String(guests))}</strong></div>` : ''}
    </div>
    <p style="font-size:0.85rem;opacity:0.72;margin-bottom:18px;">
      You'll complete payment directly on ${platformName}. Waypoint earns a small referral commission at no extra cost to you.
    </p>
    <a href="${esc(url)}" target="_blank" rel="noopener"
       class="btn" style="width:100%;display:block;text-align:center;margin-bottom:10px;"
       onclick="document.getElementById('bookingModal').classList.remove('open')">
      Continue to ${platformName} →
    </a>
    <p class="booking-disclaimer">Opens in a new tab. Payment is taken by ${platformName}.</p>`;

  bookingModal.classList.add('open');
}

/* ============================================================
   CLAUDE AI CHATBOT — the entire trip planning experience
   ============================================================ */

const chatBubble  = document.getElementById('chatBubble');
const chatWindow  = document.getElementById('chatWindow');
const chatMsgsEl  = document.getElementById('chatMessages');
const chatQREl    = document.getElementById('chatQR');
const chatInput   = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSend');
const chatUnread  = document.getElementById('chatUnread');

let chatHistory  = [];
let chatIsOpen   = false;
let chatIsBusy   = false;
// Accumulates trip data as Claude extracts it from the conversation
let tripData     = {};

/* ── System prompt — tells Claude its role and how to respond ── */
function buildSystemPrompt() {
  const p    = userProfile;
  const name = currentUser?.displayName || p?.name || '';

  let profileCtx = '';
  if (Object.keys(p).length) {
    const bits = [];
    if (name)            bits.push(`Name: ${name}`);
    if (p.airport)       bits.push(`Home airport: ${p.airport}`);
    if (p.currency)      bits.push(`Preferred currency: ${p.currency}`);
    if (p.flightClass)   bits.push(`Preferred flight class: ${p.flightClass}`);
    if (p.pace)          bits.push(`Travel pace: ${p.pace}`);
    if (p.diet?.length)  bits.push(`Dietary needs: ${p.diet.join(', ')}`);
    if (p.notes)         bits.push(`Extra notes: ${p.notes}`);
    if (bits.length) profileCtx = `\n\nTraveller profile:\n${bits.map(b => `• ${b}`).join('\n')}`;
  }

  return `You are Waypoint's AI travel concierge, powered by Claude. Your job is to plan complete, personalised trips through friendly conversation — the user never has to fill in a form or visit another website until the very end when they pay.

HOW YOU WORK:
1. Start by warmly asking where they want to go and when (if not already provided).
2. Ask follow-up questions one or two at a time: duration, number of travellers, budget (backpacker/mid-range/luxury), interests, any special needs. Build up a full picture naturally in conversation.
3. Once you have enough information, generate a full day-by-day itinerary with specific hotels, activities and experiences. Be specific — use real hotel names, real attraction names, real restaurants.
4. Let the user ask you to change anything — swap a hotel, add an activity, adjust the pace.
5. When the user is happy and wants to book, output BOOKING CARDS using this exact JSON format embedded in your message (one per bookable item):

For hotels:
[BOOK:{"platform":"booking","label":"Hotel name","destination":"City, Country","checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","guests":2,"search":"hotel name city"}]

For experiences/tours (GetYourGuide):
[BOOK:{"platform":"gyg","label":"Tour name","destination":"City","search":"tour name city"}]

For packing items (Amazon):
[BOOK:{"platform":"amazon","label":"Item name","search":"item search term"}]

Output one BOOK card per hotel recommendation and per recommended experience. The app will automatically convert these into tappable "Book now" buttons that send the user straight to Booking.com or GetYourGuide to pay.

RULES:
- Keep messages conversational and warm. Use short paragraphs.
- Never output raw URLs — use BOOK cards instead.
- Do not mention Expedia, Skyscanner, Kayak or any platform other than Booking.com, GetYourGuide and Amazon.
- Never invent specific prices. Say "mid-range hotels in Kyoto typically run £80–£150/night" rather than giving a false exact price.
- If asked about flights, say you focus on hotels and experiences for now, and suggest the user searches Google Flights or Skyscanner for flights directly.
- Once the itinerary is confirmed, output a packing list as BOOK cards linking to Amazon.${profileCtx}`;
}

/* ── Render a message bubble, including parsing BOOK cards ── */
function renderMessage(role, rawText, typing = false) {
  const wrap   = document.createElement('div');
  wrap.className = `chat-msg ${role}${typing ? ' typing' : ''}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (typing) {
    bubble.innerHTML = '<span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>';
    wrap.appendChild(bubble);
    chatMsgsEl.appendChild(wrap);
    chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
    return wrap;
  }

  // Split message into text segments and BOOK cards
  const parts = rawText.split(/(\[BOOK:\{.*?\}\])/g);

  parts.forEach(part => {
    const bookMatch = part.match(/^\[BOOK:(\{.*?\})\]$/);
    if (bookMatch) {
      try {
        const data = JSON.parse(bookMatch[1]);
        // Build the affiliate URL
        let url = '#';
        if (data.platform === 'booking') {
          url = AffiliateLinks.booking(data.search || data.destination, data.checkIn, data.checkOut, data.guests);
        } else if (data.platform === 'gyg') {
          url = AffiliateLinks.gygActivity(data.search || data.label, data.destination || '');
        } else if (data.platform === 'expedia') {
          url = AffiliateLinks.expedia(data.search || data.destination, data.checkIn, data.checkOut, data.guests);
        } else if (data.platform === 'amazon') {
          url = AffiliateLinks.amazon(data.search || data.label);
        }

        const platformLabel = data.platform === 'booking' ? 'Booking.com'
                            : data.platform === 'gyg'     ? 'GetYourGuide'
                            : data.platform === 'expedia' ? 'Expedia'
                            : data.platform === 'amazon'  ? 'Amazon'
                            : data.platform;

        const card = document.createElement('div');
        card.className = 'chat-book-card';
        card.innerHTML = `
          <h4>${esc(data.label)}</h4>
          ${data.destination ? `<p>${esc(data.destination)}${data.checkIn ? ` · ${esc(data.checkIn)} → ${esc(data.checkOut)}` : ''}${data.guests ? ` · ${esc(String(data.guests))} guests` : ''}</p>` : ''}
          <div class="book-btns">
            <button class="chat-book-btn primary" data-url="${esc(url)}" data-platform="${esc(data.platform)}" data-label="${esc(data.label)}" data-dest="${esc(data.destination||'')}" data-checkin="${esc(data.checkIn||'')}" data-checkout="${esc(data.checkOut||'')}" data-guests="${esc(String(data.guests||''))}">
              Book on ${platformLabel} →
            </button>
          </div>`;
        bubble.appendChild(card);
      } catch (e) {
        // Malformed JSON — skip
      }
    } else if (part.trim()) {
      // Regular text — render markdown-lite
      const p = document.createElement('p');
      p.style.marginBottom = '6px';
      p.innerHTML = esc(part.trim())
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      bubble.appendChild(p);
    }
  });

  wrap.appendChild(bubble);
  chatMsgsEl.appendChild(wrap);

  // Wire up book buttons
  wrap.querySelectorAll('.chat-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openBookingRedirect({
        platform:    btn.dataset.platform,
        label:       btn.dataset.label,
        url:         btn.dataset.url,
        destination: btn.dataset.dest,
        checkIn:     btn.dataset.checkin,
        checkOut:    btn.dataset.checkout,
        guests:      btn.dataset.guests,
      });
    });
  });

  chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
  return wrap;
}

/* ── Quick replies ── */
function showQR(replies) {
  chatQREl.innerHTML = replies.map(r =>
    `<button class="qr-chip" data-msg="${esc(r)}">${esc(r)}</button>`).join('');
  chatQREl.querySelectorAll('.qr-chip').forEach(btn =>
    btn.addEventListener('click', () => { chatQREl.innerHTML = ''; sendChat(btn.dataset.msg); }));
}

/* ── Open / close ── */
function openChat() {
  chatIsOpen = true;
  chatWindow.classList.add('open');
  chatUnread.classList.remove('show');

  if (chatHistory.length === 0) {
    const name = currentUser?.displayName?.split(' ')[0] || '';
    const greeting = name
      ? `Hi ${name}! I'm your Waypoint AI travel planner. Where in the world are you thinking of going? 🌍`
      : `Hi! I'm your Waypoint AI travel planner. I'll plan your whole trip through our conversation — you just tell me where you want to go, and I'll take care of the rest. Where are you thinking? 🌍`;
    renderMessage('ai', greeting);
    showQR(['Europe', 'Asia', 'North America', 'Beach holiday', 'City break', 'Adventure trip']);
  }

  setTimeout(() => chatInput.focus(), 150);
}

function closeChat() { chatIsOpen = false; chatWindow.classList.remove('open'); }

chatBubble.addEventListener('click', () => chatIsOpen ? closeChat() : openChat());
document.getElementById('chatClose').addEventListener('click', closeChat);
document.getElementById('heroStartChat').addEventListener('click', () => {
  openChat();
  document.getElementById('chatWindow').scrollIntoView({ behavior: 'smooth', block: 'end' });
});

/* ── Input handling ── */
chatInput.addEventListener('input', () => {
  chatSendBtn.disabled = chatIsBusy || !chatInput.value.trim();
});
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !chatSendBtn.disabled) {
    e.preventDefault();
    sendChat(chatInput.value.trim());
  }
});
chatSendBtn.addEventListener('click', () => {
  if (!chatSendBtn.disabled) sendChat(chatInput.value.trim());
});

/* ── Main send ── */
async function sendChat(text) {
  if (!text || chatIsBusy) return;

  chatQREl.innerHTML = '';
  chatInput.value   = '';
  chatSendBtn.disabled = true;
  chatIsBusy = true;

  renderMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const typing = renderMessage('ai', '', true);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 2048,
        system:     buildSystemPrompt(),
        messages:   chatHistory.map(m => ({
          role:    m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    const data  = await res.json();
    if (data.error) throw new Error(data.error.message);
    const reply = data.content.map(b => b.text || '').join('').trim();

    typing.remove();
    renderMessage('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (err) {
    typing.remove();
    renderMessage('ai', "I'm sorry, I couldn't connect right now. Please try again in a moment.");
    console.error('Chat error:', err);
  }

  chatIsBusy = false;
  chatSendBtn.disabled = !chatInput.value.trim();
}

// Show unread dot on first visit
if (chatHistory.length === 0) chatUnread.classList.add('show');
