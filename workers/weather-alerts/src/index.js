import { getAccessToken, sendFCMMessage } from './fcm.js';

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
        const topic = "jeju_weather_alerts";

        // Instance ID API를 사용하여 해당 토큰을 Topic에 강제 구독
        const iidUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`;
        const res = await fetch(iidUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });

        if (res.ok) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } else {
          const err = await res.text();
          return new Response(JSON.stringify({ success: false, error: err }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  },

  // 스케줄러: 매 10분마다 실행되어 기상특보 확인 후 알림 발송
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAndSendAlerts(env));
  }
};

async function checkAndSendAlerts(env) {
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
      // 가장 최근에 발생한 특보를 기준으로 알림 발송
      const latestAlert = activeItems[0];
      
      // 아침 8시(KST)를 기준으로 리마인더 날짜(주기)를 계산합니다.
      const now = new Date();
      const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const kstHour = kstTime.getUTCHours();
      
      let reminderDate = kstTime;
      // 새벽 0시 ~ 아침 7시 59분까지는 '어제' 날짜 주기에 속하므로 리마인더 날짜를 어제로 유지
      if (kstHour < 8) {
        reminderDate = new Date(kstTime.getTime() - 24 * 60 * 60 * 1000);
      }
      const reminderDateString = reminderDate.toISOString().slice(0, 10);
      
      // getWthrWrnMsg의 tmFc(발표시간)와 리마인더 날짜를 결합하여 고유 ID 생성
      // 이 로직을 통해 발표시간이 동일하더라도 매일 아침 8시가 넘으면 ID가 갱신되어 1회 다시 발송됨
      const alertId = `${latestAlert.tmFc}_${latestAlert.type}_${reminderDateString}`;
      
      const kv = env.WEATHER_KV;
      if (kv) {
        // 이미 발송한 알림인지 확인 (중복 발송 방지)
        const lastSent = await kv.get("LAST_SENT_ALERT_ID");
        if (lastSent === alertId) {
          console.log("Already sent this alert:", alertId);
          return;
        }
        await kv.put("LAST_SENT_ALERT_ID", alertId);
      } else {
        console.warn("WEATHER_KV is not bound, proceeding without deduplication");
      }

      // FCM 발송
      const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
      const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
      const projectId = sa.project_id;
      
      const accessToken = await getAccessToken(serviceAccountJson);
      
      // 제목 클리닝 (예: [호우주의보] 제주도 산지 -> 호우주의보)
      const cleanTitle = latestAlert.title.replace(/\(\*\)/g, '').trim();
      const title = "🚨 제주도 기상특보 발효";
      const body = cleanTitle;
      
      await sendFCMMessage(accessToken, projectId, "jeju_weather_alerts", title, body);
      console.log("Push sent successfully!", body);
    }
  } catch (error) {
    console.error("Error in scheduled task:", error.message);
  }
}
