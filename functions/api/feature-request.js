// 기능 제안 · 고객센터 문의 · CCTV 신청 → GAS
// (reservation은 예전 화면 호환용 — 새 화면은 /api/reservation 사용)
import { forwardToGas } from '../../lib/gas.js';

const TYPES = ['feature', 'customer_service', 'cctv_apply', 'reservation'];

export async function onRequest({ request, env }) {
  return forwardToGas(request, env, { types: t => TYPES.includes(t), maxBytes: 20 * 1024 });
}
