const API_URL = `http://${window.location.hostname}:5000/api/qa`;

// DOM Elements
const elements = {
  totalFaqs: document.getElementById("metricTotal"),
  tableBody: document.getElementById("faqTableBody"),
  loadingIndicator: document.getElementById("loadingIndicator"),
  emptyState: document.getElementById("emptyState"),
  
  modal: document.getElementById("faqModal"),
  openAddModalBtn: document.getElementById("openAddModalBtn"),
  
  // Clear DB Elements
  openClearDbModalBtn: document.getElementById("openClearDbModalBtn"),
  clearDbModal: document.getElementById("clearDbModal"),
  closeClearDbModalBtn: document.getElementById("closeClearDbModalBtn"),
  clearFaqsCheckbox: document.getElementById("clearFaqsCheckbox"),
  clearChatsCheckbox: document.getElementById("clearChatsCheckbox"),
  confirmClearDbBtn: document.getElementById("confirmClearDbBtn"),
  
  closeModalBtn: document.getElementById("closeModalBtn"),
  
  form: document.getElementById("faqForm"),
  modalTitle: document.getElementById("modalTitle"),
  idInput: document.getElementById("faqId"),
  questionInput: document.getElementById("faqQuestion"),
  answerInput: document.getElementById("faqAnswer"),
  saveBtn: document.getElementById("saveFaqBtn"),
  
  loginOverlay: document.getElementById("loginOverlay"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  logoutBtn: document.getElementById("logoutBtn"),
  
  themeToggleCheckbox: document.getElementById("themeToggleCheckbox")
};

// State
let faqs = [];

// Initialize
async function init() {
  // Theme initialization
  const savedTheme = localStorage.getItem("adminTheme") || "light";
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (elements.themeToggleCheckbox) elements.themeToggleCheckbox.checked = true;
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (elements.themeToggleCheckbox) elements.themeToggleCheckbox.checked = false;
  }

  setupEventListeners();
  const token = localStorage.getItem("jwtToken");
  if (token) {
    elements.loginOverlay.style.display = "none";
    await loadFaqs();
  } else {
    elements.loginOverlay.style.display = "flex";
  }
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Event Listeners
function setupEventListeners() {
  // --- Clear Database Logic ---
  elements.openClearDbModalBtn.addEventListener("click", () => {
    elements.clearFaqsCheckbox.checked = false;
    elements.clearChatsCheckbox.checked = false;
    elements.clearDbModal.style.display = "flex";
    setTimeout(() => elements.clearDbModal.classList.add("open"), 10);
  });

  elements.closeClearDbModalBtn.addEventListener("click", () => {
    elements.clearDbModal.classList.remove("open");
    setTimeout(() => elements.clearDbModal.style.display = "none", 300);
  });

  elements.confirmClearDbBtn.addEventListener("click", async () => {
    const clearFaqs = elements.clearFaqsCheckbox.checked;
    const clearChats = elements.clearChatsCheckbox.checked;
    
    if (!clearFaqs && !clearChats) {
      alert("Please select at least one database to clear.");
      return;
    }
    
    if (!confirm("Are you absolutely sure you want to permanently delete this data? This action CANNOT be undone.")) {
      return;
    }
    
    const originalBtnText = elements.confirmClearDbBtn.innerHTML;
    elements.confirmClearDbBtn.innerHTML = `<i data-lucide="loader" class="lucide-loader"></i> Deleting...`;
    elements.confirmClearDbBtn.disabled = true;
    
    try {
      const token = localStorage.getItem("jwtToken");
      const clearUrl = API_URL.replace("/api/qa", "/admin/database/clear");
      
      const res = await fetch(clearUrl, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ clearFaqs, clearChats })
      });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to clear database");
      }
      
      const data = await res.json();
      alert(data.message);
      
      elements.closeClearDbModalBtn.click();
      
      // Refresh tables
      if (clearFaqs) setTimeout(loadFaqs, 500);
      if (clearChats) setTimeout(loadChatHistory, 500);
      
    } catch (error) {
      console.error("Error clearing DB:", error);
      alert(error.message || "Error clearing database.");
    } finally {
      elements.confirmClearDbBtn.disabled = false;
      elements.confirmClearDbBtn.innerHTML = originalBtnText;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  });

  elements.openAddModalBtn.addEventListener("click", () => openModal());
  elements.closeModalBtn.addEventListener("click", closeModal);
  elements.form.addEventListener("submit", handleFormSubmit);
  
  elements.loginForm.addEventListener("submit", handleLogin);
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", handleLogout);
  }
  
  if (elements.themeToggleCheckbox) {
    elements.themeToggleCheckbox.addEventListener("change", toggleTheme);
  }
  
  // Close modal on overlay click
  elements.modal.addEventListener("click", (e) => {
    if (e.target === elements.modal) {
      closeModal();
    }
  });
}

// Theme Toggle
function toggleTheme(e) {
  const newTheme = e.target.checked ? "dark" : "light";
  
  if (newTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  
  localStorage.setItem("adminTheme", newTheme);
}

// Fetch FAQs
async function loadFaqs() {
  try {
    elements.loadingIndicator.style.display = "block";
    elements.emptyState.style.display = "none";
    elements.tableBody.innerHTML = "";
    
    const token = localStorage.getItem("jwtToken");
    const res = await fetch(API_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      return;
    }
    
    if (!res.ok) throw new Error("Failed to fetch");
    
    faqs = await res.json();
    renderTable();
  } catch (error) {
    console.error(error);
    alert("Could not load FAQs from server.");
  } finally {
    elements.loadingIndicator.style.display = "none";
  }
}

// Render Table
function renderTable() {
  elements.tableBody.innerHTML = "";
  elements.totalFaqs.textContent = faqs.length;
  
  if (faqs.length === 0) {
    elements.emptyState.style.display = "block";
    return;
  }
  
  faqs.forEach(faq => {
    const tr = document.createElement("tr");
    
    // Truncate answer preview
    const answerPreview = faq.answer.length > 80 ? faq.answer.substring(0, 80) + "..." : faq.answer;
    
    tr.innerHTML = `
      <td>#${faq.id}</td>
      <td style="font-weight: 500;">${faq.question}</td>
      <td style="color: #8b949e;">${answerPreview}</td>
      <td>
        <div class="table-actions">
          <button class="action-btn edit" onclick="editFaq(${faq.id})"><i data-lucide="edit-2" style="width:14px;height:14px;"></i> Edit</button>
          <button class="action-btn delete" onclick="deleteFaq(${faq.id})"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> Delete</button>
        </div>
      </td>
    `;
    elements.tableBody.appendChild(tr);
  });
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Modal Management
function openModal(faq = null) {
  if (faq) {
    elements.modalTitle.textContent = "Edit FAQ";
    elements.idInput.value = faq.id;
    elements.questionInput.value = faq.question;
    elements.answerInput.value = faq.answer;
  } else {
    elements.modalTitle.textContent = "Add Custom FAQ";
    elements.form.reset();
    elements.idInput.value = "";
  }
  
  elements.modal.style.display = "flex";
  setTimeout(() => {
    elements.modal.classList.add("open");
    elements.questionInput.focus();
  }, 10);
}

function closeModal() {
  elements.modal.classList.remove("open");
  setTimeout(() => {
    elements.modal.style.display = "none";
    elements.form.reset();
  }, 300);
}

// Form Submission (Add / Edit)
async function handleFormSubmit(e) {
  e.preventDefault();
  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = "Saving...";
  
  const id = elements.idInput.value;
  const payload = {
    question: elements.questionInput.value.trim(),
    answer: elements.answerInput.value.trim()
  };
  
  try {
    const url = id ? `${API_URL}/${id}` : API_URL;
    const method = id ? "PUT" : "POST";
    const token = localStorage.getItem("jwtToken");
    
    const res = await fetch(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      return;
    }
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save");
    }
    
    const data = await res.json();
    if (res.status === 207 && data.warning) {
      alert("⚠️ " + data.warning);
    }
    
    closeModal();
    setTimeout(loadFaqs, 500); // Refresh table with slight delay to ensure DB locks are released
  } catch (error) {
    console.error(error);
    alert(error.message || "Error saving FAQ.");
  } finally {
    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = "Save FAQ";
  }
}

// Delete Logic
async function deleteFaq(id) {
  if (!confirm("Are you sure you want to delete this FAQ? This action cannot be undone.")) {
    return;
  }
  
  try {
    const token = localStorage.getItem("jwtToken");
    const res = await fetch(`${API_URL}/${id}`, { 
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      return;
    }
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete");
    }
    
    setTimeout(loadFaqs, 500); // Refresh table
  } catch (error) {
    console.error(error);
    alert(error.message || "Error deleting FAQ.");
  }
}

// Auth Logic
async function handleLogin(e) {
  e.preventDefault();
  const username = elements.loginUsername.value;
  const password = elements.loginPassword.value;
  
  try {
    // API_URL is /api/qa, so we need to target /api/auth/login
    const loginUrl = API_URL.replace("/qa", "/auth/login");
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    
    if (!res.ok) {
      alert("Invalid credentials");
      return;
    }
    
    const data = await res.json();
    localStorage.setItem("jwtToken", data.token);
    elements.loginOverlay.style.display = "none";
    await loadFaqs();
  } catch (err) {
    alert("Login failed due to network error.");
  }
}

function handleLogout() {
  localStorage.removeItem("jwtToken");
  elements.loginOverlay.style.display = "flex";
  elements.loginUsername.value = "";
  elements.loginPassword.value = "";
}

// Fetch and Render Chat History
async function loadChatHistory() {
  try {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;
    
    const chatTableBody = document.getElementById("chatTableBody");
    const chatEmptyState = document.getElementById("chatEmptyState");
    const chatLoadingIndicator = document.getElementById("chatLoadingIndicator");
    
    // Only show loading if it's empty
    if (chatTableBody.innerHTML === "") {
      chatLoadingIndicator.style.display = "block";
    }
    
    // We target /admin/chats
    const chatsUrl = API_URL.replace("/api/qa", "/admin/chats");
    const res = await fetch(chatsUrl, {
      method: "GET",
      cache: "no-store",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    chatLoadingIndicator.style.display = "none";

    if (!res.ok) return; // Silent fail for polling
    const chats = await res.json();
    
    if (chats.length === 0) {
      chatEmptyState.style.display = "block";
      chatTableBody.innerHTML = "";
      return;
    }
    
    chatEmptyState.style.display = "none";
    chatTableBody.innerHTML = "";
    
    chats.forEach(chat => {
      const tr = document.createElement("tr");
      
      const timeStr = new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const qPreview = chat.user_message && chat.user_message.length > 50 ? chat.user_message.substring(0, 50) + "..." : (chat.user_message || "");
      const aPreview = chat.bot_response && chat.bot_response.length > 80 ? chat.bot_response.substring(0, 80) + "..." : (chat.bot_response || "");
      
      let ipDisplay = "Unknown";
      if (chat.ip_address) {
        // Strip out IPv4 mapped IPv6 prefix if present e.g. ::ffff:103.x.x.x
        let ip = chat.ip_address.replace('::ffff:', '');
        const parts = ip.split(".");
        if (parts.length === 4) {
          ipDisplay = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        } else {
          ipDisplay = "Hidden"; // For pure IPv6 or local
        }
      }
      if (chat.ip_address === "127.0.0.1" || chat.ip_address === "::1") ipDisplay = "Localhost";
      
      const browserDisplay = `${chat.browser || 'Unknown'}<br><small style="color: var(--text-muted);">${chat.os || 'Unknown'}</small>`;
      
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 12px; font-weight: 600;">${timeStr}</td>
        <td style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${ipDisplay}</td>
        <td style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">${browserDisplay}</td>
        <td style="font-weight: 500; color: var(--text-primary);">${qPreview}</td>
        <td style="color: var(--text-secondary);">${aPreview}</td>
      `;
      chatTableBody.appendChild(tr);
    });
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Live chat polling error:", err);
  }
}

let chatPollInterval;

function startPollingChats() {
  if (chatPollInterval) clearInterval(chatPollInterval);
  loadChatHistory();
  chatPollInterval = setInterval(loadChatHistory, 3000); // Poll every 3 seconds
}

function stopPollingChats() {
  if (chatPollInterval) clearInterval(chatPollInterval);
}

// Bootstrap
window.editFaq = (id) => {
  const faq = faqs.find(f => f.id === id);
  if (faq) openModal(faq);
};

window.deleteFaq = deleteFaq;

// Override handleLogout to stop polling
const originalHandleLogout = handleLogout;
handleLogout = function() {
  stopPollingChats();
  originalHandleLogout();
}

// Update init to start polling
const originalInit = init;
init = async function() {
  await originalInit();
  const token = localStorage.getItem("jwtToken");
  if (token) {
    startPollingChats();
  }
}

// Update handleLogin to start polling on success
const originalHandleLogin = handleLogin;
handleLogin = async function(e) {
  await originalHandleLogin(e);
  const token = localStorage.getItem("jwtToken");
  if (token) {
    startPollingChats();
  }
}

init();
