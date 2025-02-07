import { struct, bool, u64, Layout } from "@coral-xyz/borsh";
import { DEFAULT_POW } from "./sdk";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export class BondingCurveAccount {
  public discriminator: bigint;
  public virtualTokenReserves: bigint;
  public virtualSolReserves: bigint;
  public realTokenReserves: bigint;
  public realSolReserves: bigint;
  public tokenTotalSupply: bigint;
  public complete: boolean;

  constructor(
    discriminator: bigint = 0n,
    virtualTokenReserves: bigint = BigInt(1073000000 * DEFAULT_POW),
    virtualSolReserves: bigint = BigInt(30 * LAMPORTS_PER_SOL),
    realTokenReserves: bigint = BigInt(793100000 * DEFAULT_POW),
    realSolReserves: bigint = 0n,
    tokenTotalSupply: bigint = BigInt(1000000000 * DEFAULT_POW),
    complete: boolean = false
  ) {
    this.discriminator = discriminator;
    this.virtualTokenReserves = virtualTokenReserves;
    this.virtualSolReserves = virtualSolReserves;
    this.realTokenReserves = realTokenReserves;
    this.realSolReserves = realSolReserves;
    this.tokenTotalSupply = tokenTotalSupply;
    this.complete = complete;
  }

  getBuyPrice(amount: bigint): bigint {
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

  simulateBuy(solAmounts: bigint[]): bigint[] {
    let simulateTokenBuyAmounts: bigint[] = [];
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

      this.realSolReserves += solAmounts[1];
      this.virtualTokenReserves -= simulateTokenBuyAmounts[i];
      this.realTokenReserves -= simulateTokenBuyAmounts[i];
    }
    return simulateTokenBuyAmounts;
  }

  getSellPrice(amount: bigint, feeBasisPoints: bigint): bigint {
    if (this.complete) {
      throw new Error("Curve is complete");
    }

    if (amount <= 0n) {
      return 0n;
    }

    // Calculate the proportional amount of virtual sol reserves to be received
    let n =
      (amount * this.virtualSolReserves) / (this.virtualTokenReserves + amount);

    // Calculate the fee amount in the same units
    let a = (n * feeBasisPoints) / 10000n;

    // Return the net amount after deducting the fee
    return n - a;
  }

  simulateSell(tokenAmounts: bigint[], feeBasisPoints: bigint): bigint[] {
    if (this.complete) {
      throw new Error("Curve is complete");
    }

    let simulateSolSellAmounts: bigint[] = [];

    for (let i = 0; i < tokenAmounts.length; i++) {
      // Expected sol amount including fee, pumpfun charge 1% fee of selling token
      let n = (tokenAmounts[i] * this.virtualSolReserves) / (this.virtualTokenReserves + tokenAmounts[i]);

      // Calculate the fee amount in the same units
      let a = (n * feeBasisPoints) / 10000n;

      // Return the net amount after deducting the fee
      simulateSolSellAmounts[i] = n - a;
      this.virtualTokenReserves += tokenAmounts[i];
      this.realTokenReserves += tokenAmounts[i];
      this.realSolReserves -= n;
    }

    return simulateSolSellAmounts;
  }

  getMarketCapSOL(): bigint {
    if (this.virtualTokenReserves === 0n) {
      return 0n;
    }

    return (
      (this.tokenTotalSupply * this.virtualSolReserves) /
      this.virtualTokenReserves
    );
  }

  getFinalMarketCapSOL(feeBasisPoints: bigint): bigint {
    let totalSellValue = this.getBuyOutPrice(
      this.realTokenReserves,
      feeBasisPoints
    );
    let totalVirtualValue = this.virtualSolReserves + totalSellValue;
    let totalVirtualTokens = this.virtualTokenReserves - this.realTokenReserves;

    if (totalVirtualTokens === 0n) {
      return 0n;
    }

    return (this.tokenTotalSupply * totalVirtualValue) / totalVirtualTokens;
  }

  getBuyOutPrice(amount: bigint, feeBasisPoints: bigint): bigint {
    let solTokens =
      amount < this.realSolReserves ? this.realSolReserves : amount;
    let totalSellValue =
      (solTokens * this.virtualSolReserves) /
        (this.virtualTokenReserves - solTokens) +
      1n;
    let fee = (totalSellValue * feeBasisPoints) / 10000n;
    return totalSellValue + fee;
  }

  public static fromBuffer(buffer: Buffer): BondingCurveAccount {
    const structure: Layout<BondingCurveAccount> = struct([
      u64("discriminator"),
      u64("virtualTokenReserves"),
      u64("virtualSolReserves"),
      u64("realTokenReserves"),
      u64("realSolReserves"),
      u64("tokenTotalSupply"),
      bool("complete"),
    ]);

    let value = structure.decode(buffer);
    return new BondingCurveAccount(
      BigInt(value.discriminator),
      BigInt(value.virtualTokenReserves),
      BigInt(value.virtualSolReserves),
      BigInt(value.realTokenReserves),
      BigInt(value.realSolReserves),
      BigInt(value.tokenTotalSupply),
      value.complete
    );
  }
}
