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

// Visit log storage functions
function getVisits(restaurantId) {
  const visits = JSON.parse(localStorage.getItem('restaurantVisits') || '{}');
  return visits[restaurantId] || [];
}

function saveVisit(restaurantId, timeOfDay) {
  const visits = JSON.parse(localStorage.getItem('restaurantVisits') || '{}');
  if (!visits[restaurantId]) {
    visits[restaurantId] = [];
  }
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  visits[restaurantId].push({ date: today, time: timeOfDay });
  localStorage.setItem('restaurantVisits', JSON.stringify(visits));
  return visits[restaurantId];
}

// Generate star rating HTML
function getStarRating(rating) {
  if (!rating || rating === 0) return '<span style="color:#ccc;">Not rated</span>';
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? '&#9733;' : '&#9734;';
  }
  return stars;
}

// Format visits for display
function formatVisits(restaurantId) {
  const visits = getVisits(restaurantId);
  if (visits.length === 0) return '';
  
  const recentVisits = visits.slice(-3).reverse();
  let html = '<div class="visit-history"><strong>Recent visits:</strong><ul>';
  recentVisits.forEach(v => {
    html += `<li>${v.date} (${v.time})</li>`;
  });
  html += '</ul>';
  if (visits.length > 3) {
    html += `<span class="more-visits">+${visits.length - 3} more</span>`;
  }
  html += '</div>';
  return html;
}

// Create popup content
function createPopupContent(restaurant) {
  const visits = getVisits(restaurant.id);
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
  
  // Visit history
  content += formatVisits(restaurant.id);
  
  // Log visit button
  content += `
    <div class="log-visit-section">
      <button class="log-visit-btn" onclick="showVisitModal(${restaurant.id})">+ Log Visit</button>
    </div>
  `;
  
  return content;
}

// Show visit modal
window.showVisitModal = function(restaurantId) {
  const modal = document.getElementById('visit-modal');
  modal.dataset.restaurantId = restaurantId;
  modal.style.display = 'flex';
}

// Close modal
window.closeVisitModal = function() {
  document.getElementById('visit-modal').style.display = 'none';
}

// Log the visit
window.logVisit = function(timeOfDay) {
  const modal = document.getElementById('visit-modal');
  const restaurantId = parseInt(modal.dataset.restaurantId);
  saveVisit(restaurantId, timeOfDay);
  closeVisitModal();
  
  // Update popup content
  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (restaurant && markers[restaurantId]) {
    markers[restaurantId].setPopupContent(createPopupContent(restaurant));
  }
  
  // Update sidebar card
  updateSidebarCard(restaurantId);
}

// Update sidebar card with visit info
function updateSidebarCard(restaurantId) {
  const card = document.querySelector(`.restaurant-card[data-id="${restaurantId}"]`);
  if (!card) return;
  
  const visits = getVisits(restaurantId);
  let visitBadge = card.querySelector('.visit-count');
  
  if (visits.length > 0) {
    if (!visitBadge) {
      visitBadge = document.createElement('span');
      visitBadge.className = 'visit-count';
      card.appendChild(visitBadge);
    }
    visitBadge.textContent = `${visits.length} visit${visits.length > 1 ? 's' : ''}`;
  }
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
  
  const visits = getVisits(restaurant.id);
  let cardContent = `
    <h3>${restaurant.name}</h3>
    <div class="english-name">${restaurant.englishName}</div>
    <span class="cuisine">${restaurant.cuisine}</span>
    <div class="address">${restaurant.address}</div>
    <div class="rating">${getStarRating(restaurant.rating)}</div>
  `;
  
  if (visits.length > 0) {
    cardContent += `<span class="visit-count">${visits.length} visit${visits.length > 1 ? 's' : ''}</span>`;
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

// Create visit modal
const modalHtml = `
<div id="visit-modal" class="modal" style="display:none;">
  <div class="modal-content">
    <h3>Log Your Visit</h3>
    <p>When did you visit?</p>
    <div class="time-buttons">
      <button onclick="logVisit('Breakfast')">Breakfast</button>
      <button onclick="logVisit('Lunch')">Lunch</button>
      <button onclick="logVisit('Dinner')">Dinner</button>
      <button onclick="logVisit('Late Night')">Late Night</button>
    </div>
    <button class="cancel-btn" onclick="closeVisitModal()">Cancel</button>
  </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalHtml);
