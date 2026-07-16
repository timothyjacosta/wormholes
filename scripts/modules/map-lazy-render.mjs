/* Wormholes Beta 248 viewport-aware map detail rendering and DOM compaction.
   Shapes, relationships, and stored data remain unchanged. On large maps,
   off-screen text and secondary markers are temporarily detached from the SVG
   and restored before they approach the viewport. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  ("use strict");

  const stateByStage = new WeakMap();
  const stateByWrap = new WeakMap();
  const DEFAULT_MINIMUM_CANDIDATES = 18;
  const LABEL_OVERSCAN_PX = 180;
  const DETAIL_OVERSCAN_PX = 96;
  const DEFAULT_DOM_COMPACT_MINIMUM_CANDIDATES = 48;

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeRect(rect) {
    if (!rect) return null;
    const x = finiteNumber(rect.x, finiteNumber(rect.left));
    const y = finiteNumber(rect.y, finiteNumber(rect.top));
    const width = Math.max(0, finiteNumber(rect.width, finiteNumber(rect.right) - x));
    const height = Math.max(0, finiteNumber(rect.height, finiteNumber(rect.bottom) - y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {x, y, width, height, right: x + width, bottom: y + height};
  }

  function mapLazyRectIntersects(a, b) {
    const first = normalizeRect(a);
    const second = normalizeRect(b);
    if (!first || !second) return true;
    return (
      first.right >= second.x &&
      first.x <= second.right &&
      first.bottom >= second.y &&
      first.y <= second.bottom
    );
  }

  function applyMatrix(point, matrix) {
    if (!matrix) return {x: point.x, y: point.y};
    return {
      x:
        finiteNumber(matrix.a, 1) * point.x +
        finiteNumber(matrix.c) * point.y +
        finiteNumber(matrix.e),
      y:
        finiteNumber(matrix.b) * point.x +
        finiteNumber(matrix.d, 1) * point.y +
        finiteNumber(matrix.f),
    };
  }

  function inverseMatrix(matrix) {
    if (!matrix) return null;
    if (typeof matrix.inverse === "function") {
      try {
        return matrix.inverse();
      } catch (error) {}
    }
    const a = finiteNumber(matrix.a, 1);
    const b = finiteNumber(matrix.b);
    const c = finiteNumber(matrix.c);
    const d = finiteNumber(matrix.d, 1);
    const e = finiteNumber(matrix.e);
    const f = finiteNumber(matrix.f);
    const determinant = a * d - b * c;
    if (Math.abs(determinant) < 1e-9) return null;
    return {
      a: d / determinant,
      b: -b / determinant,
      c: -c / determinant,
      d: a / determinant,
      e: (c * f - d * e) / determinant,
      f: (b * e - a * f) / determinant,
    };
  }

  function rectFromPoints(points) {
    const xs = points.map((point) => finiteNumber(point.x));
    const ys = points.map((point) => finiteNumber(point.y));
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {x: minX, y: minY, width: maxX - minX, height: maxY - minY, right: maxX, bottom: maxY};
  }

  function rootBoundsForElement(element, svg) {
    if (!element) return null;

    /* Browser geometry is the most reliable source here because SVG text and
         badge groups can carry their own transforms. Convert the painted screen
         rectangle back into root SVG coordinates once, then reuse it while panning. */
    try {
      const screenBox = element.getBoundingClientRect?.();
      const svgScreenInverse = inverseMatrix(svg?.getScreenCTM?.());
      if (screenBox && svgScreenInverse && (screenBox.width > 0 || screenBox.height > 0)) {
        return rectFromPoints([
          applyMatrix({x: screenBox.left, y: screenBox.top}, svgScreenInverse),
          applyMatrix({x: screenBox.right, y: screenBox.top}, svgScreenInverse),
          applyMatrix({x: screenBox.left, y: screenBox.bottom}, svgScreenInverse),
          applyMatrix({x: screenBox.right, y: screenBox.bottom}, svgScreenInverse),
        ]);
      }
    } catch (error) {}

    if (typeof element.getBBox !== "function") return null;
    try {
      const fallback = normalizeRect(element.getBBox());
      return fallback && (fallback.width > 0 || fallback.height > 0) ? fallback : null;
    } catch (error) {
      return null;
    }
  }

  function geometryElementForCandidate(element, mode) {
    if (mode !== "labels") return element;
    return element.querySelector?.(":scope > .wormhole-node-shape, :scope > rect") || element;
  }

  function mapCandidateDescriptors(stage) {
    if (!stage?.querySelectorAll) return [];
    const isConnectionsMap =
      stage.id === "connectionsMapStage" || stage.classList?.contains?.("connections-map-stage");
    const labelSelector = isConnectionsMap
      ? ".connection-node"
      : ".wormhole-creation, .wormhole-cluster-title";
    const detailSelector = [
      ".svg-badge-stack",
      ".connection-note-preview",
      ".connection-note-hint",
      ".connection-note-dot",
    ].join(", ");

    return [
      ...Array.from(stage.querySelectorAll(labelSelector)).map((element) => ({
        element,
        ownerElement: element,
        mode: "labels",
      })),
      ...Array.from(stage.querySelectorAll(detailSelector)).map((element) => ({
        element,
        ownerElement:
          element.closest?.(
            ".connection-node, .connection-edge-group, .wormhole-creation, .wormhole-cluster-title, .wormhole-bridge-note-group, .wormhole-cluster",
          ) || element,
        mode: "detail",
      })),
    ];
  }

  function detachableNodesForCandidate(element, mode) {
    if (!element) return [];
    if (mode === "detail") return [element];
    return Array.from(element.children || []).filter((child) => {
      const tagName = String(child.tagName || "").toLowerCase();
      return tagName === "text" || child.classList?.contains?.("wormhole-group-title-overlay");
    });
  }

  function restoreCandidateParts(candidate) {
    (candidate?.parts || []).forEach((part) => {
      if (!part?.detached) return;
      const placeholder = part.placeholder;
      if (placeholder?.parentNode) {
        placeholder.parentNode.replaceChild(part.node, placeholder);
      }
      part.detached = false;
      part.placeholder = null;
    });
  }

  function detachCandidateParts(candidate) {
    let detached = 0;
    (candidate?.parts || []).forEach((part) => {
      if (!part?.node || part.detached || !part.node.parentNode) return;
      const documentRef = part.node.ownerDocument || global.document;
      if (!documentRef?.createComment) return;
      const placeholder = documentRef.createComment("wormholes-map-detail");
      part.node.parentNode.replaceChild(placeholder, part.node);
      part.placeholder = placeholder;
      part.detached = true;
      detached += 1;
    });
    return detached;
  }

  function candidateDetachedPartCount(candidate) {
    return (candidate?.parts || []).reduce((count, part) => count + (part?.detached ? 1 : 0), 0);
  }

  function clearCandidateClasses(candidate) {
    restoreCandidateParts(candidate);
    candidate?.element?.classList?.remove?.(
      "map-lazy-labels-offscreen",
      "map-lazy-detail-offscreen",
    );
    if (candidate?.element?.dataset) delete candidate.element.dataset.mapLazyVisible;
    if (candidate) candidate.visible = true;
  }

  function prepareMapLazyRender(stage, options = {}) {
    if (!stage) return null;
    const svg = stage.querySelector?.("svg");
    const wrap = options.wrap || stage.parentElement;
    if (!svg || !wrap) return null;

    const previousState = stateByStage.get(stage);
    previousState?.resizeObserver?.disconnect?.();
    previousState?.candidates?.forEach?.(clearCandidateClasses);
    const previousWrapState = stateByWrap.get(wrap);
    if (previousWrapState && previousWrapState.stage !== stage) {
      previousWrapState.resizeObserver?.disconnect?.();
      previousWrapState.candidates?.forEach?.(clearCandidateClasses);
      stateByStage.delete(previousWrapState.stage);
    }

    const descriptors = mapCandidateDescriptors(stage);
    const candidates = descriptors
      .map((descriptor) => {
        const geometryElement = geometryElementForCandidate(descriptor.element, descriptor.mode);
        const bounds = rootBoundsForElement(geometryElement, svg);
        return bounds
          ? {
              ...descriptor,
              bounds,
              visible: true,
              parts: detachableNodesForCandidate(descriptor.element, descriptor.mode).map(
                (node) => ({node, placeholder: null, detached: false}),
              ),
            }
          : null;
      })
      .filter(Boolean);

    const minimumCandidates = Math.max(
      1,
      finiteNumber(
        options.minimumCandidates,
        finiteNumber(stage.dataset?.mapLazyMinimum, DEFAULT_MINIMUM_CANDIDATES),
      ),
    );
    const domCompactMinimumCandidates = Math.max(
      minimumCandidates,
      finiteNumber(
        options.domCompactMinimumCandidates,
        finiteNumber(stage.dataset?.mapDomCompactMinimum, DEFAULT_DOM_COMPACT_MINIMUM_CANDIDATES),
      ),
    );
    const domCompactRequested = stage.dataset?.mapDomCompact === "true";
    const state = {
      stage,
      svg,
      wrap,
      candidates,
      descriptorCount: descriptors.length,
      needsMeasurement: candidates.length === 0 && descriptors.length > 0,
      minimumCandidates,
      eligible: candidates.length >= minimumCandidates,
      domCompactMinimumCandidates,
      domCompactEligible: domCompactRequested && candidates.length >= domCompactMinimumCandidates,
      frame: 0,
      resizeObserver: null,
    };

    stateByStage.set(stage, state);
    stateByWrap.set(wrap, state);
    stage.dataset.mapLazyCandidateCount = String(candidates.length);
    stage.dataset.mapLazyEligible = state.eligible ? "true" : "false";
    stage.dataset.mapDomCompactionEligible = state.domCompactEligible ? "true" : "false";
    stage.dataset.mapDomDetachedCount = "0";

    if (!state.eligible) {
      candidates.forEach(clearCandidateClasses);
      stage.classList?.remove?.("map-lazy-active");
      stage.dataset.mapLazyRenderedCount = String(candidates.length);
      stage.dataset.mapLazyDeferredCount = "0";
    }

    if (typeof global.ResizeObserver === "function") {
      try {
        state.resizeObserver = new global.ResizeObserver(() => scheduleMapLazyRender(stage, wrap));
        state.resizeObserver.observe(wrap);
      } catch (error) {}
    }

    return state;
  }

  function mapViewportInSvg(svg, wrap, overscanPx) {
    if (!svg || !wrap?.getBoundingClientRect) return null;
    const screenRect = wrap.getBoundingClientRect();
    const inverse = inverseMatrix(svg.getScreenCTM?.());
    if (!inverse) return null;

    const overscan = Math.max(0, finiteNumber(overscanPx));
    const left = screenRect.left - overscan;
    const top = screenRect.top - overscan;
    const right = screenRect.right + overscan;
    const bottom = screenRect.bottom + overscan;
    return rectFromPoints([
      applyMatrix({x: left, y: top}, inverse),
      applyMatrix({x: right, y: top}, inverse),
      applyMatrix({x: left, y: bottom}, inverse),
      applyMatrix({x: right, y: bottom}, inverse),
    ]);
  }

  function setCandidateVisible(candidate, visible, options = {}) {
    if (!candidate?.element) return;
    const nextVisible = !!visible;
    const compactDom = options.compactDom === true;
    if (nextVisible) {
      restoreCandidateParts(candidate);
    } else if (compactDom) {
      detachCandidateParts(candidate);
    }
    candidate.visible = nextVisible;
    const offscreenClass =
      candidate.mode === "labels" ? "map-lazy-labels-offscreen" : "map-lazy-detail-offscreen";
    candidate.element.classList?.toggle?.(offscreenClass, !nextVisible);
    if (candidate.element.dataset)
      candidate.element.dataset.mapLazyVisible = nextVisible ? "true" : "false";
  }

  function candidateMustRender(candidate) {
    const element = candidate?.element;
    const ownerElement = candidate?.ownerElement || element;
    if (!element) return false;
    try {
      if (element.matches?.(":focus, .selected, .connected, .focus-member, .bridge-source"))
        return true;
      if (
        ownerElement?.matches?.(
          ":focus, .selected, .connected, .focus-member, .bridge-source, .focused",
        )
      )
        return true;
      if (ownerElement?.closest?.(".selected, .connected, .focus-member, .bridge-source, .focused"))
        return true;
    } catch (error) {}
    return false;
  }

  function applyMapLazyCandidates(candidates, labelViewport, detailViewport, options = {}) {
    let rendered = 0;
    let deferred = 0;
    (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
      const viewport = candidate.mode === "labels" ? labelViewport : detailViewport;
      const visible =
        candidateMustRender(candidate) ||
        !viewport ||
        mapLazyRectIntersects(candidate.bounds, viewport);
      setCandidateVisible(candidate, visible, options);
      if (visible) rendered += 1;
      else deferred += 1;
    });
    const detached = (Array.isArray(candidates) ? candidates : []).reduce(
      (count, candidate) => count + candidateDetachedPartCount(candidate),
      0,
    );
    return {rendered, deferred, detached};
  }

  function updateMapLazyRenderState(stage, wrap = null) {
    if (!stage) return {rendered: 0, deferred: 0, active: false};
    let state = stateByStage.get(stage);
    if (!state || state.svg !== stage.querySelector?.("svg") || state.needsMeasurement) {
      state = prepareMapLazyRender(stage, {wrap: wrap || state?.wrap || stage.parentElement});
    }
    if (!state) return {rendered: 0, deferred: 0, active: false};
    if (wrap) state.wrap = wrap;

    if (!state.eligible) {
      return {rendered: state.candidates.length, deferred: 0, detached: 0, active: false};
    }

    const labelViewport = mapViewportInSvg(state.svg, state.wrap, LABEL_OVERSCAN_PX);
    const detailViewport = mapViewportInSvg(state.svg, state.wrap, DETAIL_OVERSCAN_PX);
    if (!labelViewport || !detailViewport) {
      state.candidates.forEach(clearCandidateClasses);
      stage.classList?.remove?.("map-lazy-active");
      stage.dataset.mapLazyRenderedCount = String(state.candidates.length);
      stage.dataset.mapLazyDeferredCount = "0";
      stage.dataset.mapDomDetachedCount = "0";
      return {rendered: state.candidates.length, deferred: 0, detached: 0, active: false};
    }

    const counts = applyMapLazyCandidates(state.candidates, labelViewport, detailViewport, {
      compactDom: state.domCompactEligible,
    });
    stage.classList?.add?.("map-lazy-active");
    stage.classList?.toggle?.(
      "map-dom-compaction-active",
      state.domCompactEligible && counts.detached > 0,
    );
    stage.dataset.mapLazyRenderedCount = String(counts.rendered);
    stage.dataset.mapLazyDeferredCount = String(counts.deferred);
    stage.dataset.mapDomDetachedCount = String(counts.detached);
    return {
      ...counts,
      active: true,
      domCompactionActive: state.domCompactEligible && counts.detached > 0,
    };
  }

  function scheduleMapLazyRender(stage, wrap = null) {
    if (!stage) return;
    let state = stateByStage.get(stage);
    if (!state) {
      state = prepareMapLazyRender(stage, {wrap: wrap || stage.parentElement});
      if (!state) return;
    }
    if (wrap) state.wrap = wrap;
    if (state.frame) return;

    const requestFrame =
      typeof global.requestAnimationFrame === "function"
        ? global.requestAnimationFrame.bind(global)
        : (callback) => global.setTimeout(callback, 0);
    state.frame = requestFrame(() => {
      state.frame = 0;
      if (stage.isConnected === false) return;
      updateMapLazyRenderState(stage, state.wrap);
    });
  }

  function resetMapLazyRender(stage) {
    const state = stateByStage.get(stage);
    if (!state) return;
    state.resizeObserver?.disconnect?.();
    state.candidates.forEach(clearCandidateClasses);
    stage.classList?.remove?.("map-lazy-active", "map-dom-compaction-active");
    if (stage.dataset) stage.dataset.mapDomDetachedCount = "0";
    stateByStage.delete(stage);
    if (stateByWrap.get(state.wrap) === state) stateByWrap.delete(state.wrap);
  }

  global.mapLazyRectIntersects = mapLazyRectIntersects;
  global.applyMapLazyCandidates = applyMapLazyCandidates;
  global.prepareMapLazyRender = prepareMapLazyRender;
  global.updateMapLazyRenderState = updateMapLazyRenderState;
  global.scheduleMapLazyRender = scheduleMapLazyRender;
  global.resetMapLazyRender = resetMapLazyRender;

  const moduleApi = Object.freeze({
    mapLazyRectIntersects,
    applyMapLazyCandidates,
    prepareMapLazyRender,
    updateMapLazyRenderState,
    scheduleMapLazyRender,
    resetMapLazyRender,
  });
  global.WormholesMapLazyRender = moduleApi;
  return global.WormholesMapLazyRender;
}

export const api = install(globalThis);
export default api;
