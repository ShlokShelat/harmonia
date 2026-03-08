const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'harmonia-secret-key-123'; // In prod, use environment variable
const GOOGLE_CLIENT_ID = '817002154388-pffbdlp0q6sbdh6s1hbrndios2f1aeub.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const INDIAN_LOCATIONS = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
    'Goa': ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar'],
    'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Rohtak'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Kullu', 'Manali', 'Solan'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kannur'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad'],
    'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
    'Meghalaya': ['Shillong', 'Tura', 'Nongstoin', 'Jowai'],
    'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai'],
    'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Puri'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Chandigarh'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur'],
    'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
    'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Noida'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
    'Andaman and Nicobar Islands': ['Port Blair'],
    'Chandigarh': ['Chandigarh'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla'],
    'Ladakh': ['Leh', 'Kargil'],
    'Lakshadweep': ['Kavaratti', 'Agatti'],
    'Puducherry': ['Puducherry', 'Oulgaret', 'Karaikal', 'Mahe']
};
const INDIAN_STATES = Object.keys(INDIAN_LOCATIONS);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT,
            data TEXT,
            google_id TEXT
        )`);

        db.run(`ALTER TABLE users ADD COLUMN google_id TEXT`, (err) => { });

        db.run(`CREATE TABLE IF NOT EXISTS concerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT,
            city TEXT,
            title TEXT,
            date TEXT,
            venue TEXT,
            price REAL,
            user_id INTEGER
        )`);

        // Add state column if missing (migration)
        db.run(`ALTER TABLE concerts ADD COLUMN state TEXT`, (err) => { });

        db.run(`CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            concert_id INTEGER,
            user_id INTEGER,
            qr_code TEXT
        )`, () => {
            // Seed sample concerts if table is empty
            db.get('SELECT COUNT(*) as count FROM concerts', (err, row) => {
                if (!err && row && row.count === 0) {
                    // [state, city, title, date, venue, price]
                    const sampleConcerts = [
                        // Andhra Pradesh
                        ['Andhra Pradesh', 'Visakhapatnam', 'Vizag Beach Music Festival', '2026-04-12T18:00', 'RK Beach Amphitheater', 800],
                        ['Andhra Pradesh', 'Vijayawada', 'Telugu Pop Night', '2026-05-03T19:00', 'Siddhartha Auditorium', 600],
                        ['Andhra Pradesh', 'Tirupati', 'Devotional Music Evening', '2026-06-15T17:30', 'SVU Auditorium', 400],
                        // Arunachal Pradesh
                        ['Arunachal Pradesh', 'Itanagar', 'Northeast Beats Festival', '2026-05-20T16:00', 'IG Park', 500],
                        ['Arunachal Pradesh', 'Tawang', 'Mountain Music Fest', '2026-07-10T15:00', 'Tawang Monastery Grounds', 300],
                        // Assam
                        ['Assam', 'Guwahati', 'Bihu Rock Fusion', '2026-04-14T18:00', 'Sarusajai Stadium', 700],
                        ['Assam', 'Guwahati', 'Zubeen Garg Live', '2026-05-28T19:00', 'ITA Centre', 1200],
                        ['Assam', 'Jorhat', 'Assamese Folk Night', '2026-06-05T18:30', 'Jorhat Gymkhana Club', 400],
                        // Bihar
                        ['Bihar', 'Patna', 'Maithili Music Night', '2026-04-22T18:00', 'Gyan Bhawan', 500],
                        ['Bihar', 'Patna', 'Bihar Indie Fest', '2026-06-10T17:00', 'Eco Park', 600],
                        ['Bihar', 'Gaya', 'Sufi Evening', '2026-07-20T19:00', 'Magadh University Auditorium', 350],
                        // Chhattisgarh
                        ['Chhattisgarh', 'Raipur', 'Panthi Dance Music Show', '2026-05-15T18:00', 'Science College Ground', 450],
                        ['Chhattisgarh', 'Bilaspur', 'Folk Fusion Night', '2026-06-22T19:00', 'Town Hall', 400],
                        // Goa
                        ['Goa', 'Panaji', 'Sunburn Music Festival 2026', '2026-12-28T14:00', 'Vagator Beach', 5000],
                        ['Goa', 'Margao', 'Jazz by the Sea', '2026-04-18T19:00', 'Ravindra Bhavan', 1200],
                        ['Goa', 'Panaji', 'Goan Carnival Music Night', '2026-02-15T20:00', 'Miramar Beach Stage', 800],
                        // Gujarat
                        ['Gujarat', 'Ahmedabad', 'Garba Fusion Night', '2026-10-02T19:00', 'GMDC Ground', 900],
                        ['Gujarat', 'Surat', 'Arijit Singh Live', '2026-04-30T19:30', 'Sardar Patel Stadium', 2500],
                        ['Gujarat', 'Vadodara', 'Classical Evening with Pandit Jasraj Tribute', '2026-05-12T18:00', 'Navlakhi Ground', 700],
                        // Haryana
                        ['Haryana', 'Gurugram', 'EDM Nights Gurgaon', '2026-04-19T21:00', 'Leisure Valley Park', 1500],
                        ['Haryana', 'Chandigarh', 'Punjabi Pop Blast', '2026-05-24T20:00', 'Sector 17 Plaza', 1000],
                        ['Haryana', 'Faridabad', 'Haryanvi Beats Festival', '2026-06-08T18:00', 'NIT Ground', 600],
                        // Himachal Pradesh
                        ['Himachal Pradesh', 'Shimla', 'Hillside Acoustic Session', '2026-05-10T16:00', 'Ridge Maidan', 500],
                        ['Himachal Pradesh', 'Manali', 'Mountain Music Festival', '2026-06-20T15:00', 'Solang Valley', 1200],
                        ['Himachal Pradesh', 'Dharamshala', 'Peace & Music Fest', '2026-07-05T17:00', 'HPCA Stadium', 800],
                        // Jharkhand
                        ['Jharkhand', 'Ranchi', 'Tribal Beats Festival', '2026-05-05T18:00', 'Morabadi Ground', 500],
                        ['Jharkhand', 'Jamshedpur', 'Rock the Steel City', '2026-06-14T19:00', 'Gopal Maidan', 700],
                        // Karnataka
                        ['Karnataka', 'Bengaluru', 'Indie Music Festival', '2026-05-01T16:00', 'Palace Grounds', 1500],
                        ['Karnataka', 'Bengaluru', 'Prateek Kuhad Live', '2026-04-20T19:00', 'Phoenix Marketcity', 1800],
                        ['Karnataka', 'Mysuru', 'Carnatic Classical Night', '2026-05-22T18:00', 'Jaganmohan Palace', 600],
                        ['Karnataka', 'Mangaluru', 'Tulu Folk Rock', '2026-06-10T19:00', 'Mangala Stadium', 500],
                        // Kerala
                        ['Kerala', 'Kochi', 'Kerala Electronic Music Fest', '2026-05-15T20:00', 'Bolgatty Palace Grounds', 1400],
                        ['Kerala', 'Thiruvananthapuram', 'Chenda Melam Fusion', '2026-04-14T17:00', 'Kanakakkunnu Palace', 700],
                        ['Kerala', 'Kozhikode', 'Mappila Songs Night', '2026-06-02T18:30', 'Kozhikode Beach', 500],
                        // Madhya Pradesh
                        ['Madhya Pradesh', 'Bhopal', 'Sufi Night by the Lake', '2026-05-08T19:00', 'Upper Lake Promenade', 800],
                        ['Madhya Pradesh', 'Indore', 'Indie Rock Indore', '2026-04-25T20:00', 'Lalbagh Palace Ground', 900],
                        ['Madhya Pradesh', 'Gwalior', 'Tansen Music Festival', '2026-12-25T17:00', 'Tansen Tomb', 600],
                        // Maharashtra
                        ['Maharashtra', 'Mumbai', 'Arijit Singh Live in Concert', '2026-04-15T19:00', 'NSCI Dome', 2500],
                        ['Maharashtra', 'Mumbai', 'The Local Train — Farewell Tour', '2026-06-05T18:00', 'Jio Garden', 2000],
                        ['Maharashtra', 'Mumbai', 'Bollywood Retro Night', '2026-05-10T20:00', 'Bandra Fort Amphitheater', 1800],
                        ['Maharashtra', 'Pune', 'Nucleya Bass Drop Tour', '2026-04-28T21:00', 'Mahalaxmi Lawns', 1800],
                        ['Maharashtra', 'Pune', 'NH7 Weekender', '2026-11-15T14:00', 'Magarpatta City', 3500],
                        ['Maharashtra', 'Nagpur', 'Orange City Rock Fest', '2026-05-18T18:00', 'Kasturchand Park', 700],
                        ['Maharashtra', 'Aurangabad', 'Marathi Bands Unite', '2026-06-20T19:00', 'Garware Stadium', 500],
                        // Manipur
                        ['Manipur', 'Imphal', 'Manipuri Folk & Rock Fest', '2026-05-12T17:00', 'Hapta Kangjeibung', 400],
                        ['Manipur', 'Imphal', 'Sangai Music Night', '2026-11-25T18:00', 'Sangai Festival Ground', 500],
                        // Meghalaya
                        ['Meghalaya', 'Shillong', 'Rock Capital Festival', '2026-05-20T16:00', 'Polo Ground', 800],
                        ['Meghalaya', 'Shillong', 'Cherry Blossom Music Fest', '2026-11-10T15:00', 'Ward Lake', 1200],
                        // Mizoram
                        ['Mizoram', 'Aizawl', 'Mizo Music Night', '2026-06-01T17:00', 'Assam Rifles Ground', 400],
                        // Nagaland
                        ['Nagaland', 'Dimapur', 'Hornbill Music Festival', '2026-12-05T14:00', 'Kisama Heritage Village', 1500],
                        ['Nagaland', 'Kohima', 'Naga Rock Night', '2026-06-15T18:00', 'Local Ground', 600],
                        // Odisha
                        ['Odisha', 'Bhubaneswar', 'Odissi Fusion Night', '2026-05-08T18:00', 'Rabindra Mandap', 600],
                        ['Odisha', 'Puri', 'Beach Beats Festival', '2026-04-20T17:00', 'Puri Beach', 800],
                        ['Odisha', 'Cuttack', 'Odia Pop Night', '2026-06-12T19:00', 'Barabati Stadium', 500],
                        // Punjab
                        ['Punjab', 'Amritsar', 'Punjabi Music Mela', '2026-04-13T19:00', 'Guru Nanak Dev Stadium', 900],
                        ['Punjab', 'Ludhiana', 'Diljit Dosanjh Live', '2026-05-30T20:00', 'Punjab Agricultural University Ground', 2500],
                        ['Punjab', 'Jalandhar', 'Bhangra Beats Night', '2026-06-18T19:00', 'Burlton Park', 700],
                        // Rajasthan
                        ['Rajasthan', 'Jaipur', 'Rajasthani Folk Fusion', '2026-04-10T18:00', 'Albert Hall Lawns', 900],
                        ['Rajasthan', 'Udaipur', 'Lakeside Music Festival', '2026-05-05T18:30', 'Fateh Sagar Lake Promenade', 1200],
                        ['Rajasthan', 'Jodhpur', 'RIFF — Rajasthan International Folk Festival', '2026-10-18T17:00', 'Mehrangarh Fort', 2000],
                        ['Rajasthan', 'Jaisalmer', 'Desert Music Night', '2026-02-10T19:00', 'Sam Sand Dunes', 1500],
                        // Sikkim
                        ['Sikkim', 'Gangtok', 'Himalayan Music Fest', '2026-06-10T15:00', 'MG Marg', 600],
                        ['Sikkim', 'Gangtok', 'Red Panda Music Night', '2026-10-20T17:00', 'Paljor Stadium', 500],
                        // Tamil Nadu
                        ['Tamil Nadu', 'Chennai', 'Carnatic Fusion Night', '2026-05-18T19:00', 'Music Academy', 800],
                        ['Tamil Nadu', 'Chennai', 'AR Rahman World Tour 2026', '2026-06-22T18:30', 'Jawaharlal Nehru Indoor Stadium', 3500],
                        ['Tamil Nadu', 'Coimbatore', 'Indie Tamil Night', '2026-05-25T19:00', 'Codissia Trade Fair Complex', 700],
                        ['Tamil Nadu', 'Madurai', 'Temple Town Beats', '2026-07-12T18:00', 'Tamukkam Ground', 500],
                        // Telangana
                        ['Telangana', 'Hyderabad', 'Prateek Kuhad Acoustic Night', '2026-05-10T20:00', 'Shilpakala Vedika', 1200],
                        ['Telangana', 'Hyderabad', 'Hyderabad EDM Festival', '2026-04-26T21:00', 'Hitex Exhibition Centre', 2000],
                        ['Telangana', 'Warangal', 'Telugu Rock Night', '2026-06-08T18:30', 'Warangal Fort Grounds', 500],
                        // Tripura
                        ['Tripura', 'Agartala', 'Tripuri Folk Music Night', '2026-05-18T17:00', 'Rabindra Shatabarshiki Bhavan', 350],
                        // Uttar Pradesh
                        ['Uttar Pradesh', 'Lucknow', 'Ghazal Night', '2026-04-18T19:00', 'Nawab Wajid Ali Shah Auditorium', 800],
                        ['Uttar Pradesh', 'Varanasi', 'Ganga Aarti Musical Evening', '2026-05-02T18:00', 'Dashashwamedh Ghat', 600],
                        ['Uttar Pradesh', 'Noida', 'Anuv Jain Live Under the Stars', '2026-06-12T19:30', 'Gardens Galleria', 1400],
                        ['Uttar Pradesh', 'Agra', 'Moonlight at Taj — Classical Night', '2026-10-15T19:00', 'Taj Mahal Complex', 2000],
                        // Uttarakhand
                        ['Uttarakhand', 'Dehradun', 'Mountain Echoes Music Fest', '2026-05-20T16:00', 'Rajaji National Park Edge', 900],
                        ['Uttarakhand', 'Rishikesh', 'Yoga & Sound Healing Fest', '2026-06-21T06:00', 'Parmarth Niketan Ghat', 700],
                        ['Uttarakhand', 'Nainital', 'Lake Music Festival', '2026-07-15T17:00', 'Nainital Lake Boat Club', 600],
                        // West Bengal
                        ['West Bengal', 'Kolkata', 'Bengali Rock Night', '2026-05-25T19:00', 'Rabindra Sadan', 600],
                        ['West Bengal', 'Kolkata', 'Kolkata Jazz Festival', '2026-04-10T18:00', 'Victoria Memorial Lawns', 1000],
                        ['West Bengal', 'Darjeeling', 'Himalayan Blues Night', '2026-06-05T17:00', 'Chowrasta Mall', 500],
                        ['West Bengal', 'Siliguri', 'North Bengal Music Fest', '2026-07-20T18:00', 'Kanchanjungha Stadium', 400],
                        // Delhi (UT)
                        ['Delhi', 'New Delhi', 'AR Rahman World Tour 2026', '2026-04-22T18:30', 'Jawaharlal Nehru Stadium', 3000],
                        ['Delhi', 'New Delhi', 'Anuv Jain Live Under the Stars', '2026-06-12T19:30', 'Select City Walk Amphitheater', 1400],
                        ['Delhi', 'New Delhi', 'Delhi Jazz Festival', '2026-05-16T18:00', 'India Habitat Centre', 1000],
                        ['Delhi', 'New Delhi', 'Qutub Festival — Classical & Sufi', '2026-11-20T18:00', 'Qutub Minar Complex', 1500],
                        // Chandigarh (UT)
                        ['Chandigarh', 'Chandigarh', 'Chandigarh Music Festival', '2026-05-08T18:00', 'Rock Garden', 800],
                        ['Chandigarh', 'Chandigarh', 'EDM Lake Party', '2026-06-25T20:00', 'Sukhna Lake Promenade', 1200],
                        // Jammu and Kashmir (UT)
                        ['Jammu and Kashmir', 'Srinagar', 'Sufi Night on Dal Lake', '2026-06-15T19:00', 'Dal Lake Floating Stage', 900],
                        ['Jammu and Kashmir', 'Jammu', 'Dogri Folk Fest', '2026-05-10T17:00', 'Mubarak Mandi Palace', 500],
                        // Ladakh (UT)
                        ['Ladakh', 'Leh', 'Ladakh Music Festival', '2026-07-01T15:00', 'Polo Ground', 800],
                        // Puducherry (UT)
                        ['Puducherry', 'Puducherry', 'French Quarter Jazz Night', '2026-05-22T19:00', 'Promenade Beach Stage', 700],
                        ['Puducherry', 'Puducherry', 'Auroville Music & Arts Fest', '2026-06-08T16:00', 'Matrimandir Amphitheater', 600],
                        // Andaman and Nicobar Islands (UT)
                        ['Andaman and Nicobar Islands', 'Port Blair', 'Island Beats Festival', '2026-05-28T18:00', 'Cellular Jail Courtyard', 700],
                        // Lakshadweep (UT)
                        ['Lakshadweep', 'Kavaratti', 'Ocean Sounds Night', '2026-06-20T18:30', 'Kavaratti Beach Stage', 500],
                        // Dadra and Nagar Haveli and Daman and Diu (UT)
                        ['Dadra and Nagar Haveli and Daman and Diu', 'Daman', 'Beach Music Festival', '2026-05-12T18:00', 'Devka Beach', 600],
                    ];
                    const stmt = db.prepare('INSERT INTO concerts (state, city, title, date, venue, price, user_id) VALUES (?, ?, ?, ?, ?, ?, 0)');
                    sampleConcerts.forEach(c => stmt.run(c));
                    stmt.finalize();
                    console.log(`Seeded ${sampleConcerts.length} sample concerts across all Indian states.`);
                }
            });
        });
    }
});

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// ── AUTH ROUTES ──

// 1. Signup
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, data } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (email, password, name, data) VALUES (?, ?, ?, ?)',
            [email.toLowerCase(), hashedPassword, name, JSON.stringify(data || {})],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
                res.status(201).json({ token });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Error processing request' });
    }
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(401).json({ error: 'Incorrect password' });
        const token = jwt.sign({ id: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, data: JSON.parse(row.data) });
    });
});

// 3. Google OAuth
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Check if user exists
        db.get('SELECT * FROM users WHERE email = ? OR google_id = ?', [email, googleId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (row) {
                // Existing user — update google_id if needed and login
                if (!row.google_id) {
                    db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, row.id]);
                }
                const token = jwt.sign({ id: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });
                const userData = JSON.parse(row.data || '{}');
                userData.name = userData.name || name;
                userData.avatar = picture;
                res.json({ token, data: userData, name: row.name || name });
            } else {
                // New user — auto-create
                const newUserData = JSON.stringify({
                    name, email, avatar: picture,
                    level: 1, xp: 0, totalPracticeTime: 0,
                    achievements: [], activities: [], generatedTracks: [],
                    instruments: { piano: { level: 'Beginner', progress: 0 }, guitar: { level: 'Beginner', progress: 0 } }
                });
                db.run('INSERT INTO users (email, password, name, data, google_id) VALUES (?, ?, ?, ?, ?)',
                    [email, '', name, newUserData, googleId],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
                        res.status(201).json({ token, data: JSON.parse(newUserData), name });
                    }
                );
            }
        });
    } catch (err) {
        console.error('Google OAuth error:', err);
        res.status(401).json({ error: 'Invalid Google credential' });
    }
});

// ── USER DATA ROUTES ──

app.get('/api/user', authenticateToken, (req, res) => {
    db.get('SELECT data FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(JSON.parse(row.data));
    });
});

app.put('/api/user', authenticateToken, (req, res) => {
    const data = JSON.stringify(req.body);
    db.run('UPDATE users SET data = ? WHERE id = ?', [data, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User data updated successfully' });
    });
});

// ── AI MUSIC GENERATION ──
// Returns a procedurally generated note sequence based on parameters

const SCALES = {
    'C Major': [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
    'G Major': [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99],
    'D Minor': [293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25, 587.33],
    'A Minor': [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00],
    'F Major': [349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 659.25, 698.46],
    'E Minor': [329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25],
};

const WAVE_TYPES = {
    'Lo-fi': 'sine', 'Jazz': 'triangle', 'Classical': 'sine',
    'Electronic': 'square', 'Folk': 'triangle', 'Pop': 'sine', 'Rock': 'sawtooth',
};

function generateNoteSequence(genre, mood, tempo, key) {
    const scale = SCALES[key] || SCALES['C Major'];
    const waveType = WAVE_TYPES[genre] || 'sine';
    const bpm = parseInt(tempo) || 90;
    const beatDuration = 60 / bpm;
    const noteCount = 16 + Math.floor(Math.random() * 16); // 16-32 notes
    const notes = [];

    // Mood affects note selection pattern
    const moodWeights = {
        'Calm': { rest: 0.2, longNote: 0.4, stepSize: 1 },
        'Energetic': { rest: 0.05, longNote: 0.1, stepSize: 2 },
        'Melancholic': { rest: 0.25, longNote: 0.5, stepSize: 1 },
        'Happy': { rest: 0.1, longNote: 0.2, stepSize: 2 },
        'Mysterious': { rest: 0.3, longNote: 0.3, stepSize: 3 },
        'Romantic': { rest: 0.15, longNote: 0.45, stepSize: 1 },
    };
    const w = moodWeights[mood] || moodWeights['Calm'];

    let currentIdx = Math.floor(Math.random() * scale.length);
    for (let i = 0; i < noteCount; i++) {
        if (Math.random() < w.rest) {
            // Rest
            notes.push({ freq: 0, duration: beatDuration * (Math.random() < 0.5 ? 0.5 : 1), type: waveType });
        } else {
            // Step through scale
            const step = Math.floor(Math.random() * w.stepSize * 2) - w.stepSize;
            currentIdx = Math.max(0, Math.min(scale.length - 1, currentIdx + step));
            const duration = Math.random() < w.longNote
                ? beatDuration * (1 + Math.random())
                : beatDuration * (0.25 + Math.random() * 0.5);
            // Occasionally use lower octave
            const octaveShift = Math.random() < 0.15 ? 0.5 : 1;
            notes.push({ freq: scale[currentIdx] * octaveShift, duration, type: waveType });
        }
    }

    // Add bass line (every 4 beats)
    const bassNotes = [];
    for (let i = 0; i < Math.ceil(noteCount / 4); i++) {
        const bassIdx = Math.floor(Math.random() * 3); // root, 3rd, 5th
        bassNotes.push({ freq: scale[bassIdx] / 2, duration: beatDuration * 2, type: 'sine' });
    }

    return { melody: notes, bass: bassNotes, waveType, bpm };
}

// ── PROMPT-AWARE LYRICS GENERATION ──
function generateLyrics(mood, genre, prompt) {
    // Extract meaningful words from the prompt
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','it','this','that','from','as','are','was','be','has','had','do','does','my','your','we','i','me','you','he','she','they','our','make','like','want','need','some','get','let','can','will','just']);
    const promptWords = (prompt || '').toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const theme = promptWords.slice(0, 5).join(' ') || 'music and life';

    // Theme-specific line generators
    const themeLines = {
        love: [
            `Your love is everything I need`, `Hearts beating as one tonight`,
            `Hold me close, never let me go`, `Every whisper tells our story`,
            `In your eyes I see forever`, `Two souls dancing in the moonlight`,
        ],
        night: [
            `The night is alive with sound`, `Stars are falling all around`,
            `Midnight dreams and neon lights`, `Dancing through the endless night`,
            `The city sleeps but we're awake`, `Under moonlit sky we break`,
        ],
        rain: [
            `Rain falls like a symphony`, `Drops of silver melody`,
            `Washing away yesterday's pain`, `Dancing barefoot in the rain`,
            `Thunder echoes what I feel`, `Every raindrop makes it real`,
        ],
        summer: [
            `Golden sun on my skin`, `Summer breeze, let it begin`,
            `Endless days of warmth and light`, `Beach waves crashing left and right`,
            `Ice cream dreams and salty air`, `Freedom floating everywhere`,
        ],
        dream: [
            `Lost in a dream I never want to end`, `Fantasy and reality blend`,
            `Floating through a world of light`, `Everything feels so right`,
            `Close my eyes and start to fly`, `Touching colors in the sky`,
        ],
        dance: [
            `Move your body to the beat`, `Feel the rhythm in your feet`,
            `The floor is ours tonight`, `Spinning under flashing lights`,
            `Let the music take control`, `Dancing deep into your soul`,
        ],
        sad: [
            `Tears fall like autumn leaves`, `My heart breaks but still believes`,
            `Empty rooms and silent phones`, `Walking through this world alone`,
            `Missing everything we had`, `Memories that make me sad`,
        ],
        party: [
            `Turn it up and let it go`, `Feel the bass drop down below`,
            `Hands up, reaching for the sky`, `Tonight we're gonna fly so high`,
            `The crowd goes wild, can you feel it`, `This moment is ours to live it`,
        ],
    };

    // Match prompt to themes
    const themeMap = {
        love: ['love','heart','romance','kiss','darling','baby','together','crush','passion','affection'],
        night: ['night','dark','moon','midnight','stars','evening','late','neon','city'],
        rain: ['rain','storm','thunder','drops','wet','umbrella','clouds','weather'],
        summer: ['summer','sun','beach','hot','warm','vacation','sea','ocean','sand'],
        dream: ['dream','sleep','imagine','fantasy','wonder','float','fly','cloud'],
        dance: ['dance','move','groove','rhythm','beat','club','floor','step','vibe'],
        sad: ['sad','cry','miss','alone','broken','lost','pain','tears','gone','goodbye'],
        party: ['party','celebrate','fun','wild','crazy','tonight','turn','lit','fire','hype'],
    };

    let matchedThemes = [];
    for (const [th, keywords] of Object.entries(themeMap)) {
        if (promptWords.some(w => keywords.includes(w))) matchedThemes.push(th);
    }
    if (matchedThemes.length === 0) matchedThemes = ['dream'];

    // Mood-based filler lines
    const moodLines = {
        'Calm': ['Peaceful moments drift on by', 'The world stands still in gentle time', 'Breathe in deep and let it flow', 'Quiet whispers soft and low'],
        'Energetic': ['We own the night, we own the stage', 'Breaking free from every cage', 'Running fast, no looking back', 'On fire, there\'s no turning back'],
        'Melancholic': ['Shadows fall on empty streets', 'Memories play on repeat', 'Time moves slow when you\'re away', 'I still remember every day'],
        'Happy': ['Sunshine breaking through the grey', 'Every moment feels like play', 'Laughter echoes all around', 'Joy in every sight and sound'],
        'Mysterious': ['Secrets hidden in the dark', 'Every shadow leaves its mark', 'The unknown is calling me', 'Into mysteries, I\'m set free'],
        'Romantic': ['Your smile lights up my world', 'In your arms, I come unfurled', 'Love is written in the stars', 'You\'re the one who heals my scars'],
    };

    const fillers = moodLines[mood] || moodLines['Calm'];
    const themed = matchedThemes.flatMap(t => themeLines[t] || []);
    const allLines = [...themed, ...fillers].sort(() => Math.random() - 0.5);

    // Create prompt-specific chorus line
    const chorusKeyword = promptWords[0] || 'music';
    const chorusTemplates = [
        `Oh, ${chorusKeyword}, you're all I need tonight`,
        `${chorusKeyword.charAt(0).toUpperCase() + chorusKeyword.slice(1)}, take me higher, take me far`,
        `Living for the ${chorusKeyword}, living for the sound`,
        `Every ${chorusKeyword} brings me back to life`,
    ];
    const chorusLine1 = chorusTemplates[Math.floor(Math.random() * chorusTemplates.length)];
    const chorusLine2 = allLines[0] || 'Feel the music in your soul';

    const verse1 = allLines.slice(1, 5).join('\n');
    const verse2 = allLines.slice(5, 9).length >= 4 ? allLines.slice(5, 9).join('\n') : allLines.slice(1, 5).sort(() => Math.random() - 0.5).join('\n');
    const chorus = `${chorusLine1}\n${chorusLine2}\n${allLines[allLines.length - 1] || 'Let the music set you free'}\nYeah, ${chorusKeyword}, this is where we belong`;
    const bridge = `(Bridge)\n${themed[themed.length - 1] || 'Close your eyes and feel the sound'}\n${fillers[fillers.length - 1] || 'Everything comes back around'}`;

    return `[Verse 1]\n${verse1}\n\n[Chorus]\n${chorus}\n\n[Verse 2]\n${verse2}\n\n[Chorus]\n${chorus}\n\n${bridge}\n\n[Outro]\n${chorusLine1}\n${chorusKeyword.charAt(0).toUpperCase() + chorusKeyword.slice(1)}... (fade out)`;
}

app.post('/api/music/generate', async (req, res) => {
    const { prompt, genre, mood, tempo, key, withLyrics } = req.body;

    const words = (prompt || '').split(' ').filter(w => w.length > 3);
    const pick = (words.length > 0 ? words[Math.floor(Math.random() * words.length)] : 'Untitled').replace(/[^a-zA-Z]/g, '');
    const sfx = ['Dreams', 'Waves', 'Nights', 'Echoes', 'Journey', 'Drift', 'Horizon', 'Aurora'];
    const name = (pick ? pick.charAt(0).toUpperCase() + pick.slice(1) : 'Audio') + ' ' + sfx[Math.floor(Math.random() * sfx.length)];

    const fullPrompt = `${genre || 'Lo-fi'} ${mood || 'calm'} music, ${prompt || 'instrumental'}, ${tempo || 90} BPM`;

    // Try HuggingFace MusicGen API
    let audioBase64 = null;
    let usedAI = false;
    try {
        const hfRes = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: fullPrompt }),
            signal: AbortSignal.timeout(30000),
        });
        if (hfRes.ok) {
            const audioBuffer = await hfRes.arrayBuffer();
            audioBase64 = Buffer.from(audioBuffer).toString('base64');
            usedAI = true;
        }
    } catch (err) {
        console.log('HuggingFace API unavailable, using local synthesis:', err.message);
    }

    const sequence = generateNoteSequence(genre, mood, tempo, key || 'C Major');

    const track = {
        id: 'trk_' + Math.random().toString(36).substring(2, 9),
        name,
        prompt,
        genre,
        mood,
        tempo,
        key: key || 'C Major',
        date: new Date().toLocaleDateString(),
        sequence,
        usedAI,
    };

    if (audioBase64) {
        track.audioBase64 = audioBase64;
    }

    if (withLyrics) {
        track.lyrics = generateLyrics(mood, genre, prompt);
    }

    res.json(track);
});

// ── CONCERTS ROUTES ──

// GET /api/concerts?state=...&city=...
app.get('/api/concerts', (req, res) => {
    const { state, city } = req.query;
    let query = 'SELECT * FROM concerts';
    let conditions = [];
    let params = [];
    if (state) {
        conditions.push('LOWER(state) = ?');
        params.push(state.toLowerCase());
    }
    if (city) {
        conditions.push('LOWER(city) LIKE ?');
        params.push(`%${city.toLowerCase()}%`);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date ASC';
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ concerts: rows });
    });
});

// GET /api/concerts/states — returns list of valid Indian states
app.get('/api/concerts/states', (req, res) => {
    res.json({ states: INDIAN_STATES, locations: INDIAN_LOCATIONS });
});

app.post('/api/concerts', authenticateToken, (req, res) => {
    const { state, city, title, date, venue, price } = req.body;
    if (!state || !city || !title) return res.status(400).json({ error: 'State, city, and title are required' });

    // Validate Indian state
    const validState = INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase());
    if (!validState) {
        return res.status(400).json({
            error: 'Only Indian locations are supported',
            message: `"${state}" is not a valid Indian state or union territory. Please select a valid Indian state.`
        });
    }

    db.run(
        'INSERT INTO concerts (state, city, title, date, venue, price, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [validState, city, title, date, venue, price, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.post('/api/concerts/book', authenticateToken, (req, res) => {
    const { concertId } = req.body;
    if (!concertId) return res.status(400).json({ error: 'Concert ID required' });

    const qrCode = `TK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    db.run(
        'INSERT INTO tickets (concert_id, user_id, qr_code) VALUES (?, ?, ?)',
        [concertId, req.user.id, qrCode],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, ticketId: this.lastID, qrCode });
        }
    );
});

app.get('/api/users/tickets', authenticateToken, (req, res) => {
    db.all(
        `SELECT tickets.qr_code, tickets.id as ticket_id, concerts.* 
         FROM tickets 
         JOIN concerts ON tickets.concert_id = concerts.id 
         WHERE tickets.user_id = ?`,
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ tickets: rows });
        }
    );
});

// Fallback
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
