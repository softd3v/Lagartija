import { z } from 'zod';

export const alertTypeSchema = z.enum([
  'down',
  'recovered',
  'database-down',
  'database-recovered',
]);

export const webhookTypeSchema = z.enum(['discord', 'generic', 'slack']);

export const webhookConfigSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'ID must be alphanumeric with _ or -'),
  name: z.string().min(1).max(120),
  url: z.string().url('Must be a valid webhook URL'),
  type: webhookTypeSchema.default('discord'),
  enabled: z.boolean().default(true),
  events: z.array(alertTypeSchema).min(1, 'Select at least one event'),
  endpointIds: z.array(z.string()).default([]),
});

export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>;
