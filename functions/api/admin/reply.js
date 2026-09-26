/**
 * [관리자 전용] 위챗 답변 도우미 — POST /api/admin/reply
 * 고객 메시지 + 위챗ID/접수번호 → 구글 시트 조회 → AI가 중국어 답변 초안 작성
 * 사람이 확인 후 직접 위챗으로 보내는 반자동 방식 (자동 발송 없음)
 *
 * 필요한 환경변수 (Cloudflare Pages → Settings → Variables and Secrets):
 *   ADMIN_REPLY_KEY    관리자 페이지 비밀번호
 *   ADMIN_LOOKUP_SECRET  GAS 스크립트 속성과 같은 값
 *   ADMIN_GAS_URL      답변 도우미 전용 GAS 배포 URL (…/exec)
 *   ANTHROPIC_API_KEY  Claude 사용 시
 *   GEMINI_API_KEY     Gemini 사용 시 (선택: GEMINI_MODEL)
 */
import Anthropic from '@anthropic-ai/sdk';

const LATEST_GAS_URL = 'https://script.google.com/macros/s/AKfycbyKQiffY5B8SsbMJkXAHrLHFSsUqohXpBc9xq2BdPV1rY8zGMOZal9cP4EM2Wu02Z4/exec';

// 서비스 안내 사실 — 요금·정책이 바뀌면 여기만 고치면 됨
const SERVICE_FACTS = `
[제주라이브 jeju-live.com 서비스 사실]
- 분실물 등록: 사이트에서 무료 등록. 등록 내용은 관리자 구글 시트에 기록됨.
- 전담 수색(유료): 10위안(위챗페이). 전담 직원이 주변 호텔·택시 등에 직접 전화해 3~7일간 집중 수색.
- 대리수령 진행 단계(Step): 1=접수(已受理), 2=물품확인중(核实中), 3=수령완료(已取件), 4=발송완료(已寄出), 5=고객 직접수령(客户自提).
- 예약 대행: 수수료 10위안. 예약이 불가하면 전액 환불.
`.trim();

const SYSTEM_PROMPT = `당신은 제주 여행 정보 사이트 jeju-live.com의 위챗 고객상담 보조입니다.
중국인 여행객이 보낸 위챗 메시지에 대해, 관리자가 검토 후 그대로 보낼 수 있는 답변 초안을 작성합니다.

${SERVICE_FACTS}

규칙:
- 답변(reply_zh)은 간체 중국어, 위챗 채팅 말투로 친절하고 짧게(보통 2~5문장). 마크다운 금지, 이모지는 1~2개까지.
- 시트 조회 결과에 있는 사실만 말하세요. 진행 상황·날짜·장소를 추측하지 마세요.
- 서비스 사실에 없는 요금·배송비·소요시간은 지어내지 말고, 답변에 【待确认】 로 표시한 뒤 notes에 무엇을 확인해야 하는지 적으세요.
- 조회 결과가 없으면 접수번호(jeju-0000 형식)나 등록 시 사용한 위챗ID를 정중히 요청하세요.
- 물건을 찾았다고 확정하는 말, 환불·보상 약속은 시트에 근거가 있을 때만 하세요.
- reply_ko는 reply_zh의 자연스러운 한국어 번역(관리자 확인용)입니다.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['lost_found', 'reservation', 'payment', 'other'] },
    matched_case: { type: 'string', description: '답변 근거가 된 CaseId 또는 시트 행 요약. 없으면 빈 문자열' },
    reply_zh: { type: 'string' },
    reply_ko: { type: 'string' },
    notes: { type: 'string', description: '관리자가 보내기 전에 확인할 점 (한국어). 없으면 빈 문자열' },
  },
  required: ['category', 'matched_case', 'reply_zh', 'reply_ko', 'notes'],
  additionalProperties: false,
};

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const respond = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// 길이가 달라도 시간 차이로 비밀번호가 새지 않도록 비교
function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function lookupSheet(env, wechat, caseId) {
  // ADMIN_GAS_URL: adminLookup이 포함된 답변 도우미 전용 GAS 배포 (기존 사이트 배포와 분리)
  const url = new URL(env.ADMIN_GAS_URL || env.GAS_URL || env.SECRET_GAS_URL || LATEST_GAS_URL);
  url.searchParams.set('action', 'admin_lookup');
  url.searchParams.set('key', env.ADMIN_LOOKUP_SECRET || '');
  if (wechat) url.searchParams.set('wechat', wechat);
  if (caseId) url.searchParams.set('caseId', caseId);
  const res = await fetch(url.toString(), { cf: { cacheTtl: 0 } });
  const data = JSON.parse(await res.text());
  if (data.error) throw new Error('시트 조회 실패: ' + data.error);
  return data;
}

async function draftWithClaude(env, userContent) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  if (response.stop_reason === 'refusal') throw new Error('AI가 답변 작성을 거절했습니다.');
  const text = response.content.find((b) => b.type === 'text');
  return JSON.parse(text.text);
}

async function draftWithGemini(env, userContent) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-pro';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: OUTPUT_SCHEMA },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Gemini 오류: ' + (data.error?.message || res.status));
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return JSON.parse(text);
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_REPLY_KEY || !safeEqual(request.headers.get('X-Admin-Key') || '', env.ADMIN_REPLY_KEY)) {
    return respond({ error: '비밀번호가 올바르지 않습니다.' }, 401);
  }

  try {
    const body = await request.json();
    const message = String(body.message || '').slice(0, 4000);
    const wechat = String(body.wechat || '').trim();
    const engine = body.engine === 'gemini' ? 'gemini' : 'claude';
    if (!message.trim()) return respond({ error: '고객 메시지를 입력하세요.' }, 400);

    // 입력칸이 비어 있으면 메시지 안의 접수번호를 자동 추출
    const caseId = String(body.caseId || '').trim() || (message.match(/jeju-\d{4,}/i) || [''])[0];
    const records = await lookupSheet(env, wechat, caseId);

    const userContent =
      `[고객 위챗ID] ${wechat || '(모름)'}\n[접수번호] ${caseId || '(모름)'}\n` +
      `[오늘 날짜] ${new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n` +
      `[시트 조회 결과]\n${JSON.stringify(records)}\n\n` +
      `[고객 메시지]\n${message}`;

    const draft = engine === 'gemini' ? await draftWithGemini(env, userContent) : await draftWithClaude(env, userContent);
    return respond({ engine, caseId, records, draft });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return respond({ error: `Claude 오류 ${e.status}: ${e.message}` }, 502);
    return respond({ error: e.message }, 500);
  }
}
