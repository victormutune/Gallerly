const API_URL = 'http://localhost:5000/api/photos';
const AUTH_API_URL = 'http://localhost:5000/api/auth';
const BACKEND_URL = 'http://localhost:5000';

// --- Auth State ---
function isLoggedIn() {
  return !!localStorage.getItem('token');
}
function getToken() {
  return localStorage.getItem('token');
}
function setToken(token) {
  localStorage.setItem('token', token);
}
function clearToken() {
  localStorage.removeItem('token');
}

// --- UI Elements ---
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const switchToRegister = document.getElementById('switchToRegister');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const openModalBtn = document.getElementById('openModalBtn');
const logoutBtn = document.getElementById('logoutBtn');
const gallery = document.getElementById('gallery');
const usernameDisplay = document.getElementById('usernameDisplay');
const accountBtn = document.getElementById('accountBtn');
const accountModal = document.getElementById('accountModal');
const closeAccountModalBtn = document.getElementById('closeAccountModalBtn');
const accountUsername = document.getElementById('accountUsername');
const accountLogoutBtn = document.getElementById('accountLogoutBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const bodyRoot = document.getElementById('bodyRoot');
const headerRoot = document.getElementById('headerRoot');
const userDropdownBtn = document.getElementById('userDropdownBtn');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const userDropdownWrapper = document.getElementById('userDropdownWrapper');

let isRegisterMode = false;

function showAuthModal() {
  authModal.classList.remove('hidden');
}
function hideAuthModal() {
  authModal.classList.add('hidden');
  authForm.reset();
}
function updateAuthMode() {
  if (isRegisterMode) {
    authTitle.innerHTML = '<i class="fa fa-user-plus"></i> Register';
    authForm.querySelector('button[type="submit"]').textContent = 'Register';
    toggleAuthMode.innerHTML = 'Already have an account? <button class="text-blue-600 hover:underline" id="switchToRegister">Login</button>';
  } else {
    authTitle.innerHTML = '<i class="fa fa-user"></i> Login';
    authForm.querySelector('button[type="submit"]').textContent = 'Login';
    toggleAuthMode.innerHTML = 'Don\'t have an account? <button class="text-blue-600 hover:underline" id="switchToRegister">Register</button>';
  }
  // Re-attach event listener for toggle
  document.getElementById('switchToRegister').onclick = () => {
    isRegisterMode = !isRegisterMode;
    updateAuthMode();
  };
}

function getUsernameFromToken() {
  const token = getToken();
  if (!token) return '';
  try {
    // JWT: header.payload.signature
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || '';
  } catch {
    return '';
  }
}

// --- Dark Mode ---
function setDarkMode(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('dark');
    bodyRoot.classList.add('bg-gray-900');
    bodyRoot.classList.remove('bg-gray-50');
    headerRoot.classList.add('bg-gray-800');
    headerRoot.classList.remove('bg-blue-600');
    localStorage.setItem('darkMode', '1');
  } else {
    html.classList.remove('dark');
    bodyRoot.classList.remove('bg-gray-900');
    bodyRoot.classList.add('bg-gray-50');
    headerRoot.classList.remove('bg-gray-800');
    headerRoot.classList.add('bg-blue-600');
    localStorage.setItem('darkMode', '0');
  }
}
function isDarkMode() {
  return localStorage.getItem('darkMode') === '1';
}
function updateDarkModeIcons() {
  const iconClass = isDarkMode() ? 'fa-sun' : 'fa-moon';
  if (darkModeToggle && darkModeToggle.querySelector('i')) {
    darkModeToggle.querySelector('i').className = 'fa ' + iconClass;
  }
}
darkModeToggle.onclick = function() {
  setDarkMode(!isDarkMode());
  updateDarkModeIcons();
};
// On page load
setDarkMode(isDarkMode());
updateDarkModeIcons();

// --- Account Modal Logic ---
function openAccountModal() {
  accountModal.classList.remove('hidden');
  accountUsername.textContent = getUsernameFromToken();
}
function closeAccountModal() {
  accountModal.classList.add('hidden');
}
accountBtn.onclick = openAccountModal;
closeAccountModalBtn.onclick = closeAccountModal;
accountModal.addEventListener('click', (e) => {
  if (e.target === accountModal) closeAccountModal();
});
accountLogoutBtn.onclick = () => {
  clearToken();
  updateUIOnAuth();
  closeAccountModal();
  showToast('Logged out!');
};

// --- User Dropdown Logic ---
function showUserDropdown() {
  userDropdownMenu.classList.remove('hidden');
  userDropdownBtn.setAttribute('aria-expanded', 'true');
}
function hideUserDropdown() {
  userDropdownMenu.classList.add('hidden');
  userDropdownBtn.setAttribute('aria-expanded', 'false');
}
userDropdownBtn.onclick = (e) => {
  e.stopPropagation();
  if (userDropdownMenu.classList.contains('hidden')) {
    showUserDropdown();
  } else {
    hideUserDropdown();
  }
};
document.addEventListener('click', (e) => {
  if (!userDropdownWrapper.contains(e.target)) {
    hideUserDropdown();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideUserDropdown();
});

// --- Update UI on Auth (update username display and dropdown) ---
function updateUIOnAuth() {
  if (isLoggedIn()) {
    authModal.classList.add('hidden');
    openModalBtn.classList.remove('hidden');
    userDropdownWrapper.classList.remove('hidden');
    const username = getUsernameFromToken();
    if (username) {
      usernameDisplay.textContent = username;
      usernameDisplay.classList.remove('hidden');
    } else {
      usernameDisplay.classList.add('hidden');
    }
    fetchPhotos();
  } else {
    authModal.classList.remove('hidden');
    openModalBtn.classList.add('hidden');
    userDropdownWrapper.classList.add('hidden');
    usernameDisplay.classList.add('hidden');
    gallery.innerHTML = '';
  }
}

// --- Auth Form Submission ---
authForm.onsubmit = async (e) => {
  e.preventDefault();
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!username || !password) {
    showToast('Username and password required', 'error');
    return;
  }
  authForm.querySelector('button[type="submit"]').disabled = true;
  try {
    if (isRegisterMode) {
      // Register
      const res = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      showToast('Registration successful! Please login.');
      isRegisterMode = false;
      updateAuthMode();
    } else {
      // Login
      const res = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      showToast('Login successful!');
      updateUIOnAuth();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    authForm.querySelector('button[type="submit"]').disabled = false;
  }
};

// --- Logout ---
logoutBtn.onclick = () => {
  clearToken();
  updateUIOnAuth();
  showToast('Logged out!');
};

// --- Modal logic for Add/Edit Form (unchanged) ---
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
function openModal() {
  modalOverlay.classList.remove('hidden');
}
function closeModal() {
  modalOverlay.classList.add('hidden');
  document.getElementById('photoForm').reset();
  document.getElementById('photoId').value = '';
  document.getElementById('photoForm').querySelector('button[type="submit"]').textContent = 'Add Photo';
}
openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// --- Toast notification and animation code (unchanged) ---
// Toast notification
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `px-4 py-2 rounded shadow text-white font-semibold animate-fade-in-up ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

// Animations
const style = document.createElement('style');
style.innerHTML = `
@keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
.animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(.4,0,.2,1); }
.animate-fade-out { animation: fade-out 0.5s cubic-bezier(.4,0,.2,1) forwards; }
`;
document.head.appendChild(style);

// --- Image Preview Modal logic ---
const imagePreviewModal = document.getElementById('imagePreviewModal');
const closeImagePreviewBtn = document.getElementById('closeImagePreviewBtn');
const previewImage = document.getElementById('previewImage');
const previewTitle = document.getElementById('previewTitle');
const previewDescription = document.getElementById('previewDescription');

function showImagePreview(src, title, description) {
  previewImage.src = src;
  previewTitle.textContent = title || '';
  previewDescription.textContent = description || '';
  imagePreviewModal.classList.remove('hidden');
}
function closeImagePreview() {
  imagePreviewModal.classList.add('hidden');
  previewImage.src = '';
  previewTitle.textContent = '';
  previewDescription.textContent = '';
}
closeImagePreviewBtn.onclick = closeImagePreview;
imagePreviewModal.addEventListener('click', (e) => {
  if (e.target === imagePreviewModal) closeImagePreview();
});
document.addEventListener('keydown', (e) => {
  if (!imagePreviewModal.classList.contains('hidden') && e.key === 'Escape') closeImagePreview();
});

// --- Fetch Photos (with JWT) ---
async function fetchPhotos() {
  if (!isLoggedIn()) return;
  const res = await fetch(API_URL, {
    headers: { Authorization: 'Bearer ' + getToken() }
  });
  if (res.status === 401) {
    clearToken();
    updateUIOnAuth();
    showToast('Session expired. Please login again.', 'error');
    return;
  }
  const photos = await res.json();
  gallery.innerHTML = '';
  if (photos.length === 0) {
    gallery.innerHTML = '<div class="col-span-full text-center text-gray-400">No photos yet. Add one above!</div>';
    return;
  }
  photos.forEach(photo => {
    let imgSrc = photo.imageUrl;
    if (imgSrc && imgSrc.startsWith('/uploads')) {
      imgSrc = BACKEND_URL + imgSrc;
    }
    const card = document.createElement('div');
    card.className = "bg-white rounded-xl shadow-md p-3 flex flex-col transition hover:shadow-xl animate-fade-in-up";
    card.innerHTML = `
      <div class="relative group mb-2">
        <img src="${imgSrc}" alt="${photo.title}" class="w-full h-48 object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition cursor-pointer"/>
        <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button onclick="editPhoto('${photo._id}')" title="Edit" class="bg-yellow-400 hover:bg-yellow-500 text-white rounded-full p-2 shadow"><i class="fa fa-pen"></i></button>
          <button onclick="deletePhoto('${photo._id}')" title="Delete" class="bg-red-500 hover:bg-red-600 text-black  rounded-sm p-2 shadow"><i class="fa fa-trash"></i></button>
        </div>
      </div>
      <h2 class="text-lg font-bold mb-1 truncate">${photo.title}</h2>
      <p class="text-gray-600 text-sm mb-2 truncate">${photo.description || ''}</p>
      <span class="text-xs text-gray-400 mt-auto">${photo.createdAt ? new Date(photo.createdAt).toLocaleString() : ''}</span>
    `;
    // Add click handler for image preview
    card.querySelector('img').onclick = () => showImagePreview(imgSrc, photo.title, photo.description);
    gallery.appendChild(card);
  });
}

// --- Add/Edit Photo Form Submission (with JWT) ---
document.getElementById('photoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const photoId = document.getElementById('photoId').value;
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const imageUrl = document.getElementById('imageUrl').value.trim();
  const imageFile = document.getElementById('imageFile').files[0];
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (!title) {
    showToast('Title is required', 'error');
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = photoId ? 'Updating...' : 'Adding...';
  try {
    if (photoId) {
      // If a new file is selected, use FormData
      if (imageFile) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', imageFile);
        await fetch(`${API_URL}/${photoId}`, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + getToken() },
          body: formData,
        });
      } else {
        // No new file, update text fields and/or imageUrl
        await fetch(`${API_URL}/${photoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + getToken()
          },
          body: JSON.stringify({ title, description, imageUrl }),
        });
      }
      showToast('Photo updated!');
    } else {
      // Add new photo (with file upload support)
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imageUrl) {
        formData.append('imageUrl', imageUrl);
      }
      await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: formData,
      });
      showToast('Photo added!');
    }
    fetchPhotos();
    e.target.reset();
    document.getElementById('photoId').value = '';
    submitBtn.textContent = 'Add Photo';
    closeModal();
  } catch (err) {
    showToast('Something went wrong', 'error');
    submitBtn.textContent = photoId ? 'Update Photo' : 'Add Photo';
  } finally {
    submitBtn.disabled = false;
  }
});

// --- Edit Photo: open modal and populate form (with JWT) ---
window.editPhoto = async function(id) {
  const res = await fetch(`${API_URL}/${id}`, {
    headers: { Authorization: 'Bearer ' + getToken() }
  });
  if (res.status === 401) {
    clearToken();
    updateUIOnAuth();
    showToast('Session expired. Please login again.', 'error');
    return;
  }
  const photo = await res.json();
  document.getElementById('photoId').value = photo._id;
  document.getElementById('title').value = photo.title;
  document.getElementById('description').value = photo.description;
  document.getElementById('imageUrl').value = photo.imageUrl;
  document.getElementById('imageFile').value = '';
  document.getElementById('photoForm').querySelector('button[type="submit"]').textContent = 'Update Photo';
  openModal();
}

// --- Delete Photo (with JWT) ---
window.deletePhoto = async function(id) {
  if (!confirm('Are you sure you want to delete this photo?')) return;
  await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + getToken() }
  });
  fetchPhotos();
  showToast('Photo deleted!');
}

// --- Change Password Logic ---
const changePasswordForm = document.getElementById('changePasswordForm');
changePasswordForm.onsubmit = async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showToast('All fields are required', 'error');
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }
  try {
    const res = await fetch('http://localhost:5000/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    showToast('Password changed successfully!');
    changePasswordForm.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// --- Initial UI State ---
window.onload = () => {
  updateAuthMode();
  updateUIOnAuth();
}; 