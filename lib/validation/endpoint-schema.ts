import { z } from 'zod';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const baseSchema = z.object({
  id: z
    .string()
    .min(1, 'id is required')
    .max(100)
    .regex(/^[A-Z0-9_-]+$/, 'id only allows A-Z, 0-9, _, -'),
  type: z.enum(['api', 'database']),
  name: z.string().min(1, 'name is required').max(200),
  interval: z.number().int().min(5).max(86400),
  timeout: z.number().int().min(100).max(120000),
  enabled: z.boolean(),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
});

const apiSchema = baseSchema.extend({
  type: z.literal('api'),
  method: z.enum(HTTP_METHODS),
  url: z.url('url must be valid'),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

const databaseSchema = baseSchema.extend({
  type: z.literal('database'),
  host: z.string().min(1, 'host is required'),
  port: z.number().int().min(1).max(65535),
  serviceName: z.string().min(1, 'serviceName is required'),
});

export const monitorEndpointSchema = z.discriminatedUnion('type', [
  apiSchema,
  databaseSchema,
]);

export const monitorEndpointUpdateSchema = z.union([
  apiSchema.partial(),
  databaseSchema.partial(),
]).refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);

export type MonitorEndpointInput = z.infer<typeof monitorEndpointSchema>;
