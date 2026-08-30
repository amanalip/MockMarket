import { Position } from '../../model/types';

export function calculatePositionUpdate(
  currentPos: Position | undefined,
  side: 'buy' | 'sell',
  shares: number,
  price: number,
  fee = 0
): { updatedPosition: Position | null; realizedPnL: number } {
  if (!Number.isFinite(shares) || !Number.isInteger(shares) || shares <= 0) {
    throw new Error('Shares must be positive integer');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be positive finite');
  }
  if (side === 'buy') {
    const existingShares = currentPos?.shares || 0;
    const existingTotalCost = currentPos?.totalCost || 0;
    const existingRealizedPnL = currentPos?.realizedPnL || 0;

    const newShares = existingShares + shares;
    const newTotalCost = existingTotalCost + (shares * price) + (Number.isFinite(fee) ? fee : 0);
    const newAvgCost = newShares > 0 ? newTotalCost / newShares : 0;
    const currentValue = newShares * price;
    const unrealizedPnL = currentValue - newTotalCost;
    const unrealizedPnLPercent = newTotalCost > 0 ? (unrealizedPnL / newTotalCost) * 100 : 0;

    return {
      updatedPosition: {
        ticker: currentPos?.ticker || '',
        shares: newShares,
        avgCost: Number(newAvgCost.toFixed(4)),
        totalCost: Number(newTotalCost.toFixed(2)),
        currentPrice: price,
        currentValue: Number(currentValue.toFixed(2)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        realizedPnL: existingRealizedPnL,
      },
      realizedPnL: 0,
    };
  } else {
    // Sell
    if (!currentPos || currentPos.shares < shares) {
      throw new Error(`Insufficient shares to sell. Owned: ${currentPos?.shares || 0}, requested: ${shares}`);
    }

    const costOfSharesSold = shares * currentPos.avgCost;
    const grossProceeds = shares * price;
    const tradeRealizedPnL = grossProceeds - costOfSharesSold - fee;
    const cumulativeRealizedPnL = (currentPos.realizedPnL || 0) + tradeRealizedPnL;

    const remainingShares = currentPos.shares - shares;
    if (remainingShares === 0) {
      return {
        updatedPosition: null,
        realizedPnL: Number(tradeRealizedPnL.toFixed(2)),
      };
    }

    const newTotalCost = remainingShares * currentPos.avgCost;
    const currentValue = remainingShares * price;
    const unrealizedPnL = currentValue - newTotalCost;
    const unrealizedPnLPercent = newTotalCost > 0 ? (unrealizedPnL / newTotalCost) * 100 : 0;

    return {
      updatedPosition: {
        ticker: currentPos.ticker,
        shares: remainingShares,
        avgCost: currentPos.avgCost,
        totalCost: Number(newTotalCost.toFixed(2)),
        currentPrice: price,
        currentValue: Number(currentValue.toFixed(2)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        realizedPnL: Number(cumulativeRealizedPnL.toFixed(2)),
      },
      realizedPnL: Number(tradeRealizedPnL.toFixed(2)),
    };
  }
}

export function revaluePosition(position: Position, newPrice: number): Position {
  if (!Number.isFinite(newPrice) || newPrice < 0) {
    return position;
  }
  const currentValue = position.shares * newPrice;
  const unrealizedPnL = currentValue - position.totalCost;
  const unrealizedPnLPercent = position.totalCost > 0 ? (unrealizedPnL / position.totalCost) * 100 : 0;

  return {
    ...position,
    currentPrice: newPrice,
    currentValue: Number(currentValue.toFixed(2)),
    unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
    unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
  };
}
