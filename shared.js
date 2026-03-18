/* ═══════════════════════════════════════════
   HARMONIA SHOWCASE — Shared JavaScript
   Audio engine, annotation system, utilities
═══════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════
   AUDIO ENGINE
════════════════════════════════ */
let AC = null;
function getAC() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

// Piano: additive synthesis with harmonics
function playPiano(freq, dur = 1.5) {
  const ctx = getAC();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.005);
  masterGain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.3);
  masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  [1, 2, 3, 4, 5, 6].forEach((h, i) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq * h, ctx.currentTime);
    g.gain.setValueAtTime([1, 0.5, 0.25, 0.12, 0.06, 0.03][i], ctx.currentTime);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  });
}

// Guitar: Karplus-Strong style pluck
function playGuitar(freq, dur = 1.2) {
  const ctx = getAC();
  const bufSize = Math.ceil(ctx.sampleRate / freq);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 2000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + dur);
}

// Drums: synthesized percussion
function playDrum(type) {
  const ctx = getAC();
  if (type === 'kick') {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } else if (type === 'snare') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.6, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.connect(f); f.connect(g); g.connect(ctx.destination); noise.start();
    const osc = ctx.createOscillator(), g2 = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = 180;
    g2.gain.setValueAtTime(0.5, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g2); g2.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
  } else if (type === 'hihat') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    noise.connect(f); f.connect(g); g.connect(ctx.destination); noise.start();
  } else if (type === 'openhat') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    noise.connect(f); f.connect(g); g.connect(ctx.destination); noise.start();
  } else if (type === 'tom') {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.7, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.25);
  } else if (type === 'tom2') {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.22);
    g.gain.setValueAtTime(0.7, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.28);
  } else if (type === 'crash') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    noise.connect(f); f.connect(g); g.connect(ctx.destination); noise.start();
  } else if (type === 'ride') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4500; f.Q.value = 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    noise.connect(f); f.connect(g); g.connect(ctx.destination); noise.start();
  }
}

// Violin: bowed string (sawtooth + vibrato)
function playViolin(freq, dur = 1.0) {
  const ctx = getAC();
  const osc = ctx.createOscillator(), lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain(), gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sawtooth'; osc.frequency.value = freq;
  lfo.frequency.value = 5.5; lfoGain.gain.value = 3;
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  filter.type = 'lowpass'; filter.frequency.value = 2500;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.22, ctx.currentTime + dur - 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
  osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  lfo.start(); osc.start(); osc.stop(ctx.currentTime + dur); lfo.stop(ctx.currentTime + dur);
}

// Flute: sine with harmonics
function playFlute(freq, dur = 0.8) {
  const ctx = getAC();
  const osc = ctx.createOscillator(), osc2 = ctx.createOscillator();
  const gain = ctx.createGain(), gain2 = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  osc2.type = 'sine'; osc2.frequency.value = freq * 2; gain2.gain.value = 0.08;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.28, ctx.currentTime + dur - 0.08);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc2.connect(gain2); gain2.connect(ctx.destination);
  osc.start(); osc2.start(); osc.stop(ctx.currentTime + dur); osc2.stop(ctx.currentTime + dur);
}

// Generic tone
function playTone(freq, type = 'sine', dur = 0.5, vol = 0.3) {
  const ctx = getAC();
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur);
}

/* ════════════════════════════════
   NOTE FREQUENCIES
════════════════════════════════ */
const FREQS = {
  'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196,'A3':220,'B3':246.94,
  'C4':261.63,'Cs4':277.18,'D4':293.66,'Ds4':311.13,'E4':329.63,
  'F4':349.23,'Fs4':369.99,'G4':392,'Gs4':415.30,'A4':440,'As4':466.16,'B4':493.88,
  'C5':523.25,'Cs5':554.37,'D5':587.33,'Ds5':622.25,'E5':659.25,'F5':698.46,'Fs5':739.99,
  'G5':783.99,'Gs5':830.61,'A5':880,'B5':987.77,
  'Cs3':138.59,'Ds3':155.56,'Fs3':185,'Gs3':207.65,'As3':233.08,
  'E2':82.41,'F2':87.31,'Fs2':92.50,'G2':98,'Gs2':103.83,'A2':110,'As2':116.54,'B2':123.47,
  'C2':65.41,'Cs2':69.30,'D2':73.42,'Ds2':77.78,
};

/* ════════════════════════════════
   THEME TOGGLE
════════════════════════════════ */
function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('harmonia_theme', dark ? 'light' : 'dark');
}
(function initTheme() {
  const saved = localStorage.getItem('harmonia_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = saved === 'light' ? '☀️' : '🌙';
  }
})();

/* ════════════════════════════════
   HCI ANNOTATION SYSTEM
════════════════════════════════ */
let annotationsVisible = false;

function toggleAnnotations() {
  annotationsVisible = !annotationsVisible;
  document.body.classList.toggle('annotations-visible', annotationsVisible);
  const btn = document.querySelector('.hci-toggle');
  if (btn) {
    btn.classList.toggle('active', annotationsVisible);
    btn.innerHTML = annotationsVisible
      ? '📐 Hide HCI Principles'
      : '📐 Show HCI Principles';
  }
}

/* ════════════════════════════════
   TOAST
════════════════════════════════ */
function showToast(msg, type = 'default') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  const colors = { teal:'var(--emerald)', emerald:'var(--emerald)', gold:'var(--amber)', amber:'var(--amber)', rose:'var(--coral)', coral:'var(--coral)', default:'var(--accent)' };
  t.style.borderLeftColor = colors[type] || colors.default;
  t.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ════════════════════════════════
   NAV SCROLL EFFECT
════════════════════════════════ */
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
});

/* ════════════════════════════════
   INDIAN LOCATIONS (for Concerts)
════════════════════════════════ */
const INDIAN_LOCATIONS = {
  'Andhra Pradesh':['Visakhapatnam','Vijayawada','Guntur','Nellore','Tirupati'],
  'Arunachal Pradesh':['Itanagar','Naharlagun','Pasighat','Tawang'],
  'Assam':['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon'],
  'Bihar':['Patna','Gaya','Bhagalpur','Muzaffarpur','Purnia'],
  'Chhattisgarh':['Raipur','Bhilai','Bilaspur','Korba','Durg'],
  'Goa':['Panaji','Vasco da Gama','Margao','Mapusa','Ponda'],
  'Gujarat':['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Gandhinagar'],
  'Haryana':['Faridabad','Gurugram','Panipat','Ambala','Rohtak'],
  'Himachal Pradesh':['Shimla','Dharamshala','Kullu','Manali','Solan'],
  'Jharkhand':['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar'],
  'Karnataka':['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi'],
  'Kerala':['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kannur'],
  'Madhya Pradesh':['Indore','Bhopal','Jabalpur','Gwalior','Ujjain'],
  'Maharashtra':['Mumbai','Pune','Nagpur','Nashik','Thane','Aurangabad'],
  'Manipur':['Imphal','Thoubal','Bishnupur','Churachandpur'],
  'Meghalaya':['Shillong','Tura','Nongstoin','Jowai'],
  'Mizoram':['Aizawl','Lunglei','Saiha','Champhai'],
  'Nagaland':['Kohima','Dimapur','Mokokchung','Tuensang'],
  'Odisha':['Bhubaneswar','Cuttack','Rourkela','Brahmapur','Puri'],
  'Punjab':['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Chandigarh'],
  'Rajasthan':['Jaipur','Jodhpur','Kota','Bikaner','Ajmer','Udaipur'],
  'Sikkim':['Gangtok','Namchi','Gyalshing','Mangan'],
  'Tamil Nadu':['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem'],
  'Telangana':['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam'],
  'Tripura':['Agartala','Dharmanagar','Udaipur','Kailashahar'],
  'Uttar Pradesh':['Lucknow','Kanpur','Ghaziabad','Agra','Varanasi','Noida'],
  'Uttarakhand':['Dehradun','Haridwar','Roorkee','Haldwani','Rishikesh'],
  'West Bengal':['Kolkata','Howrah','Durgapur','Asansol','Siliguri'],
  'Andaman and Nicobar Islands':['Port Blair'],
  'Chandigarh':['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu':['Daman','Diu','Silvassa'],
  'Delhi':['New Delhi','North Delhi','South Delhi','East Delhi','West Delhi'],
  'Jammu and Kashmir':['Srinagar','Jammu','Anantnag','Baramulla'],
  'Ladakh':['Leh','Kargil'],
  'Lakshadweep':['Kavaratti','Agatti'],
  'Puducherry':['Puducherry','Oulgaret','Karaikal','Mahe']
};

/* ════════════════════════════════
   SAMPLE CONCERT DATA (mock)
════════════════════════════════ */
const SAMPLE_CONCERTS = [
  {id:1,state:'Maharashtra',city:'Mumbai',title:'Arijit Singh Live in Concert',date:'2026-04-15T19:00',venue:'NSCI Dome',price:2500},
  {id:2,state:'Maharashtra',city:'Mumbai',title:'The Local Train — Farewell Tour',date:'2026-06-05T18:00',venue:'Jio Garden',price:2000},
  {id:3,state:'Maharashtra',city:'Pune',title:'Nucleya Bass Drop Tour',date:'2026-04-28T21:00',venue:'Mahalaxmi Lawns',price:1800},
  {id:4,state:'Maharashtra',city:'Pune',title:'NH7 Weekender',date:'2026-11-15T14:00',venue:'Magarpatta City',price:3500},
  {id:5,state:'Delhi',city:'New Delhi',title:'AR Rahman World Tour 2026',date:'2026-04-22T18:30',venue:'Jawaharlal Nehru Stadium',price:3000},
  {id:6,state:'Delhi',city:'New Delhi',title:'Anuv Jain Live Under the Stars',date:'2026-06-12T19:30',venue:'Select City Walk Amphitheater',price:1400},
  {id:7,state:'Delhi',city:'New Delhi',title:'Delhi Jazz Festival',date:'2026-05-16T18:00',venue:'India Habitat Centre',price:1000},
  {id:8,state:'Karnataka',city:'Bengaluru',title:'Indie Music Festival',date:'2026-05-01T16:00',venue:'Palace Grounds',price:1500},
  {id:9,state:'Karnataka',city:'Bengaluru',title:'Prateek Kuhad Live',date:'2026-04-20T19:00',venue:'Phoenix Marketcity',price:1800},
  {id:10,state:'Tamil Nadu',city:'Chennai',title:'AR Rahman World Tour 2026',date:'2026-06-22T18:30',venue:'Nehru Indoor Stadium',price:3500},
  {id:11,state:'Telangana',city:'Hyderabad',title:'Hyderabad EDM Festival',date:'2026-04-26T21:00',venue:'Hitex Exhibition Centre',price:2000},
  {id:12,state:'Rajasthan',city:'Jaipur',title:'Rajasthani Folk Fusion',date:'2026-04-10T18:00',venue:'Albert Hall Lawns',price:900},
  {id:13,state:'Rajasthan',city:'Udaipur',title:'Lakeside Music Festival',date:'2026-05-05T18:30',venue:'Fateh Sagar Lake Promenade',price:1200},
  {id:14,state:'Goa',city:'Panaji',title:'Sunburn Music Festival 2026',date:'2026-12-28T14:00',venue:'Vagator Beach',price:5000},
  {id:15,state:'Goa',city:'Margao',title:'Jazz by the Sea',date:'2026-04-18T19:00',venue:'Ravindra Bhavan',price:1200},
  {id:16,state:'West Bengal',city:'Kolkata',title:'Kolkata Jazz Festival',date:'2026-04-10T18:00',venue:'Victoria Memorial Lawns',price:1000},
  {id:17,state:'Gujarat',city:'Surat',title:'Arijit Singh Live',date:'2026-04-30T19:30',venue:'Sardar Patel Stadium',price:2500},
  {id:18,state:'Punjab',city:'Ludhiana',title:'Diljit Dosanjh Live',date:'2026-05-30T20:00',venue:'PAU Ground',price:2500},
  {id:19,state:'Kerala',city:'Kochi',title:'Kerala Electronic Music Fest',date:'2026-05-15T20:00',venue:'Bolgatty Palace Grounds',price:1400},
  {id:20,state:'Uttar Pradesh',city:'Varanasi',title:'Ganga Aarti Musical Evening',date:'2026-05-02T18:00',venue:'Dashashwamedh Ghat',price:600},
  {id:21,state:'Meghalaya',city:'Shillong',title:'Cherry Blossom Music Fest',date:'2026-11-10T15:00',venue:'Ward Lake',price:1200},
  {id:22,state:'Nagaland',city:'Dimapur',title:'Hornbill Music Festival',date:'2026-12-05T14:00',venue:'Kisama Heritage Village',price:1500},
  {id:23,state:'Himachal Pradesh',city:'Manali',title:'Mountain Music Festival',date:'2026-06-20T15:00',venue:'Solang Valley',price:1200},
  {id:24,state:'Chandigarh',city:'Chandigarh',title:'EDM Lake Party',date:'2026-06-25T20:00',venue:'Sukhna Lake Promenade',price:1200},
];

/* ════════════════════════════════
   COUNTER ANIMATION
════════════════════════════════ */
function animateCounter(el, target, suffix = '') {
  let c = 0; const step = target / 60;
  const t = setInterval(() => {
    c = Math.min(c + step, target);
    el.textContent = Math.floor(c).toLocaleString() + suffix;
    if (c >= target) clearInterval(t);
  }, 16);
}
