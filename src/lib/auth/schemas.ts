import { z } from "zod";

/** Shared between the client form and the server action, so they cannot drift. */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "An email is required.")
  .email("That does not look like an email address.")
  .toLowerCase();

/**
 * Length is the only hard requirement. Composition rules (a digit, a symbol,
 * a capital) measurably push people toward weaker, more predictable passwords,
 * so the floor is raised instead.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That is longer than 200 characters.");

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Choose a name.")
    .max(60, "Keep it under 60 characters."),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
