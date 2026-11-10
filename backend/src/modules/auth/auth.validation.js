import { z } from 'zod';
export const email = z.string().trim().toLowerCase().max(254).email();
export const password = z
  .string()
  .min(12)
  .max(128)
  .refine((value) => value.trim().length > 0);
export const displayName = z.string().trim().min(2).max(80);
export const objectId = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .transform((value) => value.toLowerCase());
export const opaqueToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const registerSchema = z.strictObject({ email, password, displayName });
export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1).max(128),
});
export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});
export const emailSchema = z.strictObject({ email });
export const tokenSchema = z.strictObject({ token: opaqueToken });
export const resetSchema = z.strictObject({
  token: opaqueToken,
  newPassword: password,
});
export const userParams = z.strictObject({ userId: objectId });
