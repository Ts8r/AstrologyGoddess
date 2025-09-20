/* assets/main.js */
(() => {
  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Helpers
  const EUR = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
  const q = (sel, el=document) => el.querySelector(sel);
  const qa = (sel, el=document) => [...el.querySelectorAll(sel)];
  const parse = s => { try { return JSON.parse(s); } catch { return null; } };

  // State (persisted)
  const STORAGE_KEY = 'ag_cart_v2';
  const state = { cart: parse(localStorage.getItem(STORAGE_KEY)) || [] };
  const save  = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));

  // Refs
  const refs = {
    count: q('#cart-count'),
    list: q('#cart-items'),
    empty: q('#cart-empty'),
    clear: q('#clear-cart'),
    checkoutBtn: q('#checkout-btn'),
    subtotal: q('#cart-subtotal'),
    checkoutBox: q('#checkout'),
    orderHidden: q('#order-items'),
    orderTotalHidden: q('#order-total'),
    orderList: q('#order-summary'),
    bookingForm: q('#booking-form'),
    contactForm: q('#contact-form'),
    bookingFeedback: q('#booking-feedback'),
    contactFeedback: q('#contact-feedback'),
  };

  // Compute subtotal
  const subtotal = () => state.cart.reduce((s,i)=> s + i.price * i.qty, 0);

  // Render cart
  function renderCart(){
    if (!refs.list) return;

    refs.list.innerHTML = '';
    const has = state.cart.length > 0;

    if (refs.empty) refs.empty.style.display = has ? 'none' : 'block';
    if (refs.clear) refs.clear.disabled = !has;
    if (refs.checkoutBtn) refs.checkoutBtn.disabled = !has;
    if (refs.count) refs.count.textContent = String(state.cart.reduce((s,i)=>s+i.qty,0));
    if (refs.subtotal) refs.subtotal.textContent = EUR.format(subtotal());

    if (!has) return;

    state.cart.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div class="cart-item__meta">
          <span class="cart-item__name">${item.name}</span>
          <span class="cart-item__category">${item.category}</span>
        </div>
        <div class="qty" data-index="${idx}">
          <button class="qty-dec" aria-label="Decrease">−</button>
          <input class="qty-input" type="number" min="1" value="${item.qty}" inputmode="numeric" />
          <button class="qty-inc" aria-label="Increase">+</button>
        </div>
        <div>
          <div class="cart-item__price">${EUR.format(item.price * item.qty)}</div>
          <button class="cart-item__remove" data-index="${idx}" aria-label="Remove ${item.name}">Remove</button>
        </div>
      `;
      refs.list.appendChild(li);
    });
  }

  // Sync checkout
  function syncCheckout(){
    if (refs.orderHidden) refs.orderHidden.value = JSON.stringify(state.cart);
    if (refs.orderTotalHidden) refs.orderTotalHidden.value = String(subtotal());
    if (refs.orderList){
      refs.orderList.innerHTML = state.cart.length
        ? state.cart.map(i => `<li>${i.name} × ${i.qty} — <strong>${EUR.format(i.price*i.qty)}</strong> <span class="muted">(${i.category})</span></li>`).join('')
        : '<li class="muted">No items.</li>';
    }
  }

  // Add item (merge by id)
  function addToCart(card){
    const id = card.dataset.id || card.querySelector('h4')?.textContent?.trim() || String(Date.now());
    const exists = state.cart.find(i => i.id === id);
    const item = {
      id,
      name: card.dataset.name || card.querySelector('h4')?.textContent?.trim() || 'Service',
      category: card.dataset.category || card.closest('.service')?.querySelector('h3')?.textContent?.trim() || '',
      price: Number(card.dataset.price || 0),
      qty: 1
    };
    if (exists) exists.qty += 1; else state.cart.push(item);
    save(); renderCart(); syncCheckout();
  }

  // Delegated clicks
  document.addEventListener('click', (e) => {
    // Add
    const addBtn = e.target.closest('.add-to-cart');
    if (addBtn){
      const card = addBtn.closest('.option-card');
      if (card) addToCart(card);
      q('#cart')?.scrollIntoView({ behavior:'smooth' });
      return;
    }

    // Remove
    const removeBtn = e.target.closest('.cart-item__remove');
    if (removeBtn){
      const idx = Number(removeBtn.dataset.index);
      if (!Number.isNaN(idx)) {
        state.cart.splice(idx,1);
        save(); renderCart(); syncCheckout();
      }
      return;
    }

    // Quantity controls
    const dec = e.target.closest('.qty-dec');
    const inc = e.target.closest('.qty-inc');
    if (dec || inc){
      const box = e.target.closest('.qty');
      const idx = Number(box?.dataset.index);
      if (Number.isNaN(idx)) return;
      const item = state.cart[idx];
      if (!item) return;
      if (dec && item.qty > 1) item.qty -= 1;
      if (inc) item.qty += 1;
      save(); renderCart(); syncCheckout();
      return;
    }
  });

  // Quantity direct input
  refs.list?.addEventListener('input', (e) => {
    const input = e.target.closest('.qty-input');
    if (!input) return;
    const box = e.target.closest('.qty');
    const idx = Number(box?.dataset.index);
    let val = Math.max(1, Number(input.value || 1));
    if (!Number.isFinite(val)) val = 1;
    state.cart[idx].qty = val;
    save(); renderCart(); syncCheckout();
  });

  // Clear & Checkout
  refs.clear?.addEventListener('click', () => { state.cart.length = 0; save(); renderCart(); syncCheckout(); });
  refs.checkoutBtn?.addEventListener('click', () => {
    refs.checkoutBox?.classList.remove('hidden');
    syncCheckout();
    refs.checkoutBox?.scrollIntoView({ behavior:'smooth' });
  });

  // Dummy submits (no backend on GitHub Pages)
  refs.bookingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    refs.bookingFeedback.textContent = 'Order captured locally ✅. Connect a form service (Netlify, Formspree…) to receive it.';
    state.cart.length = 0; save(); renderCart(); syncCheckout();
  });
  refs.contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    refs.contactFeedback.textContent = 'Message captured locally ✅. Connect a form service to receive emails.';
  });

  // Initial paint
  renderCart(); syncCheckout();
  console.log('%cAstrology Goddess JS ready','color:#d6b16b');
})();