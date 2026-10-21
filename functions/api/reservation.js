// 예약 신청 (미용·식당·액티비티·코스·대절 등) → GAS Reservation 시트
import { forwardToGas } from '../../lib/gas.js';

export async function onRequest({ request, env }) {
  return forwardToGas(request, env, { types: t => t === 'reservation', maxBytes: 20 * 1024 });
}
