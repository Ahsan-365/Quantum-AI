// Add marked library for basic markdown parsing to handle LLM outputs beautifully
const markedScript = document.createElement('script');
markedScript.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(markedScript);

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendBtn');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatThread = document.getElementById('chatThread');
    const loadingTemplate = document.getElementById('loadingTemplate');
    const suggestionCards = document.querySelectorAll('.suggestion-card');

    // Settings & Modals Variables
    const topModelDropdownBtn = document.getElementById('topModelDropdownBtn');
    const settingsModal = document.getElementById('settingsModal');
    const helpModal = document.getElementById('helpModal');
    const activityModal = document.getElementById('activityModal');
    const proModal = document.getElementById('proModal');

    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const activityBtn = document.getElementById('activityBtn');

    // Modal controls
    const allModals = document.querySelectorAll('.modal-overlay');
    const closeBtns = document.querySelectorAll('.modal-close-btn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const modelSelect = document.getElementById('modelSelect');

    // UI Controls
    const newChatBtn = document.getElementById('newChatBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const toastContainer = document.getElementById('toastContainer');
    const recentChatsList = document.getElementById('recentChatsList');
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.menu-btn');

    // Dummy buttons (for toasts)
    const dummyButtons = document.querySelectorAll('.input-action-btn:not(#sendBtn)');

    // Conversation State Trackers
    let currentChatId = null;
    let chatHistory = []; // The messages array for API
    let allStoredChats = []; // Array of chat objects {id, title, messages}

    // System Persona Prompt
    const getSystemPrompt = () => ({
        role: "system",
        content: "You are an intelligent, helpful AI assistant built on an open-source model. Your name is Quantum AI. Your responses should be concise, helpful, and formatted using Markdown if necessary."
    });

    // --- Boot Sequence ---
    initStorage();
    loadStoredSettings();

    function initStorage() {
        const stored = localStorage.getItem('quantumChats');
        if (stored) {
            allStoredChats = JSON.parse(stored);
            renderSidebarChats();
        }
    }

    function loadStoredSettings() {
        if (localStorage.getItem('groqApiKey')) {
            apiKeyInput.value = localStorage.getItem('groqApiKey');
        }
        if (localStorage.getItem('groqModel')) {
            modelSelect.value = localStorage.getItem('groqModel');
            updateHeaderModelDisplay();
        }
    }

    function updateHeaderModelDisplay() {
        const modelName = modelSelect.options[modelSelect.selectedIndex].text;
        topModelDropdownBtn.querySelector('h2').textContent = `Quantum AI (${modelName.split(' ')[2] || 'Fast'})`;
    }

    // --- Modal Logic ---
    function openModal(modal) {
        modal.style.display = 'flex';
    }

    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    topModelDropdownBtn.addEventListener('click', () => openModal(settingsModal));
    helpBtn.addEventListener('click', () => openModal(helpModal));

    activityBtn.addEventListener('click', () => {
        openModal(activityModal);
        refreshActivityFeed();
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').style.display = 'none';
        });
    });

    // Close Modals & Dropdowns on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }

        // Close chat options if clicked outside
        if (!e.target.closest('.chat-options-btn') && !e.target.closest('.chat-options-menu')) {
            document.querySelectorAll('.chat-options-menu').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    saveSettingsBtn.addEventListener('click', () => {
        localStorage.setItem('groqApiKey', apiKeyInput.value.trim());
        localStorage.setItem('groqModel', modelSelect.value);
        settingsModal.style.display = 'none';

        updateHeaderModelDisplay();
        showToast('Settings saved successfully!');
    });

    // --- UI Controls Logic ---
    newChatBtn.addEventListener('click', () => {
        startNewChat();
        showToast('Started a new chat.');
    });

    function startNewChat() {
        // Clear UI
        chatThread.innerHTML = '';
        chatThread.style.display = 'none';
        welcomeScreen.style.display = 'flex';

        // Reset state
        currentChatId = null;
        chatHistory = [];

        // Remove active state from sidebar
        document.querySelectorAll('.recent-item').forEach(wrapper => wrapper.classList.remove('active'));
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        if (document.body.classList.contains('light-theme')) {
            themeIcon.textContent = 'dark_mode';
            showToast('Switched to Light Theme');
        } else {
            themeIcon.textContent = 'light_mode';
            showToast('Switched to Dark Theme');
        }
    });

    // Sidebar toggle for desktop/mobile
    menuBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            const transform = sidebar.style.transform;
            sidebar.style.transform = (transform === 'translateX(0%)') ? 'translateX(-100%)' : 'translateX(0%)';
        } else {
            sidebar.classList.toggle('collapsed');
        }
    });

    // Wire up remaining dummy buttons to show a toast
    dummyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.querySelector('.material-symbols-outlined')) {
                const iconName = btn.querySelector('.material-symbols-outlined').textContent;
                if (iconName === 'mic') showToast('Voice input coming soon to Quantum AI.');
            }
        });
    });

    promptInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        if (this.value.trim().length > 0) {
            sendBtn.classList.add('active');
        } else {
            sendBtn.classList.remove('active');
            this.style.height = 'auto';
        }
    });

    promptInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim()) {
                handleSend(this.value.trim());
            }
        }
    });

    sendBtn.addEventListener('click', () => {
        if (promptInput.value.trim()) {
            handleSend(promptInput.value.trim());
        }
    });

    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const text = card.querySelector('p').textContent;
            handleSend(text);
        });
    });

    async function handleSend(text) {
        welcomeScreen.style.display = 'none';
        chatThread.style.display = 'flex';

        // Display user message in UI
        addUserMessage(text);

        // Add to abstract state for API
        if (chatHistory.length === 0) {
            chatHistory.push(getSystemPrompt());
        }
        chatHistory.push({ role: "user", content: text });

        promptInput.value = '';
        promptInput.style.height = 'auto';
        sendBtn.classList.remove('active');

        showLoadingState();

        const apiKey = localStorage.getItem('groqApiKey');
        const model = localStorage.getItem('groqModel') || "llama-3.3-70b-versatile";

        if (!apiKey) {
            removeLoadingState();
            addBotMessage("<p>⚠️ Please enter your free Groq API key in the Settings menu (bottom left) to connect to open-source models.</p>");
            chatHistory.pop(); // Remove prompt since we failed to send
            return;
        }

        try {
            const responseText = await fetchFromGroq(chatHistory, apiKey, model);
            removeLoadingState();

            // Render markdown using Marked.js if loaded, else fallback
            const htmlContent = window.marked && typeof marked.parse === 'function'
                ? marked.parse(responseText)
                : `<p>${escapeHtml(responseText).replace(/\n/g, '<br>')}</p>`;

            addBotMessage(htmlContent);
            chatHistory.push({ role: "assistant", content: responseText });

            // Save chat to local storage
            if (!currentChatId) {
                currentChatId = Date.now().toString();
                const chatTitle = text.length > 50 ? text.substring(0, 47) + '...' : text;
                allStoredChats.unshift({ id: currentChatId, title: chatTitle, messages: [...chatHistory] });
            } else {
                const index = allStoredChats.findIndex(c => c.id === currentChatId);
                if (index !== -1) {
                    allStoredChats[index].messages = [...chatHistory];
                }
            }
            localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));
            renderSidebarChats();

        } catch (error) {
            removeLoadingState();
            chatHistory.pop();
            addBotMessage(`<p style="color: #ff6b6b">Error communicating with API: ${error.message}</p>`);
        }
    }

    async function fetchFromGroq(messages, apiKey, modelId) {
        const url = "https://api.groq.com/openai/v1/chat/completions";

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    function addUserMessage(text) {
        const msgHtml = `
            <div class="chat-message user">
                <div class="message-content">
                    ${escapeHtml(text).replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        chatThread.insertAdjacentHTML('beforeend', msgHtml);
        scrollToBottom();
    }

    function showLoadingState() {
        const clone = loadingTemplate.content.cloneNode(true);
        chatThread.appendChild(clone);
        scrollToBottom();
    }

    function removeLoadingState() {
        const loader = chatThread.querySelector('.loading-state');
        if (loader) {
            loader.remove();
        }
    }

    function addBotMessage(htmlContent) {
        const msgHtml = `
            <div class="chat-message bot">
                <div class="bot-avatar quantum-sparkle"></div>
                <div class="message-content markdown-body">
                    ${htmlContent}
                </div>
            </div>
        `;
        chatThread.insertAdjacentHTML('beforeend', msgHtml);
        scrollToBottom();

        setTimeout(() => {
            const avatar = chatThread.lastElementChild.querySelector('.bot-avatar');
            if (avatar) avatar.classList.remove('quantum-sparkle-spin');
        }, 100);
    }

    function scrollToBottom() {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
        const chatArea = document.querySelector('.chat-area');
        if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Helper to prevent XSS in user input display
    function escapeHtml(unsafe) {
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- State Storage Functions ---
    function saveCurrentChat() {
        if (!currentChatId) return;
        const index = allStoredChats.findIndex(c => c.id === currentChatId);
        if (index !== -1) {
            allStoredChats[index].messages = [...chatHistory];
        }
        localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));
    }

    function renderSidebarChats() {
        recentChatsList.innerHTML = '';
        allStoredChats.forEach(chat => {
            const wrapper = document.createElement('div');
            wrapper.className = 'recent-item';
            if (chat.id === currentChatId) wrapper.classList.add('active');

            wrapper.innerHTML = `
                <div class="chat-main-click" title="${escapeHtml(chat.title)}">
                    <span class="material-symbols-outlined chat-icon">chat_bubble</span>
                    <span class="item-text">${escapeHtml(chat.title)}</span>
                </div>
                <button class="chat-options-btn" title="Options">
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
                <div class="chat-options-menu">
                    <button class="chat-option rename-btn">
                        <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Rename
                    </button>
                    <button class="chat-option delete delete-btn">
                        <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete
                    </button>
                </div>
            `;

            // Handle loading the chat
            wrapper.querySelector('.chat-main-click').addEventListener('click', () => {
                loadChatHistory(chat.id);
            });

            // Handle options dropdown toggle
            const optionsBtn = wrapper.querySelector('.chat-options-btn');
            const optionsMenu = wrapper.querySelector('.chat-options-menu');
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other menus first
                document.querySelectorAll('.chat-options-menu').forEach(menu => {
                    if (menu !== optionsMenu) menu.classList.remove('active');
                });
                optionsMenu.classList.toggle('active');
            });

            // Handle Rename
            wrapper.querySelector('.rename-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.classList.remove('active');

                const newTitle = prompt("Enter a new name for this chat:", chat.title);
                if (newTitle && newTitle.trim().length > 0) {
                    renameChat(chat.id, newTitle.trim());
                }
            });

            // Handle Delete
            wrapper.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.classList.remove('active');

                if (confirm(`Are you sure you want to delete "${chat.title}"?`)) {
                    deleteChat(chat.id);
                }
            });

            recentChatsList.appendChild(wrapper);
        });
    }

    function renameChat(chatId, newTitle) {
        const index = allStoredChats.findIndex(c => c.id === chatId);
        if (index !== -1) {
            allStoredChats[index].title = newTitle;
            localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));
            renderSidebarChats();
            logActivity(`Renamed chat to "${newTitle}"`);
        }
    }

    function deleteChat(chatId) {
        allStoredChats = allStoredChats.filter(c => c.id !== chatId);
        localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));

        // If the user deleted the chat they are currently looking at, wipe the board clean
        if (currentChatId === chatId) {
            startNewChat();
        } else {
            renderSidebarChats();
        }

        showToast('Chat deleted.');
        logActivity('Deleted a chat from history.');
    }

    function loadChatHistory(chatId) {
        const chatObj = allStoredChats.find(c => c.id === chatId);
        if (!chatObj) return;

        currentChatId = chatId;
        chatHistory = [...chatObj.messages];

        // Fix active styling in sidebar
        renderSidebarChats();

        // Render UI
        welcomeScreen.style.display = 'none';
        chatThread.style.display = 'flex';
        chatThread.innerHTML = '';

        chatHistory.forEach(msg => {
            if (msg.role === 'user') {
                addUserMessage(msg.content);
            } else if (msg.role === 'assistant') {
                const htmlContent = window.marked && typeof marked.parse === 'function'
                    ? marked.parse(msg.content)
                    : `<p>${escapeHtml(msg.content).replace(/\n/g, '<br>')}</p>`;
                addBotMessage(htmlContent);
            }
        });

        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').style.transform = 'translateX(-100%)';
        }
    }

    // --- Activity Feed Helper ---
    function logActivity(action) {
        let history = JSON.parse(localStorage.getItem('quantumActivity') || '[]');
        history.unshift({ action, time: new Date().toISOString() });
        // Keeping only last 20
        history = history.slice(0, 20);
        localStorage.setItem('quantumActivity', JSON.stringify(history));
    }

    function refreshActivityFeed() {
        const feed = document.getElementById('activityLogContent');
        const history = JSON.parse(localStorage.getItem('quantumActivity') || '[]');

        feed.innerHTML = '';
        if (history.length === 0) {
            feed.innerHTML = '<p class="modal-desc">No recent activity.</p>';
            return;
        }

        history.forEach(item => {
            const date = new Date(item.time);
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <span class="time">${date.toLocaleTimeString()} - ${date.toLocaleDateString()}</span>
                ${escapeHtml(item.action)}
            `;
            feed.appendChild(div);
        });
    }

    // Setup hooks for activity
    let _oldLoad = loadChatHistory;
    loadChatHistory = (id) => {
        _oldLoad(id);
        logActivity('Loaded a past chat from history.');
    }
});
