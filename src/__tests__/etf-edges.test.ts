import { describe, it, expect } from 'vitest';
import { normalizeWeights, simulateETF } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const mk = (dates:string[], price:number): Candle[] => dates.map(d=>({ time:d, open:price, high:price, low:price, close:price, volume:1000 }));

describe('ETF Builder - Edges', () => {
  it('normalize sum 0 -> equal weights sum to 100 (fixed rounding)', () => {
    const res=normalizeWeights([{ticker:'A',targetWeight:0},{ticker:'B',targetWeight:0},{ticker:'C',targetWeight:0}]);
    const sum=res.reduce((s,c)=>s+c.targetWeight,0);
    expect(sum).toBeCloseTo(100,2);
    expect(sum).toBe(100);
  });

  it('normalize 1/3 weights sum ~100', () => {
    const res=normalizeWeights([{ticker:'A',targetWeight:33.33},{ticker:'B',targetWeight:33.33},{ticker:'C',targetWeight:33.34}]);
    expect(res.reduce((s,c)=>s+c.targetWeight,0)).toBeCloseTo(100,1);
  });

  it('normalize arbitrary sum scales to 100', () => {
    const res=normalizeWeights([{ticker:'A',targetWeight:10},{ticker:'B',targetWeight:30}]);
    expect(res[0].targetWeight).toBe(25);
    expect(res[1].targetWeight).toBe(75);
  });

  it('simulateETF single ticker', () => {
    const dates=['2020-01-01','2020-01-02','2020-01-03','2020-01-04','2020-01-05','2020-01-06'];
    const map={ AAPL: dates.map((d,i)=>({ time:d, open:100+i, high:100+i, low:100+i, close:100+i, volume:1000 })) };
    const res=simulateETF({ id:'1', name:'Test', tickers:[{ticker:'AAPL',targetWeight:100}], rebalanceFrequency:'never', createdAt:'2020-01-01' }, map);
    expect(res.navHistory.length).toBe(6);
    expect(res.navHistory[0].nav).toBe(100);
    expect(res.driftHistory[0].weights['AAPL']).toBe(100);
  });

  it('simulateETF two tickers with rebalance monthly', () => {
    const dates=['2020-01-30','2020-01-31','2020-02-01','2020-02-02','2020-02-03','2020-02-04'];
    const dataMap = {
      AAPL: dates.map(d=>({ time:d, open:100, high:110, low:90, close:100, volume:1000 })),
      MSFT: dates.map((d,i)=>({ time:d, open:100, high:110, low:90, close:100+i, volume:1000 })),
    };
    const res=simulateETF({ id:'1', name:'Test', tickers:[{ticker:'AAPL',targetWeight:50},{ticker:'MSFT',targetWeight:50}], rebalanceFrequency:'monthly', createdAt:'2020-01-01' }, dataMap);
    expect(res.navHistory.length).toBe(6);
    expect(res.metrics.totalReturnPercent).toBeDefined();
  });

  it('simulateETF throws if no valid tickers', () => {
    expect(()=> simulateETF({ id:'1', name:'Test', tickers:[{ticker:'UNKNOWN',targetWeight:100}], rebalanceFrequency:'never', createdAt:'2020-01-01' }, {})).toThrow();
  });

  it('simulateETF throws if insufficient overlapping dates', () => {
    const map={ AAPL: mk(['2020-01-01','2020-01-02'],100), MSFT: mk(['2020-01-03','2020-01-04'],100) };
    expect(()=> simulateETF({ id:'1', name:'Test', tickers:[{ticker:'AAPL',targetWeight:50},{ticker:'MSFT',targetWeight:50}], rebalanceFrequency:'never', createdAt:'2020-01-01' }, map)).toThrow(/Insufficient overlapping/);
  });

  it('simulateETF metrics annualized reasonable', () => {
    const dates=Array.from({length:30},(_,i)=>{ const d=new Date('2020-01-01'); d.setDate(d.getDate()+i); return d.toISOString().split('T')[0]; });
    const map={ AAPL: dates.map(d=>({ time:d, open:100, high:105, low:95, close:100+Math.random()*5, volume:1000 })),
                MSFT: dates.map(d=>({ time:d, open:100, high:105, low:95, close:100+Math.random()*5, volume:1000 })) };
    const res=simulateETF({ id:'1', name:'Test', tickers:[{ticker:'AAPL',targetWeight:50},{ticker:'MSFT',targetWeight:50}], rebalanceFrequency:'never', createdAt:'2020-01-01' }, map);
    expect(res.metrics.annualizedVolatility).toBeGreaterThanOrEqual(0);
    expect(res.metrics.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
  });

  it('drift weights sum approx 100', () => {
    const dates=['2020-01-01','2020-01-02','2020-01-03','2020-01-04','2020-01-05','2020-01-06'];
    const map={ AAPL: dates.map(d=>({ time:d, open:100, high:100, low:100, close:100, volume:1000 })), MSFT: dates.map(d=>({ time:d, open:200, high:200, low:200, close:200, volume:1000 })) };
    const res=simulateETF({ id:'1', name:'Test', tickers:[{ticker:'AAPL',targetWeight:50},{ticker:'MSFT',targetWeight:50}], rebalanceFrequency:'never', createdAt:'2020-01-01' }, map);
    res.driftHistory.forEach(dp=>{
      const sum=Object.values(dp.weights).reduce((a,b)=>a+b,0);
      expect(sum).toBeCloseTo(100,0);
    });
  });
});
