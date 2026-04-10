var currentMode = 'need';
var currentFilter = 'all';
var posts = [];
var hazards = [];
var stats = { help: 12, offer: 28, hazard: 7 };

var map = null;
var userMarker = null;
var watchId = null;
var sharedPins = [];
var pinMarkers = [];
var userLat = null;
var userLng = null;

var catLabels = {
  food: 'Food and Water',
  shelter: 'Shelter',
  medical: 'Medical',
  transport: 'Transport',
  supplies: 'Supplies',
  other: 'Other'
};

var hazardLabels = {
  flood: 'Flooding',
  road: 'Blocked Road',
  power: 'Power Line Down',
  debris: 'Debris',
  fire: 'Fire',
  other: 'Other'
};

var statusColors = {
  'need-rescue':   'red',
  'need-medical':  'red',
  'stranded':      'orange',
  'offering-help': 'green',
  'shelter':       'green'
};

var statusLabels = {
  'need-rescue':   'Need Rescue',
  'need-medical':  'Need Medical Help',
  'stranded':      'Stranded — Safe for now',
  'offering-help': 'Offering Help',
  'shelter':       'Shelter Available'
};

var seedPosts = [
  { id: 1, type: 'need', name: 'Priya K.', category: 'medical', message: 'Elderly mother needs insulin. Cannot reach pharmacy, Velachery main road is flooded.', location: 'Velachery', contact: '98401XXXXX', time: '10 mins ago' },
  { id: 2, type: 'offer', name: 'Rajan S.', category: 'shelter', message: 'Can take in up to 6 people. Have food, water, and blankets ready.', location: 'Anna Nagar West', contact: '91760XXXXX', time: '18 mins ago' },
  { id: 3, type: 'need', name: 'Anonymous', category: 'transport', message: 'Need a vehicle to evacuate 3 people including an infant. Water is at knee level.', location: 'Tambaram East', contact: 'WhatsApp only', time: '22 mins ago' },
  { id: 4, type: 'offer', name: 'Deepa M.', category: 'food', message: 'Cooking meals. Can deliver within 2 km. Rice and dal ready now.', location: 'T. Nagar', contact: '94450XXXXX', time: '35 mins ago' }
];

var seedHazards = [
  { type: 'flood', location: 'Saidapet underpass', severity: 'high', desc: 'Completely submerged. Do not attempt to cross.', time: '15 mins ago' },
  { type: 'power', location: 'LB Road near SRM bus stop', severity: 'high', desc: 'Live wire down on the road. Not cleared yet.', time: '30 mins ago' },
  { type: 'road', location: 'Poonamallee High Road', severity: 'medium', desc: 'Large pothole exposed by flooding. Half lane blocked.', time: '45 mins ago' }
];

var seedPins = [
  { name: 'Kumar Family', status: 'need-rescue', note: '2nd floor, blue house', lat: 13.052, lng: 80.218 },
  { name: 'Lakshmi Shelter', status: 'shelter', note: 'Can take 8 people', lat: 13.059, lng: 80.225 },
  { name: 'Venkat', status: 'stranded', note: 'Roof of Apna Bazaar', lat: 13.045, lng: 80.212 }
];

window.onload = function() {
  loadSeedData();
  animateStats();
  setDefaultTime();
  initMap();
};

function loadSeedData() {
  var i = 0;
  while (i < seedPosts.length) {
    posts.push(seedPosts[i]);
    i++;
  }

  i = 0;
  while (i < seedHazards.length) {
    hazards.push(seedHazards[i]);
    i++;
  }

  i = 0;
  while (i < seedPins.length) {
    sharedPins.push(seedPins[i]);
    i++;
  }

  renderBoard();
  renderHazards();
}

function animateStats() {
  var helpEl = document.getElementById('stat-help');
  var offerEl = document.getElementById('stat-offer');
  var hazardEl = document.getElementById('stat-hazard');
  var count = 0;

  var timer = setInterval(function() {
    count++;
    if (count <= stats.help) helpEl.textContent = count;
    if (count <= stats.offer) offerEl.textContent = count;
    if (count <= stats.hazard) hazardEl.textContent = count;
    if (count >= stats.offer) clearInterval(timer);
  }, 40);
}

function setDefaultTime() {
  var input = document.getElementById('h-time');
  var now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  input.value = now.toISOString().slice(0, 16);
}

function triggerAlert() {
  document.getElementById('alert-banner').classList.remove('hidden');
}

function dismissAlert() {
  document.getElementById('alert-banner').classList.add('hidden');
}

function setMode(mode) {
  currentMode = mode;
  var needBtn = document.getElementById('btn-need');
  var offerBtn = document.getElementById('btn-offer');
  var submitBtn = document.getElementById('post-submit-btn');

  needBtn.className = 'toggle-btn';
  offerBtn.className = 'toggle-btn';

  if (mode === 'need') {
    needBtn.classList.add('active-need');
    submitBtn.textContent = 'Post Help Request';
  } else {
    offerBtn.classList.add('active-offer');
    submitBtn.textContent = 'Post Your Offer';
  }
}

function submitPost() {
  var name = document.getElementById('post-name').value.trim() || 'Anonymous';
  var category = document.getElementById('post-category').value;
  var message = document.getElementById('post-message').value.trim();
  var location = document.getElementById('post-location').value.trim();
  var contact = document.getElementById('post-contact').value.trim() || 'Not provided';

  if (!message) {
    alert('Please describe what you need or can offer.');
    return;
  }
  if (!location) {
    alert('Please enter your area or landmark.');
    return;
  }

  var post = {
    id: Date.now(),
    type: currentMode,
    name: name,
    category: category,
    message: message,
    location: location,
    contact: contact,
    time: 'Just now'
  };

  posts.unshift(post);

  if (currentMode === 'need') {
    stats.help++;
  } else {
    stats.offer++;
  }

  document.getElementById('stat-help').textContent = stats.help;
  document.getElementById('stat-offer').textContent = stats.offer;

  renderBoard();

  document.getElementById('post-name').value = '';
  document.getElementById('post-message').value = '';
  document.getElementById('post-location').value = '';
  document.getElementById('post-contact').value = '';
}

function renderBoard() {
  var feed = document.getElementById('board-feed');
  feed.innerHTML = '';

  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];

    if (currentFilter !== 'all' && p.type !== currentFilter && p.category !== currentFilter) {
      continue;
    }

    var card = document.createElement('div');
    card.className = 'post-card type-' + p.type;

    card.innerHTML =
      '<div class="post-card-top">' +
        '<span class="type-badge ' + (p.type === 'need' ? 'badge-need' : 'badge-offer') + '">' +
          (p.type === 'need' ? 'Help Needed' : 'Offering') +
        '</span>' +
        '<span class="post-time">' + p.time + '</span>' +
      '</div>' +
      '<p class="post-message">' + p.message + '</p>' +
      '<div class="post-meta">' +
        '<span>Name: ' + p.name + '</span>' +
        '<span>Area: ' + p.location + '</span>' +
        '<span>Contact: ' + p.contact + '</span>' +
        '<span class="cat-tag">' + (catLabels[p.category] || p.category) + '</span>' +
      '</div>';

    card.onmouseover = function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
    };
    card.onmouseout = function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
    };

    feed.appendChild(card);
  }

  if (feed.children.length === 0) {
    feed.innerHTML = '<p style="color:#999; font-size:14px; padding:24px; text-align:center;">No posts match this filter.</p>';
  }
}

function filterBoard(filter, event) {
  currentFilter = filter;
  renderBoard();

  var buttons = document.querySelectorAll('.filter-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('active-filter');
  }
  if (event && event.target) {
    event.target.classList.add('active-filter');
  }
}

function submitHazard(e) {
  e.preventDefault();

  var htype = document.querySelector('input[name="htype"]:checked').value;
  var location = document.getElementById('h-location').value.trim();
  var severity = document.getElementById('h-severity').value;
  var desc = document.getElementById('h-description').value.trim();

  var hazard = {
    type: htype,
    location: location,
    severity: severity,
    desc: desc,
    time: 'Just now'
  };

  hazards.unshift(hazard);
  stats.hazard++;
  document.getElementById('stat-hazard').textContent = stats.hazard;

  renderHazards();

  document.getElementById('h-location').value = '';
  document.getElementById('h-description').value = '';
  document.getElementById('h-reporter').value = '';
  document.getElementById('chk-rescue').checked = false;
  document.getElementById('chk-ambulance').checked = false;
  document.getElementById('chk-notified').checked = false;
  document.getElementById('rescue-detail').classList.add('hidden');

  alert('Hazard reported successfully. Thank you for keeping the community informed.');
}

function renderHazards() {
  var list = document.getElementById('hazard-list');
  list.innerHTML = '';

  for (var i = 0; i < hazards.length; i++) {
    var h = hazards[i];
    var card = document.createElement('div');
    card.className = 'hazard-card';

    card.innerHTML =
      '<div class="hazard-card-top">' +
        '<span class="hazard-type-label">' + (hazardLabels[h.type] || h.type) + '</span>' +
        '<span class="sev-badge sev-' + h.severity + '">' + h.severity.toUpperCase() + '</span>' +
      '</div>' +
      '<div class="hazard-location">Location: ' + h.location + ' &nbsp;|&nbsp; ' + h.time + '</div>' +
      '<div class="hazard-desc">' + h.desc + '</div>';

    list.appendChild(card);
  }
}

function toggleRescue() {
  var checked = document.getElementById('chk-rescue').checked;
  var detail = document.getElementById('rescue-detail');
  if (checked) {
    detail.classList.remove('hidden');
  } else {
    detail.classList.add('hidden');
  }
}

/* ── MAP & LOCATION ───────────────────────────────── */

function initMap() {
  map = L.map('map').setView([13.05, 80.22], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap contributors'
  }).addTo(map);

  for (var i = 0; i < sharedPins.length; i++) {
    addPinMarker(sharedPins[i]);
  }

  renderSharedList();
}

function makeIcon(color) {
  var colors = {
    red: '#e74c3c',
    orange: '#e67e22',
    green: '#27ae60',
    blue: '#2980b9'
  };

  var fill = colors[color] || '#2980b9';

  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">' +
    '<path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="' + fill + '"/>' +
    '<circle cx="16" cy="16" r="6" fill="white"/>' +
  '</svg>';

  return L.divIcon({
    html: svg,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    className: ''
  });
}

function addPinMarker(pin) {
  var color = statusColors[pin.status] || 'orange';
  var icon = makeIcon(color);
  var marker = L.marker([pin.lat, pin.lng], { icon: icon }).addTo(map);

  var label = statusLabels[pin.status] || pin.status;
  marker.bindPopup(
    '<strong>' + pin.name + '</strong><br/>' +
    label + '<br/>' +
    '<span style="font-size:12px;color:#777;">' + (pin.note || '') + '</span>'
  );

  pinMarkers.push(marker);
}

function shareLocation() {
  if (!navigator.geolocation) {
    setLocStatus('error', 'Your browser does not support location sharing.');
    return;
  }

  setLocStatus('idle', 'Getting your location...');
  document.getElementById('loc-share-btn').textContent = 'Getting Location...';
  document.getElementById('loc-share-btn').disabled = true;

  navigator.geolocation.getCurrentPosition(
    function(position) {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;

      var coords = userLat.toFixed(5) + ', ' + userLng.toFixed(5);
      setLocStatus('active', 'Location found');
      document.getElementById('loc-coords').textContent = coords;

      map.setView([userLat, userLng], 15);

      if (userMarker) {
        userMarker.setLatLng([userLat, userLng]);
      } else {
        userMarker = L.marker([userLat, userLng], { icon: makeIcon('blue') })
          .addTo(map)
          .bindPopup('<strong>Your Location</strong>');
      }

      document.getElementById('loc-share-btn').textContent = 'Share My Location';
      document.getElementById('loc-share-btn').disabled = false;
      document.getElementById('loc-form').classList.remove('hidden');
      document.getElementById('loc-stop-btn').classList.remove('hidden');

      startWatching();
    },
    function(error) {
      var msg = 'Could not get location.';
      if (error.code === 1) msg = 'Location permission denied. Please allow access in your browser.';
      if (error.code === 2) msg = 'Location unavailable. Try again.';
      if (error.code === 3) msg = 'Location request timed out. Try again.';

      setLocStatus('error', msg);
      document.getElementById('loc-share-btn').textContent = 'Try Again';
      document.getElementById('loc-share-btn').disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function startWatching() {
  if (watchId !== null) return;

  watchId = navigator.geolocation.watchPosition(
    function(position) {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;

      var coords = userLat.toFixed(5) + ', ' + userLng.toFixed(5);
      document.getElementById('loc-coords').textContent = coords;

      if (userMarker) {
        userMarker.setLatLng([userLat, userLng]);
      }
    },
    function() {},
    { enableHighAccuracy: true }
  );
}

function confirmShare() {
  if (userLat === null || userLng === null) {
    alert('Please share your location first.');
    return;
  }

  var name = document.getElementById('loc-name').value.trim() || 'Anonymous';
  var status = document.getElementById('loc-status-msg').value;
  var note = document.getElementById('loc-note').value.trim();

  var pin = {
    name: name,
    status: status,
    note: note,
    lat: userLat,
    lng: userLng,
    isUser: true
  };

  sharedPins.unshift(pin);
  addPinMarker(pin);
  renderSharedList();

  document.getElementById('loc-form').classList.add('hidden');
  setLocStatus('active', 'Your location is visible on the map');
}

function stopSharing() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }

  userLat = null;
  userLng = null;

  setLocStatus('idle', 'Location not shared');
  document.getElementById('loc-coords').textContent = '';
  document.getElementById('loc-form').classList.add('hidden');
  document.getElementById('loc-stop-btn').classList.add('hidden');
  document.getElementById('loc-share-btn').textContent = 'Share My Location';
}

function setLocStatus(type, message) {
  var box = document.getElementById('loc-status-box');
  var text = document.getElementById('loc-status-text');
  box.className = 'loc-status-box ' + type;
  text.textContent = message;
}

function updateStatusPreview() {}

function renderSharedList() {
  var container = document.getElementById('shared-pins');
  container.innerHTML = '';

  for (var i = 0; i < sharedPins.length; i++) {
    var pin = sharedPins[i];
    var color = statusColors[pin.status] || 'orange';
    var label = statusLabels[pin.status] || pin.status;

    var item = document.createElement('div');
    item.className = 'pin-item';
    item.innerHTML =
      '<span class="pin-dot ' + color + '"></span>' +
      '<div>' +
        '<div class="pin-name">' + pin.name + '</div>' +
        '<div class="pin-note">' + label + (pin.note ? ' — ' + pin.note : '') + '</div>' +
      '</div>';

    item.onmouseover = function() { this.style.background = '#f7f8fa'; };
    item.onmouseout = function() { this.style.background = ''; };

    container.appendChild(item);
  }
}