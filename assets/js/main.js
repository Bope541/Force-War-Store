console.log("[ForceWar] main.js carregado!");
const base_url = window.location.origin;
function Spinner({ size = 5 }) {
return `
<svg aria-hidden="true" id="spinner" class="size-${size} text-white/30 animate-spin fill-white" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
<path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
</svg>
`;
}
function formatPrice(amount, currency = "BRL") {
return amount.toLocaleString(undefined, {
style: "currency",
currency,
});
}
function setLoading(button, loading) {
const text = button.querySelector("span");
if (loading) {
button.disabled = true;
text.classList.add("hidden");
button.innerHTML += Spinner({});
} else {
button.disabled = false;
text.classList.remove("hidden");
button.querySelector("#spinner").remove();
}
}
function loadCategory(categoryId, element) {
(async () => {
try {
const req = await fetch(`${base_url}/search?categoryId=${categoryId}&page=1&limit=1000&type=DEFAULT`).then((res) =>
res.text(),
);
element.querySelector("#products-list").innerHTML = req;
element.classList.add("visible");
if (window.lucide) lucide.createIcons();
} catch (error) {
console.log("Load products error");
}
})();
}
(() => {
document.querySelectorAll("#category-section").forEach((category) => {
new IntersectionObserver(
(entries, observer) => {
entries.forEach((entry) => {
if (entry.isIntersecting) {
loadCategory(category.getAttribute("data-category-id"), category);
observer.unobserve(entry.target);
}
});
},
{
rootMargin: "0px 0px 0px 0px",
threshold: 0.1,
},
).observe(category);
});
})();
function useAction({ handle, onError, onSuccess, autoExecute = false }) {
async function execute(input) {
try {
const data = await handle(input);
if (data.error) return onError(new Error(data.error.name));
onSuccess(data);
} catch (error) {
onError(error);
}
}
if (autoExecute) execute();
return {
execute,
};
}
function callNotification(content, status) {
const html = `
<div class="flex items-center gap-2">
${
status === "error"
? '<i data-lucide="circle-x" class="text-red-500 me-0.5 min-size-4 inline"></i>'
: '<i data-lucide="circle-check" class="text-green-500 me-0.5 min-size-4 inline"></i>'
}
<p class="text-sm">${content}</p>
</div>
`;
Toastify({
style: {
background: `rgb(var(--background))`,
border: "solid 1px rgb(var(--border))",
borderRadius: "8px",
boxShadow: "none",
maxWidth: "520px",
minWidth: "310px",
width: "fit-content",
display: "flex",
gap: "16px",
alignItems: "center",
justifyContent: "space-between",
},
escapeMarkup: false,
text: html,
duration: 3000,
close: true,
gravity: "bottom",
position: "right",
}).showToast();
lucide.createIcons();
}
const toast = {
success: function (content) {
callNotification(content, "success");
},
error: function (content) {
callNotification(content, "error");
},
};
document.querySelectorAll("[data-action=copy]").forEach((element) => {
const content = element.getAttribute("data-content");
element.addEventListener("click", () => {
window.navigator.clipboard.writeText(content);
element.disabled = true;
element.setAttribute("data-is-copied", "true");
setTimeout(() => {
element.disabled = false;
element.setAttribute("data-is-copied", "false");
}, 1500);
toast.success("Conteúdo copiado com sucesso para sua área de transferência!");
});
});
document.querySelectorAll("[data-action=download]").forEach((element) => {
const content = element.getAttribute("data-content");
const name = element.getAttribute("data-name");
element.addEventListener("click", () => {
const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
const a = document.createElement("a");
a.href = url;
a.download = name;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
toast.success("Conteúdo baixado com sucesso!");
});
});
function useTyping(inputElement, { onStart, onStop, delay = 600 }) {
let typingTimer;
let isTyping = false;
const handleInput = () => {
const value = inputElement.value;
if (!isTyping) {
isTyping = true;
onStart?.(value);
}
clearTimeout(typingTimer);
typingTimer = setTimeout(() => {
isTyping = false;
onStop?.(value);
}, delay);
};
inputElement.addEventListener("input", handleInput);
return () => {
inputElement.removeEventListener("input", handleInput);
clearTimeout(typingTimer);
};
}
(() => {
const searchContainer = document.getElementById("search-items");
const inputElement = document.getElementById("search-popover").querySelector("input");
inputElement.addEventListener("focus", () => {
if (inputElement.value) {
searchContainer.style.display = "block";
}
});
inputElement.addEventListener("blur", () => {
setTimeout(() => {
if (!searchContainer.contains(document.activeElement)) {
searchContainer.style.display = "none";
}
}, 0);
});
useTyping(inputElement, {
onStart: () => {
searchContainer.style.display = "block";
searchContainer.innerHTML = `<div class="p-3 flex items-center justify-center">${Spinner({ size: 10 })}</div>`;
},
onStop: async (content) => {
if (!content) {
searchContainer.style.display = "none";
return;
}
try {
const req = await fetch(`${base_url}/search?title=${content}&page=1&limit=1000&type=SEARCH`).then((res) =>
res.text(),
);
searchContainer.innerHTML = req;
} catch (error) {}
},
});
})();
(() => {
setCookie("storeId", "01994f4f-0365-78dd-9acf-63a1a970ce7a");
})();
window.addEventListener("DOMContentLoaded", function () {
  const canvas = document.createElement("canvas");
  canvas.id = "starfield-bg";
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "1",
    pointerEvents: "none",
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const stars = [];
  const NUM = 300;

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener("resize", resize);
  resize();

  for (let i = 0; i < NUM; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      depth: Math.random() * 3 + 1,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
    });
  }

  let mx = canvas.width / 2;
  let my = canvas.height / 2;
  addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const vx = (mx - canvas.width / 2) / 100;
    const vy = (my - canvas.height / 2) / 100;

    for (const s of stars) {
      s.x += vx * (1 / s.depth);
      s.y += vy * (1 / s.depth);
      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
      if (s.y < 0) s.y = canvas.height;
      if (s.y > canvas.height) s.y = 0;

      ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
});
let navbar = document.querySelector(".nav");
function toggleFAQ(questionElement) {
questionElement.parentNode.classList.toggle("active");
}
function scrollToElement(selector, index = 0) {
const elements = document.querySelectorAll(selector);
if (elements.length > index) {
const targetElement = elements[index];
gsap.to(window, {
duration: 1,
scrollTo: {
y: targetElement,
offsetY: 170
},
ease: "power2.out"
});
}
}
document.addEventListener('DOMContentLoaded', function() {
const readMoreBtn = document.getElementById('readMoreBtn');
const descriptionContent = document.getElementById('descriptionContent');
const fadeGradient = document.getElementById('fadeGradient');
let isExpanded = false;
readMoreBtn.addEventListener('click', function() {
if (!isExpanded) {
descriptionContent.classList.remove('max-h-48');
descriptionContent.classList.add('max-h-none');
fadeGradient.classList.add('hidden');
readMoreBtn.textContent = 'Ler menos';
isExpanded = true;
} else {
descriptionContent.classList.remove('max-h-none');
descriptionContent.classList.add('max-h-48');
fadeGradient.classList.remove('hidden');
readMoreBtn.textContent = 'Ler mais';
isExpanded = false;
}
});
});
document.addEventListener("DOMContentLoaded", function() {
AOS.init({
once: false,
mirror: true
});
});
const swiper = new Swiper(".mySwiper", {
slidesPerView: "auto",
spaceBetween: 16,
loop: true,
speed: 4000,
autoplay: {
delay: 1000,
disableOnInteraction: false,
pauseOnMouseEnter: true,
},
freeMode: true,
freeModeMomentum: false,
grabCursor: true,
});