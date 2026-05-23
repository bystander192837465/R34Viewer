const USER_ID = "6278658";
const API_KEY = "6e11c73ba247ea2116196d4746f6173af0c36cf8eb40a88d02f255ffc49cb7b879f36f988679ad6082dc3d310b9409f5f9f2741d3c37999dbd6c0a156ef9e515";

const API_BASE = "https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1";
const AUTOCOMPLETE_URL = "https://api.rule34.xxx/autocomplete.php?q=";

let currentTags = JSON.parse(localStorage.getItem('r34Tags')) || [];
let currentPage = 0;
let scrollPosition = 0;
let favorites = JSON.parse(localStorage.getItem('r34Favs')) || [];
let currentPosts = [];

const searchInput = document.getElementById('search-input');
const autocompleteDiv = document.getElementById('autocomplete');
const selectedTagsDiv = document.getElementById('selected-tags');
const grid = document.getElementById('grid');
const favsGrid = document.getElementById('favs-grid');
const loadMoreBtn = document.getElementById('load-more');
const backToTop = document.getElementById('back-to-top');

function getAuthParams() {
  return `&api_key=${encodeURIComponent(API_KEY)}&user_id=${encodeURIComponent(USER_ID)}`;
}

// Render selected tags as pills
function renderSelectedTags() {
  selectedTagsDiv.innerHTML = '';
  
  currentTags.forEach((tag, index) => {
    const pill = document.createElement('div');
    pill.className = 'tag-pill';
    pill.innerHTML = `${tag} <span>×</span>`;
    
    pill.onclick = () => {
      currentTags.splice(index, 1);
      renderSelectedTags();
      saveTags();
      search();
      renderFavoriteTags();        // ← Important: refresh grey pills
    };
    
    selectedTagsDiv.appendChild(pill);
  });
}

function saveTags() {
  localStorage.setItem('r34Tags', JSON.stringify(currentTags));
}

function renderGrid(posts, container) {
  container.innerHTML = '';
  
  posts.forEach(post => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    
    const img = document.createElement('img');
    
    // Better quality order: sample_url > preview_url > file_url
    img.src = post.sample_url || post.preview_url || post.file_url;
    
    img.loading = "lazy";
    img.alt = "hot girl";
    
    img.onclick = () => openViewer(post);
    
    item.appendChild(img);
    container.appendChild(item);
  });
}

async function search(reset = true) {
  if (reset) {
    currentPage = 0;
    currentPosts = [];
  }

  // Join with + for AND logic (this is correct for Rule34)
  const tagStr = currentTags.join('+') || 'lesbian';

  console.log("🔍 Searching with tags:", tagStr); // Debug

  const url = `${API_BASE}&tags=${tagStr}&pid=${currentPage}&limit=50${getAuthParams()}`;

  try {
    const res = await fetch(url);
    const newPosts = await res.json();

    currentPosts = reset ? newPosts : [...currentPosts, ...newPosts];
    renderGrid(currentPosts, grid);
  } catch (e) {
    console.error("Search error:", e);
  }
}

loadMoreBtn.onclick = async () => {
  currentPage++;
  await search(false);
};

// Tab switching - FIXED
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Switch content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(btn.dataset.tab + '-tab').classList.add('active');

    // If switching to favorites → render them
    if (btn.dataset.tab === 'favs') {
      renderFavorites();
    }
  });
});

// New function to render favorites
function renderFavorites() {
  const favsGrid = document.getElementById('favs-grid');
  const noFavsMsg = document.getElementById('no-favs');

  favsGrid.innerHTML = '';

  if (favorites.length === 0) {
    noFavsMsg.style.display = 'block';
    return;
  }

  noFavsMsg.style.display = 'none';
  renderGrid(favorites, favsGrid);
}

// ================= AUTOCOMPLETE =================
searchInput.addEventListener('input', async () => {
  const term = searchInput.value.trim();
  const autocompleteDiv = document.getElementById('autocomplete');

  autocompleteDiv.innerHTML = '';
  autocompleteDiv.classList.remove('show');

  if (term.length < 2) return;

  try {
    const res = await fetch(AUTOCOMPLETE_URL + encodeURIComponent(term));
    const data = await res.json();

    if (!data || data.length === 0) return;

    data.slice(0, 12).forEach(item => {
      const tagName = item.value || item;

      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = tagName;

      div.onclick = () => {
        if (!currentTags.includes(tagName)) {
          currentTags.push(tagName);
          renderSelectedTags();
          saveTags();
        }
        searchInput.value = '';
        autocompleteDiv.classList.remove('show');
        search();
      };

      autocompleteDiv.appendChild(div);
    });

    autocompleteDiv.classList.add('show');

  } catch (e) {
    console.error("Autocomplete failed:", e);
  }
});

// Click outside to hide
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    document.getElementById('autocomplete').classList.remove('show');
  }
});

// ============== ZOOM & DRAG FUNCTIONALITY ==============
let scale = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX, startY;
let minScale = 1;

const imageContainer = document.querySelector('.viewer-image-container');
const viewerImage = document.getElementById('viewer-image');

function updateImageTransform() {
  viewerImage.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

function resetPositionIfNeeded() {
  if (scale <= minScale + 0.01) {
    posX = 0;
    posY = 0;
    updateImageTransform();
  }
}

function calculateFitScale(imgElement) {
  const containerRect = imageContainer.getBoundingClientRect();
  if (!imgElement.naturalWidth) return 1;
  
  return Math.min(
    containerRect.width / imgElement.naturalWidth,
    containerRect.height / imgElement.naturalHeight
  );
}

// Open Viewer
function openViewer(post) {
  scrollPosition = window.scrollY;
  posX = 0;
  posY = 0;

  viewerImage.src = post.file_url;
  document.getElementById('viewer').classList.remove('hidden');

  viewerImage.onload = () => {
    minScale = calculateFitScale(viewerImage);
    scale = minScale;
    updateImageTransform();
  };

  // === FAVORITE BUTTON WITH LIVE UPDATE ===
  const favBtn = document.getElementById('toggle-fav');
  
  const updateFavButton = () => {
    const isFavorited = favorites.some(f => f.id === post.id);
    if (isFavorited) {
      favBtn.textContent = "❤️ Remove from Favorites";
      favBtn.style.background = "#c026d3";
    } else {
      favBtn.textContent = "❤️ Add to Favorites";
      favBtn.style.background = "#ff1493";
    }
  };

  updateFavButton();

  favBtn.onclick = () => {
    const exists = favorites.some(f => f.id === post.id);
    
    if (exists) {
      // Remove
      favorites = favorites.filter(f => f.id !== post.id);
    } else {
      // Add
      favorites.push(post);
    }
    
    localStorage.setItem('r34Favs', JSON.stringify(favorites));
    updateFavButton();

    // 🔥 LIVE UPDATE: Refresh favorites grid if the tab is currently open
    const favsTab = document.getElementById('favs-tab');
    if (favsTab.classList.contains('active')) {
      renderFavorites();
    }
  };
}

// ================= MOUSE DRAG =================
imageContainer.addEventListener('mousedown', (e) => {
  if (scale <= minScale + 0.05) return;
  
  isDragging = true;
  startX = e.clientX - posX;
  startY = e.clientY - posY;
  imageContainer.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  posX = e.clientX - startX;
  posY = e.clientY - startY;
  updateImageTransform();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  imageContainer.style.cursor = scale > minScale + 0.05 ? 'grab' : 'default';
});

// Prevent default image drag behavior
viewerImage.addEventListener('dragstart', (e) => e.preventDefault());

// ================= WHEEL ZOOM =================
imageContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.15 : -0.15;
  scale = Math.max(minScale, Math.min(scale + delta, 6));
  resetPositionIfNeeded();
  updateImageTransform();
}, { passive: false });

// ================= TOUCH SUPPORT =================
let initialDistance = 0;

imageContainer.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
  } else if (e.touches.length === 1 && scale > minScale + 0.05) {
    isDragging = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

imageContainer.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    scale = Math.max(minScale, Math.min(scale * (dist / initialDistance), 6));
    resetPositionIfNeeded();
    updateImageTransform();
    initialDistance = dist;
  } else if (e.touches.length === 1 && isDragging) {
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
    updateImageTransform();
  }
});

imageContainer.addEventListener('touchend', () => isDragging = false);

// Close viewer
document.getElementById('close-viewer').onclick = () => {
  document.getElementById('viewer').classList.add('hidden');
  window.scrollTo(0, scrollPosition);
};

// Back to top
window.addEventListener('scroll', () => {
  backToTop.style.display = window.scrollY > 600 ? 'block' : 'none';
});
backToTop.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

// Your favorite tags
const myFavoriteTags = [
  "futanari", "exhibitionism", "enf", 
  "public", "embarrassed", "caught"
];

function renderFavoriteTags() {
  const container = document.getElementById('favorite-tags');
  container.innerHTML = '';

  myFavoriteTags.forEach(tag => {
    // Only show tags that are NOT currently active
    if (!currentTags.includes(tag)) {
      const pill = document.createElement('div');
      pill.className = 'fav-tag';
      pill.textContent = tag;
      
      pill.onclick = () => {
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          renderSelectedTags();
          saveTags();
          search();
          renderFavoriteTags(); // refresh grey pills
        }
      };
      
      container.appendChild(pill);
    }
  });
}

// ================= TAB PERSISTENCE =================
const TAB_KEY = 'r34CurrentTab';

function saveCurrentTab(tabName) {
  localStorage.setItem(TAB_KEY, tabName);
}

function loadCurrentTab() {
  return localStorage.getItem(TAB_KEY) || 'search';
}

// Update tab switching to save the choice
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const targetTab = document.getElementById(btn.dataset.tab + '-tab');
    targetTab.classList.add('active');

    saveCurrentTab(btn.dataset.tab);

    if (btn.dataset.tab === 'favs') {
      renderFavorites();
    }
  });
});

// ================= HARDWARE BACK BUTTON SUPPORT =================
let isViewerOpen = false;

function openViewer(post) {
  scrollPosition = window.scrollY;
  posX = 0;
  posY = 0;

  viewerImage.src = post.file_url;
  document.getElementById('viewer').classList.remove('hidden');
  isViewerOpen = true;

  // Push a new history state so back button works
  history.pushState({ viewerOpen: true }, '', '');

  viewerImage.onload = () => {
    minScale = calculateFitScale(viewerImage);
    scale = minScale;
    updateImageTransform();
  };

  // ... your existing favorite button code ...
}

// Close viewer function
function closeViewer() {
  document.getElementById('viewer').classList.add('hidden');
  window.scrollTo(0, scrollPosition);
  isViewerOpen = false;
}

// Handle browser back button (including phone hardware back)
window.addEventListener('popstate', (event) => {
  if (isViewerOpen) {
    closeViewer();
    // Prevent default back navigation
    history.pushState(null, '', '');
  }
});

// Update the close button to also use the same function
document.getElementById('close-viewer').onclick = closeViewer;

// Init - restore last used tab
function initTab() {
  const lastTab = loadCurrentTab();
  
  // Activate the correct button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === lastTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Activate the correct content
  document.querySelectorAll('.tab-content').forEach(tab => {
    if (tab.id === lastTab + '-tab') {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // If we restored favorites tab, render them
  if (lastTab === 'favs') {
    renderFavorites();
  }
}

// Init
renderSelectedTags();
search();
initTab();
renderFavoriteTags();