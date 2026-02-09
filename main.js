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

// Load custom restaurants from localStorage
function getCustomRestaurants() {
  return JSON.parse(localStorage.getItem('customRestaurants') || '[]');
}

function saveCustomRestaurant(restaurant) {
  const custom = getCustomRestaurants();
  custom.push(restaurant);
  localStorage.setItem('customRestaurants', JSON.stringify(custom));
}

// Combine default and custom restaurants
function getAllRestaurants() {
  const custom = getCustomRestaurants();
  return [...restaurants, ...custom];
}

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
      <button class="log-visit-btn" onclick="showVisitModal('${restaurant.id}')">+ Log Visit</button>
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
  const restaurantId = modal.dataset.restaurantId;
  saveVisit(restaurantId, timeOfDay);
  closeVisitModal();

  // Update popup content
  const allRestaurants = getAllRestaurants();
  const restaurant = allRestaurants.find(r => String(r.id) === String(restaurantId));
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

// Add a restaurant to the map and sidebar
function addRestaurantToUI(restaurant) {
  // Add marker
  const marker = L.marker([restaurant.lat, restaurant.lng], { icon: restaurantIcon })
    .addTo(map)
    .bindPopup(createPopupContent(restaurant));
  markers[restaurant.id] = marker;

  // Add sidebar card
  const listContainer = document.getElementById('restaurant-list');
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
    document.querySelectorAll('.restaurant-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    map.flyTo([restaurant.lat, restaurant.lng], 15, { duration: 0.5 });
    markers[restaurant.id].openPopup();
  });

  listContainer.appendChild(card);
}

// Initialize all restaurants
function initRestaurants() {
  const allRestaurants = getAllRestaurants();
  allRestaurants.forEach(restaurant => {
    addRestaurantToUI(restaurant);
  });

  // Fit map bounds
  if (allRestaurants.length > 0) {
    const group = new L.featureGroup(Object.values(markers));
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// =====================================================
// Add Restaurant Modal Functions
// =====================================================

window.openAddModal = function() {
  document.getElementById('add-modal').style.display = 'flex';
  document.getElementById('search-input').focus();
}

window.closeAddModal = function() {
  document.getElementById('add-modal').style.display = 'none';
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('add-form').reset();
}

window.handleSearchKeyup = function(event) {
  if (event.key === 'Enter') {
    searchRestaurants();
  }
}

// Search for restaurants using Nominatim (OpenStreetMap)
window.searchRestaurants = async function() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

  try {
    // Search in Bay Area
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query + ' restaurant')}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=5&` +
      `viewbox=-122.5,37.8,-121.5,37.2&` +
      `bounded=1`
    );

    const results = await response.json();

    if (results.length === 0) {
      // Try without bounding box
      const response2 = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5`
      );
      const results2 = await response2.json();

      if (results2.length === 0) {
        resultsContainer.innerHTML = '<div class="search-empty">No results found. Try a different search or add manually below.</div>';
        return;
      }

      renderSearchResults(results2);
    } else {
      renderSearchResults(results);
    }

  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = '<div class="search-empty">Search failed. Please try again or add manually.</div>';
  }
}

function renderSearchResults(results) {
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = results.map((result, index) => {
    const name = result.name || result.display_name.split(',')[0];
    const address = result.display_name;

    return `
      <div class="search-result-item" onclick="selectSearchResult(${index})">
        <div class="result-name">${name}</div>
        <div class="result-address">${address}</div>
      </div>
    `;
  }).join('');

  // Store results for selection
  window.searchResultsData = results;
}

window.selectSearchResult = function(index) {
  const result = window.searchResultsData[index];
  const name = result.name || result.display_name.split(',')[0];

  // Fill the manual form
  document.getElementById('manual-name').value = name;
  document.getElementById('manual-english').value = name;
  document.getElementById('manual-address').value = result.display_name;
  document.getElementById('manual-lat').value = result.lat;
  document.getElementById('manual-lng').value = result.lon;
  document.getElementById('manual-cuisine').value = '';

  // Clear search results
  document.getElementById('search-results').innerHTML =
    '<div class="search-empty">Selected! Fill in the cuisine type and click "Add Restaurant".</div>';

  // Focus cuisine input
  document.getElementById('manual-cuisine').focus();
}

window.addRestaurantManual = function(event) {
  event.preventDefault();

  const name = document.getElementById('manual-name').value.trim();
  const englishName = document.getElementById('manual-english').value.trim() || name;
  const address = document.getElementById('manual-address').value.trim();
  const cuisine = document.getElementById('manual-cuisine').value.trim();
  const lat = parseFloat(document.getElementById('manual-lat').value);
  const lng = parseFloat(document.getElementById('manual-lng').value);

  if (!name || !address || !cuisine || isNaN(lat) || isNaN(lng)) {
    alert('Please fill in all required fields');
    return;
  }

  // Generate unique ID
  const allRestaurants = getAllRestaurants();
  const maxId = Math.max(...allRestaurants.map(r => typeof r.id === 'number' ? r.id : 0), 0);
  const newId = maxId + 1;

  const newRestaurant = {
    id: newId,
    name: name,
    englishName: englishName,
    address: address,
    lat: lat,
    lng: lng,
    cuisine: cuisine,
    rating: 0,
    notes: '',
    dateVisited: ''
  };

  // Save to localStorage
  saveCustomRestaurant(newRestaurant);

  // Add to UI
  addRestaurantToUI(newRestaurant);

  // Fly to new restaurant
  map.flyTo([lat, lng], 15, { duration: 0.5 });
  setTimeout(() => {
    markers[newId].openPopup();
  }, 600);

  // Close modal
  closeAddModal();
}

// =====================================================
// Export/Import Functions
// =====================================================

window.exportData = function() {
  const allRestaurants = getAllRestaurants();
  const visits = JSON.parse(localStorage.getItem('restaurantVisits') || '{}');
  const customRestaurants = getCustomRestaurants();

  let md = `# My Bay Area Restaurants\n\n`;
  md += `*Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\n\n`;
  md += `---\n\n`;

  // Summary
  const totalVisits = Object.values(visits).reduce((sum, v) => sum + v.length, 0);
  md += `## Summary\n\n`;
  md += `- **Total Restaurants:** ${allRestaurants.length}\n`;
  md += `- **Total Visits:** ${totalVisits}\n`;
  md += `- **Custom Added:** ${customRestaurants.length}\n\n`;
  md += `---\n\n`;

  // Restaurants with visits
  md += `## Visit History\n\n`;

  allRestaurants.forEach(r => {
    const restaurantVisits = visits[r.id] || [];
    md += `### ${r.name} (${r.englishName})\n\n`;
    md += `- **Cuisine:** ${r.cuisine}\n`;
    md += `- **Address:** ${r.address}\n`;
    md += `- **Location:** ${r.lat}, ${r.lng}\n`;
    if (r.rating > 0) md += `- **Rating:** ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}\n`;
    if (r.notes) md += `- **Notes:** ${r.notes}\n`;

    if (restaurantVisits.length > 0) {
      md += `- **Visits (${restaurantVisits.length}):**\n`;
      restaurantVisits.forEach(v => {
        md += `  - ${v.date} (${v.time})\n`;
      });
    } else {
      md += `- **Visits:** None yet\n`;
    }
    md += `\n`;
  });

  // Custom restaurants data (for re-import)
  md += `---\n\n`;
  md += `## Data (for import)\n\n`;
  md += `\`\`\`json\n`;
  md += JSON.stringify({
    customRestaurants: customRestaurants,
    visits: visits
  }, null, 2);
  md += `\n\`\`\`\n`;

  // Download file
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bay-area-restaurants-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

window.importData = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;

    // Extract JSON data from markdown
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      alert('Could not find data in the markdown file. Make sure it was exported from this app.');
      return;
    }

    try {
      const data = JSON.parse(jsonMatch[1]);

      // Merge custom restaurants
      if (data.customRestaurants && data.customRestaurants.length > 0) {
        const existing = getCustomRestaurants();
        const existingIds = new Set(existing.map(r => r.id));
        const newRestaurants = data.customRestaurants.filter(r => !existingIds.has(r.id));
        localStorage.setItem('customRestaurants', JSON.stringify([...existing, ...newRestaurants]));
      }

      // Merge visits
      if (data.visits) {
        const existingVisits = JSON.parse(localStorage.getItem('restaurantVisits') || '{}');
        Object.keys(data.visits).forEach(id => {
          if (!existingVisits[id]) {
            existingVisits[id] = data.visits[id];
          } else {
            // Merge visits, avoid duplicates by date+time
            const existingSet = new Set(existingVisits[id].map(v => `${v.date}-${v.time}`));
            data.visits[id].forEach(v => {
              if (!existingSet.has(`${v.date}-${v.time}`)) {
                existingVisits[id].push(v);
              }
            });
          }
        });
        localStorage.setItem('restaurantVisits', JSON.stringify(existingVisits));
      }

      alert('Data imported successfully! Refreshing page...');
      location.reload();

    } catch (err) {
      console.error('Import error:', err);
      alert('Error parsing data. Please check the file format.');
    }
  };
  reader.readAsText(file);

  // Reset file input
  event.target.value = '';
}

// =====================================================
// Initialize
// =====================================================

initRestaurants();

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
