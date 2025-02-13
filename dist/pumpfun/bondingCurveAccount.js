"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BondingCurveAccount = void 0;
const borsh_1 = require("@coral-xyz/borsh");
const sdk_1 = require("./sdk");
const web3_js_1 = require("@solana/web3.js");
class BondingCurveAccount {
    discriminator;
    virtualTokenReserves;
    virtualSolReserves;
    realTokenReserves;
    realSolReserves;
    tokenTotalSupply;
    complete;
    constructor(discriminator = 0n, virtualTokenReserves = BigInt(1073000000 * sdk_1.DEFAULT_POW), virtualSolReserves = BigInt(30 * web3_js_1.LAMPORTS_PER_SOL), realTokenReserves = BigInt(793100000 * sdk_1.DEFAULT_POW), realSolReserves = 0n, tokenTotalSupply = BigInt(1000000000 * sdk_1.DEFAULT_POW), complete = false) {
        this.discriminator = discriminator;
        this.virtualTokenReserves = virtualTokenReserves;
        this.virtualSolReserves = virtualSolReserves;
        this.realTokenReserves = realTokenReserves;
        this.realSolReserves = realSolReserves;
        this.tokenTotalSupply = tokenTotalSupply;
        this.complete = complete;
    }
    getBuyPrice(amount) {
        if (this.complete) {
            throw new Error("Curve is complete");
        }
        if (amount <= 0n) {
            return 0n;
        }
        // Calculate the product of virtual reserves
        let n = this.virtualSolReserves * this.virtualTokenReserves;
        // Calculate the new virtual sol reserves after the purchase
        let i = this.virtualSolReserves + amount;
        // Calculate the new virtual token reserves after the purchase
        let r = n / i + 1n;
        // Calculate the amount of tokens to be purchased
        let s = this.virtualTokenReserves - r;
        // Return the minimum of the calculated tokens and real token reserves
        return s < this.realTokenReserves ? s : this.realTokenReserves;
    }
    simulateBuy(solAmounts) {
        let simulateTokenBuyAmounts = [];
        for (let i = 0; i < solAmounts.length; i++) {
            let n = this.virtualSolReserves * this.virtualTokenReserves;
            // Calculate the new virtual sol reserves after the purchase
            let l = this.virtualSolReserves + solAmounts[i];
            // Calculate the new virtual token reserves after the purchase
            let r = n / l + 1n;
            // Calculate the amount of tokens to be purchased
            let s = this.virtualTokenReserves - r;
            // Return the minimum of the calculated tokens and real token reserves
            simulateTokenBuyAmounts[i] = s < this.realTokenReserves ? s : this.realTokenReserves;
            this.realSolReserves += solAmounts[i];
            this.virtualTokenReserves -= simulateTokenBuyAmounts[i];
            this.realTokenReserves -= simulateTokenBuyAmounts[i];
        }
        return simulateTokenBuyAmounts;
    }
    getSellPrice(amount, feeBasisPoints) {
        if (this.complete) {
            throw new Error("Curve is complete");
        }
        if (amount <= 0n) {
            return 0n;
        }
        // Calculate the proportional amount of virtual sol reserves to be received
        let n = (amount * this.virtualSolReserves) / (this.virtualTokenReserves + amount);
        // Calculate the fee amount in the same units
        let a = (n * feeBasisPoints) / 10000n;
        // Return the net amount after deducting the fee
        return n - a;
    }
    simulateSell(tokenAmounts, feeBasisPoints) {
        if (this.complete) {
            throw new Error("Curve is complete");
        }
        let simulateSolSellAmounts = [];
        for (let i = 0; i < tokenAmounts.length; i++) {
            // Expected sol amount including fee, pumpfun charge 1% fee of selling token
            let n = (tokenAmounts[i] * this.virtualSolReserves) / (this.virtualTokenReserves + tokenAmounts[i]);
            // Calculate the fee amount in the same units
            let a = (n * feeBasisPoints) / 10000n;
            // Return the net amount after deducting the fee
            simulateSolSellAmounts[i] = n - a;
            this.virtualTokenReserves += tokenAmounts[i];
            this.realTokenReserves += tokenAmounts[i];
            this.realSolReserves -= n; // simulateSolSellAmounts[i] + a // a is platform fee;
        }
        return simulateSolSellAmounts;
    }
    getMarketCapSOL() {
        if (this.virtualTokenReserves === 0n) {
            return 0n;
        }
        return ((this.tokenTotalSupply * this.virtualSolReserves) /
            this.virtualTokenReserves);
    }
    getFinalMarketCapSOL(feeBasisPoints) {
        let totalSellValue = this.getBuyOutPrice(this.realTokenReserves, feeBasisPoints);
        let totalVirtualValue = this.virtualSolReserves + totalSellValue;
        let totalVirtualTokens = this.virtualTokenReserves - this.realTokenReserves;
        if (totalVirtualTokens === 0n) {
            return 0n;
        }
        return (this.tokenTotalSupply * totalVirtualValue) / totalVirtualTokens;
    }
    getBuyOutPrice(amount, feeBasisPoints) {
        let solTokens = amount < this.realSolReserves ? this.realSolReserves : amount;
        let totalSellValue = (solTokens * this.virtualSolReserves) /
            (this.virtualTokenReserves - solTokens) +
            1n;
        let fee = (totalSellValue * feeBasisPoints) / 10000n;
        return totalSellValue + fee;
    }
    static fromBuffer(buffer) {
        const structure = (0, borsh_1.struct)([
            (0, borsh_1.u64)("discriminator"),
            (0, borsh_1.u64)("virtualTokenReserves"),
            (0, borsh_1.u64)("virtualSolReserves"),
            (0, borsh_1.u64)("realTokenReserves"),
            (0, borsh_1.u64)("realSolReserves"),
            (0, borsh_1.u64)("tokenTotalSupply"),
            (0, borsh_1.bool)("complete"),
        ]);
        let value = structure.decode(buffer);
        return new BondingCurveAccount(BigInt(value.discriminator), BigInt(value.virtualTokenReserves), BigInt(value.virtualSolReserves), BigInt(value.realTokenReserves), BigInt(value.realSolReserves), BigInt(value.tokenTotalSupply), value.complete);
    }
}
exports.BondingCurveAccount = BondingCurveAccount;
