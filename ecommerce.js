// Sample product data
const products = [
    {
        id: 1,
        name: "Wireless Noise-Cancelling Headphones",
        price: 199.99,
        originalPrice: 249.99,
        image: "/api/placeholder/400/300",
        category: "electronics",
        rating: 4.7,
        reviews: 1283,
        description: "Premium wireless headphones with active noise cancellation, providing immersive sound quality and all-day comfort.",
        details: [
            "40mm dynamic drivers for rich, detailed sound",
            "Up to 30 hours of battery life",
            "Active noise cancellation technology",
            "Comfortable over-ear design with memory foam cushions",
            "Quick charging capability: 5 hours of playback with just 10 minutes of charging"
        ]
    },
    {
        id: 2,
        name: "Ultra HD Smart TV 55\"",
        price: 649.99,
        originalPrice: 799.99,
        image: "/api/placeholder/400/300",
        category: "electronics",
        rating: 4.5,
        reviews: 856,
        description: "Crystal clear 4K Ultra HD resolution smart TV with built-in streaming apps and voice control.",
        details: [
            "4K Ultra HD resolution (3840 x 2160)",
            "Smart TV functionality with all major streaming apps",
            "Voice control compatible with Alexa and Google Assistant",
            "4 HDMI ports and 2 USB ports",
            "Dolby Vision and HDR10+ support"
        ]
    },
    {
        id: 3,
        name: "Premium Laptop Backpack",
        price: 79.99,
        originalPrice: 99.99,
        image: "/api/placeholder/400/300",
        category: "clothing",
        rating: 4.8,
        reviews: 547,
        description: "Water-resistant backpack with padded laptop compartment and multiple organization pockets.",
        details: [
            "Fits laptops up to 17 inches",
            "Water-resistant material",
            "Anti-theft back pocket for valuables",
            "USB charging port connection",
            "Ergonomic padded shoulder straps"
        ]
    },
    {
        id: 4,
        name: "Smart Fitness Watch",
        price: 129.99,
        originalPrice: 159.99,
        image: "/api/placeholder/400/300",
        category: "electronics",
        rating: 4.6,
        reviews: 932,
        description: "Track your health and fitness goals with this advanced smartwatch featuring heart rate monitoring and GPS.",
        details: [
            "Heart rate and sleep tracking",
            "Built-in GPS for accurate activity tracking",
            "Water resistant up to 50 meters",
            "7+ day battery life",
            "Compatible with iOS and Android devices"
        ]
    },
    {
        id: 5,
        name: "Espresso Coffee Machine",
        price: 299.99,
        originalPrice: 349.99,
        image: "/api/placeholder/400/300",
        category: "home",
        rating: 4.4,
        reviews: 412,
        description: "Compact semi-automatic espresso machine for barista-quality coffee at home.",
        details: [
            "15 bar pressure pump for perfect extraction",
            "Manual milk frother for lattes and cappuccinos",
            "Removable water tank and drip tray for easy cleaning",
            "Compatible with ground coffee or pods",
            "Rapid heating system ready in 30 seconds"
        ]
    },
    {
        id: 6,
        name: "Bestselling Novel Collection",
        price: 49.99,
        originalPrice: 69.99,
        image: "/api/placeholder/400/300",
        category: "books",
        rating: 4.9,
        reviews: 723,
        description: "Collection of five bestselling novels from renowned authors, in hardcover edition with exclusive bonus content.",
        details: [
            "Includes 5 hardcover editions",
            "Exclusive author interviews in each book",
            "Premium bookshelf-worthy design",
            "Comes in a collectible box set",
            "Perfect gift for book lovers"
        ]
    },
    {
        id: 7,
        name: "Premium Chef's Knife",
        price: 89.99,
        originalPrice: 119.99,
        image: "/api/placeholder/400/300",
        category: "home",
        rating: 4.7,
        reviews: 385,
        description: "Professional-grade 8-inch chef's knife made with high-carbon stainless steel for precise cutting.",
        details: [
            "8-inch blade made of high-carbon stainless steel",
            "Ergonomic handle for comfortable grip",
            "Full tang construction for balance and durability",
            "Hand-honed edge for exceptional sharpness",
            "Comes with protective sheath"
        ]
    },
    {
        id: 8,
        name: "Men's Classic Oxford Shirt",
        price: 45.99,
        originalPrice: 59.99,
        image: "/api/placeholder/400/300",
        category: "clothing",
        rating: 4.5,
        reviews: 629,
        description: "Timeless button-down oxford shirt made from premium cotton for comfort and style.",
        details: [
            "100% premium cotton fabric",
            "Button-down collar design",
            "Available in multiple colors and sizes",
            "Machine washable",
            "Tailored slim fit"
        ]
    },
    {
        id: 9,
        name: "Programming Reference Guide",
        price: 34.99,
        originalPrice: 44.99,
        image: "/api/placeholder/400/300",
        category: "books",
        rating: 4.8,
        reviews: 521,
        description: "Comprehensive guide to modern programming languages with practical examples and exercises.",
        details: [
            "Covers JavaScript, Python, and Java",
            "Over 500 pages of content and examples",
            "Includes online access to code repositories",
            "Written by industry experts",
            "Suitable for beginners and intermediate coders"
        ]
    }
];

// DOM elements
const productsGrid = document.getElementById('products-grid');
const categoryList = document.getElementById('category-list');
const currentCategoryElement = document.getElementById('current-category');
const calibrationButton = document.getElementById('calibration-button');
const toggleTrackingButton = document.getElementById('toggle-tracking');
const productModal = document.getElementById('product-modal');
const closeModalButton = document.getElementById('close-modal');
const scrollUpButton = document.getElementById('scroll-up');
const scrollDownButton = document.getElementById('scroll-down');
const hideInstructionsButton = document.getElementById('hide-instructions');
const instructionsElement = document.getElementById('instructions');
const gazeStatusElement = document.querySelector('.gaze-status');

// State variables
let currentCategory = 'all';
let isTrackingActive = false;
let gazeTarget = null;
let gazeStartTime = 0;
const GAZE_DURATION_THRESHOLD = 600; // 1.5 seconds to trigger action
let currentProductInView = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    setupEventListeners();
    setupWebGazer();
});

// Render products based on selected category
function renderProducts() {
    productsGrid.innerHTML = '';
    
    const filteredProducts = currentCategory === 'all' 
        ? products 
        : products.filter(product => product.category === currentCategory);
    
    filteredProducts.forEach(product => {
        const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        
        const productElement = document.createElement('div');
        productElement.classList.add('product-card', 'bg-white', 'rounded-lg', 'shadow-md', 'overflow-hidden', 'eye-tracking-zone');
        productElement.dataset.productId = product.id;
        productElement.dataset.action = 'view-product';
        
        // Generate star rating HTML
        const ratingStars = generateRatingStars(product.rating);
        
        productElement.innerHTML = `
            <div class="relative">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
                <span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">-${discount}%</span>
            </div>
            <div class="p-4">
                <h3 class="text-lg font-semibold mb-2 truncate">${product.name}</h3>
                <div class="flex items-center mb-2">
                    <div class="flex items-center text-yellow-400">
                        ${ratingStars}
                    </div>
                    <span class="text-gray-500 text-sm ml-1">(${product.reviews})</span>
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-bold text-lg">$${product.price.toFixed(2)}</span>
                        <span class="text-gray-500 text-sm line-through ml-1">$${product.originalPrice.toFixed(2)}</span>
                    </div>
                    <button class="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productElement);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Category filtering
    categoryList.addEventListener('click', (e) => {
        const categoryItem = e.target.closest('.category-item');
        if (categoryItem) {
            const category = categoryItem.dataset.category;
            filterByCategory(category);
        }
    });
    
    // Product click to view details
    productsGrid.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
            const productId = parseInt(productCard.dataset.productId);
            openProductModal(productId);
        }
    });
    
    // Close modal
    closeModalButton.addEventListener('click', () => {
        productModal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.classList.add('hidden');
        }
    });
    
    // Scroll buttons
    scrollUpButton.addEventListener('click', () => {
        window.scrollBy({
            top: -400,
            behavior: 'smooth'
        });
    });
    
    scrollDownButton.addEventListener('click', () => {
        window.scrollBy({
            top: 400,
            behavior: 'smooth'
        });
    });
    
    // Toggle tracking button
    toggleTrackingButton.addEventListener('click', toggleTracking);
    
    // Calibration button
    calibrationButton.addEventListener('click', () => {
        webgazer.showPredictionPoints(true);
        webgazer.showVideo(true);
        webgazer.showFaceOverlay(true);
        
        // Simple calibration - in a real app, you'd want a more comprehensive calibration process
        alert('Please follow the moving dot with your eyes for calibration.');
        
        // For now, we'll just make sure webgazer is running
        if (!webgazer.isReady()) {
            webgazer.begin();
        }
    });
    
    // Hide instructions
    hideInstructionsButton.addEventListener('click', () => {
        instructionsElement.classList.add('hidden');
    });
}

// Filter products by category
function filterByCategory(category) {
    currentCategory = category;
    
    // Update active category styling
    document.querySelectorAll('.category-item').forEach(item => {
        if (item.dataset.category === category) {
            item.classList.add('bg-blue-100', 'font-semibold');
        } else {
            item.classList.remove('bg-blue-100', 'font-semibold');
        }
    });
    
    // Update category title
    const categoryTitle = document.querySelector(`[data-category="${category}"]`).textContent.trim();
    currentCategoryElement.textContent = categoryTitle;
    
    // Render filtered products
    renderProducts();
}

// Open product modal with details
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-image').src = product.image;
    document.getElementById('modal-image').alt = product.name;
    document.getElementById('modal-price').textContent = `$${product.price.toFixed(2)}`;
    
    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    document.getElementById('modal-discount').textContent = `${discount}% OFF`;
    
    document.getElementById('modal-rating').innerHTML = generateRatingStars(product.rating);
    document.getElementById('modal-reviews').textContent = `${product.reviews} reviews`;
    document.getElementById('modal-description').textContent = product.description;
    
    const detailsList = document.getElementById('modal-details');
    detailsList.innerHTML = '';
    product.details.forEach(detail => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check text-green-500 mr-2"></i>${detail}`;
        detailsList.appendChild(li);
    });
    
    productModal.classList.remove('hidden');
}

// Generate star rating HTML
function generateRatingStars(rating) {
    let starsHtml = '';
    
    // Full stars
    const fullStars = Math.floor(rating);
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (rating % 1 >= 0.5) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }
    
    return starsHtml;
}

// WebGazer setup and handling
function setupWebGazer() {
    webgazer.setGazeListener((data, timestamp) => {
        if (!data || !isTrackingActive) return;
        
        const { x, y } = data;

        // Check if gaze is on a trackable element
        const elements = document.elementsFromPoint(x, y);
        const trackableElement = elements.find(element => 
            element.classList.contains('eye-tracking-zone') || 
            element.classList.contains('category-item')
        );
        
        if (trackableElement) {
            // If we're looking at a new element, reset the timer
            if (gazeTarget !== trackableElement) {
                gazeTarget = trackableElement;
                gazeStartTime = Date.now();
                updateGazeStatus(`Looking at: ${getElementDescription(trackableElement)}`);
            } else {
                // Check if we've been looking long enough to trigger action
                const gazeTime = Date.now() - gazeStartTime;
                
                if (gazeTime >= GAZE_DURATION_THRESHOLD) {
                    triggerGazeAction(trackableElement);
                    // Reset to prevent multiple triggers
                    gazeStartTime = Date.now() + 1000; // Add buffer time
                }
            }
        } else {
            // Not looking at a trackable element
            gazeTarget = null;
            updateGazeStatus('Looking at: nothing trackable');
        }
    });
    
    // Set up the video feed
    webgazer.showVideo(true);
    webgazer.showFaceOverlay(true);
    webgazer.showPredictionPoints(true);
    
    // Position the video feed in our container
    webgazer.setVideoViewerSize(240, 180);
    // webgazer.showVideoPreview(true);
    
    // Initially hide prediction dots until calibration
    webgazer.showPredictionPoints(false);
}

// Toggle eye tracking
function toggleTracking() {
    isTrackingActive = !isTrackingActive;
    
    if (isTrackingActive) {
        // Start tracking
        if (!webgazer.isReady()) {
            webgazer.begin().then(() => {
                console.log('WebGazer is ready!');
                toggleTrackingButton.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Eye Tracking';
                toggleTrackingButton.classList.remove('bg-green-500', 'hover:bg-green-600');
                toggleTrackingButton.classList.add('bg-red-500', 'hover:bg-red-600');
                updateGazeStatus('Tracking active');
            });
        } else {
            webgazer.resume();
            toggleTrackingButton.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Eye Tracking';
            toggleTrackingButton.classList.remove('bg-green-500', 'hover:bg-green-600');
            toggleTrackingButton.classList.add('bg-red-500', 'hover:bg-red-600');
            updateGazeStatus('Tracking active');
        }
    } else {
        // Stop tracking
        webgazer.pause();
        toggleTrackingButton.innerHTML = '<i class="fas fa-play mr-2"></i>Start Eye Tracking';
        toggleTrackingButton.classList.remove('bg-red-500', 'hover:bg-red-600');
        toggleTrackingButton.classList.add('bg-green-500', 'hover:bg-green-600');
        updateGazeStatus('Tracking paused');
    }
}

// Update the gaze status indicator
function updateGazeStatus(statusText) {
    const statusDot = gazeStatusElement.querySelector('span:first-child');
    const statusLabel = gazeStatusElement.querySelector('span:last-child');
    
    if (isTrackingActive) {
        statusDot.classList.remove('bg-gray-500');
        statusDot.classList.add('bg-green-500');
        statusLabel.textContent = statusText || 'Tracking active';
    } else {
        statusDot.classList.remove('bg-green-500');
        statusDot.classList.add('bg-gray-500');
        statusLabel.textContent = 'Gaze inactive';
    }
}

// Get a description of the element for the status display
function getElementDescription(element) {
    if (element.classList.contains('category-item')) {
        return element.textContent.trim();
    } else if (element.classList.contains('product-card')) {
        const productName = element.querySelector('h3').textContent.trim();
        return `Product: ${productName.substring(0, 15)}...`;
    } else if (element === scrollUpButton) {
        return 'Scroll Up';
    } else if (element === scrollDownButton) {
        return 'Scroll Down';
    } else {
        return element.tagName.toLowerCase();
    }
}

// Trigger action based on gaze
function triggerGazeAction(element) {
    // Different actions based on the element type
    if (element.classList.contains('category-item')) {
        // Filter by category
        const category = element.dataset.category;
        filterByCategory(category);
        updateGazeStatus(`Selected category: ${element.textContent.trim()}`);
    } else if (element.classList.contains('product-card')) {
        // View product details
        const productId = parseInt(element.dataset.productId);
        openProductModal(productId);
        updateGazeStatus('Opened product details');
    } else if (element === scrollUpButton) {
        // Scroll up
        window.scrollBy({
            top: -400,
            behavior: 'smooth'
        });
        updateGazeStatus('Scrolling up');
    } else if (element === scrollDownButton) {
        // Scroll down
        window.scrollBy({
            top: 400,
            behavior: 'smooth'
        });
        updateGazeStatus('Scrolling down');
    }
    
    // Visual feedback
    element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
    setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
    }, 500);
}