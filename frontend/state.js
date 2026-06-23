// state.js - global state for the frontend application

export const state = {
  // Theme: "light" or "dark"
  theme: localStorage.getItem('chatbot-theme') || 'light',
  // Chat UI state
  isWidgetOpen: false,
  sidebarOpen: false,
  isLoading: false,
  activeChatId: 1,
  chatHistory: [{ id: 1, title: 'New Chat', messages: [] }],
  // Admin token (optional – stored after first entry)
  adminToken: localStorage.getItem('admin-token') || null,
};
