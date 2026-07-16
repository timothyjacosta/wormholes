/* Wormholes Beta 256 map inspector and list-view orchestration boundary.
   Accessible text-map inspection and list-view modal behavior are separated from app-core.
   Native execution imports owned state directly and reaches cross-feature behavior through
   the controller-service contract instead of bare compatibility globals. */

import {api as importedMapInspectorSafeRenderApi} from "./safe-render.mjs";
import {universes, currentUniverseId, archiveEntries} from "./app-state-domain.mjs";
import {controllerServices as importedMapInspectorControllerServices} from "./controller-service-registry.mjs";

const mapInspectorSafeRenderApi =
  typeof importedMapInspectorSafeRenderApi !== "undefined"
    ? importedMapInspectorSafeRenderApi
    : globalThis.WormholesSafeRender;
const mapInspectorServices =
  typeof importedMapInspectorControllerServices !== "undefined"
    ? importedMapInspectorControllerServices
    : globalThis.controllerServices || globalThis;
function ensureMapListViewModal() {
  let modal = document.getElementById("mapListViewModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "mapListViewModal";
  modal.className = "modal-backdrop map-list-view-backdrop";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "mapListViewTitle");
  modal.dataset.escapeDismiss = "closeMapListViewBtn";
  modal.dataset.backdropDismiss = "same";
  modal.dataset.dialogKind = "viewer";
  modal.dataset.dialogInitialFocus = "closeMapListViewBtn";
  modal.innerHTML = `
    <div class="modal map-list-view-modal">
      <div class="archive-header">
        <h2 id="mapListViewTitle">Map List View</h2>
        <div class="archive-header-actions">
          <button class="small-archive-button app-button" data-app-button="true" id="closeMapListViewBtn" type="button">Close</button>
        </div>
      </div>
      <p class="map-list-view-intro" id="mapListViewIntro">A plain-text companion view for the current map.</p>
      <div class="map-list-view-content" id="mapListViewContent"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#closeMapListViewBtn")?.addEventListener("click", closeMapListView);

  modal.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-map-list-entity-toggle]");
    if (toggle && modal.contains(toggle)) {
      event.preventDefault();
      event.stopPropagation();
      const panelKey = toggle.dataset.mapListEntityToggle || "";
      const panel = Array.from(modal.querySelectorAll("[data-map-list-entity-panel]")).find(
        (item) => item.dataset.mapListEntityPanel === panelKey,
      );
      const card = toggle.closest("details");
      if (card) card.open = true;
      if (panel) {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      }
      return;
    }

    const jump = event.target.closest("[data-map-list-jump-to]");
    if (jump && modal.contains(jump)) {
      event.preventDefault();
      event.stopPropagation();
      const targetKey = jump.dataset.mapListJumpTo || "";
      const target = Array.from(modal.querySelectorAll("[data-map-list-entity-key]")).find(
        (item) => item.dataset.mapListEntityKey === targetKey,
      );
      if (target) {
        let parent = target.closest("details");
        while (parent) {
          parent.open = true;
          parent = parent.parentElement?.closest("details");
        }
        target.scrollIntoView({behavior: "smooth", block: "center"});
        target.classList.add("map-list-jump-highlight");
        setTimeout(() => target.classList.remove("map-list-jump-highlight"), 1200);
      }
    }
  });
  return modal;
}

function closeMapListView() {
  const modal = document.getElementById("mapListViewModal");
  modal?.classList.remove("open");
  if (modal) modal.dataset.scope = "";
}

function refreshOpenMapListView(scope = null) {
  const modal = document.getElementById("mapListViewModal");
  if (!modal?.classList.contains("open")) return;

  const activeScope = modal.dataset.scope || "";
  if (scope && activeScope && activeScope !== scope) return;

  const content = modal.querySelector("#mapListViewContent");
  if (!content) return;

  content.innerHTML =
    activeScope === "wormholes"
      ? mapInspectorServices.buildWormholesMapListViewHtml()
      : buildConnectionMapListViewHtml();
}

function mapInspectorEscape(text) {
  return mapInspectorSafeRenderApi.escapeHtml(String(text ?? ""));
}

function mapInspectorEntryType(entry) {
  if (mapInspectorServices.isGroupEntry(entry))
    return `Group — ${mapInspectorServices.groupChildIds(entry).length} creation${mapInspectorServices.groupChildIds(entry).length === 1 ? "" : "s"}`;
  return entry?.what?.val ? entry.what.val.split("—")[0].trim() : "Creation";
}

function mapInspectorAttachmentPill(universeId, entryId, options = {}) {
  const literature = options.groupChildren
    ? mapInspectorServices.literatureCountForGroupChildrenTag(universeId, entryId)
    : mapInspectorServices.literatureCountForEntryTag(universeId, entryId);
  const images = options.groupChildren
    ? mapInspectorServices.visionCountForGroupChildrenTag(universeId, entryId)
    : mapInspectorServices.visionCountForEntryTag(universeId, entryId);
  const bits = [];
  if (literature > 0) bits.push(`${literature} lit`);
  if (images > 0) bits.push(`${images} img`);
  return bits.length
    ? ` <span class="map-list-pill">${mapInspectorEscape(bits.join(" · "))}</span>`
    : "";
}

function mapInspectorDirectConnections(entryId, archive) {
  const ids = new Set();
  const source = archive.find((entry) => entry.id === entryId);

  (source?.connections || []).forEach((id) => {
    if (archive.some((entry) => entry.id === id)) ids.add(id);
  });

  archive.forEach((entry) => {
    if (entry.id !== entryId && (entry.connections || []).includes(entryId)) {
      ids.add(entry.id);
    }
  });

  return Array.from(ids)
    .map((id) => archive.find((entry) => entry.id === id))
    .filter(Boolean);
}

function mapInspectorBridgeTargetLabel(bridge) {
  if (!bridge?.universeId) return "";
  const universeTitle = mapInspectorServices.getUniverseTitle(bridge.universeId);
  if (bridge.creationId) {
    const creationTitle = mapInspectorServices.getCreationTitleFromUniverse(
      bridge.universeId,
      bridge.creationId,
    );
    return creationTitle ? `${universeTitle} → ${creationTitle}` : universeTitle;
  }
  return universeTitle;
}

function mapInspectorEntryBridges(entry) {
  return mapInspectorServices
    .normalizeBridges(entry?.bridges || [])
    .map(mapInspectorBridgeTargetLabel)
    .filter(Boolean);
}

function mapInspectorNoteCountForEntry(entryId, archive) {
  let count = 0;
  mapInspectorDirectConnections(entryId, archive).forEach((target) => {
    if (mapInspectorServices.getConnectionNote(entryId, target.id)) count += 1;
  });
  return count;
}

function mapInspectorEntryTitleFromArchive(archive, entryId) {
  const entry = (archive || []).find((item) => item.id === entryId);
  return entry ? entry.title || "Untitled" : "Missing item";
}

function mapInspectorPairKey(a, b) {
  return [a, b].sort().join("::");
}

function mapInspectorConnectionLedgerForArchive(archive) {
  const byId = new Map((archive || []).map((entry) => [entry.id, entry]));
  const rows = [];
  const seen = new Set();

  (archive || []).forEach((entry) => {
    (entry.connections || []).forEach((targetId) => {
      if (!byId.has(targetId)) return;
      const key = mapInspectorPairKey(entry.id, targetId);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        key,
        aId: entry.id,
        bId: targetId,
        aTitle: entry.title || "Untitled",
        bTitle: byId.get(targetId)?.title || "Untitled",
        note: !!mapInspectorServices.getConnectionNote(entry.id, targetId),
      });
    });
  });

  return rows.sort((a, b) => `${a.aTitle} ${a.bTitle}`.localeCompare(`${b.aTitle} ${b.bTitle}`));
}

function mapInspectorBridgeNodeLabel(node) {
  if (!node) return "";
  if (node.type === "universe") {
    return mapInspectorServices.getUniverseTitle(node.universeId);
  }

  const universeTitle = mapInspectorServices.getUniverseTitle(node.universeId);
  const creationTitle =
    mapInspectorServices.getCreationTitleFromUniverse(node.universeId, node.creationId) ||
    "Untitled";
  return `${universeTitle} → ${creationTitle}`;
}

function mapInspectorBridgeLedgerForUniverse(universeId) {
  const rows = [];
  const seen = new Set();
  const universe = universes.find((item) => item.id === universeId);
  const archive = mapInspectorServices.readArchiveForUniverse(universeId);

  mapInspectorServices.normalizeUniverseBridges(universe).forEach((bridge) => {
    const a = {type: "universe", universeId};
    const b = bridge.creationId
      ? {type: "creation", universeId: bridge.universeId, creationId: bridge.creationId}
      : {type: "universe", universeId: bridge.universeId};
    const key = mapInspectorServices.bridgeNoteKeyForNodes(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      key,
      a,
      b,
      aLabel: mapInspectorBridgeNodeLabel(a),
      bLabel: mapInspectorBridgeNodeLabel(b),
      note: !!mapInspectorServices.getBridgeNote(key),
    });
  });

  archive.forEach((entry) => {
    mapInspectorServices.normalizeBridges(entry.bridges || []).forEach((bridge) => {
      const a = {type: "creation", universeId, creationId: entry.id};
      const b = bridge.creationId
        ? {type: "creation", universeId: bridge.universeId, creationId: bridge.creationId}
        : {type: "universe", universeId: bridge.universeId};
      const key = mapInspectorServices.bridgeNoteKeyForNodes(a, b);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        key,
        a,
        b,
        aLabel: mapInspectorBridgeNodeLabel(a),
        bLabel: mapInspectorBridgeNodeLabel(b),
        note: !!mapInspectorServices.getBridgeNote(key),
      });
    });
  });

  return rows.sort((a, b) => `${a.aLabel} ${a.bLabel}`.localeCompare(`${b.aLabel} ${b.bLabel}`));
}

function mapInspectorAllBridgeLedger() {
  const rows = [];
  const seen = new Set();

  universes.forEach((universe) => {
    mapInspectorBridgeLedgerForUniverse(universe.id).forEach((row) => {
      if (seen.has(row.key)) return;
      seen.add(row.key);
      rows.push(row);
    });
  });

  return rows.sort((a, b) => `${a.aLabel} ${a.bLabel}`.localeCompare(`${b.aLabel} ${b.bLabel}`));
}

function mapInspectorEndpointKeyForUniverse(endpoint, universeId) {
  if (!endpoint || endpoint.universeId !== universeId) return null;
  if (endpoint.type === "universe") return `U:${universeId}`;
  if (endpoint.type === "creation") return `C:${universeId}:${endpoint.creationId}`;
  return null;
}

function mapInspectorConnectedEntityCountForUniverse(universeId) {
  const archive = mapInspectorServices.readArchiveForUniverse(universeId);
  const ids = new Set();

  mapInspectorConnectionLedgerForArchive(archive).forEach((row) => {
    if (row.aId) ids.add(row.aId);
    if (row.bId) ids.add(row.bId);
  });

  return ids.size;
}

function mapInspectorBridgeRowsForUniverse(universeId) {
  return mapInspectorAllBridgeLedger().filter(
    (row) =>
      mapInspectorEndpointKeyForUniverse(row.a, universeId) ||
      mapInspectorEndpointKeyForUniverse(row.b, universeId),
  );
}

function mapInspectorBridgedEntityCountForUniverse(universeId) {
  const ids = new Set();

  mapInspectorBridgeRowsForUniverse(universeId).forEach((row) => {
    const aKey = mapInspectorEndpointKeyForUniverse(row.a, universeId);
    const bKey = mapInspectorEndpointKeyForUniverse(row.b, universeId);
    if (aKey) ids.add(aKey);
    if (bKey) ids.add(bKey);
  });

  return ids.size;
}

function mapInspectorJumpKeyForEntry(universeId, entryId) {
  const archive = mapInspectorServices.readArchiveForUniverse(universeId);
  const topEntries = mapInspectorServices.topLevelArchiveEntries(archive);
  if (topEntries.some((entry) => entry.id === entryId)) return `C:${universeId}:${entryId}`;

  const group = mapInspectorServices.getGroupForEntryId(entryId, archive);
  return group ? `C:${universeId}:${group.id}` : `C:${universeId}:${entryId}`;
}

function mapInspectorEntityRowForEntry(universeId, entryId) {
  const archive = mapInspectorServices.readArchiveForUniverse(universeId);
  const entry = archive.find((item) => item.id === entryId);
  if (!entry) return null;

  const group = mapInspectorServices.getGroupForEntryId(entryId, archive);
  return {
    key: `C:${universeId}:${entryId}`,
    jumpKey: mapInspectorJumpKeyForEntry(universeId, entryId),
    label: entry.title || "Untitled",
    type: mapInspectorServices.isGroupEntry(entry) ? "Group" : "Creation",
    meta: group ? `inside ${group.title || "group"}` : "",
  };
}

function mapInspectorConnectedEntityRowsForUniverse(universeId) {
  const archive = mapInspectorServices.readArchiveForUniverse(universeId);
  const ids = new Set();

  mapInspectorConnectionLedgerForArchive(archive).forEach((row) => {
    if (row.aId) ids.add(row.aId);
    if (row.bId) ids.add(row.bId);
  });

  return Array.from(ids)
    .map((id) => mapInspectorEntityRowForEntry(universeId, id))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function mapInspectorBridgedEntityRowsForUniverse(universeId) {
  const rows = [];
  const seen = new Set();

  mapInspectorBridgeRowsForUniverse(universeId).forEach((row) => {
    [row.a, row.b].forEach((endpoint) => {
      const endpointKey = mapInspectorEndpointKeyForUniverse(endpoint, universeId);
      if (!endpointKey || seen.has(endpointKey)) return;
      seen.add(endpointKey);

      if (endpoint.type === "universe") {
        rows.push({
          key: endpointKey,
          jumpKey: endpointKey,
          label: mapInspectorServices.getUniverseTitle(universeId),
          type: "Universe",
          meta: "universe itself",
        });
        return;
      }

      const entryRow = mapInspectorEntityRowForEntry(universeId, endpoint.creationId);
      if (entryRow) rows.push(entryRow);
    });
  });

  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

function mapInspectorEntityCountButtonHtml(panelKey, label, rows) {
  return `<button class="map-list-count-button" type="button" data-map-list-entity-toggle="${mapInspectorEscape(panelKey)}" aria-expanded="false"><b>${rows.length}</b> ${mapInspectorEscape(label)}</button>`;
}

function mapInspectorEntityPanelHtml(panelKey, rows, emptyText) {
  return `
    <div class="map-list-entity-panel" data-map-list-entity-panel="${mapInspectorEscape(panelKey)}" hidden>
      ${
        rows.length
          ? `
        <ul>
          ${rows
            .map(
              (row) => `
            <li>
              <button class="map-list-entity-jump" type="button" data-map-list-jump-to="${mapInspectorEscape(row.jumpKey)}">
                <span>${mapInspectorEscape(row.label)}</span>
                <em>${mapInspectorEscape(row.type)}${row.meta ? ` · ${mapInspectorEscape(row.meta)}` : ""}</em>
              </button>
            </li>
          `,
            )
            .join("")}
        </ul>
      `
          : `<p class="map-list-muted">${mapInspectorEscape(emptyText)}</p>`
      }
    </div>
  `;
}

function mapInspectorLinksForEntry(entryId, archive, universeId) {
  const connectionRows = mapInspectorConnectionLedgerForArchive(archive)
    .filter((row) => row.aId === entryId || row.bId === entryId)
    .map((row) => ({
      type: "Connection",
      label: row.aId === entryId ? row.bTitle : row.aTitle,
      note: row.note,
    }));

  const bridgeRows = mapInspectorBridgeLedgerForUniverse(universeId)
    .filter(
      (row) =>
        (row.a.type === "creation" &&
          row.a.universeId === universeId &&
          row.a.creationId === entryId) ||
        (row.b.type === "creation" &&
          row.b.universeId === universeId &&
          row.b.creationId === entryId),
    )
    .map((row) => {
      const isA =
        row.a.type === "creation" &&
        row.a.universeId === universeId &&
        row.a.creationId === entryId;
      return {
        type: "Bridge",
        label: isA ? row.bLabel : row.aLabel,
        note: row.note,
      };
    });

  return [...connectionRows, ...bridgeRows];
}

function mapInspectorLinksForUniverse(universeId) {
  return mapInspectorAllBridgeLedger()
    .filter(
      (row) =>
        (row.a.type === "universe" && row.a.universeId === universeId) ||
        (row.b.type === "universe" && row.b.universeId === universeId),
    )
    .map((row) => {
      const isA = row.a.type === "universe" && row.a.universeId === universeId;
      return {
        type: "Bridge",
        label: isA ? row.bLabel : row.aLabel,
        note: row.note,
      };
    });
}

function mapInspectorLedgerListHtml(rows, emptyText, options = {}) {
  if (!rows.length) return `<p class="map-list-muted">${mapInspectorEscape(emptyText)}</p>`;

  return `
    <ul class="map-list-ledger">
      ${rows
        .map(
          (row) => `
        <li>
          <span class="map-list-ledger-link">
            <b>${mapInspectorEscape(row.aTitle || row.aLabel || row.source || "Item")}</b>
            <span aria-label="linked with">↔</span>
            <b>${mapInspectorEscape(row.bTitle || row.bLabel || row.label || "Item")}</b>
          </span>
          ${row.note ? `<span class="map-list-pill">note</span>` : ""}
        </li>
      `,
        )
        .join("")}
    </ul>
  `;
}

function mapInspectorEntityCardHtml(entry, archive, universeId) {
  const childRows = mapInspectorServices.isGroupEntry(entry)
    ? mapInspectorServices
        .groupChildIds(entry)
        .map((id) => archive.find((child) => child.id === id))
        .filter(Boolean)
    : [];
  const links = mapInspectorLinksForEntry(entry.id, archive, universeId);
  const bits = [];
  if (childRows.length) bits.push(`${childRows.length} inside`);
  if (links.length) bits.push(`${links.length} link${links.length === 1 ? "" : "s"}`);
  const noteCount = links.filter((link) => link.note).length;
  if (noteCount) bits.push(`${noteCount} note${noteCount === 1 ? "" : "s"}`);

  return `
    <details class="map-list-card" data-map-list-entity-key="${mapInspectorEscape(`C:${universeId}:${entry.id}`)}">
      <summary>
        <span><strong>${mapInspectorEscape(entry.title || "Untitled")}</strong> <em>${mapInspectorEscape(mapInspectorEntryType(entry))}</em></span>
        ${bits.length ? `<span class="map-list-pill">${mapInspectorEscape(bits.join(" · "))}</span>` : ""}
      </summary>
      ${
        childRows.length
          ? `
        <div class="map-list-subsection">
          <b>Inside group</b>
          <ul>${childRows.map((child) => `<li>${mapInspectorEscape(child.title || "Untitled")} <em>${mapInspectorEscape(mapInspectorEntryType(child))}</em>${mapInspectorAttachmentPill(universeId, child.id)}</li>`).join("")}</ul>
        </div>
      `
          : ""
      }
      ${
        links.length
          ? `
        <div class="map-list-subsection">
          <b>Linked with</b>
          <ul>${links.map((link) => `<li><span class="map-list-link-type">${mapInspectorEscape(link.type)}</span> ${mapInspectorEscape(link.label)}${link.note ? ` <span class="map-list-pill">note</span>` : ""}</li>`).join("")}</ul>
        </div>
      `
          : `<p class="map-list-muted">No links.</p>`
      }
    </details>
  `;
}

function mapInspectorEntityIndexHtml(entries, archive, universeId) {
  if (!entries.length) return `<p class="map-list-muted">No groups or creations to list.</p>`;

  const groups = entries.filter(isGroupEntry);
  const creations = entries.filter((entry) => !mapInspectorServices.isGroupEntry(entry));

  return `
    <div class="map-list-split-index">
      <div>
        <h4>Groups <span class="map-list-pill">${groups.length}</span></h4>
        <div class="map-list-entity-grid">
          ${groups.length ? groups.map((entry) => mapInspectorEntityCardHtml(entry, archive, universeId)).join("") : `<p class="map-list-muted">No groups.</p>`}
        </div>
      </div>
      <div>
        <h4>Creations <span class="map-list-pill">${creations.length}</span></h4>
        <div class="map-list-entity-grid">
          ${creations.length ? creations.map((entry) => mapInspectorEntityCardHtml(entry, archive, universeId)).join("") : `<p class="map-list-muted">No ungrouped creations.</p>`}
        </div>
      </div>
    </div>
  `;
}

function buildConnectionMapListViewHtml() {
  const currentUniverse = mapInspectorServices.getCurrentUniverse();
  const universeTitle = currentUniverse?.title || "Current Universe";
  const topEntries = mapInspectorServices.topLevelArchiveEntries(archiveEntries);
  const mapGroups = topEntries.filter(isGroupEntry);
  const mapCreations = topEntries.filter((entry) => !mapInspectorServices.isGroupEntry(entry));
  const allEntries = archiveEntries || [];
  const connectionLedger = mapInspectorConnectionLedgerForArchive(allEntries);
  const bridgeLedger = mapInspectorBridgeLedgerForUniverse(currentUniverseId);
  const orphanEntries = allEntries.filter(
    (entry) =>
      !mapInspectorServices.isGroupEntry(entry) &&
      !mapInspectorServices.getGroupForEntryId(entry.id, allEntries) &&
      mapInspectorLinksForEntry(entry.id, allEntries, currentUniverseId).length === 0,
  );
  const noteCount =
    connectionLedger.filter((row) => row.note).length +
    bridgeLedger.filter((row) => row.note).length;

  return `
    <div class="map-list-summary-grid">
      <div><b>${mapGroups.length}</b><span>groups</span></div>
      <div><b>${mapCreations.length}</b><span>creations</span></div>
      <div><b>${connectionLedger.length}</b><span>connections</span></div>
      <div><b>${bridgeLedger.length}</b><span>bridges</span></div>
      <div><b>${noteCount}</b><span>relationship notes</span></div>
    </div>

    <section class="map-list-section">
      <h3>Relationship Ledger</h3>
      <p class="map-list-muted">Every relationship appears once here. The ↔ symbol means the link is mutual.</p>
      <div class="map-list-ledger-columns">
        <div>
          <h4>Connections</h4>
          ${mapInspectorLedgerListHtml(connectionLedger, "No connections in this universe.")}
        </div>
        <div>
          <h4>Bridges</h4>
          ${mapInspectorLedgerListHtml(bridgeLedger, "No bridges from this universe.")}
        </div>
      </div>
    </section>

    <section class="map-list-section">
      <h3>Entity Index — ${mapInspectorEscape(universeTitle)}</h3>
      <p class="map-list-muted">Entity cards summarize what each item touches without repeating the full ledger.</p>
      ${mapInspectorEntityIndexHtml(topEntries, allEntries, currentUniverseId)}
    </section>

    ${
      orphanEntries.length
        ? `
      <section class="map-list-section">
        <h3>Unlinked creations</h3>
        <p class="map-list-muted">${orphanEntries.map((entry) => mapInspectorEscape(entry.title || "Untitled")).join(", ")}</p>
      </section>
    `
        : ""
    }
  `;
}

function openMapListView(scope) {
  const safeScope = scope === "wormholes" ? "wormholes" : "connections";
  const modal = ensureMapListViewModal();
  const title = modal.querySelector("#mapListViewTitle");
  const intro = modal.querySelector("#mapListViewIntro");
  const content = modal.querySelector("#mapListViewContent");

  if (title) {
    title.textContent =
      safeScope === "wormholes" ? "Bridge Map List View" : "Connections Map List View";
  }

  if (intro) {
    intro.textContent =
      safeScope === "wormholes"
        ? "A compact text version of the Manage Bridges map, grouped by universe."
        : "A compact text version of the current Connections map.";
  }

  if (content) {
    content.innerHTML =
      safeScope === "wormholes"
        ? mapInspectorServices.buildWormholesMapListViewHtml()
        : buildConnectionMapListViewHtml();
  }

  modal.dataset.scope = safeScope;
  modal.classList.add("open");
  setTimeout(() => modal.querySelector("#closeMapListViewBtn")?.focus(), 0);
}

export {
  ensureMapListViewModal,
  closeMapListView,
  refreshOpenMapListView,
  mapInspectorEscape,
  mapInspectorEntryType,
  mapInspectorAttachmentPill,
  mapInspectorDirectConnections,
  mapInspectorBridgeTargetLabel,
  mapInspectorEntryBridges,
  mapInspectorNoteCountForEntry,
  mapInspectorEntryTitleFromArchive,
  mapInspectorPairKey,
  mapInspectorConnectionLedgerForArchive,
  mapInspectorBridgeNodeLabel,
  mapInspectorBridgeLedgerForUniverse,
  mapInspectorAllBridgeLedger,
  mapInspectorEndpointKeyForUniverse,
  mapInspectorConnectedEntityCountForUniverse,
  mapInspectorBridgeRowsForUniverse,
  mapInspectorBridgedEntityCountForUniverse,
  mapInspectorJumpKeyForEntry,
  mapInspectorEntityRowForEntry,
  mapInspectorConnectedEntityRowsForUniverse,
  mapInspectorBridgedEntityRowsForUniverse,
  mapInspectorEntityCountButtonHtml,
  mapInspectorEntityPanelHtml,
  mapInspectorLinksForEntry,
  mapInspectorLinksForUniverse,
  mapInspectorLedgerListHtml,
  mapInspectorEntityCardHtml,
  mapInspectorEntityIndexHtml,
  buildConnectionMapListViewHtml,
  openMapListView,
};
