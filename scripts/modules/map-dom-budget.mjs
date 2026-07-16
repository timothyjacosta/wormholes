/* Wormholes Beta 248 adaptive SVG/DOM budget module.
   Canonical ES-module source; the local-file build uses a generated classic compatibility adapter. */

export const DEFAULTS = Object.freeze({
  minimumNodes: 48,
  minimumEdges: 72,
  minimumEstimatedElements: 900,
  aggressiveNodes: 120,
  aggressiveEdges: 240,
  aggressiveEstimatedElements: 1900,
});

function finiteCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function createMapDomProfile(options = {}) {
  const nodes = finiteCount(options.nodes);
  const edges = finiteCount(options.edges);
  const details = finiteCount(options.details);
  const estimatedElements = finiteCount(
    options.estimatedElements != null
      ? options.estimatedElements
      : nodes * 10 + edges * 6 + details * 2,
  );

  const minimumNodes = finiteCount(options.minimumNodes || DEFAULTS.minimumNodes);
  const minimumEdges = finiteCount(options.minimumEdges || DEFAULTS.minimumEdges);
  const minimumEstimatedElements = finiteCount(
    options.minimumEstimatedElements || DEFAULTS.minimumEstimatedElements,
  );
  const compact =
    options.forceCompact === true ||
    nodes >= minimumNodes ||
    edges >= minimumEdges ||
    estimatedElements >= minimumEstimatedElements;

  const aggressive =
    compact &&
    (nodes >= finiteCount(options.aggressiveNodes || DEFAULTS.aggressiveNodes) ||
      edges >= finiteCount(options.aggressiveEdges || DEFAULTS.aggressiveEdges) ||
      estimatedElements >=
        finiteCount(options.aggressiveEstimatedElements || DEFAULTS.aggressiveEstimatedElements));

  return Object.freeze({nodes, edges, details, estimatedElements, compact, aggressive});
}

export function mapDomProfileAttributes(profile) {
  const safe = profile || createMapDomProfile();
  return [
    `data-map-dom-compact="${safe.compact ? "true" : "false"}"`,
    `data-map-dom-aggressive="${safe.aggressive ? "true" : "false"}"`,
    `data-map-dom-node-count="${safe.nodes}"`,
    `data-map-dom-edge-count="${safe.edges}"`,
    `data-map-dom-estimated-elements="${safe.estimatedElements}"`,
  ].join(" ");
}

export const api = Object.freeze({DEFAULTS, createMapDomProfile, mapDomProfileAttributes});
if (typeof window !== "undefined") {
  window.createMapDomProfile = createMapDomProfile;
  window.mapDomProfileAttributes = mapDomProfileAttributes;
}
export default api;
