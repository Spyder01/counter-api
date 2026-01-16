// CONFIG — how many hours until the same IP can increment again?
const COOLDOWN_HOURS = 2;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      return new Response("Use: /hit/<ns>/<key> or /get/<ns>/<key>", { status: 400 });
    }

    const action = parts[0];
    const ns = parts[1];
    const key = parts[2] ?? "default";
    const fullKey = `${ns}:${key}`;

    // Cloudflare gives real IP
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const ipKey = `ip:${ns}:${key}:${ip}`;

    switch (action) {

      // -------------------------------------------------------
      // HIT — increment if cooldown expired
      // -------------------------------------------------------
      case "hit": {
        const now = Date.now();

        // Last visit timestamp by this IP
        const lastVisit = await env.COUNTERS.get(ipKey);

        let allowed = false;

        if (!lastVisit) {
          // First ever visit: allowed
          allowed = true;
        } else {
          const last = parseInt(lastVisit);
          const hoursPassed = (now - last) / (1000 * 60 * 60);

          if (hoursPassed >= COOLDOWN_HOURS) {
            allowed = true;
          }
        }

        if (allowed) {
          // increment counter
          let current = parseInt(await env.COUNTERS.get(fullKey) || "0");
          const newValue = current + 1;

          await env.COUNTERS.put(fullKey, newValue.toString());
          await env.COUNTERS.put(ipKey, now.toString());

          return json({ value: newValue, incremented: true });
        }

        // Not allowed — return current value
        const current = parseInt(await env.COUNTERS.get(fullKey) || "0");
        return json({
          value: current,
          incremented: false,
          retry_after_hours: COOLDOWN_HOURS
        });
      }

      // -------------------------------------------------------
      // GET — read value without increment
      // -------------------------------------------------------
      case "get": {
        const current = parseInt(await env.COUNTERS.get(fullKey) || "0");
        return json({ value: current });
      }

      // -------------------------------------------------------
      // SET — manually set value
      // -------------------------------------------------------
      case "set": {
        const val = url.searchParams.get("value");
        if (!val || isNaN(parseInt(val))) {
          return new Response("Missing ?value=number", { status: 400 });
        }
        await env.COUNTERS.put(fullKey, val);
        return json({ value: parseInt(val) });
      }

      default:
        return new Response("Unknown action", { status: 400 });
    }
  }
};

// Helper
function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json" }
  });
}
