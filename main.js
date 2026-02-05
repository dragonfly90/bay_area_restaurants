// Initialize map centered on Bay Area
const map = L.map('map').setView([37.4, -122.0], 11);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Custom marker icon
const restaurantIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#e74c3c; width:30px; height:30px; border-radius:50%; border:3px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px;">&#127860;</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Store markers for reference
const markers = {};

// Generate star rating HTML
function getStarRating(rating) {
  if (!rating || rating === 0) return '<span style="color:#ccc;">Not rated</span>';
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? '&#9733;' : '&#9734;';
  }
  return stars;
}

// Create popup content
function createPopupContent(restaurant) {
  let content = `
    <div class="popup-title">${restaurant.name}</div>
    <div class="popup-english">${restaurant.englishName}</div>
    <div class="popup-cuisine">${restaurant.cuisine}</div>
    <div class="popup-address">${restaurant.address}</div>
    <div class="popup-rating">${getStarRating(restaurant.rating)}</div>
  `;
  
  if (restaurant.notes) {
    content += `<div class="popup-notes">"${restaurant.notes}"</div>`;
  }
  
  if (restaurant.dateVisited) {
    content += `<div class="popup-date">Visited: ${restaurant.dateVisited}</div>`;
  }
  
  return content;
}

// Add markers to map
restaurants.forEach(restaurant => {
  const marker = L.marker([restaurant.lat, restaurant.lng], { icon: restaurantIcon })
    .addTo(map)
    .bindPopup(createPopupContent(restaurant));
  
  markers[restaurant.id] = marker;
});

// Build sidebar list
const listContainer = document.getElementById('restaurant-list');

restaurants.forEach(restaurant => {
  const card = document.createElement('div');
  card.className = 'restaurant-card';
  card.dataset.id = restaurant.id;
  
  let cardContent = `
    <h3>${restaurant.name}</h3>
    <div class="english-name">${restaurant.englishName}</div>
    <span class="cuisine">${restaurant.cuisine}</span>
    <div class="address">${restaurant.address}</div>
    <div class="rating">${getStarRating(restaurant.rating)}</div>
  `;
  
  if (restaurant.dateVisited) {
    cardContent += `<div class="details">Visited: ${restaurant.dateVisited}</div>`;
  }
  
  card.innerHTML = cardContent;
  
  // Click to fly to marker
  card.addEventListener('click', () => {
    // Remove active class from all cards
    document.querySelectorAll('.restaurant-card').forEach(c => c.classList.remove('active'));
    // Add active class to clicked card
    card.classList.add('active');
    
    // Fly to marker and open popup
    map.flyTo([restaurant.lat, restaurant.lng], 15, { duration: 0.5 });
    markers[restaurant.id].openPopup();
  });
  
  listContainer.appendChild(card);
});

// Fit map bounds to show all markers
if (restaurants.length > 0) {
  const group = new L.featureGroup(Object.values(markers));
  map.fitBounds(group.getBounds().pad(0.1));
}
