import { onRequest as __api_cctv_proxy_js_onRequest } from "C:\\jeju-live\\functions\\api\\cctv-proxy.js"
import { onRequest as __api_feature_request_js_onRequest } from "C:\\jeju-live\\functions\\api\\feature-request.js"
import { onRequest as __api_hallasan_status_js_onRequest } from "C:\\jeju-live\\functions\\api\\hallasan-status.js"
import { onRequest as __api_image_proxy_js_onRequest } from "C:\\jeju-live\\functions\\api\\image-proxy.js"
import { onRequest as __api_lost_report_js_onRequest } from "C:\\jeju-live\\functions\\api\\lost-report.js"
import { onRequest as __api_ping_js_onRequest } from "C:\\jeju-live\\functions\\api\\ping.js"
import { onRequest as __api_public_data_js_onRequest } from "C:\\jeju-live\\functions\\api\\public-data.js"
import { onRequest as __api_reward_list_js_onRequest } from "C:\\jeju-live\\functions\\api\\reward-list.js"
import { onRequest as __api_success_list_js_onRequest } from "C:\\jeju-live\\functions\\api\\success-list.js"
import { onRequest as __api___path___js_onRequest } from "C:\\jeju-live\\functions\\api\\[[path]].js"

export const routes = [
    {
      routePath: "/api/cctv-proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_cctv_proxy_js_onRequest],
    },
  {
      routePath: "/api/feature-request",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_feature_request_js_onRequest],
    },
  {
      routePath: "/api/hallasan-status",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_hallasan_status_js_onRequest],
    },
  {
      routePath: "/api/image-proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_image_proxy_js_onRequest],
    },
  {
      routePath: "/api/lost-report",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_lost_report_js_onRequest],
    },
  {
      routePath: "/api/ping",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ping_js_onRequest],
    },
  {
      routePath: "/api/public-data",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_public_data_js_onRequest],
    },
  {
      routePath: "/api/reward-list",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_reward_list_js_onRequest],
    },
  {
      routePath: "/api/success-list",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_success_list_js_onRequest],
    },
  {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]