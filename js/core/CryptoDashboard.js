import { CryptoEcosystem } from '../crypto/Ecosystem.js';
import SaveSystem from './SaveSystem.js';

export default class CryptoDashboard {
    constructor() {
        this.container = null;
        this.ecosystem = new CryptoEcosystem();
        this.saveSystem = SaveSystem.getInstance();
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-[100] p-4 text-white font-[Poppins]">
                <div class="glass-panel rounded-xl p-8 max-w-4xl w-full h-[80vh] flex flex-col relative overflow-hidden border border-fuchsia-500/30">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <h2 class="text-3xl font-bold title-glow text-fuchsia-400">
                            <i class="fas fa-wallet mr-2"></i> Crypto Wallet
                        </h2>
                        <div class="flex items-center gap-4">
                            <button id="btn-connect-web3" class="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 rounded-lg font-bold text-sm shadow-lg transition transform hover:scale-105 hidden sm:block">
                                Connect Web3
                            </button>
                            <div id="web3-status" class="text-slate-400 text-sm">Mainnet Connected (Simulated)</div>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <!-- Assets -->
                            <div class="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                                <h3 class="text-xl font-bold mb-4 text-cyan-400"><i class="fas fa-coins mr-2"></i> Balances</h3>
                                <div class="space-y-4" id="balances-container">
                                    <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                                        <span class="font-bold">NeonCoin (Meme)</span>
                                        <span class="text-yellow-400">1,000,000</span>
                                    </div>
                                    <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                                        <span class="font-bold">USDC</span>
                                        <span class="text-green-400">0.00</span>
                                    </div>
                                    <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                                        <span class="font-bold">BTC</span>
                                        <span class="text-orange-400">0.00000000</span>
                                    </div>
                                </div>
                            </div>

                            <!-- NFTs -->
                            <div class="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                                <h3 class="text-xl font-bold mb-4 text-purple-400"><i class="fas fa-images mr-2"></i> NFTs Minted</h3>
                                <div id="nft-list" class="space-y-4">
                                    <div class="text-slate-500 text-center py-4">No NFTs minted yet. Play games to generate hashes!</div>
                                </div>
                                <button id="btn-mint-nft" class="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-500 rounded font-bold transition">
                                    Simulate Mint NFT
                                </button>
                            </div>

                        </div>

                        <!-- Trading -->
                        <div class="mt-6 bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                            <h3 class="text-xl font-bold mb-4 text-green-400"><i class="fas fa-exchange-alt mr-2"></i> Trade on Rails</h3>

                            <div class="flex flex-wrap gap-4 items-center">
                                <select id="trade-provider" class="bg-slate-900 border border-slate-600 rounded p-2 text-white">
                                    <option value="Robinhood">Robinhood</option>
                                    <option value="Coinbase">Coinbase</option>
                                </select>

                                <span class="text-slate-400">Sell</span>
                                <input type="number" id="trade-amount" value="10000" class="bg-slate-900 border border-slate-600 rounded p-2 w-32 text-white" />
                                <span>NeonCoin for</span>

                                <select id="trade-currency" class="bg-slate-900 border border-slate-600 rounded p-2 text-white">
                                    <option value="USDC">USDC</option>
                                    <option value="BTC">BTC</option>
                                    <option value="DOGE">DOGE</option>
                                </select>

                                <button id="btn-execute-trade" class="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded font-bold transition ml-auto shadow-lg shadow-green-500/20">
                                    Execute Trade
                                </button>
                            </div>

                            <!-- Terminal output -->
                            <div class="mt-4 bg-black rounded p-4 font-mono text-xs text-green-500 h-32 overflow-y-auto" id="trade-terminal">
                                > System ready.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.classList.remove('hidden');
        await this.ecosystem.init();

        setTimeout(() => { this.updateBalances(); }, 100);
        this.bindEvents();
    }


    updateBalances() {
        // Read simulated values from localStorage
        const usdc = parseFloat(localStorage.getItem('ad_revenue_usdc') || '0').toFixed(2);

        let nncBase = 1000000;
        const pendingNNC = parseFloat(localStorage.getItem('pending_airdrop_nnc') || '0');
        const nncTotal = (nncBase + pendingNNC).toLocaleString();

        const balancesHTML = `
            <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                <span class="font-bold">NeonCoin (Meme)</span>
                <span class="text-yellow-400">${nncTotal}</span>
            </div>
            <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                <span class="font-bold">USDC</span>
                <span class="text-green-400">${usdc}</span>
            </div>
            <div class="flex justify-between items-center bg-slate-900/50 p-3 rounded">
                <span class="font-bold">BTC</span>
                <span class="text-orange-400">0.00000000</span>
            </div>
        `;

        const balancesContainer = this.container.querySelector('#balances-container');
        if (balancesContainer) {
            balancesContainer.innerHTML = balancesHTML;
        }
    }

    bindEvents() {
        const log = (msg) => {
            const term = this.container.querySelector('#trade-terminal');
            if (term) {
                term.innerHTML += `<br>> ${msg}`;
                term.scrollTop = term.scrollHeight;
            }
        };

        const connectWeb3Btn = this.container.querySelector('#btn-connect-web3');
        const web3Status = this.container.querySelector('#web3-status');

        if (connectWeb3Btn) {
            connectWeb3Btn.addEventListener('click', async () => {
                log('Initiating Web3 Wallet Connection...');
                const result = await this.ecosystem.connectWeb3();
                if (result.success) {
                    web3Status.innerHTML = `<span class="text-green-400"><i class="fas fa-link mr-1"></i> Connected: ${result.account.substring(0, 6)}...${result.account.substring(result.account.length - 4)}</span>`;
                    connectWeb3Btn.classList.add('hidden');
                    log(`Wallet Connected: ${result.account}`);
                } else {
                    log(`<span class="text-red-500">Connection Failed: ${result.error}</span>`);
                }
            });
        }

        const mintBtn = this.container.querySelector('#btn-mint-nft');
        mintBtn.addEventListener('click', async () => {
            mintBtn.disabled = true;
            mintBtn.textContent = 'Minting...';
            try {
                log('Initiating NFT mint from Game Hash...');
                const hash = 'hash_' + Math.random().toString(36).substr(2, 9);
                const nft = await this.ecosystem.convertHashToNFT(hash, { game: 'Unknown', score: 100 });
                log(`Success! NFT ID: ${nft.id}`);

                const list = this.container.querySelector('#nft-list');
                if (list.innerHTML.includes('No NFTs')) list.innerHTML = '';
                list.innerHTML += `
                    <div class="bg-slate-900/50 p-3 rounded text-sm break-all">
                        <span class="text-purple-400 font-bold">${nft.id}</span><br>
                        <span class="text-slate-500">${nft.sourceHash}</span>
                    </div>
                `;
            } catch (e) {
                log(`Error: ${e.message}`);
            }
            mintBtn.disabled = false;
            mintBtn.textContent = 'Simulate Mint NFT';
        });

        const tradeBtn = this.container.querySelector('#btn-execute-trade');
        tradeBtn.addEventListener('click', async () => {
            tradeBtn.disabled = true;
            tradeBtn.textContent = 'Processing...';
            try {
                const provider = this.container.querySelector('#trade-provider').value;
                const amount = this.container.querySelector('#trade-amount').value;
                const currency = this.container.querySelector('#trade-currency').value;

                log(`Connecting to ${provider} API...`);
                const result = await this.ecosystem.tradeAsset('MemeCoin', 'NeonCoin', currency, amount, provider);

                log(`Trade Executed via ${provider}!`);
                log(`Tx Hash: ${result.txHash}`);

            } catch (e) {
                log(`<span class="text-red-500">Error: ${e.message}</span>`);
            }
            tradeBtn.disabled = false;
            tradeBtn.textContent = 'Execute Trade';
        });
    }

    async shutdown() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.add('hidden');
        }
    }
}
