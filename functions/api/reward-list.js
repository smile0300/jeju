// 홍바오(현상금) 목록 — RewardList 시트
import { corsPreflight, cachedGasGet } from '../../lib/gas.js';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return corsPreflight();
  return cachedGasGet(context, {
    cacheKey: 'https://jeju-live.com/api/reward-list',
    gasParams: {},
    ttl: 300,
  });
}
