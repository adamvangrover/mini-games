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

    buy(symbol: string, price: number, quantity: number): boolean {
        const cost = price * quantity;
        if (this.cash >= cost) {
            this.cash -= cost;
            const item = this.portfolio.find(p => p.symbol === symbol);
            if (item) {
                // Update average price
                const totalVal = item.avgPrice * item.quantity + cost;
                item.quantity += quantity;
                item.avgPrice = totalVal / item.quantity;
            } else {
                this.portfolio.push({ symbol, quantity, avgPrice: price });
            }
            return true;
        }
        return false;
    }

    sell(symbol: string, price: number, quantity: number): boolean {
        const item = this.portfolio.find(p => p.symbol === symbol);
        if (item && item.quantity >= quantity) {
            const revenue = price * quantity;
            this.cash += revenue;
            item.quantity -= quantity;
            if (item.quantity === 0) {
                this.portfolio = this.portfolio.filter(p => p.symbol !== symbol);
            }
            return true;
        }
        return false;
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
}
