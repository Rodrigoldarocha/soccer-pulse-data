import { createStart, createCsrfMiddleware } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// NOTA: não registrar attachSupabaseAuth aqui — as server functions são
// públicas e o middleware puxa o cliente Supabase para o bundle do browser,
// causando "Missing Supabase environment variable(s)".
export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
