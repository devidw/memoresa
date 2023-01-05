export const fetchOptions = {
  headers: {
    cookie: `token=${Deno.env.get("MEMORESA_TOKEN")}`,
  },
}