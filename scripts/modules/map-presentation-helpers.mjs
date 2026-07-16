/* Wormholes Beta 250 map presentation helpers.
   Owns shared SVG badge scaling, geometry, text fitting, edge clipping, and
   collision-aware note placement used by both map controllers. */

function svgBadgeTransform(x, y, scale = 1) {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return `translate(${x}, ${y}) scale(${safeScale})`;
}

function svgBadgeStackTransform(x, y, offsetScale = 1) {
  const safeOffsetScale = Number.isFinite(offsetScale) && offsetScale > 0 ? offsetScale : 1;
  return `translate(${x}, ${y}) scale(${safeOffsetScale})`;
}

function svgBadgeIconTransform(localX = 0, iconScale = 1, offsetScale = 1) {
  const safeLocalX = Number.isFinite(localX) ? localX : 0;
  const safeIconScale = Number.isFinite(iconScale) && iconScale > 0 ? iconScale : 1;
  const safeOffsetScale = Number.isFinite(offsetScale) && offsetScale > 0 ? offsetScale : 1;
  return `translate(${safeLocalX}, 0) scale(${safeIconScale / safeOffsetScale})`;
}

function mapBadgeScaleForZoom(zoom) {
  /*
    Beta 75: restore the smaller, map-attached badge behavior.
    Badges remain present at every zoom level, but they scale naturally with
    the map instead of counter-scaling into oversized icons at fit-map zoom.
  */
  return 1;
}

function mapBadgeOffsetScaleForZoom(zoom) {
  /* Keep sibling badge spacing in the same local coordinate system as before. */
  return 1;
}

function mapConnectionBadgeScaleForZoom(zoom) {
  /*
    Beta 75: the Connections map uses rectangular nodes, so the page/camera
    badges read larger than the same artwork on the Manage Bridges galaxy.
    Keep them map-attached and naturally zooming, but start from a smaller base.
  */
  return 0.62;
}

function mapConnectionBadgeOffsetScaleForZoom(zoom) {
  /* Preserve sibling spacing while reducing the whole badge cluster. */
  return 0.72;
}

function updateSvgMapBadgeScale(root, zoom) {
  const isConnectionsMap =
    root?.id === "connectionsMapStage" || root?.classList?.contains("connections-map-stage");
  const iconScale = isConnectionsMap
    ? mapConnectionBadgeScaleForZoom(zoom)
    : mapBadgeScaleForZoom(zoom);
  const offsetScale = isConnectionsMap
    ? mapConnectionBadgeOffsetScaleForZoom(zoom)
    : mapBadgeOffsetScaleForZoom(zoom);

  root?.querySelectorAll?.(".svg-badge-stack").forEach((stack) => {
    const x = parseFloat(stack.dataset.badgeX);
    const y = parseFloat(stack.dataset.badgeY);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      stack.setAttribute("transform", svgBadgeStackTransform(x, y, offsetScale));
      stack
        .querySelectorAll(".svg-literature-indicator, .svg-vision-indicator")
        .forEach((badge) => {
          const localX = parseFloat(badge.dataset.badgeLocalX || "0");
          badge.setAttribute("transform", svgBadgeIconTransform(localX, iconScale, offsetScale));
        });
    }
  });

  root?.querySelectorAll?.(".svg-literature-indicator, .svg-vision-indicator").forEach((badge) => {
    if (badge.closest?.(".svg-badge-stack")) return;
    const x = parseFloat(badge.dataset.badgeX);
    const y = parseFloat(badge.dataset.badgeY);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      badge.setAttribute("transform", svgBadgeTransform(x, y, iconScale));
    }
  });
}

function updateMapReadabilityState(root, zoom) {
  if (!root) return;

  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  /*
    Beta 75: use gentler semantic zoom. Text remains readable at fit-map
    scale, but the bubble itself also grows so the label stays visually seated
    inside its node instead of floating beyond it.
  */
  const minimumReadableZoom = 0.58;
  const readabilityRatio = safeZoom < minimumReadableZoom ? minimumReadableZoom / safeZoom : 1;
  const labelScale =
    safeZoom < minimumReadableZoom ? Math.min(1.46, 1 + (readabilityRatio - 1) * 0.34) : 1;
  const bubbleFitScale =
    safeZoom < minimumReadableZoom ? Math.min(1.58, 1 + (readabilityRatio - 1) * 0.56) : 1;

  root.style.setProperty("--map-label-scale", String(Number(labelScale.toFixed(3))));
  root.style.setProperty("--map-bubble-fit-scale", String(Number(bubbleFitScale.toFixed(3))));
  root.dataset.mapZoom = String(Number(safeZoom.toFixed(3)));
  root.classList.toggle("map-zoom-compact", safeZoom < 0.62);
  root.classList.toggle("map-zoom-far", safeZoom < 0.34);
  root.classList.toggle("map-zoom-readable", labelScale > 1.01);
}

function notePointNearSource(ax, ay, bx, by, ratio = 0.32) {
  const mx = ax + (bx - ax) * ratio;
  const my = ay + (by - ay) * ratio;
  return {mx, my};
}

function shapeCenter(shape) {
  if (!shape) return {x: 0, y: 0};
  if (Number.isFinite(shape.cx) && Number.isFinite(shape.cy)) {
    return {x: shape.cx, y: shape.cy};
  }
  return {
    x: (shape.x || 0) + (shape.w || 0) / 2,
    y: (shape.y || 0) + (shape.h || 0) / 2,
  };
}

function pointOnCircleOutline(shape, toward) {
  const center = shapeCenter(shape);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const distance = Math.hypot(dx, dy) || 1;
  const r = Math.max(0, shape.r || Math.min(shape.w || 0, shape.h || 0) / 2 || 0);
  return {
    x: center.x + (dx / distance) * r,
    y: center.y + (dy / distance) * r,
  };
}

function pointOnEllipseOutline(shape, toward) {
  const center = shapeCenter(shape);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return center;

  const rx = Math.max(1, shape.rx || (shape.w || 0) / 2 || shape.r || 1);
  const ry = Math.max(1, shape.ry || (shape.h || 0) / 2 || shape.r || 1);
  const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function pointOnCapsuleOutline(shape, toward) {
  const center = shapeCenter(shape);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return center;

  const w = Math.max(2, shape.w || (shape.rx || shape.r || 1) * 2);
  const h = Math.max(2, shape.h || (shape.ry || shape.r || 1) * 2);
  const halfW = w / 2;
  const halfH = h / 2;

  if (w < h) {
    return pointOnEllipseOutline(
      {type: "ellipse", cx: center.x, cy: center.y, rx: halfW, ry: halfH},
      toward,
    );
  }

  const radius = Math.max(1, Math.min(halfH, halfW));
  const straightHalf = Math.max(0, halfW - radius);
  const candidates = [];

  if (Math.abs(dy) > 0.0001) {
    [-radius, radius].forEach((localY) => {
      const t = localY / dy;
      if (t > 0) {
        const localX = dx * t;
        if (Math.abs(localX) <= straightHalf + 0.001) {
          candidates.push(t);
        }
      }
    });
  }

  [-straightHalf, straightHalf].forEach((capCx) => {
    const a = dx * dx + dy * dy;
    const b = -2 * capCx * dx;
    const c = capCx * capCx - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc >= 0 && a > 0) {
      const root = Math.sqrt(disc);
      const t1 = (-b - root) / (2 * a);
      const t2 = (-b + root) / (2 * a);
      [t1, t2].forEach((t) => {
        if (t > 0) {
          const localX = dx * t;
          if (
            (capCx < 0 && localX <= -straightHalf + 0.001) ||
            (capCx > 0 && localX >= straightHalf - 0.001)
          ) {
            candidates.push(t);
          }
        }
      });
    }
  });

  const t = candidates.length
    ? Math.min(...candidates)
    : 1 / Math.sqrt((dx * dx) / (halfW * halfW) + (dy * dy) / (halfH * halfH));
  return {x: center.x + dx * t, y: center.y + dy * t};
}

function capsuleShapeFromPosition(pos, fallbackR = 34) {
  const cx = Number.isFinite(pos?.cx) ? pos.cx : (pos?.x || 0) + (pos?.w || 0) / 2;
  const cy = Number.isFinite(pos?.cy) ? pos.cy : (pos?.y || 0) + (pos?.h || 0) / 2;
  const rx = Math.max(1, pos?.rx || (pos?.w || 0) / 2 || pos?.r || fallbackR);
  const ry = Math.max(1, pos?.ry || (pos?.h || 0) / 2 || pos?.r || fallbackR);
  return {
    type: "rect",
    cx,
    cy,
    rx,
    ry,
    r: Math.max(rx, ry),
    x: cx - rx,
    y: cy - ry,
    w: rx * 2,
    h: ry * 2,
  };
}

function capsuleRectSvg(cx, cy, rx, ry, className = "", style = "") {
  /*
    Beta 75: match the Connections modal's rounded-rectangle node language
    in the Manage Bridges map. Lines use the same unscaled dimensions.
  */
  const safeRx = Math.max(1, rx || 1);
  const safeRy = Math.max(1, ry || 1);
  const corner = Math.min(18, Math.max(10, safeRy * 0.34));
  const classAttr = className ? ` class="${className}"` : "";
  const styleAttr = style ? ` style="${style}"` : "";
  return `<rect${classAttr} x="${cx - safeRx}" y="${cy - safeRy}" width="${safeRx * 2}" height="${safeRy * 2}" rx="${corner}" ry="${corner}"${styleAttr}></rect>`;
}

function orbitCapsuleRectSvg(cx, cy, rx, ry, className = "") {
  /*
    Beta 75: keep the orbit path as a smooth oval, matching the Connections
    modal's orbit feel while nodes use rounded rectangles.
  */
  const safeRx = Math.max(rx * 1.18, rx + 48);
  const safeRy = Math.max(ry * 0.82, 64);
  const classAttr = className ? ` class="${className}"` : "";
  return `<ellipse${classAttr} cx="${cx}" cy="${cy}" rx="${safeRx}" ry="${safeRy}"></ellipse>`;
}

function wormholeNodeTextX(pos, padding = 18) {
  return (pos.cx || 0) - (pos.rx || pos.r || 0) + padding;
}

function pointOnRectOutline(shape, toward) {
  const center = shapeCenter(shape);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return center;

  const halfW = Math.max(1, (shape.w || 0) / 2);
  const halfH = Math.max(1, (shape.h || 0) / 2);
  const scaleX = Math.abs(dx) < 0.0001 ? Infinity : halfW / Math.abs(dx);
  const scaleY = Math.abs(dy) < 0.0001 ? Infinity : halfH / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function pointOnShapeOutline(shape, toward) {
  if (!shape) return toward || {x: 0, y: 0};
  if (shape.type === "capsule") {
    return pointOnCapsuleOutline(shape, toward);
  }
  if (shape.type === "ellipse" || (Number.isFinite(shape.rx) && Number.isFinite(shape.ry))) {
    return pointOnEllipseOutline(shape, toward);
  }
  if (shape.type === "circle" || Number.isFinite(shape.r)) {
    return pointOnCircleOutline(shape, toward);
  }
  return pointOnRectOutline(shape, toward);
}

function clippedLineBetweenShapes(sourceShape, targetShape) {
  const sourceCenter = shapeCenter(sourceShape);
  const targetCenter = shapeCenter(targetShape);
  const start = pointOnShapeOutline(sourceShape, targetCenter);
  const end = pointOnShapeOutline(targetShape, sourceCenter);
  return {
    ax: start.x,
    ay: start.y,
    bx: end.x,
    by: end.y,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
  };
}

function rectShapeFromPosition(pos, w, h) {
  return {type: "rect", x: pos.x, y: pos.y, w, h};
}

function edgeEndpointDots(edge, className = "") {
  const safeClass = className ? ` ${className}` : "";
  return `
    <circle class="map-edge-endpoint${safeClass}" cx="${edge.ax}" cy="${edge.ay}" r="4.2"></circle>
    <circle class="map-edge-endpoint${safeClass}" cx="${edge.bx}" cy="${edge.by}" r="4.2"></circle>
  `;
}

function approximateTextWidth(text, fontSize = 12) {
  return (String(text || "").length || 0) * fontSize * 0.56;
}

function fitTextToWidth(text, maxWidth, maxFontSize = 13, minFontSize = 8) {
  let fontSize = maxFontSize;
  let safeText = String(text || "");

  while (fontSize > minFontSize && approximateTextWidth(safeText, fontSize) > maxWidth) {
    fontSize -= 0.5;
  }

  if (approximateTextWidth(safeText, fontSize) > maxWidth) {
    while (safeText.length > 1 && approximateTextWidth(safeText + "…", fontSize) > maxWidth) {
      safeText = safeText.slice(0, -1);
    }
    safeText += "…";
  }

  return {
    text: safeText,
    fontSize: Number(fontSize.toFixed(1)),
  };
}

function wrapTextToLines(text, maxWidth, fontSize) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [""];

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (approximateTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  lines.push(current);
  return lines;
}

function fitTextToBubble(
  text,
  maxInnerWidth = 150,
  maxFontSize = 13,
  minFontSize = 8,
  maxLines = 3,
) {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
    const lines = wrapTextToLines(text, maxInnerWidth, fontSize);

    if (lines.length <= maxLines) {
      const widest = Math.max(...lines.map((line) => approximateTextWidth(line, fontSize)), 0);
      return {
        lines,
        fontSize: Number(fontSize.toFixed(1)),
        lineHeight: Math.max(10, fontSize * 1.08),
        rx: Math.max(88, Math.min(160, widest / 2 + 18)),
        ry: Math.max(34, 18 + lines.length * fontSize * 0.72),
      };
    }
  }

  const fallback = fitTextToWidth(text, maxInnerWidth, minFontSize, minFontSize);
  return {
    lines: [fallback.text],
    fontSize: fallback.fontSize,
    lineHeight: Math.max(10, fallback.fontSize * 1.08),
    rx: Math.max(
      88,
      Math.min(160, approximateTextWidth(fallback.text, fallback.fontSize) / 2 + 18),
    ),
    ry: 34,
  };
}

function fitTextToCircle(
  text,
  maxInnerWidth = 140,
  maxFontSize = 13,
  minFontSize = 7.5,
  maxLines = 4,
  minRadius = 36,
  maxRadius = 88,
) {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
    const lines = wrapTextToLines(text, maxInnerWidth, fontSize);
    if (lines.length <= maxLines) {
      const lineHeight = Math.max(10, fontSize * 1.08);
      const widest = Math.max(...lines.map((line) => approximateTextWidth(line, fontSize)), 0);
      const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
      const rx = Math.max(Math.max(minRadius, 86), Math.min(maxRadius * 1.28, widest / 2 + 34));
      const ry = Math.max(minRadius * 0.6, Math.min(maxRadius * 0.9, totalHeight / 2 + 22));
      const r = Math.max(rx, ry);
      return {lines, fontSize: Number(fontSize.toFixed(1)), lineHeight, totalHeight, r, rx, ry};
    }
  }
  const fallback = fitTextToWidth(text, maxInnerWidth, minFontSize, minFontSize);
  const lineHeight = Math.max(10, fallback.fontSize * 1.08);
  return {
    lines: [fallback.text],
    fontSize: fallback.fontSize,
    lineHeight,
    totalHeight: lineHeight,
    r: Math.max(
      Math.max(
        Math.max(minRadius, 86),
        Math.min(maxRadius * 1.28, approximateTextWidth(fallback.text, fallback.fontSize) / 2 + 34),
      ),
      Math.max(minRadius * 0.6, Math.min(maxRadius * 0.9, lineHeight / 2 + 22)),
    ),
    rx: Math.max(
      Math.max(minRadius, 86),
      Math.min(maxRadius * 1.28, approximateTextWidth(fallback.text, fallback.fontSize) / 2 + 34),
    ),
    ry: Math.max(minRadius * 0.6, Math.min(maxRadius * 0.9, lineHeight / 2 + 22)),
  };
}

function fitCreationCircle(title, subtitle, sizeFactor = 1) {
  let mutableTitle = String(title || "");
  let mutableSubtitle = String(subtitle || "");
  let titleFontSize = Math.max(10.2, 13.8 * sizeFactor);
  let subtitleFontSize = Math.max(8.2, 9.6 * sizeFactor);
  const maxTitleLines = 4;
  const maxSubtitleLines = 2;
  const maxInnerWidth = Math.max(164, 202 * sizeFactor);

  let titleLines = [];
  let subtitleLines = [];
  for (let guard = 0; guard < 18; guard += 1) {
    titleLines = wrapTextToLines(mutableTitle, maxInnerWidth, titleFontSize);
    subtitleLines = wrapTextToLines(mutableSubtitle, maxInnerWidth, subtitleFontSize);
    if (titleLines.length <= maxTitleLines && subtitleLines.length <= maxSubtitleLines) {
      break;
    }
    if (titleLines.length > maxTitleLines) titleFontSize = Math.max(8.8, titleFontSize - 0.45);
    if (subtitleLines.length > maxSubtitleLines)
      subtitleFontSize = Math.max(7.2, subtitleFontSize - 0.35);
  }

  while (titleLines.length > maxTitleLines && mutableTitle.length > 1) {
    mutableTitle = mutableTitle.slice(0, -1);
    titleLines = wrapTextToLines(`${mutableTitle}…`, maxInnerWidth, titleFontSize);
  }
  if (titleLines.length && mutableTitle !== String(title || "")) {
    titleLines[titleLines.length - 1] = `${titleLines[titleLines.length - 1].replace(/…?$/, "")}…`;
  }

  while (subtitleLines.length > maxSubtitleLines && mutableSubtitle.length > 1) {
    mutableSubtitle = mutableSubtitle.slice(0, -1);
    subtitleLines = wrapTextToLines(`${mutableSubtitle}…`, maxInnerWidth, subtitleFontSize);
  }
  if (subtitleLines.length && mutableSubtitle !== String(subtitle || "")) {
    subtitleLines[subtitleLines.length - 1] =
      `${subtitleLines[subtitleLines.length - 1].replace(/…?$/, "")}…`;
  }

  const titleLineHeight = Math.max(10, titleFontSize * 1.06);
  const subtitleLineHeight = Math.max(8, subtitleFontSize * 1.05);
  const subtitleGap = subtitleLines.length ? Math.max(8, 8 * sizeFactor) : 0;
  const widest = Math.max(
    ...titleLines.map((line) => approximateTextWidth(line, titleFontSize)),
    ...subtitleLines.map((line) => approximateTextWidth(line, subtitleFontSize)),
    0,
  );
  const totalHeight =
    titleLines.length * titleLineHeight +
    (subtitleLines.length ? subtitleGap + (subtitleLines.length + 1) * subtitleLineHeight : 0);
  const rx = Math.max(78 * sizeFactor, Math.min(182 * sizeFactor + 30, widest / 2 + 38));
  const ry = Math.max(30 * sizeFactor, Math.min(66 * sizeFactor + 12, totalHeight / 2 + 22));
  const r = Math.max(rx, ry);

  return {
    titleLines,
    subtitleLines,
    titleFontSize: Number(titleFontSize.toFixed(1)),
    subtitleFontSize: Number(subtitleFontSize.toFixed(1)),
    titleLineHeight,
    subtitleLineHeight,
    subtitleGap,
    totalHeight,
    r,
    rx,
    ry,
  };
}

function fitWormholeGroupCircle(groupEntry, childEntries = [], sizeFactor = 1) {
  const safeChildren = childEntries.length ? childEntries : [];
  const childCount = safeChildren.length;
  const maxInnerWidth = Math.max(174, Math.min(360, 212 * sizeFactor + childCount * 14));
  let titleFontSize = Math.max(10.4, 13.8 * sizeFactor);
  let childFontSize = Math.max(8.2, 9.8 * sizeFactor);
  const maxTitleLines = 3;

  let titleLines = wrapTextToLines(groupEntry?.title || "Group", maxInnerWidth, titleFontSize);
  while (titleLines.length > maxTitleLines && titleFontSize > 8.8) {
    titleFontSize -= 0.5;
    titleLines = wrapTextToLines(groupEntry?.title || "Group", maxInnerWidth, titleFontSize);
  }

  if (titleLines.length > maxTitleLines) {
    titleLines = titleLines.slice(0, maxTitleLines);
    titleLines[titleLines.length - 1] = `${titleLines[titleLines.length - 1].replace(/…?$/, "")}…`;
  }

  const childLines = [];
  safeChildren.forEach((child) => {
    let childTitle = String(child?.title || "Untitled");
    let wrapped = wrapTextToLines(childTitle, maxInnerWidth - 12, childFontSize);
    let guard = 0;
    while (wrapped.length > 2 && childFontSize > 7.4 && guard < 8) {
      childFontSize -= 0.35;
      wrapped = wrapTextToLines(childTitle, maxInnerWidth - 12, childFontSize);
      guard += 1;
    }

    if (wrapped.length > 2) {
      wrapped = wrapped.slice(0, 2);
      wrapped[wrapped.length - 1] = `${wrapped[wrapped.length - 1].replace(/…?$/, "")}…`;
    }

    wrapped.forEach((line, index) => {
      childLines.push({
        text: index === 0 ? `• ${line}` : `  ${line}`,
        continued: index > 0,
      });
    });
  });

  if (childLines.length === 0) {
    childLines.push({text: "• Empty group", continued: false});
  }

  const titleLineHeight = Math.max(10, titleFontSize * 1.08);
  const childLineHeight = Math.max(8, childFontSize * 1.12);
  const dividerGap = Math.max(8, 8 * sizeFactor);
  const totalHeight =
    titleLines.length * titleLineHeight + dividerGap + childLines.length * childLineHeight;

  const widest = Math.max(
    ...titleLines.map((line) => approximateTextWidth(line, titleFontSize)),
    ...childLines.map((line) => approximateTextWidth(line.text, childFontSize)),
    0,
  );

  const rx = Math.max(
    76 * sizeFactor,
    Math.min(252, Math.max(widest / 2 + 40, 66 + childCount * 8)),
  );
  const ry = Math.max(
    56 * sizeFactor,
    Math.min(198, Math.max(totalHeight / 2 + 32, 54 + childCount * 6)),
  );
  const r = Math.max(rx, ry);

  return {
    isGroupFit: true,
    titleLines,
    childLines,
    titleFontSize: Number(titleFontSize.toFixed(1)),
    childFontSize: Number(childFontSize.toFixed(1)),
    titleLineHeight,
    childLineHeight,
    dividerGap,
    totalHeight,
    r,
    rx,
    ry,
  };
}

function pointInsideRect(px, py, rect, pad = 0) {
  return (
    px >= rect.x - pad &&
    px <= rect.x + rect.w + pad &&
    py >= rect.y - pad &&
    py <= rect.y + rect.h + pad
  );
}

function distancePointToRect(px, py, rect) {
  const rx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const ry = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  return Math.hypot(px - rx, py - ry);
}

function distancePointToSegment(px, py, segment) {
  const ax = segment.ax;
  const ay = segment.ay;
  const bx = segment.bx;
  const by = segment.by;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function notePointAvoidingRects(
  ax,
  ay,
  bx,
  by,
  occupiedRects = [],
  occupiedPoints = [],
  blockingSegments = [],
  preferredRatio = 0.32,
) {
  const dx = bx - ax;
  const dy = by - ay;

  /*
    Dots must stay attached to the string they describe.
    This helper only moves dots along their own line segment; it never offsets them away from the string.
  */
  const ratioCandidates = [
    preferredRatio,
    Math.min(0.86, preferredRatio + 0.1),
    Math.max(0.14, preferredRatio - 0.1),
    0.5,
    0.62,
    0.74,
    0.82,
    0.24,
    0.18,
    0.38,
    0.44,
    0.56,
    0.68,
  ];

  let best = null;

  for (const ratio of ratioCandidates) {
    const mx = ax + dx * ratio;
    const my = ay + dy * ratio;

    let rectCollisions = 0;
    let pointCollisions = 0;
    let segmentCollisions = 0;

    let minRectClearance = Infinity;
    let minPointClearance = Infinity;
    let minSegmentClearance = Infinity;

    occupiedRects.forEach((rect) => {
      if (pointInsideRect(mx, my, rect, 10)) {
        rectCollisions += 1;
      }
      minRectClearance = Math.min(minRectClearance, distancePointToRect(mx, my, rect));
    });

    occupiedPoints.forEach((point) => {
      const dist = Math.hypot(mx - point.x, my - point.y);
      if (dist < 18) {
        pointCollisions += 1;
      }
      minPointClearance = Math.min(minPointClearance, dist);
    });

    blockingSegments.forEach((segment) => {
      const dist = distancePointToSegment(mx, my, segment);
      if (dist < 12) {
        segmentCollisions += 1;
      }
      minSegmentClearance = Math.min(minSegmentClearance, dist);
    });

    if (!Number.isFinite(minRectClearance)) minRectClearance = 80;
    if (!Number.isFinite(minPointClearance)) minPointClearance = 80;
    if (!Number.isFinite(minSegmentClearance)) minSegmentClearance = 80;

    const score =
      rectCollisions * 3000 +
      pointCollisions * 2600 +
      segmentCollisions * 2200 -
      minRectClearance * 1.0 -
      minPointClearance * 1.3 -
      minSegmentClearance * 1.1 +
      Math.abs(ratio - preferredRatio) * 35;

    if (!best || score < best.score) {
      best = {mx, my, score};
    }
  }

  return best ? {mx: best.mx, my: best.my} : notePointNearSource(ax, ay, bx, by, preferredRatio);
}

const MAP_PRESENTATION_HELPERS = Object.freeze({
  svgBadgeTransform,
  svgBadgeStackTransform,
  svgBadgeIconTransform,
  mapBadgeScaleForZoom,
  mapBadgeOffsetScaleForZoom,
  mapConnectionBadgeScaleForZoom,
  mapConnectionBadgeOffsetScaleForZoom,
  updateSvgMapBadgeScale,
  updateMapReadabilityState,
  notePointNearSource,
  shapeCenter,
  pointOnCircleOutline,
  pointOnEllipseOutline,
  pointOnCapsuleOutline,
  capsuleShapeFromPosition,
  capsuleRectSvg,
  orbitCapsuleRectSvg,
  wormholeNodeTextX,
  pointOnRectOutline,
  pointOnShapeOutline,
  clippedLineBetweenShapes,
  rectShapeFromPosition,
  edgeEndpointDots,
  approximateTextWidth,
  fitTextToWidth,
  wrapTextToLines,
  fitTextToBubble,
  fitTextToCircle,
  fitCreationCircle,
  fitWormholeGroupCircle,
  pointInsideRect,
  distancePointToRect,
  distancePointToSegment,
  notePointAvoidingRects,
});

export function installLegacyMapPresentationBindings(target = globalThis) {
  Object.assign(target, MAP_PRESENTATION_HELPERS);
  target.WormholesMapPresentation = MAP_PRESENTATION_HELPERS;
  return MAP_PRESENTATION_HELPERS;
}

if (typeof window !== "undefined") installLegacyMapPresentationBindings(window);

export {
  svgBadgeTransform,
  svgBadgeStackTransform,
  svgBadgeIconTransform,
  mapBadgeScaleForZoom,
  mapBadgeOffsetScaleForZoom,
  mapConnectionBadgeScaleForZoom,
  mapConnectionBadgeOffsetScaleForZoom,
  updateSvgMapBadgeScale,
  updateMapReadabilityState,
  notePointNearSource,
  shapeCenter,
  pointOnCircleOutline,
  pointOnEllipseOutline,
  pointOnCapsuleOutline,
  capsuleShapeFromPosition,
  capsuleRectSvg,
  orbitCapsuleRectSvg,
  wormholeNodeTextX,
  pointOnRectOutline,
  pointOnShapeOutline,
  clippedLineBetweenShapes,
  rectShapeFromPosition,
  edgeEndpointDots,
  approximateTextWidth,
  fitTextToWidth,
  wrapTextToLines,
  fitTextToBubble,
  fitTextToCircle,
  fitCreationCircle,
  fitWormholeGroupCircle,
  pointInsideRect,
  distancePointToRect,
  distancePointToSegment,
  notePointAvoidingRects,
};
