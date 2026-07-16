/* Wormholes Beta 261 — Literature tag normalization, group normalization, sanitization, and upload conversion.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

function normalizeLiteratureTags(tags) {
  const universeIds = controllerServices.uniqueList(
    Array.isArray(tags?.universes) ? tags.universes : [],
  );
  const entrySeen = new Set();
  const entries = [];
  (Array.isArray(tags?.entries) ? tags.entries : []).forEach((tag) => {
    if (!tag?.universeId || !tag?.entryId) return;
    const key = tagEntryKey(tag.universeId, tag.entryId);
    if (entrySeen.has(key)) return;
    entrySeen.add(key);
    entries.push({universeId: tag.universeId, entryId: tag.entryId});
  });
  return {universes: universeIds, entries};
}

function mergeLiteratureTags(...tagSets) {
  const universes = new Set();
  const entryMap = new Map();

  tagSets.forEach((tags) => {
    (tags?.universes || []).forEach((id) => {
      if (id) universes.add(id);
    });
    (tags?.entries || []).forEach((tag) => {
      if (!tag?.universeId || !tag?.entryId) return;
      entryMap.set(tagEntryKey(tag.universeId, tag.entryId), {
        universeId: tag.universeId,
        entryId: tag.entryId,
      });
    });
  });

  return {
    universes: Array.from(universes),
    entries: Array.from(entryMap.values()),
  };
}

function literatureGroupTagUnion(childIds, existingTags = null, docs = literatureEntries) {
  const childTags = (childIds || [])
    .map((id) => (docs || []).find((doc) => doc.id === id))
    .filter(Boolean)
    .map((doc) => doc.tags || {});
  return mergeLiteratureTags(existingTags || {}, ...childTags);
}

function normalizeLiteratureGroups(options = {}) {
  const existingIds = new Set(
    literatureEntries.filter((doc) => !isLiteratureGroup(doc)).map((doc) => doc.id),
  );
  const removedGroupIds = [];
  let changed = false;

  literatureEntries = (literatureEntries || [])
    .map((doc) => {
      if (!isLiteratureGroup(doc)) return doc;

      const oldIds = literatureGroupChildIds(doc);
      const groupIds = controllerServices
        .uniqueList(oldIds)
        .filter((id) => existingIds.has(id) && id !== doc.id);
      if (groupIds.length < 2) {
        removedGroupIds.push(doc.id);
        changed = true;
        return null;
      }

      const mergedTags = literatureGroupTagUnion(groupIds, doc.tags, literatureEntries);
      if (
        JSON.stringify(groupIds) !== JSON.stringify(oldIds) ||
        JSON.stringify(mergedTags) !== JSON.stringify(doc.tags || {})
      ) {
        changed = true;
      }

      return {
        ...doc,
        kind: "literatureGroup",
        fileType: "group",
        groupIds,
        tags: mergedTags,
        content: doc.content || "",
        updatedAt: doc.updatedAt || doc.createdAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (changed && options.persist !== false) {
    saveLiteratureToStorage();
  }

  return {changed, removedGroupIds};
}

function literaturePlainPreview(htmlText) {
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeLiteratureHtml(htmlText || "");
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

function escapeLiteratureUploadText(text) {
  return escapeHtml(text || "").replace(/\n/g, "<br>");
}

function literatureFileKind(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();

  if (name.endsWith(".docx") || type.includes("wordprocessingml")) return "docx";
  if (name.endsWith(".doc") || type === "application/msword") return "doc";
  if (name.endsWith(".txt")) return "text";
  return "unsupported";
}

function literatureFileTypeLabel(doc) {
  if (isLiteratureGroup(doc) || doc.fileType === "group") return "Literature Group";
  if (doc.fileType === "docx") return "Converted DOCX";
  if (doc.fileType === "doc") return "Converted DOC";
  if (doc.fileType === "html") return "HTML";
  if (doc.fileType === "unsupported") return "Unsupported";
  return "Text";
}

function sanitizeLiteratureHtml(htmlText) {
  const raw = String(htmlText || "").trim();
  if (!raw) return "<p></p>";

  const allowedTags = new Set([
    "p",
    "br",
    "div",
    "span",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "strike",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "font",
    "a",
  ]);
  const allowedAttributes = {
    font: new Set(["size"]),
    a: new Set(["href", "title"]),
  };
  const blockedTags = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "svg",
    "math",
    "link",
    "meta",
  ]);

  const template = document.createElement("template");
  template.innerHTML = raw;

  // Use an explicit stack so malformed or deeply nested pasted markup cannot
  // overflow the JavaScript call stack before the content-depth validator runs.
  const stack = Array.from(template.content.childNodes).reverse();
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = node.tagName.toLowerCase();
    if (blockedTags.has(tag)) {
      node.remove();
      continue;
    }

    if (!allowedTags.has(tag)) {
      const parent = node.parentNode;
      const children = Array.from(node.childNodes);
      if (parent) {
        children.forEach((child) => parent.insertBefore(child, node));
        node.remove();
        for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
      }
      continue;
    }

    Array.from(node.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const tagAllowed = allowedAttributes[tag];
      const allowed = tagAllowed && tagAllowed.has(attrName);

      if (!allowed || attrName.startsWith("on") || /javascript:/i.test(attr.value || "")) {
        node.removeAttribute(attr.name);
        return;
      }

      if (tag === "font" && attrName === "size") {
        const safeSize = String(attr.value || "").match(/^[1-7]$/) ? attr.value : "3";
        node.setAttribute("size", safeSize);
      }

      if (tag === "a" && attrName === "href") {
        const safeHref = window.WormholesSafeRender?.safeExternalUrl?.(attr.value || "") || "";
        if (!safeHref) node.removeAttribute("href");
        else node.setAttribute("href", safeHref);
      }

      if (tag === "a" && attrName === "title") {
        node.setAttribute("title", String(attr.value || "").slice(0, 500));
      }
    });

    if (tag === "a" && node.hasAttribute("href")) {
      window.WormholesSafeRender?.configureExternalLink?.(node, node.getAttribute("href"));
    }

    const children = Array.from(node.childNodes);
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
  }
  const cleaned = template.innerHTML.trim();
  return cleaned || "<p></p>";
}

function plainTextToLiteratureHtml(text) {
  const safe = escapeHtml(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  return (
    safe
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
      .join("") || "<p></p>"
  );
}

async function convertUploadedFileToLiterature(file) {
  const fileType = literatureFileKind(file);
  const now = new Date().toISOString();
  let content = "";

  if (fileType === "unsupported") {
    throw new Error("Only TXT, DOC, and DOCX are supported. PDFs are not supported.");
  } else if (fileType === "docx") {
    const text = await convertDocxArrayBufferToText(await file.arrayBuffer());
    content = plainTextToLiteratureHtml(text);
  } else if (fileType === "doc") {
    const text = convertDocArrayBufferToText(await file.arrayBuffer());
    content = plainTextToLiteratureHtml(text);
  } else {
    content = plainTextToLiteratureHtml(await file.text());
  }

  return {
    id: makeId(),
    title: file.name.replace(/\.[^.]+$/, "") || file.name,
    content,
    sourceName: file.name,
    fileType,
    mimeType: file.type || "",
    fileData: "",
    fileSize: file.size || 0,
    convertedFrom: fileType === "doc" || fileType === "docx" ? file.name : "",
    tags: {universes: [currentUniverseId], entries: []},
    createdAt: now,
    updatedAt: now,
  };
}

function buildCanonicalLiteratureRecord(doc, universeId, options = {}) {
  const source = doc || {};
  const now = new Date().toISOString();
  const id = source.id || options.idFactory?.() || makeId();
  const isGroup =
    source.kind === "literatureGroup" ||
    source.fileType === "group" ||
    Array.isArray(source.groupIds) ||
    Array.isArray(source.children);
  const normalizeTags =
    typeof options.normalizeTags === "function" ? options.normalizeTags : normalizeLiteratureTags;
  const keyFor =
    typeof options.contentStoreKeyFor === "function"
      ? options.contentStoreKeyFor
      : (scope, itemId) => `literature:${scope || "none"}:${itemId}:content`;
  const builder = globalThis.WormholesCanonicalPersistence?.builders?.literature;
  if (builder) {
    const canonical = builder(source, {
      scope: universeId,
      idFactory: options.idFactory,
      sanitizeHtml: sanitizeLiteratureHtml,
      normalizeTags,
      contentStoreKeyFor: keyFor,
      dropInvalidReferences: options.imported === true,
    });
    return {
      ...canonical,
      tags: {
        universes: [...canonical.tags.universes],
        entries: canonical.tags.entries.map((entry) => ({...entry})),
      },
      ...(canonical.groupIds ? {groupIds: [...canonical.groupIds]} : {}),
    };
  }
  const createdAt = source.createdAt || now;
  return {
    id,
    kind: isGroup ? "literatureGroup" : "",
    title:
      source.title ||
      (options.imported ? source.sourceName : "") ||
      (isGroup ? "Untitled Literature Group" : "Untitled Literature"),
    content: isGroup
      ? options.imported
        ? ""
        : source.content || ""
      : sanitizeLiteratureHtml(source.content || ""),
    sourceName: isGroup ? "" : source.sourceName || "",
    fileType: isGroup ? "group" : source.fileType || "text",
    mimeType: isGroup ? "" : source.mimeType || "",
    fileData: isGroup || options.imported ? "" : source.fileData || "",
    fileSize: isGroup ? 0 : source.fileSize || 0,
    convertedFrom: isGroup ? "" : source.convertedFrom || "",
    storage: isGroup ? "" : source.storage || "",
    folderFileName: isGroup ? "" : source.folderFileName || "",
    contentStoreKey: isGroup ? "" : source.contentStoreKey || keyFor(universeId, id),
    contentStored: isGroup ? "" : source.contentStored || "",
    ...(isGroup
      ? {
          groupIds: Array.from(
            new Set(
              (Array.isArray(source.groupIds)
                ? source.groupIds
                : Array.isArray(source.children)
                  ? source.children
                  : []
              ).filter(Boolean),
            ),
          ),
        }
      : {}),
    tags: normalizeTags(source.tags),
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || source.createdAt || now,
  };
}

const LITERATURE_CONTENT_HELPERS_API = Object.freeze({
  normalizeLiteratureTags,
  mergeLiteratureTags,
  literatureGroupTagUnion,
  normalizeLiteratureGroups,
  literaturePlainPreview,
  escapeLiteratureUploadText,
  literatureFileKind,
  literatureFileTypeLabel,
  sanitizeLiteratureHtml,
  plainTextToLiteratureHtml,
  convertUploadedFileToLiterature,
  buildCanonicalLiteratureRecord,
});

export function installLegacyLiteratureContentHelpersBindings(target = globalThis) {
  Object.assign(target, LITERATURE_CONTENT_HELPERS_API);
  target.WormholesLiteratureContentHelpers = LITERATURE_CONTENT_HELPERS_API;
  return LITERATURE_CONTENT_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyLiteratureContentHelpersBindings(window);

export {
  normalizeLiteratureTags,
  mergeLiteratureTags,
  literatureGroupTagUnion,
  normalizeLiteratureGroups,
  literaturePlainPreview,
  escapeLiteratureUploadText,
  literatureFileKind,
  literatureFileTypeLabel,
  sanitizeLiteratureHtml,
  plainTextToLiteratureHtml,
  convertUploadedFileToLiterature,
  buildCanonicalLiteratureRecord,
};
