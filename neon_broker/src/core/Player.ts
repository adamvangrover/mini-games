export interface PortfolioItem {
    symbol: string;
    quantity: number;
    avgPrice: number;
}

export class Player {
    cash: number = 1000;
    debt: number = 25000;
    portfolio: PortfolioItem[] = [];

    constructor(startCash: number = 1000, startDebt: number = 25000) {
        this.cash = startCash;
        this.debt = startDebt;
    }

    // Buying: Opens Long or Covers Short
    buy(symbol: string, price: number, quantity: number): boolean {
        const cost = price * quantity;

        // Margin Trading: Allow cash to go down to -5000 (Credit Limit)
        const creditLimit = 5000;

        if (this.cash + creditLimit >= cost) {
            this.cash -= cost;

            let item = this.portfolio.find(p => p.symbol === symbol);
            if (!item) {
                item = { symbol, quantity: 0, avgPrice: 0 };
                this.portfolio.push(item);
            }

            if (item.quantity >= 0) {
                // Adding to Long position
                const totalVal = item.avgPrice * item.quantity + cost;
                item.quantity += quantity;
                item.avgPrice = totalVal / item.quantity;
            } else {
                // Covering Short position
                // When covering, we don't change avgPrice of the remaining short,
                // but effectively we are "realizing" the loss/gain on the portion covered.
                // Simplified: just reduce magnitude of negative quantity
                item.quantity += quantity;
                if (item.quantity === 0) {
                    this.portfolio = this.portfolio.filter(p => p.symbol !== symbol);
                }
            }
            return true;
        }
        return false;
    }

    // Selling: Closes Long or Opens Short
    sell(symbol: string, price: number, quantity: number): boolean {
        let item = this.portfolio.find(p => p.symbol === symbol);

        // Limit Short Selling Position to prevent infinite risk
        const currentQty = item ? item.quantity : 0;
        if (currentQty - quantity < -100) return false; // Max short 100 shares

        const revenue = price * quantity;
        this.cash += revenue;

        if (!item) {
            item = { symbol, quantity: 0, avgPrice: price }; // Initial short price
            this.portfolio.push(item);
        }

        if (item.quantity > 0) {
            // Selling Long
            item.quantity -= quantity;
        } else {
            // Shorting
            // When shorting more, avgPrice is the weighted average of entry prices
            const shortQty = Math.abs(item.quantity);
            const totalShortVal = item.avgPrice * shortQty + revenue;
            item.quantity -= quantity;
            item.avgPrice = totalShortVal / Math.abs(item.quantity);
        }

        if (item.quantity === 0) {
             this.portfolio = this.portfolio.filter(p => p.symbol !== symbol);
        }

        return true;
    }

    payDebt(amount: number): boolean {
        if (this.cash >= amount) {
            this.cash -= amount;
            this.debt -= amount;
            if (this.debt < 0) this.debt = 0;
            return true;
        }
        return false;
    }

    getNetWorth(currentPrices: Record<string, number>): number {
        let equity = 0;
        this.portfolio.forEach(p => {
             const price = currentPrices[p.symbol] || 0;
             equity += p.quantity * price;
        });
        return this.cash + equity - this.debt;
    }
}
