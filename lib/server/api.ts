import "server-only";
import { z } from "zod";

/** Parse a JSON body with Zod → 400 with field errors (spec 12). */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<{ data: z.infer<T> } | { error: Response }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: Response.json({ error: "Ugyldig JSON" }, { status: 400 }) };
  }
  const res = schema.safeParse(json);
  if (!res.success) {
    return { error: Response.json({ error: "Valideringsfeil", fields: z.flattenError(res.error).fieldErrors }, { status: 400 }) };
  }
  return { data: res.data };
}
