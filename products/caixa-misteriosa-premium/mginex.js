const environment = {
    production: {
        api_url: "https://api.mginex.com",
        websocket_url: "wss://ws.mginex.com",
    },
    development: {
        api_url: "http://localhost:5000",
        websocket_url: "ws://localhost:1000",
    },
};

const env = environment[window.location.hostname.endsWith(".localhost") ? "development" : "production"];

const socket = io(env.websocket_url, {
    query: {
        authType: getCookie("token") ? "store_customer" : "store_visitor",
        accessToken: getCookie("token"),
        orderId: window.location.pathname.split("/")[2],
        storeId: getCookie("storeId"),
    },
    autoConnect: false,
    transports: ["websocket"],
});

function publishEvent(event, payload) {
    if (typeof window.fbq === "function") {
        if (event === "add_cart_item") fbq("track", "AddToCart");
        else if (event === "order_created") fbq("track", "InitiateCheckout");
        else if (event === "order_approved")
            fbq("track", "Purchase", {
                value: payload.pricing.total,
                currency: payload.pricing.currency,
            });
        else if (event === "search") fbq("track", "Search");
    }
}

socket.on("connect", () => {
    console.log("%c[WEBSOCKET] Successfully connected to the server.", "color: rgb(99 50 253 / 1); font-size: medium;");
    window.dispatchEvent(new CustomEvent("socket-connect"));
});

socket.on("disconnect", () => {
    console.log("%c[WEBSOCKET] Disconnected from the server.", "color: red; font-size: medium;");
    window.dispatchEvent(new CustomEvent("socket-disconnect"));
});

if (window.location.pathname.startsWith("/order/")) {
    socket.connect();
}

function setCookie(name, value, days = 1) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function getCookie(name) {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split("=");
        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

class Mginex {
    static makeRequest(path, options) {
        return fetch(new URL(path, env.api_url), {
            ...options,
            headers: {
                ...options.headers,
                "Content-Type": "application/json",
                store_id: getCookie("storeId"),
                access_token: "9da9d970-fed9-491c-ace5-de944d720d5b",
                secret_key: "98470ad9-916f-4c6f-ad4c-333278507dd5",
                session_id: getCookie("sessionId"),
                authorization: getCookie("token") ? `Bearer ${getCookie("token")}` : undefined,
            },
        });
    }

    static async getProductsByIds(productsIds) {
        return await this.getProducts({ ids: productsIds }).then((data) => data.products);
    }

    static async getProducts(query) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            searchParams.set(key, value);
        }

        return this.makeRequest(`/api/catalog/product?${searchParams.toString()}`, {
            method: "GET",
        }).then((req) => req.json());
    }

    static async getAllCategories() {
        return this.makeRequest("rest-api/v1/store/catalog/categories", {
            method: "GET",
        }).then((req) => req.json());
    }

    static async getCoupon(code) {
        return this.makeRequest(`/api/catalog/coupon/${code}`, {
            method: "GET",
        }).then((req) => req.json());
    }

    static async getCustomFields() {
        return this.makeRequest("rest-api/v1/store/checkout/custom-field", {
            method: "GET",
        }).then((req) => req.json());
    }

    static async placeOrder(data) {
        return this.makeRequest("/api/checkout/order", {
            method: "POST",
            body: JSON.stringify({
                ...data,
                referenceCode: getCookie("referenceCode"),
            }),
        }).then((req) => req.json());
    }

    static async getOrderPayment(orderId) {
        return this.makeRequest(`/api/checkout/order/${orderId}/payment`, {
            method: "GET",
        }).then((req) => req.json());
    }

    static async getChat(chatId) {
        return this.makeRequest(`/rest-api/v1/store/checkout/chat/${chatId}`, {
            method: "GET",
        }).then((req) => req.json());
    }

    static async getChatMessages(chatId) {
        return this.makeRequest(`/rest-api/v1/store/checkout/chat/${chatId}/messages`, {
            method: "GET",
        }).then((req) => req.json());
    }

    static async sendTypingIndicator(chatId, data) {
        return this.makeRequest(`/store/checkout/chat-api/${chatId}/send-typing-indicator`, {
            method: "POST",
            body: JSON.stringify(data),
        }).then((req) => req.json());
    }

    static async sendMessage(chatId, data) {
        return this.makeRequest(`/store/checkout/chat-api/${chatId}/message`, {
            method: "POST",
            body: JSON.stringify(data),
        }).then((req) => req.json());
    }

    static async getRobloxUser(username) {
        return this.makeRequest(`/rest-api/v1/roblox/users/${username}`, {
            method: "GET",
        }).then((req) => req.json());
    }

    static async registerStoreVisit() {
        return this.makeRequest("/api/store/daily-visit", {
            method: "POST",
        }).then((req) => req.json());
    }

    static async sendEmailCode(data) {
        return this.makeRequest("/store/auth/default/send-email-code", {
            method: "POST",
            body: JSON.stringify(data),
        }).then((req) => req.json());
    }

    static async verifyCode(data) {
        return this.makeRequest("/store/auth/default/verify", {
            method: "POST",
            body: JSON.stringify(data),
        }).then((req) => req.json());
    }

    static async sendFeedback(orderId, data) {
        return this.makeRequest("/api/checkout/feedback", {
            method: "POST",
            body: JSON.stringify({
                ...data,
                orderId,
            }),
        }).then((req) => req.json());
    }
}

(async () => {
    try {
        await Mginex.registerStoreVisit();
        console.log("%c[DAILY VISIT] Successfully registered store visit.", "color: green; font-size: medium;");
    } catch (error) {
        console.error("%c[DAILY VISIT] Failed to register store visit.", "color: red; font-size: medium;");
    }

    const searchParams = new URLSearchParams(window.location.search);
    const referenceCode = searchParams.get("referenceCode");
    if (referenceCode) setCookie("referenceCode", referenceCode, 360 * 10);
})();
