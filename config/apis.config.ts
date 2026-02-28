import type { ApiEndpoint } from "@/types";

// Default API endpoints to monitor
export const DEFAULT_APIS: ApiEndpoint[] = [
  {
    id: "CCTAPIEA",
    name: "CCT API CAMCO EA",
    url: process.env.NEXT_PUBLIC_CCT_API_URL || "http://localhost:5000/health/detailed",
    method: "GET",
    interval: 30,
    timeout: 5000,
    enabled: true,
    expectedStatus: 200,
    tags: ["EA", "Camco", "EA Environment"],
  },
  {
    id: "SOLDMDT-API",
    name: "API Producction for SOL DMDT",
    url: "http://172.20.10.114:5000/health",
    method: "GET",
    interval: 30,
    timeout: 5000,
    enabled: true,
    expectedStatus: 200,
    tags: ["PA", "SOL", "EMCTOS"],
  },
  {
  id: "BRIDGECAMCO-TEST",
  name: "Bridge Camco Test Environment",
  url: "http://172.100.5.13",      // o https:// si usa SSL
  method: "GET",
  interval: 30,                     // chequea cada 30 segundos
  timeout: 5000,
  enabled: true,
  expectedStatus: 200,              // o 301/302 si redirige
  tags: ["Internal", "Website"],
}
];
