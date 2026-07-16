/* GENERATED from scripts/modules/pagination.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    ("use strict");
  
    function positiveInteger(value, fallback = 1) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }
  
    function clampPage(page, totalPages) {
      const total = Math.max(1, positiveInteger(totalPages, 1));
      return Math.min(total, Math.max(1, positiveInteger(page, 1)));
    }
  
    function paginateRows(rows, pageSize, page) {
      const list = Array.isArray(rows) ? rows : [];
      const size = Math.max(1, positiveInteger(pageSize, 1));
      const totalPages = Math.max(1, Math.ceil(list.length / size));
      const currentPage = clampPage(page, totalPages);
      const start = (currentPage - 1) * size;
      return {
        page: currentPage,
        totalPages,
        totalItems: list.length,
        rows: list.slice(start, start + size),
      };
    }
  
    function paginateGroupedPlan(plan, pageSize, isGroup) {
      const rows = Array.isArray(plan) ? plan : [];
      const size = Math.max(2, positiveInteger(pageSize, 2));
      const pages = [];
      let current = [];
      let used = 0;
  
      function finishPage() {
        if (current.length) {
          pages.push(current);
          current = [];
          used = 0;
        }
      }
  
      function addSimpleRow(row) {
        if (used >= size) finishPage();
        current.push({
          ...row,
          childEntries: Array.isArray(row?.childEntries) ? [...row.childEntries] : [],
        });
        used += 1;
      }
  
      rows.forEach((row) => {
        const group = typeof isGroup === "function" ? !!isGroup(row?.entry) : false;
        const children = Array.isArray(row?.childEntries) ? row.childEntries : [];
        if (!group || children.length === 0) {
          addSimpleRow(row);
          return;
        }
  
        let childIndex = 0;
        let continuation = false;
        while (childIndex < children.length) {
          if (used >= size || size - used < 2) {
            finishPage();
          }
  
          const availableChildren = Math.max(1, size - used - 1);
          const segmentChildren = children.slice(childIndex, childIndex + availableChildren);
          current.push({
            ...row,
            childEntries: segmentChildren,
            paginationContinuation: continuation,
            paginationHasMore: childIndex + segmentChildren.length < children.length,
          });
          used += 1 + segmentChildren.length;
          childIndex += segmentChildren.length;
          continuation = true;
  
          if (childIndex < children.length) finishPage();
        }
      });
  
      finishPage();
      return pages.length ? pages : [[]];
    }
  
    function pageContainingEntry(pages, entryId) {
      const wanted = String(entryId || "");
      if (!wanted || !Array.isArray(pages)) return 1;
      const index = pages.findIndex((page) =>
        (page || []).some(
          (row) =>
            String(row?.entry?.id || "") === wanted ||
            (row?.childEntries || []).some((child) => String(child?.id || "") === wanted),
        ),
      );
      return index >= 0 ? index + 1 : 1;
    }
  
    function pageButtonSequence(currentPage, totalPages, maxButtons = 7) {
      const total = Math.max(1, positiveInteger(totalPages, 1));
      const current = clampPage(currentPage, total);
      const max = Math.max(5, positiveInteger(maxButtons, 7));
      if (total <= max) return Array.from({length: total}, (_, index) => index + 1);
  
      const pages = new Set([1, total, current - 1, current, current + 1]);
      if (current <= 3) {
        pages.add(2);
        pages.add(3);
        pages.add(4);
      }
      if (current >= total - 2) {
        pages.add(total - 1);
        pages.add(total - 2);
        pages.add(total - 3);
      }
  
      const sorted = Array.from(pages)
        .filter((page) => page >= 1 && page <= total)
        .sort((a, b) => a - b);
      const sequence = [];
      sorted.forEach((page, index) => {
        if (index && page - sorted[index - 1] > 1) sequence.push(null);
        sequence.push(page);
      });
      return sequence;
    }
  
    function renderControls(container, options = {}) {
      if (!container) return;
      const totalPages = Math.max(1, positiveInteger(options.totalPages, 1));
      const currentPage = clampPage(options.page, totalPages);
      const label = String(options.label || "Collection");
  
      if (totalPages <= 1) {
        container.hidden = true;
        container.innerHTML = "";
        return;
      }
  
      const safeRender =
        typeof importedSafeRenderApi !== "undefined"
          ? importedSafeRenderApi
          : global.WormholesSafeRender;
      if (!safeRender) throw new Error("WormholesSafeRender is required for pagination rendering.");
      const pageButtons = pageButtonSequence(currentPage, totalPages).map((value) =>
        value === null
          ? safeRender.html`<span class="pagination-ellipsis" aria-hidden="true">…</span>`
          : safeRender.html`<button class="pagination-button app-button${value === currentPage ? " is-current" : ""}" type="button" data-app-button="true" data-page="${value}"${value === currentPage ? safeRender.html` aria-current="page"` : safeRender.html``} aria-label="${label} page ${value}">${value}</button>`,
      );
  
      container.hidden = false;
      safeRender.setHtml(
        container,
        safeRender.html`
          <span class="pagination-status" aria-live="polite">Page ${currentPage} of ${totalPages}</span>
          <div class="pagination-pages">
            <button class="pagination-button pagination-step app-button" type="button" data-app-button="true" data-page="${currentPage - 1}" ${currentPage === 1 ? safeRender.html`disabled` : safeRender.html``} aria-label="Previous ${label.toLowerCase()} page">Previous</button>
            ${pageButtons}
            <button class="pagination-button pagination-step app-button" type="button" data-app-button="true" data-page="${currentPage + 1}" ${currentPage === totalPages ? safeRender.html`disabled` : safeRender.html``} aria-label="Next ${label.toLowerCase()} page">Next</button>
          </div>
        `,
      );
  
      container.querySelectorAll?.("button[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
          if (button.disabled) return;
          const nextPage = clampPage(button.dataset.page, totalPages);
          if (nextPage === currentPage) return;
          options.onPageChange?.(nextPage);
        });
      });
    }
  
    global.WormholesPagination = Object.freeze({
      clampPage,
      paginateRows,
      paginateGroupedPlan,
      pageContainingEntry,
      pageButtonSequence,
      renderControls,
    });
    return global.WormholesPagination;
  }
  
  const api = install(globalThis);
})();
