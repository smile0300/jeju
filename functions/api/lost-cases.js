// 경찰청 등록 사례 공개 목록 (지역·분류·날짜·가린 접수번호만) — 접수 화면 신뢰 띠, 진행상황 페이지
import { corsPreflight, cachedGasGet } from '../../lib/gas.js';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return corsPreflight();
  return cachedGasGet(context, {
    cacheKey: 'https://jeju-live.com/api/lost-cases',
    gasParams: { action: 'lost_cases' },
    ttl: 300,
  });
}
