export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2 || parts[0] !== "hit") {
      return new Response("Usage: /hit/<namespace>/<key>", { status: 400 });
    }

    const namespace = parts[1];
    const key = parts[2] ?? "default";

    const fullKey = `${namespace}:${key}`;

    // Read existing value from KV
    let current = await env.COUNTERS.get(fullKey);
    if (!current) current = 0;
    current = parseInt(current);

    const newValue = current + 1;

    // Store the incremented value
    await env.COUNTERS.put(fullKey, newValue.toString());

    return new Response(JSON.stringify({ value: newValue }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
