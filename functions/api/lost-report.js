// 분실신고 · 대리수령 신청 → GAS (사진 base64 포함이라 크기 한도가 크다)
import { forwardToGas } from '../../lib/gas.js';

export async function onRequest({ request, env }) {
  return forwardToGas(request, env, {
    types: t => t === 'lost_report' || t === 'proxy_pickup',
    maxBytes: 15 * 1024 * 1024,
  });
}
