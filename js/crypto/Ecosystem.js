import { PaymentRails } from './PaymentRails.js';
import { Web3Adapter } from './Web3Adapter.js';

export class CryptoEcosystem {
    constructor() {
        this.paymentRails = new PaymentRails();
        this.web3Adapter = new Web3Adapter();
        this.nfts = new Map(); // Store minted NFTs
        this.memeCoins = new Map(); // Store generated meme coins
    }

    async init() {
        await this.paymentRails.init();
        console.log('Crypto Ecosystem Initialized.');
    }

    async connectWeb3() {
        return await this.web3Adapter.connectWallet();
    }

    async convertHashToNFT(gameHash, metadata) {
        console.log(`Minting NFT from game hash: ${gameHash}`);

        if (this.web3Adapter.isConnected) {
            const onChainResult = await this.web3Adapter.mintNFTOnChain(gameHash, metadata);
            console.log(`NFT Minted ON-CHAIN: Tx ${onChainResult.txHash}`);
            const nftId = `NFT-${Date.now()}`;
            const nft = {
                id: nftId,
                sourceHash: gameHash,
                metadata: metadata,
                mintDate: new Date().toISOString(),
                onChain: true,
                txHash: onChainResult.txHash
            };
            this.nfts.set(nftId, nft);
            return nft;
        }

        // Simulate minting process fallback
        await new Promise(resolve => setTimeout(resolve, 1000));

        const nftId = `NFT-${Date.now()}`;
        const nft = {
            id: nftId,
            sourceHash: gameHash,
            metadata: metadata,
            mintDate: new Date().toISOString()
        };

        this.nfts.set(nftId, nft);
        console.log(`NFT Minted successfully (Simulated): ${nftId}`);
        return nft;
    }

    async createMemeCoin(name, symbol, initialSupply) {
         console.log(`Deploying new Meme Coin: ${name} (${symbol})`);

         if (this.web3Adapter.isConnected) {
             const onChainResult = await this.web3Adapter.deployTokenOnChain(name, symbol, initialSupply);
             const coin = {
                 name,
                 symbol,
                 supply: initialSupply,
                 contractAddress: onChainResult.contractAddress,
                 onChain: true
             };
             this.memeCoins.set(symbol, coin);
             console.log(`Meme Coin ${symbol} deployed ON-CHAIN at ${onChainResult.contractAddress}`);
             return coin;
         }

         // Simulate deployment fallback
         await new Promise(resolve => setTimeout(resolve, 1200));

         const contractAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

         const coin = {
             name,
             symbol,
             supply: initialSupply,
             contractAddress
         };

         this.memeCoins.set(symbol, coin);
         console.log(`Meme Coin ${symbol} deployed (Simulated) at ${contractAddress}`);
         return coin;
    }

    async tradeAsset(assetType, assetId, targetCurrency, amount, provider) {
        console.log(`Initiating trade: Sell ${amount} of ${assetId} for ${targetCurrency}`);

        if (this.web3Adapter.isConnected) {
             const onChainResult = await this.web3Adapter.executeTradeOnChain(assetId, targetCurrency, amount, provider);
             console.log(`Trade executed ON-CHAIN via ${provider}. Tx: ${onChainResult.txHash}`);
             return { success: true, txHash: onChainResult.txHash, onChain: true };
        }

        // Use payment rails to execute the financial side of the trade (Simulated fallback)
        const txResult = await this.paymentRails.processTransaction(amount, targetCurrency, provider);

        if (txResult.success) {
            console.log(`Trade executed successfully (Simulated) via ${provider}`);
            return txResult;
        } else {
            throw new Error("Trade execution failed");
        }
    }
}
