import { getAccessToken, sendFCMMessage } from './fcm.js';

// FCM Topic에 토큰을 구독시키는 공통 헬퍼
async function subscribeTokenToTopic(token, topic, accessToken) {
  const iidUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`;
  const res = await fetch(iidUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to subscribe to ${topic}: ${err}`);
  }
}

export default {
  // HTTP 엔드포인트: 프론트엔드에서 기기 토큰을 받아 Topic 구독 처리
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS Preflight 처리
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/subscribe") {
      try {
        const { token } = await request.json();
        if (!token) return new Response("Token required", { status: 400 });

        const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccount) {
          throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
        }

        const accessToken = await getAccessToken(serviceAccount);

        // 기상특보 + 한라산 탐방로 두 Topic에 모두 구독
        const topics = ["jeju_weather_alerts", "jeju_hallasan_alerts"];
        const results = await Promise.allSettled(
          topics.map(topic => subscribeTokenToTopic(token, topic, accessToken))
        );

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn("일부 Topic 구독 실패:", failed.map(f => f.reason?.message));
        }

        return new Response(JSON.stringify({ success: true, subscribed: topics }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  },

  // 스케줄러: 매 10분마다 실행 - 기상특보 + 한라산 탐방로 동시 체크
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.allSettled([
      checkAndSendWeatherAlerts(env),
      checkAndSendHallasanAlerts(env),
    ]));
  }
};

// ─── 기상특보 체크 (기존 함수, 이름만 변경) ───────────────────────────────
async function checkAndSendWeatherAlerts(env) {
  try {
    const serviceKey = env.KMA_API_KEY;
    if (!serviceKey) throw new Error("KMA_API_KEY is not set");
    
    let encodedKey = serviceKey.trim();
    if (!encodedKey.includes('%')) {
      encodedKey = encodeURIComponent(encodedKey);
    }
    
    const kmaEndpoint = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg";
    const url = `${kmaEndpoint}?ServiceKey=${encodedKey}&numOfRows=10&pageNo=1&dataType=JSON&stnId=184`;
    
    const res = await fetch(url);
    const json = await res.json();
    
    const items = json?.response?.body?.items?.item;
    const msgItems = Array.isArray(items) ? items : (items ? [items] : []);
    const latestMsg = msgItems[0];

    const activeItems = [];
    if (latestMsg && latestMsg.t3) {
      const lines = latestMsg.t3.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('o ') || line.startsWith('○ ')) {
          const parts = line.substring(2).split(':');
          if (parts.length >= 2) {
            const type = parts[0].trim();
            const desc = parts.slice(1).join(':').trim();
            if (desc.includes('제주') || desc.includes('추자') || desc.includes('남해') || desc.includes('바다') || desc.includes('해상')) {
              activeItems.push({
                type: type,
                desc: desc,
                title: `[${type}] ${desc}`,
                tmFc: latestMsg.tmFc || latestMsg.tmSeq
              });
            }
          }
        }
      }
    }
    
    if (activeItems.length > 0) {
      const latestAlert = activeItems[0];
      
      // 아침 8시(KST) 기준으로 리마인더 날짜 계산
      const now = new Date();
      const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const kstHour = kstTime.getUTCHours();
      
      let reminderDate = kstTime;
      if (kstHour < 8) {
        reminderDate = new Date(kstTime.getTime() - 24 * 60 * 60 * 1000);
      }
      const reminderDateString = reminderDate.toISOString().slice(0, 10);
      const alertId = `${latestAlert.tmFc}_${latestAlert.type}_${reminderDateString}`;
      
      const kv = env.WEATHER_KV;
      if (kv) {
        const lastSent = await kv.get("LAST_SENT_ALERT_ID");
        if (lastSent === alertId) {
          console.log("Weather alert already sent:", alertId);
          return;
        }
        await kv.put("LAST_SENT_ALERT_ID", alertId);
      } else {
        console.warn("WEATHER_KV is not bound");
      }

      const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
      const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
      const projectId = sa.project_id;
      const accessToken = await getAccessToken(serviceAccountJson);

      const cleanTitle = latestAlert.title.replace(/\(\*\)/g, '').trim();
      const title = "🚨 제주도 기상특보 발효";
      const body = cleanTitle;
      
      await sendFCMMessage(accessToken, projectId, "jeju_weather_alerts", title, body);
      console.log("Weather alert push sent:", body);
    } else {
      console.log("No active Jeju weather alerts.");
    }
  } catch (error) {
    console.error("Error in checkAndSendWeatherAlerts:", error.message);
  }
}

// ─── 한라산 탐방로 통제 체크 ──────────────────────────────────────────────
async function checkAndSendHallasanAlerts(env) {
  try {
    // 이미 Cloudflare Pages Function에서 크롤링/파싱하여 제공 중인 엔드포인트 활용
    const res = await fetch('https://jeju-live.pages.dev/api/hallasan-status', {
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`Hallasan API error: HTTP ${res.status}`);
    
    const trails = await res.json();
    if (!Array.isArray(trails) || trails.length === 0) throw new Error("Invalid hallasan response");
    if (trails.error) throw new Error(trails.error);

    // 통제/제한 탐방로 필터
    const controlled = trails.filter(t => {
      const s = t.status || '';
      return s.includes('통제') || s.includes('제한') || s.includes('탐방불가') || s.includes('입산제한');
    });

    // 전체 상태 판단: 전면통제 / 부분통제 / 정상운영
    const totalCount = trails.length;
    const controlledCount = controlled.length;

    let overallStatus;
    if (controlledCount === 0) {
      overallStatus = 'open';
    } else if (controlledCount >= totalCount) {
      overallStatus = 'closed';
    } else {
      overallStatus = 'partial';
    }

    const kv = env.WEATHER_KV;

    // 정상 운영 중이면 알림 불필요 → KV 상태만 초기화 후 종료
    if (overallStatus === 'open') {
      if (kv) await kv.put("LAST_HALLASAN_STATUS", "open");
      console.log("Hallasan: all trails open, no alert needed.");
      return;
    }

    // 이전 상태와 동일하면 중복 발송 방지
    if (kv) {
      const lastStatus = await kv.get("LAST_HALLASAN_STATUS");
      if (lastStatus === overallStatus) {
        console.log("Hallasan: status unchanged, skipping:", overallStatus);
        return;
      }
      await kv.put("LAST_HALLASAN_STATUS", overallStatus);
    }

    // FCM 발송
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
    const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
    const projectId = sa.project_id;
    const accessToken = await getAccessToken(serviceAccountJson);

    const controlledNames = controlled.map(t => t.name.replace('탐방로', '')).join(', ');

    let title, body;
    if (overallStatus === 'closed') {
      title = "⛰️ 한라산 전면 통제";
      body = `기상 악화로 모든 탐방로 입산이 금지되었습니다.`;
    } else {
      title = "⛰️ 한라산 일부 탐방로 통제";
      body = `${controlledNames} 구간 통제 중. 등산 전 확인 바랍니다.`;
    }

    await sendFCMMessage(accessToken, projectId, "jeju_hallasan_alerts", title, body);
    console.log("Hallasan alert push sent:", body);

  } catch (error) {
    console.error("Error in checkAndSendHallasanAlerts:", error.message);
  }
}
