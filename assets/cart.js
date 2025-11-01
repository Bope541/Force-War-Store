const cartElement = document.querySelector("#cart-drawer");
class CartHelper {
static cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
static items = [];
static async revalidate() {
try {
const products = await Mginex.getProductsByIds(this.cart.map((item) => item.productId));
this.items = [];
for (const item of this.cart) {
const product = products.find((product) => product.id === item.productId);
item.quantity =
typeof product.utils.minQuantity === "number" && item.quantity < product.utils.minQuantity
? product.utils.minQuantity
: item.quantity;
this.items.push({
...item,
...product,
variant: item.variantId ? product.variants.find((variant) => variant.id === item.variantId) : null,
});
}
handleCheckoutItems();
} catch (error) {
console.log(error);
console.log("Get cart items error");
}
}
static addItem(props) {
if (this.cart.find((item) => item.productId === props.productId && item.variantId === props.variantId))
return this.revalidate();
this.cart.push(props);
this.save();
this.revalidate();
publishEvent("add_cart_item", { productId: props.productId });
}
static removeItemQuantity(productId, variantId) {
this.cart = this.cart.map((item) => {
if (item.productId === productId && item.variantId === variantId) item.quantity -= 1;
return item;
});
this.save();
this.items = this.items.map((item) => {
if (item.productId === productId && item.variantId === variantId) item.quantity -= 1;
return item;
});
this.revalidateQuantity();
}
static addItemQuantity(productId, variantId) {
this.cart = this.cart.map((item) => {
if (item.productId === productId && item.variantId === variantId) item.quantity += 1;
return item;
});
this.save();
this.items = this.items.map((item) => {
if (item.productId === productId && item.variantId === variantId) item.quantity += 1;
return item;
});
this.revalidateQuantity();
}
static removeItem(productId, variantId) {
this.cart = this.cart.filter((item) => !(item.productId === productId && item.variantId === variantId));
this.save();
this.items = this.items.filter((item) => !(item.productId === productId && item.variantId === variantId));
handleCheckoutItems();
}
static changeQuantity(productId, quantity, variantId) {
this.cart = this.cart.map((item) => {
if (item.productId === productId && item.variantId === variantId) item.quantity = quantity;
return item;
});
this.save();
this.items = this.items.map((item) => {
if (item.productId === productId && item.variantId === variantId) item.quantity = quantity;
return item;
});
handleCheckoutItems();
}
static revalidateQuantity() {
for (const item of this.items) {
if (typeof item.utils.minQuantity === "number" && item.quantity < item.utils.minQuantity)
this.changeQuantity(item.productId, item.utils.minQuantity, item.variantId);
if (item.quantity < 1) this.removeItem(item.productId, item.variantId);
if (item.quantity >= 1000) this.changeQuantity(item.productId, 1000, item.variantId);
}
handleCheckoutItems();
}
static save() {
localStorage.setItem("cart", JSON.stringify(this.cart));
}
}
CartHelper.revalidate();
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
input.addEventListener("blur", () => {
CartHelper.revalidateQuantity();
});
input.addEventListener("change", (e) => {
CartHelper.changeQuantity(productId, parseInt(e.target.value), variantId);
});
});
}
function handleCheckoutItems() {
const productsList = cartElement.querySelector("#products-list");
if (CartHelper.items.length < 1) productsList.innerHTML = `<div class="my-auto text-center flex flex-col items-center justify-center h-full">
<i data-lucide="shopping-cart" class="size-12 text-primary mb-3"></i>
<h4 class="text-xl font-semibold">Seu carrinho está vazio.</h4>
<p class="text-sm font-medium text-muted-foreground">Adicione produtos ao seu carrinho para que possa ve-los aqui.</p>
</div>`;
else productsList.innerHTML = CartHelper.items.map((product) => `<div class="flex items-center justify-between space-x-3 p-3 rounded-md bg-secondary" id="cart-menu-item" data-product-id="${product.id}" data-variant-id="${product.variantId ?? 'null'}">
<div class="flex items-center gap-3">
<div>
<img src="${product.info.mainImage}" class="w-14 h-14 rounded-sm object-cover border" alt="${product.info.title}">
</div>
<div class="flex flex-col space-y-1 flex-1">
<h5 class="text-[0.9rem] break-all line-clamp-2">${product.info.title}${product.variant ? ` > ${product.variant.title}` : ""}</h5>
<div>
<div class="flex items-center space-x-2"><span class="text-sm text-muted-foreground">${formatPrice(product.type === "DEFAULT" ? product.pricing.price : product.variant.price)}</span></div>
</div>
</div>
</div>
<div class="flex space-x-3">
<div class="flex items-center space-x-3">
<button data-action="remove-quantity" class="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-secondary hover:text-secondary-foreground h-10 w-10" type="button">-</button>
<input data-action="change-quantity" class="bg-transparent text-center outline-none w-12 font-medium" value="${product.quantity}">
<button data-action="add-quantity" class="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-secondary hover:text-secondary-foreground h-10 w-10" type="button">+</button>
</div>
<button data-action="remove-item" class="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-500 text-white shadow-sm hover:bg-destructive/90 h-10 w-10" type="button">
<i data-lucide="trash" class="w-5 h-5"></i>
</button>
</div>
</div>`).join("");
if (CartHelper.cart.length > 0) {
const badgeButton = document.createElement("div");
badgeButton.innerText = CartHelper.cart.length;
badgeButton.className = "absolute px-2.5 py-0.5 bg-primary rounded-full -top-3 -right-3";
document.getElementById("cart-button").appendChild(badgeButton);
} else {
document.getElementById("cart-button").removeChild(document.getElementById("cart-button").querySelector("div"));
}
setupCartListeners();
const pricing = cartElement.querySelector("#cart-pricing");
if (CartHelper.cart.length < 1) pricing.style.display = "none";
else {
pricing.style.display = "flex";
pricing.querySelector("span").innerHTML =
`${formatPrice(CartHelper.items.reduce((acc, item) => (acc += (item.type === "DEFAULT" ? item.pricing.price : item.variant.price) * item.quantity), 0))}`;
}
if (window.lucide) lucide.createIcons();
window.dispatchEvent(new CustomEvent("cart-items-updated", {}));
}
function addCartItem(productId, quantity, variantId, fields = {}, canOpen = false) {
CartHelper.addItem({
productId,
quantity: quantity ?? 1,
variantId: variantId ?? undefined,
fields,
});
if (canOpen) openCart();
}
function changeQuantity(productId, quantity, variantId) {
CartHelper.addItem({
productId,
quantity: quantity ?? 1,
variantId,
});
openCart();
}
function openCart() {
cartElement.setAttribute("style", "display: flex;");
cartElement.setAttribute("data-state", "open");
}
function closeCart() {
cartElement.setAttribute("data-state", "closed");
setTimeout(() => {
cartElement.setAttribute("style", "display: none;");
}, 400);
}
cartElement.addEventListener("click", (event) => {
if (event.target === cartElement) closeCart();
});