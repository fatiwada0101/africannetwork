import { z } from 'zod';

/**
 * Zod Schema Library for API Input Validation
 * 
 * All API routes should validate request bodies through these schemas.
 * Schemas are grouped by domain (auth, purchase, plans, etc.)
 */

// ── Shared Primitives ───────────────────────────────────────

const safeString = z.string().trim().min(1).max(500);
const safeText = z.string().trim().max(5000);
const positiveAmount = z.number().positive().max(10_000_000);
const uuid = z.string().uuid();
const email = z.string().email().max(254);
const phone = z.string().regex(/^\+?[0-9\s\-()]{7,20}$/).optional();

// ── Auth Schemas ────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  action: z.string().optional(),
});

export const changePasswordSchema = z.object({
  action: z.literal('change_password'),
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(8).max(200),
});

// ── Purchase Schemas ────────────────────────────────────────

export const purchaseSchema = z.object({
  plan_id: safeString.max(100).optional(),
  plan_name: safeString.max(200).optional(),
  duration: safeString.max(50).optional(),
  user_id: uuid.optional().nullable(),
  payment_method: z.enum(['wallet', 'card', 'quick_buy']).optional(),
  auto_renew: z.boolean().optional(),
}).refine(data => data.plan_id || data.plan_name, {
  message: 'Either plan_id or plan_name must be provided',
});

export const verifyPaymentSchema = z.object({
  transaction_id: z.union([z.string(), z.number()]),
  tx_ref: z.string().max(200).optional().nullable(),
  plan_name: z.string().max(200).optional(),
  plan_id: z.string().max(100).optional(),
  price: z.coerce.number().positive().max(10_000_000),
  duration: z.string().max(50).optional(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  user_id: z.string().uuid().optional().nullable(),
  status: z.string().max(50).optional(),
  auto_renew: z.boolean().optional(),
});

// ── Plan Schemas ────────────────────────────────────────────

export const createPlanSchema = z.object({
  id: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9\-_]+$/, 'ID must be alphanumeric with hyphens/underscores'),
  name: safeString.max(100),
  speed: z.string().max(50).optional().default(''),
  price: z.coerce.number().positive().max(10_000_000),
  duration: safeString.max(50),
  popular: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(1000).default(0),
  devices: z.coerce.number().int().min(1).max(100).default(1),
  upload_speed: z.string().regex(/^\d+[MKG]$/).default('12M'),
  download_speed: z.string().regex(/^\d+[MKG]$/).default('12M'),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  id: z.string().trim().min(1).max(100),
});

export const deletePlanSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

// ── Wallet Schemas ──────────────────────────────────────────

export const walletTopupSchema = z.object({
  amount: z.coerce.number().positive().max(10_000_000),
  user_id: z.string().uuid().optional().nullable(),
  flw_ref: z.string().max(200).optional(),
  transaction_id: z.union([z.string(), z.number()]).optional(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  name: safeString.max(200).optional(),
  redirect_url: z.string().url().max(500).optional(),
});

// ── Voucher Schemas ─────────────────────────────────────────

export const voucherGenerateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(500).default(1),
  prefix: z.string().max(20).optional().default(''),
  code_format: z.enum(['numbers_only', 'alphanumeric', 'alpha_only']).default('numbers_only'),
  code_length: z.coerce.number().int().min(4).max(20).default(5),
  profile: z.string().max(100).default('default'),
  expiry_type: z.string().max(20).default('daily'),
  custom_duration: z.string().max(50).optional(),
  data_limit: z.string().max(50).default('unlimited'),
  custom_data_limit: z.string().max(50).optional(),
  price: z.coerce.number().min(0).max(10_000_000).optional().default(0),
  plan_name: safeString.max(200).optional().default('Generated Voucher'),
  devices: z.coerce.number().int().min(1).max(100).default(1),
  upload_speed: z.string().regex(/^\d+[MKG]$/).default('12M'),
  download_speed: z.string().regex(/^\d+[MKG]$/).default('12M'),
});

export const fallbackVoucherSchema = z.object({
  action: z.enum(['auto_generate', 'manual_import', 'bulk_add']).optional(),
  profile_name: safeString.max(200),
  plan_id: z.string().max(100).optional().nullable(),
  duration: safeString.max(50),
  quantity: z.coerce.number().int().min(1).max(500).optional().default(10),
  codes: z.union([z.array(z.string()), z.string()]).optional(),
  data_limit: z.string().max(50).optional(),
  price: z.coerce.number().min(0).max(10_000_000).optional(),
  expiry_days: z.coerce.number().int().min(1).max(365).optional(),
  prefix: z.string().max(20).optional(),
  code_format: z.enum(['numbers_only', 'alphanumeric', 'alpha_only']).default('numbers_only'),
  code_length: z.coerce.number().int().min(4).max(20).default(5),
});

// ── Settings Schemas ────────────────────────────────────────

export const brandingSchema = z.object({
  app_name: safeString.max(100),
  logo_url: z.string().max(500).optional(),
  theme: z.string().max(50),
  app_url: z.string().max(500).optional(),
});

export const mikrotikConfigSchema = z.object({
  ip: z.string().trim().min(1).max(100),
  user: z.string().trim().min(1).max(100),
  pass: z.string().max(200),
  port: z.union([z.string(), z.number()]).transform(v => String(v)),
  use_ssl: z.boolean().default(true),
  hotspot_url: z.string().max(200).optional(),
  wifi_ssid: z.string().max(100).optional(),
});

export const flutterwaveConfigSchema = z.object({
  public_key: z.string().max(200),
  secret_key: z.string().max(200),
  webhook_secret: z.string().max(200).optional(),
  enabled: z.boolean().default(false),
});

export const hotspotSettingsSchema = z.object({
  sharing_enabled: z.boolean().default(false),
  default_devices: z.number().int().min(1).max(100).default(1),
  default_upload_speed: z.string().regex(/^\d+[MKG]$/).default('12M'),
  default_download_speed: z.string().regex(/^\d+[MKG]$/).default('12M'),
  expiry_mode: z.enum(['elapsed', 'paused']).default('elapsed'),
});

// ── Notification Schemas ────────────────────────────────────

export const notificationSchema = z.object({
  user_id: uuid,
  title: safeString.max(200),
  message: safeText.max(2000),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
});

// ── MikroTik Schemas ────────────────────────────────────────

export const walledGardenSchema = z.object({
  dst_host: z.string().trim().min(1).max(200),
  comment: z.string().max(500).optional(),
  action: z.enum(['allow', 'deny']).default('allow'),
});

// ── Validation Helper ───────────────────────────────────────

/**
 * Validate a request body against a Zod schema.
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {Request} request - Incoming request object
 * @returns {Promise<{ data: any, error: Response|null }>}
 */
export async function validateBody(schema, request) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      return {
        data: null,
        error: new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: errors.fieldErrors,
            formErrors: errors.formErrors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      };
    }

    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }
}

/**
 * Validate URL search params against a Zod schema.
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {URLSearchParams} params - URL search params
 * @returns {{ data: any, error: Response|null }}
 */
export function validateParams(schema, params) {
  const obj = Object.fromEntries(params.entries());
  const result = schema.safeParse(obj);

  if (!result.success) {
    const errors = result.error.flatten();
    return {
      data: null,
      error: new Response(
        JSON.stringify({
          error: 'Invalid query parameters',
          details: errors.fieldErrors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { data: result.data, error: null };
}
