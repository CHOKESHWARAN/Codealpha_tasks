/**
 * AlphaStore Main Application Logic
 * CodeAlpha Full Stack Internship Task 1
 */

// Currency Formatter Helper (INR)
function formatINR(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Application State
const State = {
  products: [],
  cart: [],
  appliedCoupon: null,
  activeCategory: 'All',
  searchQuery: '',
  sortOption: 'newest',
  priceFilter: 'all',
  currentUser: null
};

// =============================================================
// INITIALIZATION
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initCart();
  setupEventListeners();
  loadProducts();
});

function initAuth() {
  State.currentUser = API.getCurrentUser();
  updateAuthUI();
}

function initCart() {
  try {
    const savedCart = localStorage.getItem('alpha_cart');
    State.cart = savedCart ? JSON.parse(savedCart) : [];
  } catch {
    State.cart = [];
  }

  try {
    const savedCoupon = localStorage.getItem('alpha_coupon');
    State.appliedCoupon = savedCoupon ? JSON.parse(savedCoupon) : null;
  } catch {
    State.appliedCoupon = null;
  }

  updateCartBadge();
  renderCart();
}

function saveCart() {
  localStorage.setItem('alpha_cart', JSON.stringify(State.cart));
  if (State.appliedCoupon) {
    localStorage.setItem('alpha_coupon', JSON.stringify(State.appliedCoupon));
  } else {
    localStorage.removeItem('alpha_coupon');
  }
  updateCartBadge();
  renderCart();
}

// =============================================================
// EVENT LISTENERS SETUP
// =============================================================
function setupEventListeners() {
  // Category Navigation Pills
  const catTabs = document.querySelectorAll('.cat-pill');
  catTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      catTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.activeCategory = btn.getAttribute('data-category');
      loadProducts();
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let debounceTimeout = null;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const val = e.target.value.trim();
    clearSearchBtn.style.display = val ? 'block' : 'none';

    debounceTimeout = setTimeout(() => {
      State.searchQuery = val;
      loadProducts();
    }, 280);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    State.searchQuery = '';
    loadProducts();
  });

  // Sorting
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', (e) => {
    State.sortOption = e.target.value;
    loadProducts();
  });

  // Price Filter
  const priceFilterSelect = document.getElementById('priceFilterSelect');
  priceFilterSelect.addEventListener('change', (e) => {
    State.priceFilter = e.target.value;
    loadProducts();
  });

  // Cart Drawer open/close
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cartOverlay')) {
      closeCart();
    }
  });

  // Apply Coupon Button
  document.getElementById('applyCouponBtn').addEventListener('click', handleApplyCoupon);
  document.getElementById('couponInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCoupon();
    }
  });

  // Proceed to Checkout Button
  document.getElementById('proceedCheckoutBtn').addEventListener('click', openCheckoutModal);

  // User Account Menu Toggle
  const userMenuBtn = document.getElementById('userMenuBtn');
  const accountDropdown = document.getElementById('accountDropdown');
  userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    accountDropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!accountDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
      accountDropdown.classList.remove('open');
    }
  });

  // Payment method radio cards change
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const cardFields = document.getElementById('cardFieldsBox');
      cardFields.style.display = e.target.value === 'Card' ? 'block' : 'none';
    });
  });
}

// =============================================================
// PRODUCT CATALOG MANAGEMENT
// =============================================================
async function loadProducts() {
  const grid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyCatalogState');
  const countLabel = document.getElementById('productCountLabel');
  const title = document.getElementById('catalogTitle');

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
      <p class="mt-2">Loading products...</p>
    </div>
  `;
  emptyState.style.display = 'none';

  // Compute min/max price params (INR)
  let minPrice = null;
  let maxPrice = null;
  if (State.priceFilter === 'under3000') maxPrice = 3000;
  if (State.priceFilter === '3000to7000') { minPrice = 3000; maxPrice = 7000; }
  if (State.priceFilter === 'over7000') minPrice = 7000;

  try {
    const res = await API.getProducts({
      category: State.activeCategory,
      search: State.searchQuery,
      sort: State.sortOption,
      minPrice,
      maxPrice
    });

    State.products = res.products || [];

    // Update labels & headers
    title.textContent = State.activeCategory === 'All' ? 'All Products' : `${State.activeCategory} Catalog`;
    countLabel.textContent = `Showing ${State.products.length} product${State.products.length === 1 ? '' : 's'}`;

    updateActiveFilterTags();

    if (State.products.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    renderProductCards(State.products);
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--danger);">
        <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
        <p class="mt-2">Failed to load product catalog. Please ensure the backend is running.</p>
        <button class="btn btn-primary btn-sm mt-3" onclick="loadProducts()">Retry</button>
      </div>
    `;
  }
}

function updateActiveFilterTags() {
  const bar = document.getElementById('activeFiltersBar');
  const catTag = document.getElementById('activeCategoryTag');
  const searchTag = document.getElementById('activeSearchTag');

  let hasFilters = false;

  if (State.activeCategory !== 'All') {
    catTag.innerHTML = `Category: <strong>${State.activeCategory}</strong>`;
    catTag.style.display = 'inline-flex';
    hasFilters = true;
  } else {
    catTag.style.display = 'none';
  }

  if (State.searchQuery) {
    searchTag.innerHTML = `Search: "<strong>${escapeHtml(State.searchQuery)}</strong>"`;
    searchTag.style.display = 'inline-flex';
    hasFilters = true;
  } else {
    searchTag.style.display = 'none';
  }

  bar.style.display = hasFilters ? 'flex' : 'none';
}

function resetFilters() {
  State.activeCategory = 'All';
  State.searchQuery = '';
  State.sortOption = 'newest';
  State.priceFilter = 'all';

  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  document.getElementById('sortSelect').value = 'newest';
  document.getElementById('priceFilterSelect').value = 'all';

  const catTabs = document.querySelectorAll('.cat-pill');
  catTabs.forEach(b => b.classList.remove('active'));
  if (catTabs[0]) catTabs[0].classList.add('active');

  loadProducts();
}

function renderProductCards(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = (e) => {
      // Don't open detail if user clicked Add to Cart button directly
      if (!e.target.closest('.add-cart-btn')) {
        openProductModal(p.id);
      }
    };

    const badgeHtml = p.badge ? `<span class="badge-tag">${p.badge}</span>` : '';
    const origPriceHtml = p.original_price ? `<span class="original-price">${formatINR(p.original_price)}</span>` : '';

    card.innerHTML = `
      <div class="product-thumb-box">
        ${badgeHtml}
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
        <button class="quick-view-overlay-btn" title="Quick View" onclick="openProductModal('${p.id}')">
          <i class="fa-regular fa-eye"></i>
        </button>
      </div>

      <div class="product-info-box">
        <div class="product-category-row">
          <span class="product-category">${p.category}</span>
          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <span>${p.rating.toFixed(1)} (${p.reviews_count})</span>
          </div>
        </div>

        <h3 class="product-title">${escapeHtml(p.name)}</h3>
        <p class="product-description-snippet">${escapeHtml(p.description)}</p>

        <div class="product-stock-indicator">
          <i class="fa-solid fa-circle-check"></i>
          <span>In Stock (${p.stock} available)</span>
        </div>

        <div class="product-bottom-row">
          <div class="price-container">
            <span class="current-price">${formatINR(p.price)}</span>
            ${origPriceHtml}
          </div>
          <button class="add-cart-btn" onclick="addToCart('${p.id}', 1, event)">
            <i class="fa-solid fa-cart-plus"></i> Add
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// =============================================================
// PRODUCT DETAILS PAGE / MODAL
// =============================================================
async function openProductModal(productId) {
  const modal = document.getElementById('productModal');
  const body = document.getElementById('productModalBody');

  body.innerHTML = `
    <div style="text-align: center; padding: 4rem 0;">
      <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
      <p class="mt-2">Loading product details...</p>
    </div>
  `;
  modal.classList.add('open');

  try {
    const res = await API.getProductById(productId);
    const p = res.product;
    const related = res.relatedProducts || [];

    const origPriceHtml = p.original_price ? `<span class="detail-orig-price">${formatINR(p.original_price)}</span>` : '';
    const discountPercent = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
    const discountBadge = discountPercent > 0 ? `<span class="badge-tag" style="position: static; margin-left: 0.5rem; background: var(--success);">${discountPercent}% OFF</span>` : '';

    const thumbsHtml = (p.gallery && p.gallery.length > 1)
      ? p.gallery.map((img, i) => `
          <img src="${img}" class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchGalleryImage('${img}', this)" alt="Thumbnail">
        `).join('')
      : '';

    const featuresHtml = (p.features && p.features.length > 0)
      ? `<ul class="features-list">
          ${p.features.map(f => `<li><i class="fa-solid fa-check"></i> <span>${escapeHtml(f)}</span></li>`).join('')}
         </ul>`
      : '';

    const relatedHtml = related.length > 0 ? `
      <div class="modal-related-section">
        <h4>You May Also Like</h4>
        <div class="related-grid">
          ${related.map(r => `
            <div class="product-card" onclick="openProductModal('${r.id}')">
              <div class="product-thumb-box" style="padding-top: 65%;">
                <img src="${r.image}" alt="${escapeHtml(r.name)}">
              </div>
              <div style="padding: 0.75rem;">
                <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">${r.category}</div>
                <div style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(r.name)}</div>
                <div style="font-weight: 800; font-size: 0.95rem; margin-top: 0.35rem;">${formatINR(r.price)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    body.innerHTML = `
      <div class="product-detail-grid">
        <div class="gallery-column">
          <img src="${p.image}" id="mainGalleryImage" class="gallery-main-img" alt="${escapeHtml(p.name)}">
          <div class="gallery-thumbs">${thumbsHtml}</div>
        </div>

        <div class="detail-info-column">
          <span class="detail-category-badge">${p.category}</span>
          <h2 class="detail-title">${escapeHtml(p.name)}</h2>

          <div class="detail-meta-row">
            <div class="product-rating">
              <i class="fa-solid fa-star"></i>
              <span>${p.rating.toFixed(1)} (${p.reviews_count} Customer Reviews)</span>
            </div>
            <span style="color: var(--border);">|</span>
            <div class="product-stock-indicator" style="margin-bottom: 0;">
              <i class="fa-solid fa-box-check"></i>
              <span>${p.stock} units in stock</span>
            </div>
          </div>

          <div class="detail-price-box">
            <span class="detail-price">${formatINR(p.price)}</span>
            ${origPriceHtml}
            ${discountBadge}
          </div>

          <p class="detail-description">${escapeHtml(p.description)}</p>

          <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Key Specifications & Features:</h4>
          ${featuresHtml}

          <div class="detail-actions-row">
            <div class="cart-qty-stepper" style="padding: 0.2rem;">
              <button class="cart-qty-btn" onclick="stepDetailQty(-1)"><i class="fa-solid fa-minus"></i></button>
              <span class="cart-qty-val" id="detailQtyInput" style="min-width: 38px;">1</span>
              <button class="cart-qty-btn" onclick="stepDetailQty(1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="btn btn-primary" style="flex: 1;" onclick="addDetailToCart('${p.id}')">
              <i class="fa-solid fa-cart-plus"></i> Add to Cart
            </button>
          </div>
        </div>
      </div>

      ${relatedHtml}
    `;
  } catch (err) {
    body.innerHTML = `
      <div style="text-align: center; padding: 3rem 0; color: var(--danger);">
        <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
        <p class="mt-2">Failed to load product details.</p>
        <button class="btn btn-primary btn-sm mt-3" onclick="closeProductModal()">Close</button>
      </div>
    `;
  }
}

function switchGalleryImage(imgUrl, thumbEl) {
  const mainImg = document.getElementById('mainGalleryImage');
  if (mainImg) mainImg.src = imgUrl;

  const thumbs = document.querySelectorAll('.gallery-thumb');
  thumbs.forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

function stepDetailQty(delta) {
  const el = document.getElementById('detailQtyInput');
  if (!el) return;
  let current = parseInt(el.textContent, 10) || 1;
  current = Math.max(1, current + delta);
  el.textContent = current;
}

function addDetailToCart(productId) {
  const el = document.getElementById('detailQtyInput');
  const qty = el ? parseInt(el.textContent, 10) || 1 : 1;
  addToCart(productId, qty);
  closeProductModal();
  openCart();
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

// =============================================================
// SHOPPING CART MANAGEMENT
// =============================================================
function addToCart(productId, quantity = 1, event = null) {
  if (event) event.stopPropagation();

  const prod = State.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = State.cart.find(item => item.productId === productId);

  if (existing) {
    if (existing.quantity + quantity > prod.stock) {
      showToast(`Only ${prod.stock} items currently in stock!`, 'error');
      return;
    }
    existing.quantity += quantity;
  } else {
    State.cart.push({
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      image: prod.image,
      stock: prod.stock,
      quantity: quantity
    });
  }

  saveCart();
  showToast(`Added "${prod.name}" to cart!`, 'success');
}

function updateCartItemQty(productId, delta) {
  const item = State.cart.find(i => i.productId === productId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > item.stock) {
    showToast(`Maximum available stock reached (${item.stock})`, 'error');
    return;
  }

  item.quantity = newQty;
  saveCart();
}

function removeFromCart(productId) {
  State.cart = State.cart.filter(item => item.productId !== productId);
  saveCart();
  showToast('Item removed from cart', 'info');
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadgeCount');
  const headerCount = document.getElementById('cartHeaderCount');
  const totalItems = State.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (badge) badge.textContent = totalItems;
  if (headerCount) headerCount.textContent = totalItems;
}

function calculateCartTotals() {
  const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let discount = 0;
  if (State.appliedCoupon) {
    discount = subtotal * (State.appliedCoupon.discountPercent / 100);
  }

  let shipping = 99.00;
  if (subtotal - discount >= 999 || (State.appliedCoupon && State.appliedCoupon.code === 'FREESHIP')) {
    shipping = 0.00;
  }

  const grandTotal = Math.max(0, subtotal - discount + (subtotal > 0 ? shipping : 0));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    shipping: subtotal > 0 ? shipping : 0,
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const footer = document.getElementById('cartFooter');
  const meterBox = document.getElementById('shippingMeterBox');
  const meterText = document.getElementById('shippingMeterText');
  const progressBar = document.getElementById('shippingProgressBar');

  if (State.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <i class="fa-solid fa-basket-shopping"></i>
        <h4>Your Cart is Empty</h4>
        <p>Looks like you haven't added any tech essentials yet.</p>
        <button class="btn btn-primary btn-sm mt-3" onclick="closeCart()">Start Shopping</button>
      </div>
    `;
    footer.style.display = 'none';
    meterBox.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  meterBox.style.display = 'block';

  const totals = calculateCartTotals();

  // Update Free Shipping Progress Bar
  const freeShipThreshold = 999.00;
  if (totals.subtotal >= freeShipThreshold || (State.appliedCoupon && State.appliedCoupon.code === 'FREESHIP')) {
    meterText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked <strong>Free Standard Shipping</strong>!`;
    progressBar.style.width = '100%';
  } else {
    const diff = freeShipThreshold - totals.subtotal;
    const pct = Math.min(100, Math.round((totals.subtotal / freeShipThreshold) * 100));
    meterText.innerHTML = `Add <strong>${formatINR(diff)}</strong> more to get <strong>Free Shipping</strong>!`;
    progressBar.style.width = `${pct}%`;
  }

  // Render Item List
  container.innerHTML = State.cart.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
        <div class="cart-item-price">${formatINR(item.price)} each</div>
        <div class="cart-qty-stepper">
          <button class="cart-qty-btn" onclick="updateCartItemQty('${item.productId}', -1)"><i class="fa-solid fa-minus"></i></button>
          <span class="cart-qty-val">${item.quantity}</span>
          <button class="cart-qty-btn" onclick="updateCartItemQty('${item.productId}', 1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
      <div class="cart-item-actions">
        <span class="cart-item-total">${formatINR(item.price * item.quantity)}</span>
        <button class="cart-remove-btn" onclick="removeFromCart('${item.productId}')" title="Remove item">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Update Summary Rows
  document.getElementById('cartSubtotal').textContent = formatINR(totals.subtotal);

  const discountRow = document.getElementById('cartDiscountRow');
  if (totals.discount > 0 && State.appliedCoupon) {
    discountRow.style.display = 'flex';
    document.getElementById('cartDiscountPercent').textContent = State.appliedCoupon.discountPercent;
    document.getElementById('cartDiscountAmount').textContent = `-${formatINR(totals.discount)}`;
  } else {
    discountRow.style.display = 'none';
  }

  document.getElementById('cartShippingFee').textContent = totals.shipping === 0 ? 'FREE' : formatINR(totals.shipping);
  document.getElementById('cartGrandTotal').textContent = formatINR(totals.grandTotal);

  // Applied Coupon Tag
  const couponTag = document.getElementById('appliedCouponTag');
  if (State.appliedCoupon) {
    couponTag.style.display = 'flex';
    document.getElementById('appliedCouponLabel').textContent = `Applied: ${State.appliedCoupon.code} (${State.appliedCoupon.discountPercent}% OFF)`;
  } else {
    couponTag.style.display = 'none';
  }
}

async function handleApplyCoupon() {
  const input = document.getElementById('couponInput');
  const code = input.value.trim().toUpperCase();

  if (!code) {
    showToast('Please enter a coupon code.', 'error');
    return;
  }

  const totals = calculateCartTotals();

  try {
    const res = await API.applyCoupon(code, totals.subtotal);
    State.appliedCoupon = res.coupon;
    input.value = '';
    saveCart();
    showToast(`Coupon "${res.coupon.code}" applied successfully!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function removeCoupon() {
  State.appliedCoupon = null;
  saveCart();
  showToast('Coupon removed.', 'info');
}

function copyCoupon(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Copied coupon code "${code}" to clipboard!`, 'success');
    const input = document.getElementById('couponInput');
    if (input) input.value = code;
  }).catch(() => {
    showToast(`Coupon: ${code}`, 'info');
  });
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
}

// =============================================================
// CHECKOUT & ORDER PROCESSING
// =============================================================
function openCheckoutModal() {
  if (State.cart.length === 0) {
    showToast('Your shopping cart is empty.', 'error');
    return;
  }

  closeCart();
  const modal = document.getElementById('checkoutModal');
  modal.classList.add('open');

  // Pre-fill user data if authenticated
  if (State.currentUser) {
    const nameInput = document.getElementById('checkoutName');
    const emailInput = document.getElementById('checkoutEmail');
    if (nameInput && !nameInput.value) nameInput.value = State.currentUser.name || '';
    if (emailInput && !emailInput.value) emailInput.value = State.currentUser.email || '';
  }

  renderCheckoutSummary();
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.remove('open');
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkoutItemsPreview');
  const totals = calculateCartTotals();

  container.innerHTML = State.cart.map(item => `
    <div class="checkout-preview-row">
      <div class="preview-row-left">
        <img src="${item.image}" alt="${escapeHtml(item.name)}">
        <div>
          <div>${escapeHtml(item.name)}</div>
          <small class="text-muted">Qty: ${item.quantity} × ${formatINR(item.price)}</small>
        </div>
      </div>
      <strong>${formatINR(item.price * item.quantity)}</strong>
    </div>
  `).join('');

  document.getElementById('checkoutSubtotal').textContent = formatINR(totals.subtotal);

  const discRow = document.getElementById('checkoutDiscountRow');
  if (totals.discount > 0) {
    discRow.style.display = 'flex';
    document.getElementById('checkoutDiscount').textContent = `-${formatINR(totals.discount)}`;
  } else {
    discRow.style.display = 'none';
  }

  document.getElementById('checkoutShipping').textContent = totals.shipping === 0 ? 'FREE' : formatINR(totals.shipping);
  document.getElementById('checkoutGrandTotal').textContent = formatINR(totals.grandTotal);
  document.getElementById('checkoutSubmitTotal').textContent = formatINR(totals.grandTotal);
}

async function handlePlaceOrder(event) {
  event.preventDefault();

  if (State.cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitOrderBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...`;

  const customerName = document.getElementById('checkoutName').value.trim();
  const customerEmail = document.getElementById('checkoutEmail').value.trim();
  const shippingAddress = document.getElementById('checkoutAddress').value.trim();
  const city = document.getElementById('checkoutCity').value.trim();
  const postalCode = document.getElementById('checkoutPostal').value.trim();

  const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'Card';

  const orderPayload = {
    customerName,
    customerEmail,
    shippingAddress,
    city,
    postalCode,
    paymentMethod,
    items: State.cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    })),
    couponCode: State.appliedCoupon ? State.appliedCoupon.code : null
  };

  try {
    const res = await API.createOrder(orderPayload);
    const order = res.order;

    // Clear cart & coupon
    State.cart = [];
    State.appliedCoupon = null;
    saveCart();

    closeCheckoutModal();
    openOrderSuccessModal(order);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-shield-check"></i> Place Order Now (<span id="checkoutSubmitTotal">${formatINR(totals.grandTotal)}</span>)`;
    renderCheckoutSummary();
  }
}

// =============================================================
// ORDER CONFIRMATION & INVOICE RECEIPT MODAL
// =============================================================
function openOrderSuccessModal(order) {
  const modal = document.getElementById('orderSuccessModal');
  modal.classList.add('open');

  document.getElementById('receiptOrderId').textContent = order.id;
  document.getElementById('receiptCustomerName').textContent = order.customerName;
  document.getElementById('receiptCustomerEmail').textContent = order.customerEmail;
  document.getElementById('receiptShippingAddress').textContent = order.shippingAddress;
  document.getElementById('receiptPaymentMethod').textContent = order.paymentMethod;

  const tableBody = document.getElementById('receiptItemsTableBody');
  tableBody.innerHTML = order.items.map(item => `
    <tr>
      <td>${escapeHtml(item.name || item.product_name)}</td>
      <td>${item.quantity}</td>
      <td class="text-right">${formatINR(item.price)}</td>
      <td class="text-right"><strong>${formatINR(item.total)}</strong></td>
    </tr>
  `).join('');

  document.getElementById('receiptSubtotal').textContent = formatINR(order.subtotal);

  const discRow = document.getElementById('receiptDiscountRow');
  if (order.discount && order.discount > 0) {
    discRow.style.display = 'flex';
    document.getElementById('receiptDiscount').textContent = `-${formatINR(order.discount)}`;
  } else {
    discRow.style.display = 'none';
  }

  document.getElementById('receiptShipping').textContent = order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee);
  document.getElementById('receiptTotal').textContent = formatINR(order.total);

  showToast(`Order ${order.id} placed successfully!`, 'success');
}

function closeOrderSuccessModal() {
  document.getElementById('orderSuccessModal').classList.remove('open');
  loadProducts(); // Reload to refresh stock counters
}

// =============================================================
// USER AUTHENTICATION & PROFILE
// =============================================================
function updateAuthUI() {
  const guestContent = document.getElementById('guestMenuContent');
  const userContent = document.getElementById('userMenuContent');
  const userLabel = document.getElementById('userBtnLabel');
  const avatar = document.getElementById('dropdownUserAvatar');
  const nameEl = document.getElementById('dropdownUserName');
  const emailEl = document.getElementById('dropdownUserEmail');

  if (State.currentUser) {
    guestContent.style.display = 'none';
    userContent.style.display = 'block';

    const initials = State.currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    userLabel.textContent = State.currentUser.name.split(' ')[0];
    avatar.textContent = initials || 'CA';
    nameEl.textContent = State.currentUser.name;
    emailEl.textContent = State.currentUser.email;
  } else {
    guestContent.style.display = 'block';
    userContent.style.display = 'none';
    userLabel.textContent = 'Sign In';
  }
}

function openAuthModal(tab = 'login') {
  document.getElementById('accountDropdown').classList.remove('open');
  const modal = document.getElementById('authModal');
  modal.classList.add('open');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('loginTabBtn');
  const regTab = document.getElementById('registerTabBtn');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');

  if (tab === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    regForm.style.display = 'block';
    loginForm.style.display = 'none';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorBox = document.getElementById('loginErrorMsg');
  const btn = document.getElementById('loginSubmitBtn');

  errorBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await API.login(email, password);
    State.currentUser = res.user;
    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome back, ${res.user.name}!`, 'success');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In to Your Account';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorBox = document.getElementById('registerErrorMsg');
  const btn = document.getElementById('registerSubmitBtn');

  errorBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const res = await API.register(name, email, password);
    State.currentUser = res.user;
    updateAuthUI();
    closeAuthModal();
    showToast(`Account created! Welcome, ${res.user.name}!`, 'success');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Free Account';
  }
}

async function quickDemoLogin() {
  try {
    const res = await API.login('demo@everest.com', 'password123');
    State.currentUser = res.user;
    updateAuthUI();
    closeAuthModal();
    showToast(`Logged in as Everest Customer: ${res.user.name}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logoutUser() {
  API.logout();
  State.currentUser = null;
  updateAuthUI();
  document.getElementById('accountDropdown').classList.remove('open');
  showToast('You have been logged out.', 'info');
}

// =============================================================
// MY ORDERS HISTORY MODAL
// =============================================================
async function openMyOrdersModal() {
  document.getElementById('accountDropdown').classList.remove('open');
  const modal = document.getElementById('myOrdersModal');
  const body = document.getElementById('ordersListBody');

  body.innerHTML = `
    <div style="text-align: center; padding: 3rem 0;">
      <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
      <p class="mt-2">Fetching your orders history...</p>
    </div>
  `;
  modal.classList.add('open');

  try {
    const res = await API.getMyOrders();
    const orders = res.orders || [];

    if (orders.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
          <i class="fa-solid fa-receipt fa-3x" style="margin-bottom: 1rem;"></i>
          <h4>No Orders Placed Yet</h4>
          <p>Orders you place while signed in will appear here.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = orders.map(ord => `
      <div class="order-history-card">
        <div class="order-card-header">
          <div>
            <strong style="color: var(--primary);">${ord.id}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(ord.created_at).toLocaleString()}</div>
          </div>
          <div style="text-align: right;">
            <span class="order-status-badge">${ord.status}</span>
            <div style="font-size: 1.05rem; font-weight: 800; margin-top: 0.25rem;">${formatINR(ord.total)}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem;">
          ${(ord.items || []).map(i => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <img src="${i.product_image}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">
                <span>${escapeHtml(i.product_name)}</span>
              </div>
              <span class="text-muted">${i.quantity} × ${formatINR(i.price)}</span>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); font-size: 0.8rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
          <span>Shipped to: ${escapeHtml(ord.shipping_address)}, ${escapeHtml(ord.city)}</span>
          <span>Payment: <strong>${escapeHtml(ord.payment_method)}</strong></span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    body.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--danger);">
        <p>Failed to load orders. Please make sure you are signed in.</p>
      </div>
    `;
  }
}

function closeMyOrdersModal() {
  document.getElementById('myOrdersModal').classList.remove('open');
}

// =============================================================
// TOAST NOTIFICATION HELPER
// =============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check text-success';
  if (type === 'error') icon = 'fa-circle-exclamation text-danger';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
