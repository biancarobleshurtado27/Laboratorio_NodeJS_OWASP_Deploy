const { z } = require('zod');

const strongPassword = z.string().min(12).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
const email = z.string().trim().email().max(254);

const registerSchema = z.object({ email, name: z.string().trim().min(2).max(80), password: strongPassword, phone: z.string().trim().max(32).optional().or(z.literal('')) });
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
const noteSchema = z.object({ title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(5000) });
const passwordSchema = z.object({ password: strongPassword });
const emailSchema = z.object({ email });
const roleSchema = z.object({ role: z.enum(['user', 'admin']) });

module.exports = { registerSchema, loginSchema, noteSchema, passwordSchema, emailSchema, roleSchema };
