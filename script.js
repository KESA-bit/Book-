// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAldkKl1rlGjs-amA8rUADDW4vXczckNfs",
    authDomain: "kesa-c9fd6.firebaseapp.com",
    databaseURL: "https://kesa-c9fd6-default-rtdb.firebaseio.com",
    projectId: "kesa-c9fd6",
    storageBucket: "kesa-c9fd6.firebasestorage.app",
    messagingSenderId: "1006282632848",
    appId: "1:1006282632848:web:d8606db435e9292fb8f215",
    measurementId: "G-D2PD70BRB4"
};

// Cloudinary Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dnxyhv8v2/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "tel6jsyk";

let db;
let allProducts = [];
let cart = [];
let currentSliderIndex = 0;
let selectedProductForOrder = null;
let logoClickCount = 0;
let logoClickTimeout;

document.addEventListener("DOMContentLoaded", () => {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        loadProducts();
        listenToOrders();
    }

    // Secret Admin Dashboard Trigger (5 rapid clicks on KESA logo)
    document.getElementById("kesa-logo").addEventListener("click", () => {
        logoClickCount++;
        
        clearTimeout(logoClickTimeout);
        logoClickTimeout = setTimeout(() => { logoClickCount = 0; }, 3000);

        if (logoClickCount === 5) {
            logoClickCount = 0; 
            openAdminWithPassword();
        }
    });

    document.getElementById("order-form").addEventListener("submit", handleOrderSubmit);
    document.getElementById("admin-add-product-form").addEventListener("submit", handleProductUpload);
});

// 1. Fetch books from Firebase Realtime Database
function loadProducts() {
    const productsGrid = document.getElementById("products-grid");
    const adminProductsList = document.getElementById("admin-products-list");

    db.ref("products").on("value", (snapshot) => {
        productsGrid.innerHTML = "";
        if (adminProductsList) adminProductsList.innerHTML = "";
        
        const data = snapshot.val();
        if (!data) {
            productsGrid.innerHTML = "<div class='loading'>No books cataloged yet. Please open Admin panel to add items.</div>";
            return;
        }

        allProducts = [];
        for (let id in data) {
            const prod = data[id];
            prod.id = id;
            allProducts.push(prod);

            // Store Grid Card Layout
            const card = document.createElement("div");
            card.className = "product-card";
            
            const firstImage = prod.images && prod.images.length > 0 ? prod.images[0] : "";

            card.innerHTML = `
                <img src="${firstImage}" class="product-image" alt="${prod.title}" onclick="openOrderModal('${prod.id}')">
                <div>
                    <div class="product-title" title="${prod.title}">${prod.title}</div>
                    <div class="product-price">₹${prod.price}</div>
                    <button class="btn-primary" onclick="addToCart('${prod.id}')">Add to Cart</button>
                </div>
            `;
            productsGrid.appendChild(card);

            // Catalog update list in Admin Panel
            if (adminProductsList) {
                const adminItem = document.createElement("div");
                adminItem.style.padding = "10px 0";
                adminItem.style.borderBottom = "1px solid #333";
                adminItem.innerHTML = `
                    <p><strong>${prod.title}</strong> - Current Price: ₹${prod.price}</p>
                    <button class="btn-secondary" onclick="editProductPrice('${prod.id}')">Update Pricing</button>
                `;
                adminProductsList.appendChild(adminItem);
            }
        }
    });
}

// 2. Shopping Cart Configuration
function addToCart(productId) {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    cart.push(prod);
    updateCartUI();
    alert(`"${prod.title}" added to your shopping cart!`);
}

function updateCartUI() {
    document.getElementById("cart-count").innerText = cart.length;
    const list = document.getElementById("cart-items-list");
    list.innerHTML = "";
    
    let total = 0;
    cart.forEach((item, index) => {
        total += parseInt(item.price);
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.margin = "10px 0";
        div.innerHTML = `
            <span>${item.title} - ₹${item.price}</span>
            <span style="color:#cc0c39; cursor:pointer; font-weight:500;" onclick="removeFromCart(${index})">Remove</span>
        `;
        list.appendChild(div);
    });
    document.getElementById("cart-total-price").innerText = "Total: ₹" + total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCartModal() {
    const modal = document.getElementById("cart-modal");
    modal.style.display = modal.style.display === "flex" ? "none" : "flex";
}

function checkoutCart() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    toggleCartModal();
    openOrderModal(cart[0].id);
}

// 3. Media Viewer Slider Modal
function openOrderModal(productId) {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    selectedProductForOrder = prod;
    currentSliderIndex = 0;

    const slider = document.getElementById("modal-slider");
    slider.innerHTML = "";
    if (prod.images && prod.images.length > 0) {
        prod.images.forEach(imgUrl => {
            const img = document.createElement("img");
            img.src = imgUrl;
            slider.appendChild(img);
        });
    }

    document.getElementById("product-detail-info").innerHTML = `
        <h2 style="color:#ff9900; margin-top:10px;">${prod.title}</h2>
        <h3 style="margin-bottom:15px; font-weight:600;">Price per copy: ₹${prod.price}</h3>
    `;

    document.getElementById("prod-qty").value = 1;

    const savedUser = localStorage.getItem("kesa_user_details");
    const detailsSection = document.getElementById("user-details-section");
    const returningMsg = document.getElementById("returning-user-msg");

    if (savedUser) {
        const user = JSON.parse(savedUser);
        detailsSection.style.display = "none";
        returningMsg.style.display = "block";
        
        document.getElementById("cust-name").value = user.name;
        document.getElementById("cust-phone").value = user.phone;
        document.getElementById("cust-address").value = user.address;
    } else {
        detailsSection.style.display = "block";
        returningMsg.style.display = "none";
    }

    document.getElementById("order-modal").style.display = "flex";
    updateSlider();
}

function moveSlider(direction) {
    const slider = document.getElementById("modal-slider");
    const totalImages = slider.children.length;
    if (totalImages <= 1) return;

    currentSliderIndex += direction;
    if (currentSliderIndex >= totalImages) currentSliderIndex = 0;
    if (currentSliderIndex < 0) currentSliderIndex = totalImages - 1;

    updateSlider();
}

function updateSlider() {
    const slider = document.getElementById("modal-slider");
    slider.style.transform = `translateX(-${currentSliderIndex * 100}%)`;
}

function closeOrderModal() {
    document.getElementById("order-modal").style.display = "none";
}

function enableEditDetails() {
    document.getElementById("user-details-section").style.display = "block";
    document.getElementById("returning-user-msg").style.display = "none";
}

// 4. Submit Order Data Processing
function handleOrderSubmit(e) {
    e.preventDefault();

    const userData = {
        name: document.getElementById("cust-name").value,
        phone: document.getElementById("cust-phone").value,
        address: document.getElementById("cust-address").value
    };

    localStorage.setItem("kesa_user_details", JSON.stringify(userData));

    const selectedQty = parseInt(document.getElementById("prod-qty").value) || 1;
    
    const itemsToOrder = cart.length > 0 
        ? cart.map(i => ({ title: i.title, price: i.price, quantity: 1 })) 
        : [{ title: selectedProductForOrder.title, price: selectedProductForOrder.price, quantity: selectedQty }];
    
    const orderData = {
        items: itemsToOrder,
        customerName: userData.name,
        customerPhone: userData.phone,
        customerAddress: userData.address,
        timestamp: new Date().toLocaleString(),
        status: "Pending"
    };

    db.ref("orders").push(orderData).then(() => {
        alert("Success! Your book order has been registered.");
        cart = [];
        updateCartUI();
        closeOrderModal();
    });
}

// 5. Secure Protected Admin Entry Portal
function openAdminWithPassword() {
    const modal = document.getElementById("admin-modal");
    const pass = prompt("Enter Book Store Admin Passcode:");
    
    if (pass === "kesa123") {
        modal.style.display = "flex";
    } else if (pass !== null) {
        alert("Access Denied! Unauthorized Entry attempt.");
    }
}

function closeAdminPanel() {
    document.getElementById("admin-modal").style.display = "none";
}

function editProductPrice(id) {
    const newPrice = prompt("Enter new price structure amount (₹):");
    if (newPrice) {
        db.ref("products/" + id).update({ price: newPrice })
            .then(() => alert("Pricing updated successfully!"));
    }
}

// 6. FIXED: Sequential Upload Pipeline for Multiple Images
async function handleProductUpload(e) {
    e.preventDefault();
    
    const title = document.getElementById("prod-title").value;
    const price = document.getElementById("prod-price").value;
    const fileInput = document.getElementById("prod-images");
    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        alert("Please select at least one image.");
        return;
    }

    alert(`Starting upload sequence for ${files.length} images. Please wait...`);
    
    let uploadedUrls = [];

    // Safe sequential loop to prevent network blocking or server rejects
    for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
            
            if (!res.ok) {
                const errData = await res.json();
                console.error("Cloudinary Error Details:", errData);
                throw new Error(errData.error?.message || "HTTP error occurred");
            }

            const data = await res.json();
            if (data.secure_url) {
                uploadedUrls.push(data.secure_url);
            }
        } catch (err) {
            console.error("Individual asset upload failed:", err);
            alert(`Failed uploading file: ${file.name}. Error: ${err.message}`);
        }
    }

    // Only save to database if at least one image successfully uploaded
    if (uploadedUrls.length > 0) {
        const productData = {
            title: title,
            price: price,
            images: uploadedUrls
        };

        db.ref("products").push(productData).then(() => {
            alert(`Success! Published "${title}" with ${uploadedUrls.length} images.`);
            document.getElementById("admin-add-product-form").reset();
        });
    } else {
        alert("Media cloud server upload faulted. Verify your Cloudinary Upload Preset allows multiple or unsecured uploads.");
    }
}

// 7. Watch incoming book orders
function listenToOrders() {
    const list = document.getElementById("orders-list");
    db.ref("orders").on("value", (snapshot) => {
        if (!list) return;
        list.innerHTML = "";
        const data = snapshot.val();
        if (!data) { list.innerHTML = "<p style='color: #888;'>No customer orders active currently.</p>"; return; }

        for (let id in data) {
            const order = data[id];
            
            const itemNames = order.items 
                ? order.items.map(i => `${i.title} (x${i.quantity || 1})`).join(", ") 
                : "Children's Book Asset";
                
            const div = document.createElement("div");
            div.className = "order-card";
            div.innerHTML = `
                <p><strong>Books Requested:</strong> <span style="color:#ff9900;">${itemNames}</span></p>
                <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
                <p><strong>Ship To:</strong> ${order.customerAddress}</p>
                <p style="color:#888; font-size:12px; margin-top:5px;"><strong>Logged Time:</strong> ${order.timestamp}</p>
            `;
            list.appendChild(div);
        }
    });
}
