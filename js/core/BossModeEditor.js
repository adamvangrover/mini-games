
// Helper to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export class CodeEditorApp {
    constructor(container) {
        this.container = container;
        this.files = [
            { name: 'script.js', language: 'javascript', content: 'console.log("Hello Neon City!");\n\nconst user = {\n  name: "Neo",\n  role: "The One"\n};\n\nfunction wakeUp() {\n  return "Follow the white rabbit.";\n}\n\nwakeUp();' },
            { name: 'matrix.css', language: 'css', content: 'body {\n  background-color: black;\n  color: #00ff00;\n  font-family: "Courier New", monospace;\n}' },
            { name: 'index.html', language: 'html', content: '<html>\n  <body>\n    <div id="root">Loading...</div>\n  </body>\n</html>' },
            { name: 'README.md', language: 'markdown', content: '# Neon Editor v1.0\n\nWelcome to the future of coding.\n\n- Syntax Highlighting (Simulated)\n- Cloud Execution (Mocked)\n- Vibe Coding (Enabled)' }
        ];
        this.activeFile = this.files[0];
        this.consoleOutput = [
            { type: 'system', text: 'Neon Editor v1.0.2 initialized...' },
            { type: 'system', text: 'Connected to dev server: localhost:3000' }
        ];
        this.worker = null;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm overflow-hidden select-none">
                <!-- Toolbar -->
                <div class="h-8 bg-[#333333] flex items-center px-2 select-none border-b border-[#252526]">
                    <div class="flex gap-2 mr-4 window-controls">
                        <!-- Window controls placeholder -->
                    </div>
                    <div class="flex gap-4 text-xs">
                        <span class="cursor-pointer hover:text-white">File</span>
                        <span class="cursor-pointer hover:text-white">Edit</span>
                        <span class="cursor-pointer hover:text-white">Selection</span>
                        <span class="cursor-pointer hover:text-white">View</span>
                        <span class="cursor-pointer hover:text-white">Go</span>
                        <span class="cursor-pointer hover:text-white">Run</span>
                    </div>
                    <div class="flex-1"></div>
                    <div class="text-xs text-gray-400">${this.activeFile.name} - Neon Editor</div>
                </div>

                <div class="flex-1 flex overflow-hidden">
                    <!-- Sidebar -->
                    <div class="w-48 bg-[#252526] flex flex-col border-r border-[#333333]">
                        <div class="h-8 flex items-center px-4 font-bold text-xs uppercase tracking-wider text-gray-400">Explorer</div>
                        <div class="flex-1 overflow-y-auto py-2">
                            <div class="px-2 mb-1">
                                <div class="flex items-center gap-1 font-bold text-xs text-gray-300 mb-1"><i class="fas fa-chevron-down text-[10px]"></i> PROJECT-NEON</div>
                                ${this.files.map(file => `
                                    <div class="pl-4 py-1 flex items-center gap-2 cursor-pointer hover:bg-[#37373d] ${this.activeFile === file ? 'bg-[#37373d] text-white' : 'text-gray-400'}"
                                         onclick="window.BossModeEditor.openFile('${file.name}')">
                                        <i class="${this.getFileIcon(file.name)} text-xs w-4 text-center"></i>
                                        <span class="truncate">${file.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Editor Area -->
                    <div class="flex-1 flex flex-col bg-[#1e1e1e] relative">
                        <!-- Tabs -->
                        <div class="flex bg-[#252526] overflow-x-auto custom-scroll h-9 items-end px-2 gap-1 border-b border-[#252526]">
                             ${this.files.map(file => `
                                <div class="px-3 py-2 text-xs flex items-center gap-2 cursor-pointer border-t-2 ${this.activeFile === file ? 'bg-[#1e1e1e] text-white border-blue-500' : 'bg-[#2d2d2d] text-gray-500 border-transparent hover:bg-[#2d2d2d]'} rounded-t-sm min-w-[100px]"
                                     onclick="window.BossModeEditor.openFile('${file.name}')">
                                    <i class="${this.getFileIcon(file.name)} text-[10px]"></i>
                                    <span class="truncate flex-1">${file.name}</span>
                                    <i class="fas fa-times hover:bg-gray-600 rounded-full p-0.5 text-[10px]"></i>
                                </div>
                             `).join('')}
                        </div>

                        <!-- Code Area -->
                        <div class="flex-1 relative overflow-auto custom-scroll font-mono text-sm leading-6" id="editor-scroller">
                            <div class="absolute top-0 left-0 w-10 bg-[#1e1e1e] text-[#858585] text-right pr-2 border-r border-[#333333] select-none pt-2 h-full min-h-full">
                                ${this.getLineNumbers(this.activeFile.content)}
                            </div>
                            <div class="pl-12 pr-4 pt-2 pb-10 min-w-full min-h-full outline-none whitespace-pre font-mono caret-white text-[#d4d4d4]"
                                 contenteditable="true"
                                 spellcheck="false"
                                 id="code-input"
                                 oninput="window.BossModeEditor.handleInput(this)">${this.highlightSyntax(this.activeFile.content, this.activeFile.language)}</div>
                        </div>

                        <!-- Run Button (Floating) -->
                        <button class="absolute top-4 right-6 bg-green-600 hover:bg-green-500 text-white p-2 rounded-full shadow-lg z-10 w-10 h-10 flex items-center justify-center transition-transform hover:scale-110"
                                onclick="window.BossModeEditor.runCode()" title="Run Code (F5)">
                            <i class="fas fa-play text-xs pl-0.5"></i>
                        </button>
                    </div>
                </div>

                <!-- Terminal / Console -->
                <div class="h-32 bg-[#1e1e1e] border-t border-[#333333] flex flex-col">
                    <div class="flex text-xs px-4 border-b border-[#333333]">
                        <div class="px-2 py-1 text-white border-b border-white cursor-pointer">TERMINAL</div>
                        <div class="px-2 py-1 text-gray-500 hover:text-gray-300 cursor-pointer">OUTPUT</div>
                        <div class="px-2 py-1 text-gray-500 hover:text-gray-300 cursor-pointer">PROBLEMS</div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 font-mono text-xs custom-scroll" id="editor-console">
                        ${this.getConsoleHTML()}
                    </div>
                </div>

                <!-- Status Bar -->
                <div class="h-6 bg-[#007acc] text-white flex items-center px-2 text-xs justify-between select-none">
                    <div class="flex gap-3">
                        <span><i class="fas fa-code-branch"></i> main</span>
                        <span><i class="fas fa-sync-alt"></i> 0</span>
                        <span><i class="fas fa-times-circle"></i> 0</span>
                        <span><i class="fas fa-exclamation-triangle"></i> 0</span>
                    </div>
                    <div class="flex gap-3">
                        <span>Ln 10, Col 42</span>
                        <span>UTF-8</span>
                        <span>${this.activeFile.language.toUpperCase()}</span>
                        <span>Prettier</span>
                        <span><i class="fas fa-bell"></i></span>
                    </div>
                </div>
            </div>
        `;

        // Bind global handler for inline events (simpler for this architecture)
        window.BossModeEditor = this;

        // Restore cursor/scroll if needed (omitted for brevity)
    }

    openFile(name) {
        const file = this.files.find(f => f.name === name);
        if (file) {
            this.activeFile = file;
            this.render();
        }
    }

    handleInput(el) {
        // Simple update, losing selection position is expected in this simple mock
        // For a real editor, we'd use Monaco or CodeMirror.
        // Here we just update the model.
        // Note: contenteditable innerText vs innerHTML is tricky.
        // We won't re-render on every keystroke to avoid cursor jumping,
        // but we save the content.
        this.activeFile.content = el.innerText;
    }

    runCode() {
        this.log('system', `Running ${this.activeFile.name}...`);

        if (this.activeFile.language === 'javascript') {
            // SECURITY FIX: Use Web Worker to isolate code execution
            // This prevents access to DOM, localStorage, cookies, etc.
            if (this.worker) {
                this.worker.terminate();
            }

            const workerScript = `
                self.onmessage = function(e) {
                    const code = e.data;
                    const console = {
                        log: (...args) => self.postMessage({type: 'log', level: 'info', text: args.join(' ')}),
                        error: (...args) => self.postMessage({type: 'log', level: 'error', text: args.join(' ')}),
                        warn: (...args) => self.postMessage({type: 'log', level: 'warn', text: args.join(' ')})
                    };

                    try {
                        // Safe(r) evaluation in isolated worker scope
                        // Cannot access main thread window/document
                        new Function('console', code)(console);
                        self.postMessage({type: 'done'});
                    } catch (err) {
                        self.postMessage({type: 'log', level: 'error', text: err.toString()});
                    }
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            this.worker = new Worker(workerUrl);

            // Clean up blob URL immediately
            URL.revokeObjectURL(workerUrl);

            this.worker.onmessage = (e) => {
                const data = e.data;
                if (data.type === 'log') {
                    this.log(data.level === 'info' ? 'system' : (data.level === 'error' ? 'error' : 'warn'), data.text);
                } else if (data.type === 'done') {
                    // Execution finished synchronously (async tasks might still be running)
                }
            };

            this.worker.onerror = (e) => {
                this.log('error', `Worker Error: ${e.message}`);
                e.preventDefault();
            };

            // Send code to worker
            this.worker.postMessage(this.activeFile.content);

            // Timeout to prevent infinite loops freezing the worker (though main thread is safe)
            setTimeout(() => {
                if (this.worker) {
                    // Check if we should terminate?
                    // For now, we leave it running in case of async code (setTimeout etc)
                    // But we could add a "Stop" button.
                }
            }, 5000);

        } else {
            this.log('warn', `Cannot execute ${this.activeFile.language} files directly.`);
        }
    }

    runCommand(input) {
        const cmd = input.value;
        this.log('user', cmd);

        if (cmd === 'clear') {
            this.consoleOutput = [];
            this.updateConsole();
        } else if (cmd === 'npm install') {
            this.log('system', 'npm WARN deprecated request@2.88.2: request has been deprecated...');
            setTimeout(() => this.log('system', 'added 1 package in 2.3s'), 500);
        } else if (cmd === 'git status') {
            this.log('info', 'On branch main\nYour branch is up to date with "origin/main".\nnothing to commit, working tree clean');
        } else {
            this.log('error', `Command not found: ${cmd}`);
        }

        // Focus back
        setTimeout(() => {
            const inputs = this.container.querySelectorAll('input');
            if(inputs.length) inputs[inputs.length-1].focus();
        }, 50);
    }

    log(type, text) {
        this.consoleOutput.push({ type, text });
        if (this.consoleOutput.length > 50) this.consoleOutput.shift();
        this.updateConsole();
    }

    getConsoleHTML() {
        return this.consoleOutput.map(log => `
            <div class="mb-1">
                <span class="${log.type==='error'?'text-red-400':(log.type==='warn'?'text-yellow-400':'text-gray-300')}">${log.type==='system'?'':'> '}${escapeHTML(log.text)}</span>
            </div>
        `).join('') + `
        <div class="flex gap-1 text-gray-300">
            <span>$</span>
            <input class="bg-transparent border-none outline-none flex-1" onkeydown="if(event.key==='Enter') window.BossModeEditor.runCommand(this)">
        </div>`;
    }

    updateConsole() {
        const consoleEl = this.container.querySelector('#editor-console');
        if (consoleEl) {
             consoleEl.innerHTML = this.getConsoleHTML();
             consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    getLineNumbers(content) {
        const lines = content.split('\n').length;
        return Array.from({length: lines}, (_, i) => `<div>${i + 1}</div>`).join('');
    }

    getFileIcon(name) {
        if (name.endsWith('.js')) return 'fab fa-js text-yellow-400';
        if (name.endsWith('.css')) return 'fab fa-css3-alt text-blue-400';
        if (name.endsWith('.html')) return 'fab fa-html5 text-orange-500';
        if (name.endsWith('.md')) return 'fas fa-info-circle text-gray-400';
        return 'fas fa-file text-gray-400';
    }

    highlightSyntax(code, lang) {
        // Simple regex-based highlighter
        // Note: This is purely visual and fragile.
        let html = escapeHTML(code);

        if (lang === 'javascript' || lang === 'js') {
            html = html
                .replace(/\b(const|let|var|function|return|if|else|for|while|class|extends|new|this|import|export|default)\b/g, '<span class="text-[#569cd6]">$1</span>')
                .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-[#569cd6]">$1</span>')
                .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-[#ce9178]">$1</span>')
                .replace(/\b(\d+)\b/g, '<span class="text-[#b5cea8]">$1</span>')
                .replace(/(\/\/.*)/g, '<span class="text-[#6a9955]">$1</span>')
                .replace(/\b(console|window|document)\b/g, '<span class="text-[#4ec9b0]">$1</span>');
        } else if (lang === 'css') {
            html = html
                .replace(/([a-z-]+)(?=:)/g, '<span class="text-[#9cdcfe]">$1</span>')
                .replace(/(:)([^;]+)(;)/g, '$1<span class="text-[#ce9178]">$2</span>$3')
                .replace(/(\.|#)([\w-]+)/g, '<span class="text-[#d7ba7d]">$1$2</span>');
        }

        return html;
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        delete window.BossModeEditor;
    }
}
