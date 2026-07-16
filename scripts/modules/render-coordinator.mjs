/* Wormholes Beta 248 rendering boundary.
   Feature code requests named renders; renderer implementations remain isolated behind this coordinator. */

export function createRenderCoordinator(options = {}) {
  const renderers = new Map();
  const stats = new Map();
  let batchDepth = 0;
  const pending = new Map();
  const model = options.model || null;

  function register(name, renderer, config = {}) {
    const key = String(name || "");
    if (!key || typeof renderer !== "function")
      throw new TypeError("A render name and renderer function are required.");
    renderers.set(
      key,
      Object.freeze({
        renderer,
        domains: Array.isArray(config.domains) ? config.domains.slice() : [],
      }),
    );
    return renderer;
  }

  function has(name) {
    return renderers.has(String(name || ""));
  }

  function rendererInfo(name) {
    return renderers.get(String(name || "")) || null;
  }

  function noteRender(name, startedAt) {
    const previous = stats.get(name) || {count: 0, lastDurationMs: 0, lastAt: 0};
    stats.set(name, {
      count: previous.count + 1,
      lastDurationMs: Math.max(0, Date.now() - startedAt),
      lastAt: Date.now(),
    });
  }

  function invoke(name, args) {
    const entry = rendererInfo(name);
    if (!entry) return undefined;
    const startedAt = Date.now();
    let result;
    try {
      result = entry.renderer(...args);
    } catch (error) {
      noteRender(name, startedAt);
      throw error;
    }
    if (result && typeof result.then === "function") {
      return result.finally(() => noteRender(name, startedAt));
    }
    noteRender(name, startedAt);
    return result;
  }

  function render(name, ...args) {
    const key = String(name || "");
    if (batchDepth > 0) {
      pending.set(key, args);
      return undefined;
    }
    return invoke(key, args);
  }

  function renderMany(names) {
    const results = [];
    (Array.isArray(names) ? names : []).forEach((name) => results.push(render(name)));
    return results;
  }

  function flush() {
    if (batchDepth > 0 || pending.size === 0) return [];
    const queued = Array.from(pending.entries());
    pending.clear();
    return queued.map(([name, args]) => invoke(name, args));
  }

  function batch(callback) {
    batchDepth += 1;
    try {
      return typeof callback === "function" ? callback() : undefined;
    } finally {
      batchDepth = Math.max(0, batchDepth - 1);
      if (batchDepth === 0) flush();
    }
  }

  function getStats(name) {
    if (name) return stats.get(String(name)) || {count: 0, lastDurationMs: 0, lastAt: 0};
    return Object.fromEntries(stats.entries());
  }

  function context(name) {
    const entry = rendererInfo(name);
    return Object.freeze({
      name: String(name || ""),
      domains: entry?.domains || [],
      model,
      modelRevision: model?.revision?.() || 0,
    });
  }

  return Object.freeze({register, has, render, renderMany, batch, flush, getStats, context});
}

export function installRenderCoordinator(target = globalThis) {
  if (target.WormholesRendering) return target.WormholesRendering;
  target.WormholesRendering = createRenderCoordinator({model: target.WormholesAppModel || null});
  return target.WormholesRendering;
}

if (typeof window !== "undefined") installRenderCoordinator(window);
