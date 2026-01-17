import type { ApiEndpoint } from "@/types";

// Default API endpoints to monitor
export const DEFAULT_APIS: ApiEndpoint[] = [
  {
    id: "CCTAPIEA",
    name: "CCT API CAMCO EA",
    url: "http://172.20.10.112:5000/health/detailed",
    method: "GET",
    interval: 30,
    timeout: 5000,
    enabled: true,
    expectedStatus: 200,
    tags: ["EA", "Camco", "EA Environment"],
  },
];
