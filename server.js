const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbModule = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha-ecommerce-secret-key-2026';

// Initialize SQLite database
const db = dbModule.initDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Helper & Middlewares
function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.user = decoded;
    next();
  });
}

// -------------------------------------------------------------
// 1. HEALTH CHECK ENDPOINT
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Everest E-Commerce Store API is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// -------------------------------------------------------------
// 2. PRODUCTS ENDPOINTS
// -------------------------------------------------------------

// GET all categories with count
app.get('/api/products/categories', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category 
      ORDER BY category ASC
    `);
    const categories = stmt.all();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all products with filtering, search, and sorting
app.get('/api/products', (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim() !== '') {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (minPrice && !isNaN(minPrice)) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice && !isNaN(maxPrice)) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    // Sorting
    switch (sort) {
      case 'price-asc':
        query += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        query += ' ORDER BY price DESC';
        break;
      case 'rating-desc':
        query += ' ORDER BY rating DESC';
        break;
      case 'name-asc':
        query += ' ORDER BY name ASC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY rowid DESC';
        break;
    }

    const stmt = db.prepare(query);
    const products = stmt.all(...params).map(p => ({
      ...p,
      gallery: p.gallery ? JSON.parse(p.gallery) : [p.image],
      features: p.features ? JSON.parse(p.features) : []
    }));

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET product details by ID
app.get('/api/products/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const product = stmt.get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.gallery = product.gallery ? JSON.parse(product.gallery) : [product.image];
    product.features = product.features ? JSON.parse(product.features) : [];

    // Also fetch related products in the same category
    const relatedStmt = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? LIMIT 3');
    const related = relatedStmt.all(product.category, product.id).map(p => ({
      ...p,
      gallery: p.gallery ? JSON.parse(p.gallery) : [p.image],
      features: p.features ? JSON.parse(p.features) : []
    }));

    res.json({
      success: true,
      product,
      relatedProducts: related
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. COUPON VALIDATION ENDPOINT
// -------------------------------------------------------------
app.post('/api/coupons/apply', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const stmt = db.prepare('SELECT * FROM coupons WHERE code = ?');
    const coupon = stmt.get(cleanCode);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code.' });
    }

    if (subtotal && subtotal < coupon.min_spend) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${coupon.code}' requires a minimum spend of ₹${coupon.min_spend.toLocaleString('en-IN')}.`
      });
    }

    const discountAmount = subtotal ? (subtotal * (coupon.discount_percent / 100)) : 0;

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountPercent: coupon.discount_percent,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        description: coupon.description
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. USER AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and a password of at least 6 characters.'
      });
    }

    // Check if email already registered
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    if (checkStmt.get(cleanEmail)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const userId = 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, 'customer')
    `);
    insertStmt.run(userId, name.trim(), cleanEmail, hashedPassword);

    const userObj = { id: userId, name: name.trim(), email: cleanEmail, role: 'customer' };
    const token = generateToken(userObj);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const userObj = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = generateToken(userObj);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me (Current user info)
app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?');
    const user = stmt.get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. ORDER PROCESSING ENDPOINTS
// -------------------------------------------------------------

// POST /api/orders (Place new order)
app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      shippingAddress,
      city,
      postalCode,
      paymentMethod,
      items,
      couponCode
    } = req.body;

    if (!customerName || !customerEmail || !shippingAddress || !city || !postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required shipping fields.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your shopping cart is empty.'
      });
    }

    // Verify each item against real database prices & stock
    let subtotal = 0;
    const verifiedItems = [];

    const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');

    for (const item of items) {
      const prod = getProductStmt.get(item.productId);
      if (!prod) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} was not found.`
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${prod.name}.`
        });
      }

      if (prod.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${prod.name} (Only ${prod.stock} remaining).`
        });
      }

      const itemTotal = prod.price * qty;
      subtotal += itemTotal;

      verifiedItems.push({
        productId: prod.id,
        name: prod.name,
        image: prod.image,
        price: prod.price,
        quantity: qty,
        total: parseFloat(itemTotal.toFixed(2))
      });
    }

    // Coupon discount calculation
    let discount = 0;
    let validCouponCode = null;

    if (couponCode) {
      const couponStmt = db.prepare('SELECT * FROM coupons WHERE code = ?');
      const coupon = couponStmt.get(couponCode.trim().toUpperCase());
      if (coupon && subtotal >= coupon.min_spend) {
        discount = subtotal * (coupon.discount_percent / 100);
        validCouponCode = coupon.code;
      }
    }

    // Shipping rules: Free shipping over ₹999 or with coupon FREESHIP, else ₹99.00
    let shippingFee = 99.00;
    if (subtotal - discount >= 999 || validCouponCode === 'FREESHIP') {
      shippingFee = 0.00;
    }

    const total = parseFloat((subtotal - discount + shippingFee).toFixed(2));
    const orderId = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    const userId = req.user ? req.user.id : null;

    // Database inserts
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, user_id, customer_name, customer_email, shipping_address, city, postal_code,
        payment_method, subtotal, discount, shipping_fee, total, status, coupon_code
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?
      )
    `);

    insertOrder.run(
      orderId,
      userId,
      customerName.trim(),
      customerEmail.trim().toLowerCase(),
      shippingAddress.trim(),
      city.trim(),
      postalCode.trim(),
      paymentMethod || 'Card',
      parseFloat(subtotal.toFixed(2)),
      parseFloat(discount.toFixed(2)),
      shippingFee,
      total,
      validCouponCode
    );

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
    `);

    for (const vItem of verifiedItems) {
      insertOrderItem.run(
        orderId,
        vItem.productId,
        vItem.name,
        vItem.image,
        vItem.price,
        vItem.quantity,
        vItem.total
      );
      updateStock.run(vItem.quantity, vItem.productId);
    }

    res.status(201).json({
      success: true,
      message: 'Order processed successfully!',
      order: {
        id: orderId,
        customerName,
        customerEmail,
        shippingAddress: `${shippingAddress}, ${city} ${postalCode}`,
        paymentMethod: paymentMethod || 'Card',
        items: verifiedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        shippingFee,
        total,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/:id (Retrieve specific order)
app.get('/api/orders/:id', (req, res) => {
  try {
    const orderStmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    const order = orderStmt.get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const items = itemsStmt.all(order.id);

    res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/user/my-orders (Retrieve orders for logged-in user)
app.get('/api/orders/user/my-orders', requireAuth, (req, res) => {
  try {
    const ordersStmt = db.prepare(`
      SELECT * FROM orders 
      WHERE user_id = ? OR customer_email = ? 
      ORDER BY datetime(created_at) DESC
    `);
    const orders = ordersStmt.all(req.user.id, req.user.email);

    const getItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const fullOrders = orders.map(ord => ({
      ...ord,
      items: getItemsStmt.all(ord.id)
    }));

    res.json({
      success: true,
      orders: fullOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fallback to index.html for SPA client navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Internal server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error occurred.' });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛍️  Everest Simple E-Commerce Store is running!`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📡 REST API Endpoints active at http://localhost:${PORT}/api/`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
