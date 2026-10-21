// 분실물 진행상황(SuccessStories) 공개 목록
// 위챗 ID는 GAS에서 이미 가려서 오지만, 구버전 GAS 배포가 남아 있을 때를 대비해 여기서도 한 번 더 가린다.
import { corsPreflight, cachedGasGet } from '../../lib/gas.js';

const mask = v => {
  const id = String(v || '');
  if (!id || id.includes('***')) return id;
  return id.length > 4 ? id.substring(0, 2) + '***' + id.substring(id.length - 2) : '***';
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return corsPreflight();
  return cachedGasGet(context, {
    cacheKey: 'https://jeju-live.com/api/success-list',
    gasParams: { action: 'success' },
    ttl: 90, // 관리자가 단계를 바꾸면 1~2분 안에 반영
    transform: data => Array.isArray(data)
      ? data.map(item => { const o = { ...item, WeChatId: mask(item.WeChatId) }; delete o.Note; return o; })
      : data,
  });
}
