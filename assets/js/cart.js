// ======================================================
// 🛒 Force War Cart System (independente da Mginex)
// ======================================================

// 🔧 Detecta automaticamente o caminho base (compatível com GitHub Pages)
const repoName = window.location.pathname.split("/")[1];
const basePath = repoName ? `/${repoName}` : "";

// Formata valores em Real (R$)
function formatPrice(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const cartElement = document.querySelector("#cart-drawer");

class CartHelper {
  static cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
  static items = [];

  // 🔁 Atualiza o carrinho e sincroniza com o JSON de produtos
  static async revalidate() {
    try {
      let products = [];

      // 🔹 Tenta buscar da API principal
      try {
        const response = await fetch("https://api.forcewar.net/products", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        products = await response.json();
        console.log("[ForceWar] Produtos carregados da API principal");
      } catch {
        console.warn("[ForceWar] API principal indisponível. Usando fallback local (assets/data/products.json)");


        // 🔹 Tenta fallback local
        try {
          const localResponse = await fetch(`${basePath}/assets/data/products.json`, { cache: "no-store" });
          if (!localResponse.ok) throw new Error(`Fallback HTTP ${localResponse.status}`);
          products = await localResponse.json();
          console.log("[ForceWar] Produtos carregados do fallback local");
        } catch (fallbackError) {
          console.error("[ForceWar] Falha também ao carregar fallback local:", fallbackError);
          products = []; // evita crash
        }
      }

      // 🔹 Filtra apenas os produtos que estão no carrinho
      products = products.filter((p) =>
        this.cart.some((item) => item.productId === p.id)
      );

      // 🔹 Reconstrói os itens do carrinho
      this.items = [];

      for (const item of this.cart) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;

        item.quantity =
          typeof product.minQuantity === "number" && item.quantity < product.minQuantity
            ? product.minQuantity
            : item.quantity;

        this.items.push({
          ...item,
          ...product,
          variant: item.variantId
            ? product.variants?.find((v) => v.id === item.variantId)
            : null,
        });
      }

      handleCheckoutItems();
    } catch (error) {
      console.error("[ForceWar] Erro inesperado ao revalidar carrinho:", error);
    }
  }

  // Adiciona item
  static addItem(props) {
    if (this.cart.find((item) => item.productId === props.productId && item.variantId === props.variantId))
      return this.revalidate();

    this.cart.push(props);
    this.save();
    this.revalidate();
    window.dispatchEvent(new CustomEvent("add_cart_item", { detail: props }));
  }

  // Remove 1 unidade
  static removeItemQuantity(productId, variantId) {
    this.cart = this.cart.map((item) => {
      if (item.productId === productId && item.variantId === variantId)
        item.quantity -= 1;
      return item;
    });
    this.save();
    this.revalidateQuantity();
  }

  // Adiciona 1 unidade
  static addItemQuantity(productId, variantId) {
    this.cart = this.cart.map((item) => {
      if (item.productId === productId && item.variantId === variantId)
        item.quantity += 1;
      return item;
    });
    this.save();
    this.revalidateQuantity();
  }

  // Remove item completamente
  static removeItem(productId, variantId) {
    this.cart = this.cart.filter(
      (item) => !(item.productId === productId && item.variantId === variantId)
    );
    this.save();
    handleCheckoutItems();
  }

  // Altera a quantidade manualmente
  static changeQuantity(productId, quantity, variantId) {
    this.cart = this.cart.map((item) => {
      if (item.productId === productId && item.variantId === variantId)
        item.quantity = quantity;
      return item;
    });
    this.save();
    handleCheckoutItems();
  }

  // Revalida quantidades e limites
  static revalidateQuantity() {
    for (const item of this.items) {
      if (typeof item.minQuantity === "number" && item.quantity < item.minQuantity)
        this.changeQuantity(item.productId, item.minQuantity, item.variantId);
      if (item.quantity < 1) this.removeItem(item.productId, item.variantId);
      if (item.quantity >= 1000) this.changeQuantity(item.productId, 1000, item.variantId);
    }
    handleCheckoutItems();
  }

  static save() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
  }
}

// Executa sincronização inicial
CartHelper.revalidate();

// ======================================================
// 🧩 Manipulação do carrinho (render e botões)
// ======================================================
function setupCartListeners() {
  document.querySelectorAll("#cart-menu-item").forEach((element) => {
    const productId = element.getAttribute("data-product-id");
    let variantId = element.getAttribute("data-variant-id");
    if (variantId === "null") variantId = undefined;
    const input = element.querySelector("[data-action='change-quantity']");

    element.querySelector("[data-action='remove-quantity']").addEventListener("click", () => {
      CartHelper.removeItemQuantity(productId, variantId);
    });

    element.querySelector("[data-action='add-quantity']").addEventListener("click", () => {
      CartHelper.addItemQuantity(productId, variantId);
    });

    element.querySelector("[data-action='remove-item']").addEventListener("click", () => {
      CartHelper.removeItem(productId, variantId);
    });

    input.addEventListener("blur", () => CartHelper.revalidateQuantity());
    input.addEventListener("change", (e) => {
      CartHelper.changeQuantity(productId, parseInt(e.target.value), variantId);
    });
  });
}

// ======================================================
// 🖼️ Renderização dos itens e total do carrinho
// ======================================================
function handleCheckoutItems() {
  const productsList = cartElement.querySelector("#products-list");

  if (CartHelper.items.length < 1) {
    productsList.innerHTML = `
      <div class="my-auto text-center flex flex-col items-center justify-center h-full">
        <i data-lucide="shopping-cart" class="size-12 text-primary mb-3"></i>
        <h4 class="text-xl font-semibold">Seu carrinho está vazio.</h4>
        <p class="text-sm font-medium text-muted-foreground">
          Adicione produtos ao seu carrinho para que possa vê-los aqui.
        </p>
      </div>`;
  } else {
    productsList.innerHTML = CartHelper.items.map((product) => `
      <div class="flex items-center justify-between space-x-3 p-3 rounded-md bg-secondary" 
           id="cart-menu-item" data-product-id="${product.id}" 
           data-variant-id="${product.variantId ?? 'null'}">
        <div class="flex items-center gap-3">
          <img src="${product.image}" class="w-14 h-14 rounded-sm object-cover border" alt="${product.title}">
          <div class="flex flex-col space-y-1 flex-1">
            <h5 class="text-[0.9rem] break-all line-clamp-2">
              ${product.title}${product.variant ? ` > ${product.variant.title}` : ""}
            </h5>
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-muted-foreground">
                  ${formatPrice(product.variant?.price ?? product.price)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex space-x-3">
          <div class="flex items-center space-x-3">
            <button data-action="remove-quantity" class="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-secondary h-10 w-10" type="button">-</button>
            <input data-action="change-quantity" class="bg-transparent text-center outline-none w-12 font-medium" value="${product.quantity}">
            <button data-action="add-quantity" class="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-secondary h-10 w-10" type="button">+</button>
          </div>
          <button data-action="remove-item" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-500 text-white shadow-sm hover:bg-red-600 h-10 w-10" type="button">
            <i data-lucide="trash" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
    `).join("");
  }

  // 🔢 Badge do botão do carrinho
  const cartBtn = document.getElementById("cart-button");
  const oldBadge = cartBtn.querySelector("div");
  if (CartHelper.cart.length > 0) {
    if (!oldBadge) {
      const badgeButton = document.createElement("div");
      badgeButton.innerText = CartHelper.cart.length;
      badgeButton.className = "absolute px-2.5 py-0.5 bg-primary rounded-full -top-3 -right-3";
      cartBtn.appendChild(badgeButton);
    } else {
      oldBadge.innerText = CartHelper.cart.length;
    }
  } else if (oldBadge) {
    cartBtn.removeChild(oldBadge);
  }

  setupCartListeners();

  // 💰 Atualiza total
  const pricing = cartElement.querySelector("#cart-pricing");
  if (CartHelper.cart.length < 1) {
    pricing.style.display = "none";
  } else {
    pricing.style.display = "flex";
    pricing.querySelector("span").innerHTML =
      `${formatPrice(CartHelper.items.reduce((acc, item) => {
        const unit = item.variant?.price ?? item.price;
        return acc + unit * item.quantity;
      }, 0))}`;
  }

  if (window.lucide) lucide.createIcons();
  window.dispatchEvent(new CustomEvent("cart-items-updated", {}));
}

// ======================================================
// 🧭 Funções auxiliares (abrir/fechar carrinho)
// ======================================================
function addCartItem(productId, quantity, variantId, fields = {}, canOpen = false) {
  CartHelper.addItem({
    productId,
    quantity: quantity ?? 1,
    variantId: variantId ?? undefined,
    fields,
  });
  if (canOpen) openCart();
}

function openCart() {
  cartElement.style.display = "flex";
  cartElement.setAttribute("data-state", "open");
}

function closeCart() {
  cartElement.setAttribute("data-state", "closed");
  setTimeout(() => {
    cartElement.style.display = "none";
  }, 400);
}

cartElement.addEventListener("click", (event) => {
  if (event.target === cartElement) closeCart();
});
