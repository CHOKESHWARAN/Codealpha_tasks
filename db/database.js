const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const DB_DIR = __dirname;
const DB_PATH = path.join(DB_DIR, 'ecommerce.db');

let db = null;

function getDb() {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

function initDb() {
  const database = getDb();

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      rating REAL DEFAULT 4.5,
      reviews_count INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 10,
      image TEXT NOT NULL,
      gallery TEXT,
      badge TEXT,
      description TEXT NOT NULL,
      features TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      discount_percent REAL NOT NULL,
      min_spend REAL DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Processing',
      coupon_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  seedData(database);
  return database;
}

function seedData(database) {
  // Check if products exist
  const countStmt = database.prepare('SELECT COUNT(*) as count FROM products');
  const count = countStmt.get().count;

  if (count === 0) {
    console.log('Seeding initial product catalog into SQLite database...');

    const products = [
      {
        id: 'prod-001',
        name: 'AeroPulse Wireless Noise-Cancelling Headphones',
        category: 'Audio',
        price: 11999.00,
        original_price: 15999.00,
        rating: 4.8,
        reviews_count: 128,
        stock: 18,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80'
        ]),
        badge: 'Best Seller',
        description: 'Experience studio-grade acoustics with advanced Hybrid Active Noise Cancellation, 40-hour ultra-long battery life, high-fidelity 40mm graphene drivers, and plush memory foam earcups designed for all-day comfort.',
        features: JSON.stringify([
          'Active Noise Cancellation up to 35dB',
          '40 Hours Continuous Playback with Fast Charge (10 min = 4 hours)',
          'High-Resolution Audio certified with aptX HD codec support',
          'Multipoint Bluetooth 5.3 connection for seamless device switching',
          'Built-in quadruple beamforming microphones with AI wind reduction'
        ])
      },
      {
        id: 'prod-002',
        name: 'TitanFit Pro Smartwatch & Health Tracker',
        category: 'Wearables',
        price: 6999.00,
        original_price: 9999.00,
        rating: 4.7,
        reviews_count: 94,
        stock: 24,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
        ]),
        badge: 'Trending',
        description: 'Elevate your fitness regimen with a crystal-clear 1.43-inch AMOLED Always-on Retina Display, comprehensive SpO2 and Heart Rate tracking, integrated GPS navigation, and 5ATM water resistance.',
        features: JSON.stringify([
          '1.43" Vivid AMOLED Display (466x466) with Gorilla Glass',
          '120+ Sports Modes with Automatic Workout Detection',
          'Continuous 24/7 Heart Rate, SpO2 Blood Oxygen & REM Sleep tracking',
          'Waterproof rated to 50 meters (5ATM)',
          'Up to 14 days standard battery life on a single magnetic charge'
        ])
      },
      {
        id: 'prod-003',
        name: 'UltraView 27-inch 4K UHD Curved Monitor',
        category: 'Electronics',
        price: 24999.00,
        original_price: 31999.00,
        rating: 4.9,
        reviews_count: 82,
        stock: 9,
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80'
        ]),
        badge: 'Top Rated',
        description: 'Immerse your workspace in vibrant visuals with this 1500R curved 4K IPS panel featuring HDR400, 99% sRGB color gamut, 144Hz refresh rate with AMD FreeSync Premium, and USB-C 65W Power Delivery.',
        features: JSON.stringify([
          '3840 x 2160 4K UHD resolution with 1500R ergonomic curvature',
          'Smooth 144Hz refresh rate & ultra-fast 1ms response time',
          '99% sRGB and 95% DCI-P3 color accuracy for creators',
          'USB-C single cable for display output and 65W laptop charging',
          'Eye Saver mode with flicker-free certified blue light filter'
        ])
      },
      {
        id: 'prod-004',
        name: 'KeyCrafter RGB Mechanical Gaming Keyboard',
        category: 'Accessories',
        price: 5499.00,
        original_price: 6999.00,
        rating: 4.6,
        reviews_count: 145,
        stock: 35,
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'
        ]),
        badge: 'Popular',
        description: 'A hot-swappable custom 75% mechanical keyboard outfitted with pre-lubricated linear red switches, sound-dampening silicon gasket mount, and per-key customizable RGB backlighting.',
        features: JSON.stringify([
          'Hot-swappable 5-pin PCB supports Cherry, Gateron, and Kailh switches',
          'Pre-lubed custom linear red switches for silent, buttery keystrokes',
          'Double-shot PBT keycaps with shine-through legends',
          'Tri-mode connectivity: 2.4GHz wireless, Bluetooth 5.0, and USB-C',
          'Integrated volume control aluminum rotary knob'
        ])
      },
      {
        id: 'prod-005',
        name: 'SwiftBeam Precision Ergonomic Wireless Mouse',
        category: 'Accessories',
        price: 2999.00,
        original_price: 3999.00,
        rating: 4.5,
        reviews_count: 110,
        stock: 28,
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80'
        ]),
        badge: null,
        description: 'Sculpted for long hours of productivity, SwiftBeam features a natural handshake angle that reduces forearm strain by 60%, a dual-mode magnetic scroll wheel, and whisper-quiet click switches.',
        features: JSON.stringify([
          '57-degree natural vertical tilt posture promotes neutral wrist alignment',
          'Adjustable 4000 DPI high-precision optical sensor works on glass',
          'Quiet-click buttons reduce acoustic noise by 90%',
          'Rechargeable 500mAh Li-ion battery lasts up to 4 months per charge',
          'Easily pair and switch between 3 laptops or tablets'
        ])
      },
      {
        id: 'prod-006',
        name: 'OmniSound Portable Waterproof Bluetooth Speaker',
        category: 'Audio',
        price: 3999.00,
        original_price: 5499.00,
        rating: 4.7,
        reviews_count: 78,
        stock: 19,
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80'
        ]),
        badge: 'Summer Pick',
        description: 'Compact 360-degree cylindrical audio power with dual neodymium drivers, passive radiators for punchy deep bass, rugged IP67 dust and waterproof rating, and 20-hour playtime.',
        features: JSON.stringify([
          'True 360-degree omnidirectional sound with BassUp technology',
          'IP67 rated: completely dustproof, submersible in 1m water, and floats',
          'Up to 20 hours continuous music playback on medium volume',
          'PartyCast pairing: connect 100+ speakers simultaneously',
          'USB-C charge-out to power your mobile phone in emergencies'
        ])
      },
      {
        id: 'prod-007',
        name: 'PowerVault 20000mAh 65W Fast Charging Power Bank',
        category: 'Accessories',
        price: 3499.00,
        original_price: 4499.00,
        rating: 4.8,
        reviews_count: 203,
        stock: 45,
        image: 'https://images.unsplash.com/photo-1609592426508-cc85340eb424?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1609592426508-cc85340eb424?w=800&q=80'
        ]),
        badge: 'Best Seller',
        description: 'High-density airline-safe 20,000mAh battery with 65W USB-C Power Delivery 3.0 capable of rapidly charging modern MacBooks, laptops, tablets, and phones simultaneously with real-time smart LED status display.',
        features: JSON.stringify([
          '65W USB-C PD 3.0 output charges laptops from 0 to 50% in 35 mins',
          'Massive 20,000mAh capacity provides 4+ full phone charges',
          'Triple output ports: 2x USB-C + 1x USB-A QC 3.0',
          'Precision digital LED display showing exact remaining battery %',
          'Comprehensive 10-point multi-protection temperature circuit guard'
        ])
      },
      {
        id: 'prod-008',
        name: 'Zenith Pro 1080p Streamer Webcam with Ring Light',
        category: 'Electronics',
        price: 4799.00,
        original_price: 6299.00,
        rating: 4.6,
        reviews_count: 67,
        stock: 14,
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80'
        ]),
        badge: null,
        description: 'Crystal-clear Full HD 1080p 60FPS video broadcasting with integrated multi-level touch-dimmable LED ring light, dual omni-directional noise-cancelling mics, and physical sliding privacy cover.',
        features: JSON.stringify([
          '1080p @ 60 FPS HDR autofocus lens with low-light compensation',
          'Integrated multi-stage touch ring light (warm, neutral, cool white)',
          'Dual noise-filtering microphones with auto voice amplification',
          'Built-in sliding privacy shutter for verified webcam security',
          'Universal monitor clip with 1/4" tripod mount thread'
        ])
      },
      {
        id: 'prod-009',
        name: 'AirStream True Wireless Earbuds with ANC',
        category: 'Audio',
        price: 5999.00,
        original_price: 7999.00,
        rating: 4.8,
        reviews_count: 189,
        stock: 22,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80'
        ]),
        badge: 'New Arrival',
        description: 'Featherlight in-ear comfort with Active Noise Cancellation, transparency listening mode, wireless Qi-charging case, and IPX5 sweat resistance tailored for intense workouts and commutes.',
        features: JSON.stringify([
          'Hybrid ANC blocks out background chatter and commute rumble',
          'Transparency mode lets you converse without removing earbuds',
          '32 hours total playback with sleek wireless charging capsule',
          'Customizable EQ presets via responsive capacitive touch controls',
          'IPX5 sweat and splash resistance'
        ])
      },
      {
        id: 'prod-010',
        name: 'NovaPad 10.4-inch Android Tablet 128GB',
        category: 'Electronics',
        price: 14999.00,
        original_price: 18999.00,
        rating: 4.5,
        reviews_count: 53,
        stock: 12,
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80'
        ]),
        badge: 'Sale',
        description: 'Sleek, aluminum-unibody entertainment tablet featuring a 2K 10.4-inch IPS display, quad stereo speakers with Dolby Atmos, Octa-Core processor, and long-lasting 7000mAh battery.',
        features: JSON.stringify([
          '10.4-inch 2K (2000x1200) Ultra-HD wide viewing angle screen',
          'Octa-Core high-speed processor with 6GB RAM + 128GB Storage (expandable)',
          'Quad-speaker array with Dolby Atmos spatial sound tuning',
          '7000mAh battery providing up to 12 hours video playback',
          'Dual-band 5GHz Wi-Fi and Bluetooth 5.1 support'
        ])
      },
      {
        id: 'prod-011',
        name: 'PulseGrip Smart Health Band & Sleep Monitor',
        category: 'Wearables',
        price: 3799.00,
        original_price: 4999.00,
        rating: 4.4,
        reviews_count: 41,
        stock: 20,
        image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80'
        ]),
        badge: null,
        description: 'Ultralight, slim wristband delivering 24/7 biometric monitoring, sleep stage analytics, stress index tracking, silent vibration alarms, and over 14 days of continuous battery life.',
        features: JSON.stringify([
          'Featherlight 18-gram chassis with soft anti-microbial silicone band',
          'Scientific sleep tracker analyzing Deep, Light, and REM cycles',
          'Stress level detection and guided breathing exercises',
          '5ATM water resistance suitable for swimming and showers',
          'Fast magnetic charging with 14-day standby longevity'
        ])
      },
      {
        id: 'prod-012',
        name: 'AeroStand Aluminum Foldable Laptop Riser',
        category: 'Accessories',
        price: 2499.00,
        original_price: 3299.00,
        rating: 4.7,
        reviews_count: 116,
        stock: 38,
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80'
        ]),
        badge: 'Essential',
        description: 'CNC-machined aviation aluminum portable laptop stand with 6 adjustable height angles, open ventilation design for superior device cooling, and non-slip silicone cushioning pads.',
        features: JSON.stringify([
          'Premium sandblasted aircraft-grade aluminum alloy',
          '6 adjustable height elevations from 15 to 45 degrees',
          'Hollow heat-dissipation layout prevents CPU thermal throttling',
          'Collapses into a slim carry pouch in seconds (travel friendly)',
          'Supports all laptops from 10 to 17.3 inches (MacBook, Dell, HP, Lenovo)'
        ])
      }
    ];

    const insertProduct = database.prepare(`
      INSERT INTO products (
        id, name, category, price, original_price, rating, reviews_count, stock, image, gallery, badge, description, features
      ) VALUES (
        @id, @name, @category, @price, @original_price, @rating, @reviews_count, @stock, @image, @gallery, @badge, @description, @features
      )
    `);

    for (const prod of products) {
      insertProduct.run(prod);
    }
  }

  // Seed Coupons
  const couponCountStmt = database.prepare('SELECT COUNT(*) as count FROM coupons');
  if (couponCountStmt.get().count === 0) {
    console.log('Seeding discount coupons...');
    const insertCoupon = database.prepare(`
      INSERT INTO coupons (code, discount_percent, min_spend, description)
      VALUES (?, ?, ?, ?)
    `);

    insertCoupon.run('EVEREST', 20, 1499, '20% OFF on orders above ₹1,499 (Everest Exclusive)');
    insertCoupon.run('EVEREST10', 10, 0, '10% OFF with no minimum spend required');
    insertCoupon.run('CODEALPHA', 15, 1499, '15% OFF on orders above ₹1,499 (CodeAlpha Exclusive)');
    insertCoupon.run('ALPHA10', 10, 0, '10% OFF with no minimum spend required');
    insertCoupon.run('SAVE20', 20, 4999, '20% OFF on premium orders over ₹4,999');
    insertCoupon.run('FREESHIP', 0, 0, 'Free Standard Shipping applied');
  }

  // Seed Demo Users
  const userCountStmt = database.prepare('SELECT COUNT(*) as count FROM users');
  if (userCountStmt.get().count === 0) {
    console.log('Seeding demo user accounts...');
    const insertUser = database.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('password123', salt);
    const adminPasswordHash = bcrypt.hashSync('admin123', salt);

    insertUser.run('usr-demo-001', 'Everest Customer', 'demo@everest.com', demoPasswordHash, 'customer');
    insertUser.run('usr-demo-002', 'Everest Student', 'demo@codealpha.com', demoPasswordHash, 'customer');
    insertUser.run('usr-admin-001', 'Everest Administrator', 'admin@everest.com', adminPasswordHash, 'admin');
  }
}

module.exports = {
  getDb,
  initDb
};
