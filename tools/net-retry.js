/**
 * PC 인터넷이 잠깐 끊겼을 때(DNS 못 찾음 등) fetch 를 몇 번 다시 시도한다.
 * 요청이 서버에 닿기 전 실패(주소 못 찾음·연결 거부)만 다시 보낸다 — 이미 보냈을 수 있는 요청은 중복 기록을 막기 위해 그대로 실패시킴.
 * require('./net-retry') 한 줄로 전역 fetch 를 감싼다.
 */
const RETRY_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);
const TRIES = 4, WAIT_MS = 15000;

if (!global.fetch.__retry) {
  const raw = global.fetch;
  const wrapped = async (...a) => {
    for (let i = 1; ; i++) {
      try { return await raw(...a); } catch (e) {
        const code = e?.cause?.code || e?.code;
        if (i >= TRIES || !RETRY_CODES.has(code)) throw e;
        await new Promise(r => setTimeout(r, WAIT_MS));
      }
    }
  };
  wrapped.__retry = true;
  global.fetch = wrapped;
}
