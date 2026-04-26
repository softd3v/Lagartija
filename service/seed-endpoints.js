const { seedFromFallback, dbPath } = require('./sqlite-endpoints');

const fallbackEndpoints = [
  {
    id: 'CCTAPIEA',
    type: 'api',
    name: 'CCT API CAMCO EA',
    url: process.env.NEXT_PUBLIC_CCT_API_URL || 'http://172.20.10.112:5000/health/detailed',
    method: 'GET',
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: 'SOLDMDT-API',
    type: 'api',
    name: 'API Producction for SOL DMDT',
    url: 'http://172.20.10.114:5000/health',
    method: 'GET',
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: 'CCTAPI-PA',
    type: 'api',
    name: 'CCT API CAMCO PA',
    url: 'http://172.20.10.117:5000/health/detailed',
    method: 'GET',
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: 'BRIDGECAMCO-TEST',
    type: 'api',
    name: 'Bridge Camco Test Environment',
    url: 'http://172.100.5.13',
    method: 'GET',
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: 'CCTSUITE-WEB',
    type: 'api',
    name: 'MUI WEB',
    url: 'http://172.20.10.11:8080/ords/wscct/r/cct-suite/login?',
    method: 'GET',
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: 'INFOS-AUTOSERVICIO',
    type: 'api',
    name: 'INFOS-AUTOSERVICIO',
    url: 'http://172.20.10.11:8080/infos/f?p=103:101:18766474252733:::::',
    method: 'GET',
    interval: 30000,
    timeout: 5000,
    enabled: true,
  },
  {
    id: 'ORACLE_CCTPROD',
    type: 'database',
    name: 'Oracle CCTPROD Database',
    host: '172.20.10.10',
    port: 1521,
    serviceName: 'CCTPROD',
    interval: 60000,
    timeout: 10000,
    enabled: true,
  },
];

const result = seedFromFallback(fallbackEndpoints);

if (result.seeded) {
  console.log(`[SEED] SQLite created at ${dbPath} with ${result.total} endpoints`);
} else {
  console.log(`[SEED] SQLite already has ${result.total} endpoints. No changes made.`);
}
