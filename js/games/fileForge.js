
export default class FileForgeGame {
    constructor() {
        this.container = null;
        this.generatedData = null; // Blob or string
        this.generatedFilename = "";
        this.isGenerating = false;
        this.librariesLoaded = false;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col items-center justify-center bg-slate-900 text-white p-4 overflow-y-auto custom-scrollbar relative';

        // Add Back Button
        const backBtn = document.createElement('button');
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        backBtn.className = "absolute top-4 left-4 px-6 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 backdrop-blur-sm";
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(backBtn);

        // Header
        const header = document.createElement('h1');
        header.className = "text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 mb-2 mt-12 title-glow font-[Poppins]";
        header.textContent = "FILE FORGE";
        this.container.appendChild(header);

        const subHeader = document.createElement('p');
        subHeader.className = "text-slate-400 mb-8 font-mono text-sm";
        subHeader.textContent = "AI-Assisted File Generator & Converter";
        this.container.appendChild(subHeader);

        // Loading Indicator for Libraries
        this.statusMsg = document.createElement('div');
        this.statusMsg.className = "text-yellow-400 text-sm mb-4 animate-pulse";
        this.statusMsg.textContent = "Initializing Neural Networks...";
        this.container.appendChild(this.statusMsg);

        // Main UI (Hidden until loaded)
        this.ui = document.createElement('div');
        this.ui.className = "w-full max-w-4xl bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hidden flex-col gap-4";

        // Input Area
        const inputGroup = document.createElement('div');
        inputGroup.className = "flex flex-col gap-2";
        inputGroup.innerHTML = `
            <label class="text-sm font-bold text-fuchsia-400">Prompt / Content</label>
            <textarea id="ff-input" class="w-full h-40 bg-slate-900 border border-slate-600 rounded p-3 text-sm font-mono text-white focus:border-fuchsia-500 focus:outline-none transition-colors" placeholder="Type your content directly, or describe what you want (e.g. 'List of 5 planets')..."></textarea>
        `;
        this.ui.appendChild(inputGroup);

        // Controls
        const controls = document.createElement('div');
        controls.className = "flex flex-wrap gap-4 items-end";

        controls.innerHTML = `
            <div class="flex flex-col gap-2 flex-1 min-w-[200px]">
                <label class="text-sm font-bold text-cyan-400">Target Format</label>
                <select id="ff-format" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-cyan-500 focus:outline-none">
                    <option value="txt">Text (.txt)</option>
                    <option value="md">Markdown (.md)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="jsonl">JSON Lines (.jsonl)</option>
                    <option value="yml">YAML (.yml)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="ipynb">Jupyter Notebook (.ipynb)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="pptx">PowerPoint (.pptx)</option>
                </select>
            </div>
            <button id="ff-generate-btn" class="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold rounded shadow-lg transition-all transform hover:scale-105 h-10">
                <i class="fas fa-magic mr-2"></i> GENERATE
            </button>
            <button id="ff-download-btn" class="px-6 py-2 bg-slate-700 text-slate-400 font-bold rounded cursor-not-allowed h-10" disabled>
                <i class="fas fa-download mr-2"></i> DOWNLOAD
            </button>
        `;
        this.ui.appendChild(controls);

        // Preview Area
        const previewGroup = document.createElement('div');
        previewGroup.className = "flex flex-col gap-2 mt-4";
        previewGroup.innerHTML = `
            <label class="text-sm font-bold text-green-400">Preview / Status</label>
            <div id="ff-preview" class="w-full h-40 bg-black/50 border border-slate-700 rounded p-3 text-xs font-mono text-slate-300 overflow-auto whitespace-pre-wrap">Waiting for input...</div>
        `;
        this.ui.appendChild(previewGroup);

        this.container.appendChild(this.ui);

        // Load Libraries
        try {
            await Promise.all([
                this.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'),
                this.loadScript('https://cdn.jsdelivr.net/npm/docx@7.1.0/build/index.js'),
                this.loadScript('https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'),
                this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js')
            ]);
            this.librariesLoaded = true;
            this.statusMsg.textContent = "";
            this.statusMsg.className = "hidden";
            this.ui.classList.remove('hidden');
            this.ui.classList.add('flex');
            this.bindEvents();
        } catch (e) {
            this.statusMsg.textContent = "Error loading libraries. Check connection.";
            this.statusMsg.className = "text-red-500 font-bold";
            console.error("FileForge Lib Error:", e);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    bindEvents() {
        document.getElementById('ff-generate-btn').onclick = () => this.handleGenerate();
        document.getElementById('ff-download-btn').onclick = () => this.handleDownload();
    }

    async handleGenerate() {
        if (!this.librariesLoaded) return;
        const input = document.getElementById('ff-input').value.trim();
        const format = document.getElementById('ff-format').value;
        const preview = document.getElementById('ff-preview');
        const dlBtn = document.getElementById('ff-download-btn');

        if (!input) {
            preview.textContent = "Please enter some text.";
            return;
        }

        preview.textContent = "Processing...";
        this.isGenerating = true;

        // Wait a tick to show "Processing"
        await new Promise(r => setTimeout(r, 10));

        try {
            const result = await this.generateFile(input, format);
            this.generatedData = result.data;
            this.generatedFilename = `generated_file.${format}`;

            if (result.preview) {
                preview.textContent = result.preview;
            } else {
                preview.textContent = `Binary file (${format}) generated successfully. Ready to download.`;
            }

            dlBtn.disabled = false;
            dlBtn.className = "px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg transition-all transform hover:scale-105 h-10";
        } catch (err) {
            console.error(err);
            preview.textContent = "Error: " + err.message;
            dlBtn.disabled = true;
            dlBtn.className = "px-6 py-2 bg-slate-700 text-slate-400 font-bold rounded cursor-not-allowed h-10";
        }
        this.isGenerating = false;
    }

    handleDownload() {
        if (!this.generatedData) return;

        // Setup download
        const url = URL.createObjectURL(this.generatedData);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.generatedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Core Logic ---

    // Security: Helper for XSS Prevention
    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
    }

    async generateFile(input, format) {
        let content = input;
        let previewText = "";
        let blob = null;

        // Intent Recognition (Simple Heuristic)
        const lines = input.split('\n').map(l => l.trim()).filter(l => l);
        let parsedData = null;

        // Detect List
        if (input.toLowerCase().startsWith('list of')) {
            if (input.includes(':')) {
                 const content = input.substring(input.indexOf(':') + 1);
                 parsedData = content.split(',').map(s => s.trim()).filter(s => s);
            } else if (lines.length > 1) {
                 parsedData = lines.slice(1).map(l => l.replace(/^[-*•]|\d+\.\s*/, '').trim());
            }
        } else if (lines.length > 1 && lines.every(l => l.startsWith('-') || l.match(/^\d+\./))) {
            // Treat as bullet list
            parsedData = lines.map(l => l.replace(/^[-*•]|\d+\.\s*/, '').trim());
        }
        // Detect Table (CSV-like)
        else if (lines.length > 1 && lines[0].includes(',')) {
            parsedData = lines.map(l => {
                 // specific handling for csv rows? simple split for now
                 return l.split(',').map(c => c.trim());
            });
        }
        // Key-Value (Colon separated)
        else if (lines.length > 1 && lines.every(l => l.includes(':'))) {
             parsedData = {};
             lines.forEach(l => {
                 const [k, ...v] = l.split(':');
                 if(k) parsedData[k.trim()] = v.join(':').trim();
             });
        }

        switch (format) {
            case 'txt':
                blob = new Blob([input], { type: 'text/plain' });
                previewText = input;
                break;
            case 'md':
                // Auto-format title if missing
                if (!input.startsWith('#')) content = `# Generated Document\n\n${input}`;
                blob = new Blob([content], { type: 'text/markdown' });
                previewText = content;
                break;
            case 'json':
                // If parsed data exists, use it, else wrap input
                const jsonObj = parsedData || { content: input };
                const jsonStr = JSON.stringify(jsonObj, null, 2);
                blob = new Blob([jsonStr], { type: 'application/json' });
                previewText = jsonStr;
                break;
            case 'jsonl':
                // Assume list of items or split lines
                const list = Array.isArray(parsedData) ? parsedData : lines;
                const jsonlStr = list.map(item => JSON.stringify(typeof item === 'object' ? item : { text: item })).join('\n');
                blob = new Blob([jsonlStr], { type: 'application/x-jsonlines' });
                previewText = jsonlStr;
                break;
            case 'yml':
                const ymlObj = parsedData || { content: input };
                if (window.jsyaml) {
                    const ymlStr = window.jsyaml.dump(ymlObj);
                    blob = new Blob([ymlStr], { type: 'text/yaml' });
                    previewText = ymlStr;
                } else {
                    throw new Error("YAML library not loaded.");
                }
                break;
            case 'csv':
                // If parsed table, join it. Else just text.
                let csvStr = input;
                if (Array.isArray(parsedData) && Array.isArray(parsedData[0])) {
                    csvStr = parsedData.map(row => row.join(',')).join('\n');
                } else if (Array.isArray(parsedData)) {
                    // List -> Single column
                    csvStr = "Item\n" + parsedData.join('\n');
                }
                blob = new Blob([csvStr], { type: 'text/csv' });
                previewText = csvStr;
                break;
            case 'html':
                const htmlStr = `<!DOCTYPE html>
<html>
<head><title>Generated File</title></head>
<body>
${lines.map(l => `<p>${this.escapeHTML(l)}</p>`).join('\n')}
</body>
</html>`;
                blob = new Blob([htmlStr], { type: 'text/html' });
                previewText = htmlStr;
                break;
            case 'ipynb':
                const notebook = {
                    "cells": [
                        {
                            "cell_type": "markdown",
                            "metadata": {},
                            "source": ["# Generated Notebook\n", "This content was generated by File Forge."]
                        },
                        {
                            "cell_type": "code",
                            "execution_count": null,
                            "metadata": {},
                            "outputs": [],
                            "source": lines.map(l => l + "\n")
                        }
                    ],
                    "metadata": {
                        "kernelspec": {
                            "display_name": "Python 3",
                            "language": "python",
                            "name": "python3"
                        }
                    },
                    "nbformat": 4,
                    "nbformat_minor": 4
                };
                const ipynbStr = JSON.stringify(notebook, null, 2);
                blob = new Blob([ipynbStr], { type: 'application/json' });
                previewText = ipynbStr;
                break;
            case 'xlsx':
                if (window.XLSX) {
                    const wb = window.XLSX.utils.book_new();
                    let ws;
                    if (Array.isArray(parsedData) && Array.isArray(parsedData[0])) {
                        ws = window.XLSX.utils.aoa_to_sheet(parsedData);
                    } else if (Array.isArray(parsedData)) {
                        ws = window.XLSX.utils.aoa_to_sheet(parsedData.map(x => [x]));
                    } else if (typeof parsedData === 'object' && parsedData !== null) {
                         // KV to 2 columns
                         const kvs = Object.entries(parsedData);
                         ws = window.XLSX.utils.aoa_to_sheet([["Key", "Value"], ...kvs]);
                    } else {
                        // Just text in one cell
                        ws = window.XLSX.utils.aoa_to_sheet([[input]]);
                    }
                    window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
                    const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    blob = new Blob([wbout], { type: 'application/octet-stream' });
                    previewText = "[Binary XLSX Data]";
                } else {
                    throw new Error("XLSX library not loaded.");
                }
                break;
            case 'docx':
                if (window.docx) {
                    const { Document, Packer, Paragraph, TextRun } = window.docx;

                    const children = lines.map(line => new Paragraph({
                        children: [new TextRun(line)]
                    }));

                    const doc = new Document({
                        sections: [{
                            properties: {},
                            children: children
                        }]
                    });

                    blob = await Packer.toBlob(doc);
                    previewText = "[Binary DOCX Data]";
                } else {
                    throw new Error("DOCX library not loaded.");
                }
                break;
            case 'pptx':
                if (window.PptxGenJS) {
                    const pres = new window.PptxGenJS();
                    const slide = pres.addSlide();

                    // Simple logic: Add text box
                    slide.addText("Generated Presentation", { x: 1, y: 0.5, fontSize: 24, bold: true, color: '363636' });

                    slide.addText(input, { x: 1, y: 1.5, w: '80%', h: '70%', fontSize: 14, color: '666666', wrap: true });

                    blob = await pres.write({ outputType: 'blob' });
                    previewText = "[Binary PPTX Data]";
                } else {
                    throw new Error("PPTX library not loaded.");
                }
                break;
            default:
                throw new Error("Unsupported format");
        }

        return { data: blob, preview: previewText };
    }

    update(dt) {}
    draw() {}
    async shutdown() {
        this.container.innerHTML = '';
        // Cleanup global libs? No, they stay in window, which is fine (cache).
    }
}
