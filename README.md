# 🛍️ Everest — Simple E-Commerce Store

[![CodeAlpha Internship](https://img.shields.io/badge/CodeAlpha-Full%20Stack%20Internship-4f46e5.svg)](https://www.codealpha.tech)
[![Task 1](https://img.shields.io/badge/Task%201-Simple%20E--Commerce%20Store-10b981.svg)]()
[![Company](https://img.shields.io/badge/Company-Everest-blue.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express.js-success.svg)]()
[![Database](https://img.shields.io/badge/Database-SQLite%203-blue.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20ES6+-orange.svg)]()

> A full-stack, responsive e-commerce web application developed for **Everest** as part of **Task 1** of the **CodeAlpha Full Stack Web Development Internship**. Features full product catalog browsing, detailed product views with specs and image galleries, slide-out shopping cart drawer with promo codes, guided order checkout with simulated payments, user authentication (JWT + bcrypt), and persistent database storage.

---

## 📑 Table of Contents
1. [Internship Requirements Checklist](#-internship-requirements-checklist)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Architecture & Database Schema](#-architecture--database-schema)
5. [Quick Start & Installation](#-quick-start--installation)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [Demo Accounts & Promo Coupons](#-demo-accounts--promo-coupons)
8. [Automated Testing](#-automated-testing)
9. [Project Structure](#-project-structure)

---

## ✅ Internship Requirements Checklist

| Requirement | Status | Implementation Details |
| :--- | :---: | :--- |
| **Product Listings** | ✅ Completed | Grid view with category filter pills, real-time debounced search, price range filter, and multiple sort orders. |
| **Product Details Page** | ✅ Completed | Interactive modal with multi-image gallery thumbnail switcher, customer reviews, stock availability meter, bulleted specs, and related product recommendations. |
| **Shopping Cart** | ✅ Completed | Slide-out drawer with quantity steppers (- / +), stock limit validation, free shipping progress bar, promo coupon system, and persistent storage. |
| **Order Processing** | ✅ Completed | Multi-step checkout with address validation, payment method selection (Card, UPI, COD), server-side price & stock verification, and instant printable invoice generation. |
| **User Registration / Login** | ✅ Completed | Secure password hashing (`bcryptjs`), JWT token authorization, user profile menu, and 1-click demo login for rapid evaluation. |
| **Database Storage** | ✅ Completed | Persistent SQLite database (`ecommerce.db`) with tables for `products`, `users`, `orders`, `order_items`, and `coupons`. |

---

## 🌟 Key Features

### 1. 🛍️ Dynamic Product Catalog
- **Category Navigation**: Filter instantly across Audio, Wearables, Electronics, and Accessories.
- **Instant Search**: Debounced live search filtering through product titles and descriptions.
- **Price & Sort Controls**: Sort by featured, price (low-to-high, high-to-low), customer ratings, and alphabetical order.
- **Stock Tracking**: Real-time stock status badges with low stock alerts.

### 2. 🔍 Rich Product Details View
- High-resolution gallery preview with interactive thumbnail selection.
- Comprehensive specifications list and features breakdown.
- Stock meter showing real-time inventory remaining.
- Quantity selector with direct add-to-cart.
- "You May Also Like" related product suggestions.

### 3. 🛒 Interactive Cart Drawer
- Smooth slide-out drawer accessible from any page.
- Item quantity adjustment with automatic subtotal recalculation.
- Free shipping progress indicator ($50 threshold).
- Promo code validation with instant discount calculation.
- Local storage persistence synchronized with backend validation.

### 4. 💳 Order Processing & Invoice Generation
- Full checkout flow: Customer details, shipping address, and payment method (Card, UPI, Cash on Delivery).
- Server-side stock deduction and price integrity verification (tamper-proof).
- Unique Order ID generation (`ORD-YYYYMMDD-XXXX`).
- Printable invoice receipt with complete itemized breakdown.

### 5. 🔐 User Authentication & Order History
- JWT (JSON Web Tokens) with 7-day expiration.
- Passwords securely salted and hashed using `bcryptjs`.
- "My Orders" modal showing past placed orders, items, shipping details, and delivery statuses.
- Built-in **1-Click Demo Login** button for instant evaluator access without entering credentials.

---

## 🛠️ Tech Stack

- **Frontend**:
  - HTML5 (Semantic elements, accessible modal dialogues)
  - Modern CSS3 (CSS Custom Properties, Glassmorphism, Flexbox, CSS Grid, Responsive breakpoints)
  - Vanilla JavaScript (ES6+ Modules, async/await, Fetch API, DOM manipulation)
  - Font Awesome 6.5 & Google Fonts (Plus Jakarta Sans)
- **Backend**:
  - Node.js (v18+)
  - Express.js (REST API, routing, static asset serving, error handling)
  - CORS middleware
  - JSON Web Tokens (`jsonwebtoken`)
  - Bcrypt (`bcryptjs`)
- **Database**:
  - SQLite (Native `node:sqlite` in Node.js 22+ with file persistence at `db/ecommerce.db`)
  - Foreign key constraints & transactional integrity

---

## 🗄️ Database Schema

```
┌────────────────┐       ┌────────────────┐
│     users      │       │    coupons     │
├────────────────┤       ├────────────────┤
│ id (PK)        │       │ code (PK)      │
│ name           │       │ discount_pct   │
│ email (UNIQUE) │       │ min_spend      │
│ password       │       │ description    │
│ role           │       └────────────────┘
│ created_at     │
└───────┬────────┘
        │ 1:N
        ▼
┌────────────────┐ 1:N   ┌────────────────┐
│     orders     ├──────►│  order_items   │
├────────────────┤       ├────────────────┤
│ id (PK)        │       │ id (PK AUTO)   │
│ user_id (FK)   │       │ order_id (FK)  │
│ customer_name  │       │ product_id(FK) │
│ customer_email │       │ product_name   │
│ shipping_addr  │       │ product_image  │
│ city           │       │ price          │
│ postal_code    │       │ quantity       │
│ payment_method │       │ total          │
│ subtotal       │       └────────────────┘
│ discount       │
│ shipping_fee   │       ┌────────────────┐
│ total          │       │    products    │
│ status         │       ├────────────────┤
│ coupon_code    │       │ id (PK)        │
│ created_at     │       │ name           │
└────────────────┘       │ category       │
                         │ price          │
                         │ original_price │
                         │ rating         │
                         │ reviews_count  │
                         │ stock          │
                         │ image          │
                         │ gallery (JSON) │
                         │ badge          │
                         │ description    │
                         │ features (JSON)│
                         │ created_at     │
                         └────────────────┘
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js installed (v18 or higher recommended; v22/v24 included)
- npm package manager

### 1. Clone or Navigate to Directory
```bash
cd CodeAlpha_EcommerceStore
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
*For automatic reload during development:*
```bash
npm run dev
```

### 4. Open in Browser
Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | Service health status check | No |
| `GET` | `/api/products` | Get products with search, category, sort & price filters | No |
| `GET` | `/api/products/categories` | Get category list with product counts | No |
| `GET` | `/api/products/:id` | Get single product details & related products | No |
| `POST` | `/api/coupons/apply` | Validate and calculate coupon discount | No |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user and return JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer Token) |
| `POST` | `/api/orders` | Process and store a new customer order | Optional |
| `GET` | `/api/orders/:id` | Retrieve single order details & invoice items | No |
| `GET` | `/api/orders/user/my-orders`| Retrieve past orders of logged-in user | Yes (Bearer Token) |

---

## 🎟️ Demo Accounts & Promo Coupons

### Pre-Seeded Accounts for Testing:
| Role | Email | Password |
| :--- | :--- | :--- |
| **Demo Customer** | `demo@codealpha.com` | `password123` |
| **Administrator** | `admin@codealpha.com` | `admin123` |

*(You can also click the **"1-Click Demo Login"** button on the top-right menu or inside the login modal to log in instantly).*

### Pre-Seeded Promo Coupons:
| Code | Discount | Conditions |
| :--- | :--- | :--- |
| `EVEREST` | **20% OFF** | Minimum order of ₹1,499 |
| `EVEREST10` | **10% OFF** | No minimum spend required |
| `CODEALPHA` | **15% OFF** | Minimum order of ₹1,499 |
| `SAVE20` | **20% OFF** | Minimum order of ₹4,999 |
| `FREESHIP` | **Free Shipping** | Waives standard ₹99 shipping |

---

## 🧪 Automated Testing

An end-to-end integration test suite is included that tests all 12 API endpoints, database operations, and authentication tokens:

```bash
npm test
```

Expected output:
```
=======================================================
🚀 CODEALPHA TASK 1: API & DATABASE TEST SUITE
=======================================================

1. Health Check: ✅ PASS
2. Products Listing: ✅ PASS (12 products retrieved)
3. Product Categories: ✅ PASS (4 categories found)
4. Product Details (prod-001): ✅ PASS ("AeroPulse Wireless Noise-Cancelling Headphones")
5. Product Search Query: ✅ PASS (1 result matching "Headphones")
6. Coupon Validation: ✅ PASS (15% discount applied)
7. User Registration: ✅ PASS (User ID: usr-...)
8. User Login & JWT Generation: ✅ PASS
9. Authenticated Profile: ✅ PASS (Welcome Test Intern)
10. Order Creation & Stock Update: ✅ PASS (Order ID: ORD-..., Total: $...)
11. Order Lookup: ✅ PASS (Status: Confirmed, Items: 1)
12. User Order History: ✅ PASS (1 order found in history)

=======================================================
🎉 ALL 12 INTEGRATION TESTS PASSED WITH 100% SUCCESS!
=======================================================
```

---

## 📁 Project Structure

```
CodeAlpha_EcommerceStore/
├── db/
│   ├── database.js          # SQLite setup, tables schema & seed dataset
│   └── ecommerce.db         # Persistent SQLite database file
├── public/
│   ├── css/
│   │   └── styles.css       # Complete UI stylesheet & responsive media queries
│   ├── js/
│   │   ├── api.js           # Frontend REST client & token manager
│   │   └── app.js           # Application state, cart, checkout & modal controller
│   └── index.html           # Main SPA interface & modal templates
├── .env.example             # Environment variable template
├── .gitignore               # Ignored files (node_modules, db binaries, logs)
├── package.json             # NPM package scripts and dependencies
├── server.js                # Express REST API & static server
├── test-api.js              # Integration test suite for all endpoints
└── README.md                # Comprehensive project documentation
```

---

## 📌 Submission Guidelines (CodeAlpha)
- **Repository Name**: `CodeAlpha_EcommerceStore`
- **Domain**: Full Stack Web Development
- **Task**: Task 1 (Simple E-Commerce Store)
- Completed by CodeAlpha Intern, 2026.
