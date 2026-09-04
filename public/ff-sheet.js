(function () {
  if (window.__ffSheetBound) return;
  window.__ffSheetBound = true;

  function storageKey(table) {
    return "ff_sheet_" + table;
  }

  function emptyLayout() {
    return { sort: null, pinned: [] };
  }

  function parseLayout(raw) {
    if (!raw) return emptyLayout();
    try {
      var params = new URLSearchParams(raw);
      var sortRaw = params.get("sort");
      var sort = null;
      if (sortRaw) {
        var parts = sortRaw.split(":");
        if (parts[0] && (parts[1] === "asc" || parts[1] === "desc")) {
          sort = { key: parts[0], dir: parts[1] };
        }
      }
      var pinned = (params.get("pin") || "")
        .split(",")
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);
      return { sort: sort, pinned: pinned };
    } catch (err) {
      return emptyLayout();
    }
  }

  function serializeLayout(layout) {
    var params = new URLSearchParams();
    if (layout.sort) params.set("sort", layout.sort.key + ":" + layout.sort.dir);
    if (layout.pinned.length) params.set("pin", layout.pinned.join(","));
    return params.toString();
  }

  function read(table) {
    try {
      return parseLayout(window.localStorage.getItem(storageKey(table)));
    } catch (err) {
      return emptyLayout();
    }
  }

  function write(table, layout) {
    try {
      var raw = serializeLayout(layout);
      if (raw) window.localStorage.setItem(storageKey(table), raw);
      else window.localStorage.removeItem(storageKey(table));
    } catch (err) {
      /* ignore quota */
    }
  }

  function cycleSort(current, key) {
    if (!current || current.key !== key) return { key: key, dir: "asc" };
    if (current.dir === "asc") return { key: key, dir: "desc" };
    return null;
  }

  function togglePin(pinned, key) {
    return pinned.indexOf(key) >= 0 ? pinned.filter(function (item) { return item !== key; }) : pinned.concat([key]);
  }

  function normalizeCell(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^—$|^–$|^-$|^n\/a$/i, "")
      .trim();
  }

  function parseNumber(value) {
    var cleaned = value.replace(/[$,%\s]/g, "");
    if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
    var n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(value) && !/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(value)) {
      return null;
    }
    var t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }

  function compareValues(a, b) {
    var left = normalizeCell(a);
    var right = normalizeCell(b);
    if (left === "" && right === "") return 0;
    if (left === "") return 1;
    if (right === "") return -1;
    var ln = parseNumber(left);
    var rn = parseNumber(right);
    if (ln != null && rn != null) return ln === rn ? 0 : ln < rn ? -1 : 1;
    var ld = parseDate(left);
    var rd = parseDate(right);
    if (ld != null && rd != null) return ld === rd ? 0 : ld < rd ? -1 : 1;
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  }

  function cssEscape(value) {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : String(value).replace(/"/g, '\\"');
  }

  function cellText(row, col) {
    var cell = row.querySelector('[data-sheet-col="' + cssEscape(col) + '"]');
    if (!cell) return "";
    return (cell.getAttribute("data-sort") || cell.textContent || "").replace(/\s+/g, " ").trim();
  }

  function tableBodies(tableEl) {
    return tableEl.querySelectorAll(":scope > tbody");
  }

  function applySort(tableEl, sort) {
    tableBodies(tableEl).forEach(function (tbody) {
      var rows = Array.prototype.slice.call(tbody.querySelectorAll(":scope > tr"));
      rows.forEach(function (row, index) {
        if (row.dataset.sheetIndex == null) row.dataset.sheetIndex = String(index);
      });
      var locked = rows.filter(function (row) { return row.querySelector("[colspan]"); });
      var sortable = rows.filter(function (row) { return !row.querySelector("[colspan]"); });
      var next = sort
        ? sortable.slice().sort(function (a, b) {
            var cmp = compareValues(cellText(a, sort.key), cellText(b, sort.key));
            return sort.dir === "asc" ? cmp : -cmp;
          })
        : sortable.slice().sort(function (a, b) {
            return Number(a.dataset.sheetIndex || 0) - Number(b.dataset.sheetIndex || 0);
          });
      next.concat(locked).forEach(function (row) {
        tbody.appendChild(row);
      });
    });
  }

  function isShown(el) {
    if (el.hidden || el.style.display === "none") return false;
    return window.getComputedStyle(el).display !== "none";
  }

  function applyPins(tableEl, pinned) {
    tableEl.querySelectorAll("[data-sheet-col].ff-col-pinned").forEach(function (el) {
      if (pinned.indexOf(el.getAttribute("data-sheet-col") || "") < 0) {
        el.classList.remove("ff-col-pinned");
        el.style.removeProperty("--ff-pin-left");
      }
    });
    var left = 0;
    pinned.forEach(function (col) {
      var cells = Array.prototype.slice.call(
        tableEl.querySelectorAll('[data-sheet-col="' + cssEscape(col) + '"]'),
      );
      var sample = cells.filter(isShown)[0];
      if (!sample) return;
      var width = sample.getBoundingClientRect().width;
      cells.forEach(function (cell) {
        cell.classList.add("ff-col-pinned");
        cell.style.setProperty("--ff-pin-left", left + "px");
      });
      left += width;
    });
  }

  function paintHeaders(tableEl, table, layout) {
    tableEl.querySelectorAll('th[data-sheet-table="' + cssEscape(table) + '"]').forEach(function (th) {
      var col = th.getAttribute("data-sheet-col");
      var active = layout.sort && layout.sort.key === col ? layout.sort.dir : null;
      th.setAttribute("aria-sort", active === "asc" ? "ascending" : active === "desc" ? "descending" : "none");
      var pinBtn = th.querySelector("[data-sheet-pin]");
      if (pinBtn) {
        var on = layout.pinned.indexOf(col) >= 0;
        pinBtn.textContent = on ? "Unpin column" : "Pin column";
      }
    });
  }

  function applyTable(tableEl, table, layout) {
    applySort(tableEl, layout.sort);
    applyPins(tableEl, layout.pinned);
    paintHeaders(tableEl, table, layout);
  }

  function closestTable(el) {
    return el.closest("table");
  }

  function hydrated() {
    return document.documentElement.getAttribute("data-ff-hydrated") === "1";
  }

  function whenHydrated(fn) {
    if (hydrated()) {
      fn();
      return;
    }
    window.addEventListener("ff-hydrated", fn, { once: true });
  }

  function commit(el, updater) {
    if (!hydrated()) return;
    var table = el.getAttribute("data-sheet-table");
    var tableEl = closestTable(el);
    if (!table || !tableEl) return;
    var next = updater(read(table));
    write(table, next);
    applyTable(tableEl, table, next);
  }

  function closeMenus(except) {
    document.querySelectorAll("[data-sheet-menu][open]").forEach(function (menu) {
      if (menu !== except) menu.removeAttribute("open");
    });
  }

  function placeMenu(menu) {
    var panel = menu.querySelector("[data-sheet-menu-panel]");
    var summary = menu.querySelector("summary");
    if (!panel || !summary) return;
    var rect = summary.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.top = Math.round(rect.bottom + 4) + "px";
    panel.style.left = Math.round(Math.min(rect.left, window.innerWidth - 240)) + "px";
    panel.style.zIndex = "80";
  }

  document.addEventListener("click", function (event) {
    var cycle = event.target.closest("[data-sheet-cycle]");
    if (cycle) {
      event.preventDefault();
      var col = cycle.getAttribute("data-sheet-col");
      commit(cycle, function (layout) {
        return { sort: cycleSort(layout.sort, col), pinned: layout.pinned };
      });
      return;
    }
    var sortBtn = event.target.closest("[data-sheet-sort]");
    if (sortBtn) {
      event.preventDefault();
      var sortCol = sortBtn.getAttribute("data-sheet-col");
      var dir = sortBtn.getAttribute("data-sheet-sort");
      commit(sortBtn, function (layout) {
        return { sort: dir === "clear" ? null : { key: sortCol, dir: dir }, pinned: layout.pinned };
      });
      var menu = sortBtn.closest("[data-sheet-menu]");
      if (menu) menu.removeAttribute("open");
      return;
    }
    var pinBtn = event.target.closest("[data-sheet-pin]");
    if (pinBtn) {
      event.preventDefault();
      var pinCol = pinBtn.getAttribute("data-sheet-col");
      commit(pinBtn, function (layout) {
        return { sort: layout.sort, pinned: togglePin(layout.pinned, pinCol) };
      });
      var pinMenu = pinBtn.closest("[data-sheet-menu]");
      if (pinMenu) pinMenu.removeAttribute("open");
      return;
    }
    if (!event.target.closest("[data-sheet-menu]")) closeMenus();
  });

  document.addEventListener("toggle", function (event) {
    var menu = event.target;
    if (!menu || !menu.hasAttribute || !menu.hasAttribute("data-sheet-menu")) return;
    if (menu.open) {
      closeMenus(menu);
      placeMenu(menu);
    }
  }, true);

  var applied = typeof WeakSet !== "undefined" ? new WeakSet() : null;

  function boot() {
    document.querySelectorAll("th[data-sheet-table]").forEach(function (th) {
      var table = th.getAttribute("data-sheet-table");
      var tableEl = closestTable(th);
      if (!table || !tableEl) return;
      if (applied) {
        if (applied.has(tableEl)) return;
        applied.add(tableEl);
      }
      applyTable(tableEl, table, read(table));
    });
  }

  function bootRoute() {
    applied = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    boot();
  }

  whenHydrated(boot);
  window.addEventListener("ff-sheet-route", function () {
    if (hydrated()) bootRoute();
  });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) whenHydrated(bootRoute);
  });
})();
