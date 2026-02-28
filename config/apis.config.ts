import type { MonitorEndpoint } from "@/types";

// Default endpoints to monitor (APIs and Databases)
export const DEFAULT_ENDPOINTS: MonitorEndpoint[] = [
  {
    id: "CCTAPIEA",
    type: "api",
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
    type: "api",
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
    type: "api",
    name: "Bridge Camco Test Environment",
    url: "http://172.100.5.13",
    method: "GET",
    interval: 30,
    timeout: 5000,
    enabled: true,
    expectedStatus: 200,
    tags: ["Internal", "Website"],
  },
  {
    id: "ORACLE_CCTPROD",
    type: "database",
    name: "Oracle CCTPROD Database",
    host: "172.20.10.10",
    port: 1521,
    serviceName: "CCTPROD",
    interval: 60, // Check every 60 seconds
    timeout: 10000, // 10 second timeout
    enabled: true,
    tags: ["Database", "Oracle", "Production"],
  },
];

// Legacy export for backward compatibility
export const DEFAULT_APIS = DEFAULT_ENDPOINTS.filter((e) => e.type === "api");
