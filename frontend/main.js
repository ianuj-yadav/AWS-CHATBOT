// main.js - Application entry point and event wiring

import { renderMessage, showToast, toggleTheme } from "./ui.js";
import { sendMessage } from "./api.js";
import { state } from "./state.js";

// DOM elements
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatArea = document.getElementById("chatArea");
const messagesContainer = document.getElementById("messagesContainer");
const themeBtn = document.getElementById("themeBtn");
const themeLabel = document.getElementById("themeLabel");
const adminBtn = document.getElementById("adminBtn");
const fabBtn = document.getElementById("fabBtn");
const closeBtn = document.getElementById("closeBtn");
const widgetContainer = document.getElementById("widgetContainer");
const menuBtn = document.getElementById("menuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function toggleWidget(open) {
  state.isWidgetOpen = open;
  if (open) {
    widgetContainer.style.display = "flex";
    fabBtn.style.display = "none";
    setTimeout(() => {
      messageInput.focus();
      chatArea.scrollTop = chatArea.scrollHeight;
    }, 100);
  } else {
    widgetContainer.style.display = "none";
    fabBtn.style.display = "flex";
  }
}
/**
 * Append a message to the chat UI and persist it.
 * @param {Object} msg - { role: 'user'|'assistant', text: string, timestamp: string }
 */
function addMessage(msg) {
  const msgEl = renderMessage(msg);
  messagesContainer.appendChild(msgEl);
  // Persist to state
  const activeChat = state.chatHistory.find(c => c.id === state.activeChatId);
  if (activeChat) {
    activeChat.messages.push(msg);
    localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
  }
  // Auto‑scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

async function handleSend() {
  const text = messageInput.value.trim();
  if (!text) return;
  
  sendBtn.disabled = true;
  messageInput.disabled = true;

  const userMsg = {
    role: "user",
    text,
    timestamp: new Date().toISOString()
  };
  addMessage(userMsg);
  messageInput.value = "";

  let assistantMsg = null;
  let bubbleEl = null;
  const activeChat = state.chatHistory.find(c => c.id === state.activeChatId);

  try {
    let history = [];
    if (activeChat) {
      history = activeChat.messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.text
      }));
      // Limit history to last 10 messages to save tokens
      if (history.length > 10) history = history.slice(history.length - 10);
    }

    const res = await fetch(`http://${window.location.hostname}:5000/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history })
    });
    
    if (!res.ok) throw new Error("Network error or server unavailable");

    assistantMsg = {
      role: "assistant",
      text: "",
      timestamp: new Date().toISOString(),
      sources: []
    };
    
    const msgEl = renderMessage(assistantMsg);
    messagesContainer.appendChild(msgEl);
    
    const contentEl = msgEl.querySelector('.message-content');
    bubbleEl = msgEl.querySelector('.message-bubble');
    
    // Add loading indicator
    bubbleEl.innerHTML = '<div class="typing-indicator" style="box-shadow:none;border:none;background:transparent;padding:0;"><span></span><span></span><span></span></div>';
    chatArea.scrollTop = chatArea.scrollHeight;
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer);
            if (data.type === 'chunk') {
              fullText += data.text;
            }
          } catch(e) {
            console.error("Final parse error:", e);
          }
        }
        // Update the UI one last time when done, replacing the typing indicator
        if (fullText) {
          bubbleEl.innerHTML = window.DOMPurify.sanitize(window.marked.parse(fullText));
        } else {
          bubbleEl.innerHTML = "<em>[No reply]</em>";
        }
        break;
      }
      
      const chunkString = decoder.decode(value, { stream: true });
      buffer += chunkString;
      
      // Fix: split by actual newline, not a literal backslash-n string
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last incomplete part in the buffer
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.type === 'sources' && data.sources && data.sources.length) {
            assistantMsg.sources = data.sources;
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'message-sources';
            const label = document.createElement('span');
            label.className = 'sources-label';
            label.textContent = 'Sources:';
            sourcesDiv.appendChild(label);
            data.sources.forEach(src => {
              const badge = document.createElement('span');
              badge.className = 'source-badge';
              badge.textContent = src.name || 'Source';
              sourcesDiv.appendChild(badge);
            });
            contentEl.appendChild(sourcesDiv);
          } else if (data.type === 'chunk') {
            fullText += data.text;
            bubbleEl.innerHTML = window.DOMPurify.sanitize(window.marked.parse(fullText));
            chatArea.scrollTop = chatArea.scrollHeight;
          }
        } catch(e) {
          console.error("Stream parse error on line:", line, e);
        }
      }
    }
    
    assistantMsg.text = fullText || "[No reply]";
    
    if (activeChat) {
      activeChat.messages.push(assistantMsg);
      localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
    }
    
  } catch (err) {
    console.error(err);
    const errorText = "**Error:** " + (err.message || "Network error");
    if (bubbleEl && assistantMsg) {
      assistantMsg.text = errorText;
      bubbleEl.innerHTML = window.DOMPurify.sanitize(window.marked.parse(errorText));
      if (activeChat) {
        activeChat.messages.push(assistantMsg);
        localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
      }
    } else {
      addMessage({
        role: "assistant",
        text: errorText,
        timestamp: new Date().toISOString()
      });
    }
  } finally {
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

function loadPersistedChat(isInitialLoad = false) {
  const stored = localStorage.getItem('chat-history');
  if (stored) {
    try {
      state.chatHistory = JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse chat history', e);
    }
  }

  if (isInitialLoad) {
    // Filter out completely empty "New Chat" sessions to avoid clutter
    state.chatHistory = state.chatHistory.filter(c => c.messages && c.messages.length > 0);
    
    // Always start on a fresh new chat page
    const newId = Date.now();
    state.chatHistory.unshift({ id: newId, title: "New Chat", messages: [] });
    state.activeChatId = newId;
    localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
  }

  const activeChat = state.chatHistory.find(c => c.id === state.activeChatId);
  messagesContainer.innerHTML = ""; // Clear current messages
  if (activeChat && activeChat.messages.length) {
    activeChat.messages.forEach(m => messagesContainer.appendChild(renderMessage(m)));
    chatArea.scrollTop = chatArea.scrollHeight;
  }
  renderChatList();
}

function renderChatList() {
  const container = document.getElementById("chatHistoryContainer");
  if (!container) return;
  container.innerHTML = "";
  
  state.chatHistory.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-item" + (chat.id === state.activeChatId ? " chat-item--active" : "");
    
    const titleDiv = document.createElement("div");
    titleDiv.className = "chat-item-title";
    titleDiv.textContent = chat.messages.length > 0 ? chat.messages[0].text : "New Chat";
    
    // Add delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chat-item-delete";
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete Chat";
    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent selecting the chat
      state.chatHistory = state.chatHistory.filter(c => c.id !== chat.id);
      
      // If we deleted the active chat, fall back to another one or create a new one
      if (state.activeChatId === chat.id) {
         if (state.chatHistory.length > 0) {
            state.activeChatId = state.chatHistory[0].id;
         } else {
            const newId = Date.now();
            state.chatHistory = [{ id: newId, title: "New Chat", messages: [] }];
            state.activeChatId = newId;
         }
      }
      localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
      loadPersistedChat(false);
    };
    
    item.appendChild(titleDiv);
    item.appendChild(deleteBtn);

    item.addEventListener("click", () => {
      state.activeChatId = chat.id;
      localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
      loadPersistedChat(false);
      document.getElementById("sidebarOverlay").classList.remove("sidebar-overlay--open");
    });
    container.appendChild(item);
  });
}

function init() {
  // Event listeners
  const newChatBtn = document.getElementById("newChatBtn");
  
  fabBtn.addEventListener("click", () => toggleWidget(true));
  closeBtn.addEventListener("click", () => toggleWidget(false));
  
  menuBtn.addEventListener("click", () => {
    sidebarOverlay.classList.toggle("sidebar-overlay--open");
  });
  
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => {
      sidebarOverlay.classList.remove("sidebar-overlay--open");
    });
  }

  // Close sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (sidebarOverlay.classList.contains("sidebar-overlay--open") && 
        !sidebarOverlay.contains(e.target) && 
        !menuBtn.contains(e.target)) {
      sidebarOverlay.classList.remove("sidebar-overlay--open");
    }
  });
  
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      const newId = Date.now();
      state.chatHistory.unshift({ id: newId, title: "New Chat", messages: [] });
      state.activeChatId = newId;
      localStorage.setItem('chat-history', JSON.stringify(state.chatHistory));
      messagesContainer.innerHTML = ""; // clear current chat
      renderChatList();
      if (sidebarOverlay) sidebarOverlay.classList.remove("sidebar-overlay--open");
    });
  }
  
  sendBtn.addEventListener("click", handleSend);
  messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  themeBtn.addEventListener("click", () => toggleTheme(themeLabel));
  adminBtn.addEventListener("click", () => {
    // Navigate to admin panel directly; admin.html has its own login overlay now
    // Added a cache buster so that the browser does not aggressively cache the old admin.html and admin.js
    // Using '/admin' instead of 'admin.html' to bypass the 'serve' package's clean URL 301 redirect
    window.location.href = "/admin?v=" + Date.now();
  });

  // Initialise Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  loadPersistedChat(true);
}

// Initialise the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
