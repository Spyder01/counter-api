export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      return new Response("Usage: /hit/<ns>/<key> OR /get/<ns>/<key> OR /set/<ns>/<key>?value=123", { status: 400 });
    }

    const action = parts[0]; // hit, get, set
    const namespace = parts[1];
    const key = parts[2] ?? "default";
    const fullKey = `${namespace}:${key}`;

    switch (action) {

      // --------------------------------------
      // HIT — increment value
      // --------------------------------------
      case "hit": {
        let current = await env.COUNTERS.get(fullKey);
        if (!current) current = 0;
        current = parseInt(current);

        const newValue = current + 1;
        await env.COUNTERS.put(fullKey, newValue.toString());

        return json({ value: newValue });
      }

      // --------------------------------------
      // GET — read value
      // --------------------------------------
      case "get": {
        let current = await env.COUNTERS.get(fullKey);
        if (!current) current = 0;

        return json({ value: parseInt(current) });
      }

      // --------------------------------------
      // SET — set value manually
      // --------------------------------------
      case "set": {
        const newValue = url.searchParams.get("value");

        if (newValue === null || isNaN(parseInt(newValue))) {
          return new Response("Missing or invalid ?value= parameter", { status: 400 });
        }

        await env.COUNTERS.put(fullKey, newValue.toString());

        return json({ value: parseInt(newValue) });
      }

      default:
        return new Response("Unknown action. Use /hit /get /set", { status: 400 });
    }
  }
};

// Helper: JSON response shortcut
function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json" }
  });
}
