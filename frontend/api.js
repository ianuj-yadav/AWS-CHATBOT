// api.js - Handles communication with backend

const API_BASE = `http://${window.location.hostname}:5000`;

export async function sendMessage(message) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error("Network error");
  return await res.json();
}

// Admin API helpers
export async function fetchClients(token) {
  const res = await fetch(`${API_BASE}/admin/clients`, {
    headers: { "x-admin-token": token }
  });
  if (!res.ok) throw new Error("Failed to fetch clients");
  return await res.json();
}

export async function fetchUsers(token) {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: { "x-admin-token": token }
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return await res.json();
}

export async function fetchFaqs(token) {
  const res = await fetch(`${API_BASE}/admin/faqs`, {
    headers: { "x-admin-token": token }
  });
  if (!res.ok) throw new Error("Failed to fetch FAQs");
  return await res.json();
}

export async function fetchSuggestions(token) {
  const res = await fetch(`${API_BASE}/admin/suggestions`, {
    headers: { "x-admin-token": token }
  });
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  return await res.json();
}

export async function createFaq(token, faq) {
  const res = await fetch(`${API_BASE}/admin/faqs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: JSON.stringify(faq)
  });
  if (!res.ok) throw new Error("Failed to create FAQ");
  return await res.json();
}

export async function updateFaq(token, id, faq) {
  const res = await fetch(`${API_BASE}/admin/faqs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: JSON.stringify(faq)
  });
  if (!res.ok) throw new Error("Failed to update FAQ");
  return await res.json();
}

export async function deleteFaq(token, id) {
  const res = await fetch(`${API_BASE}/admin/faqs/${id}`, {
    method: "DELETE",
    headers: { "x-admin-token": token }
  });
  if (!res.ok) throw new Error("Failed to delete FAQ");
  return await res.json();
}
