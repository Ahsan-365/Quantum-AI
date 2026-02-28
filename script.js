document.addEventListener('DOMContentLoaded', () => {
    // Mobile Viewport Height Fix
    const setAppHeight = () => {
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', setAppHeight);
    setAppHeight();

    // ⚠️ HARDCODED API KEY ⚠️
    const GROQ_API_KEY = "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";

    // --- DOM Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const desktopToggleBtn = document.querySelector('.sidebar-toggle-desktop');

    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');

    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatThread = document.getElementById('chatThread');
    const scrollableContent = document.getElementById('scrollableContent');
    const loadingTemplate = document.getElementById('loadingTemplate');
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    const recentChatsList = document.getElementById('recentChatsList');
    const newChatBtn = document.getElementById('newChatBtn');

    // Modals
    const settingsModal = document.getElementById('settingsModal');
    const helpModal = document.getElementById('helpModal');
    const activityModal = document.getElementById('activityModal');
    const topModelDropdownBtn = document.getElementById('topModelDropdownBtn');

    // Model Select Settings
    const modelSelect = document.getElementById('modelSelect');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const modelNameDisplay = topModelDropdownBtn.querySelector('.model-name');

    // Buttons mapping to modals
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const activityBtn = document.getElementById('activityBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const toastContainer = document.getElementById('toastContainer');

    // --- State Variables ---
    let currentChatId = null;
    let chatHistory = [];
    let allStoredChats = [];
    let isRecording = false;
    let recognition = null;

    const getSystemPrompt = () => ({
        role: "system",
        content: "You are Quantum AI, the AI assistant of the web app 'The Quantum Theater'. Your creator is S. M. Ahsan. Answer naturally based on this persona only when relevant. Format responses using Markdown, and use LaTeX for math formulas (block math must use $$ ... $$)."
    });

    // --- Boot & Storage ---
    if (window.marked && window.markedKatex) {
        marked.use(window.markedKatex({ throwOnError: false, output: 'html', nonStandard: true }));
    }

    initStorage();
    loadSettings();

    function initStorage() {
        const stored = localStorage.getItem('quantumChats');
        if (stored) {
            allStoredChats = JSON.parse(stored);
            renderSidebarChats();
        }
    }

    function loadSettings() {
        let storedModel = localStorage.getItem('groqModel');

        // Use the first option as default if none is found
        if (!storedModel) {
            storedModel = modelSelect.options[0].value;
            localStorage.setItem('groqModel', storedModel);
        }

        modelSelect.value = storedModel;

        // If the stored model is no longer in the list, fallback to default
        if (!modelSelect.value) {
            storedModel = modelSelect.options[0].value;
            modelSelect.value = storedModel;
            localStorage.setItem('groqModel', storedModel);
        }

        updateHeaderModelDisplay();
    }

    function updateHeaderModelDisplay() {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (selectedOption) {
            const modelName = selectedOption.text;
            let shortName = "Fast";
            if (modelName.includes("70B")) shortName = "70B";
            else if (modelName.includes("8B")) shortName = "8B";
            else if (modelName.includes("9B")) shortName = "9B";
            else if (modelName.includes("27B")) shortName = "27B";
            modelNameDisplay.textContent = `Quantum AI (${shortName})`;
        }
    }

    // --- Sidebar Mobile Navigation Logic ---
    function toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay.classList.toggle('show');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    function closeSidebarMobile() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('show');
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
    if (desktopToggleBtn) desktopToggleBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarMobile);

    // --- Theme Toggle ---
    if (themeToggleBtn) {
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
    }

    // --- Modal Logic ---
    function openModal(modal) { modal.style.display = 'flex'; }
    function closeModal(modal) { modal.style.display = 'none'; }

    if (settingsBtn) settingsBtn.addEventListener('click', () => { closeSidebarMobile(); openModal(settingsModal); });
    if (topModelDropdownBtn) topModelDropdownBtn.addEventListener('click', () => openModal(settingsModal));
    if (helpBtn) helpBtn.addEventListener('click', () => { closeSidebarMobile(); openModal(helpModal); });
    if (activityBtn) activityBtn.addEventListener('click', () => { closeSidebarMobile(); openModal(activityModal); });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal-backdrop'));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeModal(e.target);
        }
    });

    // Save Settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            localStorage.setItem('groqModel', modelSelect.value);
            updateHeaderModelDisplay();
            closeModal(settingsModal);
            showToast('Settings saved successfully!');
        });
    }

    // --- Toast Notifications ---
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- New Chat Logic ---
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            startNewChat();
            showToast('Started new chat');
            closeSidebarMobile();
        });
    }

    function startNewChat() {
        chatThread.innerHTML = '';
        chatThread.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        currentChatId = null;
        chatHistory = [];
        renderSidebarChats(); // Removes active states
    }

    // --- Auto-Resize Textarea ---
    if (promptInput) {
        promptInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value.trim().length > 0) {
                sendBtn.classList.add('ready');
            } else {
                sendBtn.classList.remove('ready');
                this.style.height = 'auto';
            }
        });

        promptInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.value.trim()) handleSend(this.value.trim());
            }
        });
    }

    // --- Suggestion Cards & Send ---
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const text = card.querySelector('p').textContent;
            handleSend(text);
        });
    });

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (promptInput.value.trim()) handleSend(promptInput.value.trim());
        });
    }

    // --- Speech Recognition ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechParser = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechParser();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = function () {
            isRecording = true;
            micBtn.classList.add('active-mic');
        };

        recognition.onresult = function (event) {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript) {
                promptInput.value = promptInput.value + (promptInput.value ? ' ' : '') + finalTranscript;
            }
            promptInput.dispatchEvent(new Event('input'));
        };

        recognition.onerror = function () { stopRecording(); };
        recognition.onend = function () { stopRecording(); };
    }

    function stopRecording() {
        if (isRecording && recognition) recognition.stop();
        isRecording = false;
        if (micBtn) micBtn.classList.remove('active-mic');
    }

    if (micBtn) {
        micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!recognition) {
                showToast('Speech recognition not supported in this browser.');
                return;
            }
            if (isRecording) stopRecording();
            else recognition.start();
        });
    }

    // --- Core Chat Handlers ---
    async function handleSend(text) {
        welcomeScreen.style.display = 'none';
        chatThread.style.display = 'flex';

        addUserMessage(text);

        if (chatHistory.length === 0) chatHistory.push(getSystemPrompt());
        chatHistory.push({ role: "user", content: text });

        promptInput.value = '';
        promptInput.style.height = 'auto';
        sendBtn.classList.remove('ready');

        showLoadingState();

        try {
            const responseText = await fetchFromAPI(chatHistory);
            removeLoadingState();

            const htmlContent = window.marked && typeof marked.parse === 'function'
                ? marked.parse(responseText)
                : `<p>${escapeHtml(responseText).replace(/\n/g, '<br>')}</p>`;

            addBotMessage(htmlContent);
            chatHistory.push({ role: "assistant", content: responseText });

            saveChatState(text);
        } catch (error) {
            removeLoadingState();
            chatHistory.pop();
            addBotMessage(`<p style="color: #ff6b6b">Error: ${error.message}</p>`);
        }
    }

    async function fetchFromAPI(messages) {
        const modelId = localStorage.getItem('groqModel') || "llama-3.3-70b-versatile";
        const url = "https://api.groq.com/openai/v1/chat/completions";
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // --- Message Rendering ---
    function addUserMessage(text) {
        const msgHtml = `
            <div class="message-row user-row">
                <div class="message-bubble">
                    ${escapeHtml(text).replace(/\n/g, '<br>')}
                </div>
            </div>`;
        chatThread.insertAdjacentHTML('beforeend', msgHtml);
        scrollToBottom();
    }

    function addBotMessage(html) {
        const msgHtml = `
            <div class="message-row bot-row">
                <div class="bot-avatar sparkle-icon"></div>
                <div class="markdown-body"></div>
            </div>`;
        chatThread.insertAdjacentHTML('beforeend', msgHtml);

        const lastMessage = chatThread.lastElementChild.querySelector('.markdown-body');
        lastMessage.innerHTML = html;

        // Apply custom syntax highlight window wrapper
        lastMessage.querySelectorAll('pre code').forEach((block) => {
            if (window.hljs) hljs.highlightElement(block);

            const pre = block.parentElement;
            const wrapper = document.createElement('div');
            wrapper.className = 'code-window';

            const header = document.createElement('div');
            header.className = 'code-header';

            const langClass = Array.from(block.classList).find(c => c.startsWith('language-'));
            const langName = langClass ? langClass.replace('language-', '') : 'plaintext';

            header.innerHTML = `
                <span class="language">${langName}</span>
                <button class="copy-btn" onclick="copyCode(this)">
                    <span class="material-symbols-outlined">content_copy</span> Copy code
                </button>
            `;

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(header);
            wrapper.appendChild(pre);
        });

        scrollToBottom();
    }

    window.copyCode = function (btn) {
        const code = btn.closest('.code-window').querySelector('code').innerText;
        navigator.clipboard.writeText(code).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined">check</span> Copied!';
            setTimeout(() => btn.innerHTML = originalHTML, 2000);
        });
    };

    function showLoadingState() {
        const clone = loadingTemplate.content.cloneNode(true);
        chatThread.appendChild(clone);
        scrollToBottom();
    }

    function removeLoadingState() {
        const loader = chatThread.querySelector('.loading-row');
        if (loader) loader.remove();
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            scrollableContent.scrollTop = scrollableContent.scrollHeight;
        });
    }

    function escapeHtml(unsafe) {
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // --- Sidebar Chat Logic ---
    function saveChatState(initialText) {
        if (!currentChatId) {
            currentChatId = Date.now().toString();
            const title = initialText.length > 30 ? initialText.substring(0, 27) + '...' : initialText;
            allStoredChats.unshift({ id: currentChatId, title, messages: [...chatHistory] });
        } else {
            const idx = allStoredChats.findIndex(c => c.id === currentChatId);
            if (idx !== -1) allStoredChats[idx].messages = [...chatHistory];
        }
        localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));
        renderSidebarChats();
    }

    function renderSidebarChats() {
        recentChatsList.innerHTML = '';
        allStoredChats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'recent-item';
            if (chat.id === currentChatId) div.classList.add('active');

            div.innerHTML = `
                <span class="material-symbols-outlined chat-icon">chat_bubble</span>
                <span class="item-text" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
                <div class="chat-options">
                    <button class="options-btn" title="Options">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>
                    <div class="options-menu">
                        <button class="menu-item rename-btn">
                            <span class="material-symbols-outlined">edit</span> Rename
                        </button>
                        <button class="menu-item delete-btn" style="color: #ff6b6b;">
                            <span class="material-symbols-outlined">delete</span> Delete
                        </button>
                    </div>
                </div>
            `;

            // Main click opens chat
            div.addEventListener('click', (e) => {
                // Ignore clicks on options menu
                if (e.target.closest('.chat-options')) return;

                loadChatHistory(chat.id);
                closeSidebarMobile();
            });

            // Options menu logic
            const optionsBtn = div.querySelector('.options-btn');
            const optionsMenu = div.querySelector('.options-menu');
            const renameBtn = div.querySelector('.rename-btn');
            const deleteBtn = div.querySelector('.delete-btn');

            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other open menus
                document.querySelectorAll('.options-menu.show').forEach(menu => {
                    if (menu !== optionsMenu) menu.classList.remove('show');
                });
                optionsMenu.classList.toggle('show');
            });

            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.classList.remove('show');
                const newTitle = prompt('Enter new chat name:', chat.title);
                if (newTitle && newTitle.trim() !== '') {
                    chat.title = newTitle.trim().substring(0, 40); // limit length
                    localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));
                    renderSidebarChats();
                }
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.classList.remove('show');
                if (confirm('Are you sure you want to delete this chat?')) {
                    allStoredChats = allStoredChats.filter(c => c.id !== chat.id);
                    localStorage.setItem('quantumChats', JSON.stringify(allStoredChats));

                    if (currentChatId === chat.id) {
                        startNewChat();
                    } else {
                        renderSidebarChats();
                    }
                }
            });

            recentChatsList.appendChild(div);
        });
    }

    // Close menus when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.options-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    });

    function loadChatHistory(id) {
        const chat = allStoredChats.find(c => c.id === id);
        if (!chat) return;

        currentChatId = id;
        chatHistory = [...chat.messages];
        renderSidebarChats();

        welcomeScreen.style.display = 'none';
        chatThread.style.display = 'flex';
        chatThread.innerHTML = '';

        chatHistory.forEach(msg => {
            if (msg.role === 'user') addUserMessage(msg.content);
            else if (msg.role === 'assistant') {
                const h = window.marked ? marked.parse(msg.content) : `<p>${escapeHtml(msg.content)}</p>`;
                addBotMessage(h);
            }
        });
    }
});
