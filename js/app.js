/* ============================================================
   AI Sales Secrets — app.js
   Hash-routed reading app. Data: data/book.js (var BOOK).
   ============================================================ */
(function () {
  "use strict";

  var LIB = window.BOOK || (typeof BOOK !== "undefined" ? BOOK : null);
  if (!LIB) {
    document.body.innerHTML = "<div style='font-family:sans-serif;padding:3rem;text-align:center'>Book data failed to load. Ensure <code>data/book.js</code> is next to <code>index.html</code>.</div>";
    return;
  }
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var TOTAL = LIB.questions.length;

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function htmlToText(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || "";
  }

  function qByNum(n) {
    n = Number(n);
    if (!n || n < 1 || n > TOTAL) return null;
    return LIB.questions[n - 1];
  }

  function partOf(n) {
    for (var i = 0; i < LIB.parts.length; i++) {
      var p = LIB.parts[i];
      if (n >= p.from && n <= p.to) return p;
    }
    return LIB.parts[LIB.parts.length - 1];
  }

  function plainOf(q) {
    if (q._plain) return q._plain;
    var parts = [q.title];
    q.blocks.forEach(function (b) {
      if (b.t === "d") parts.push(b.who + ": " + htmlToText(b.html));
      else if (b.t === "p" || b.t === "prompt") parts.push(htmlToText(b.html));
      else if (b.t === "ul" || b.t === "ms") parts.push(b.items.map(htmlToText).join(" "));
    });
    q._plain = parts.join(" ").replace(/\s+/g, " ");
    return q._plain;
  }

  /* ---------- read state (localStorage) ---------- */

  var READ_KEY = "as-read-v1";
  var readSet = loadRead();
  function loadRead() {
    try {
      var raw = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      return new Set(raw.filter(function (n) { return n >= 1 && n <= TOTAL; }));
    } catch (e) { return new Set(); }
  }
  function saveRead() {
    try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readSet))); } catch (e) {}
  }
  function updateProgressChrome() {
    var n = readSet.size;
    $("#progress-chip-text").textContent = n + " / " + TOTAL;
    $("#progress-chip-fill").style.width = (n / TOTAL * 100) + "%";
  }

  /* ---------- toast + copy ---------- */

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    void t.offsetWidth;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-visible");
      toastTimer = setTimeout(function () { t.hidden = true; }, 250);
    }, 1800);
  }

  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(true); } catch (e) { done(false); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else fallback();
  }

  /* ---------- renderers ---------- */

  function renderHome() {
    var m = LIB.meta;
    var badges = m.badges.map(function (b) { return '<span class="hero-badge">' + esc(b) + "</span>"; }).join("");
    $("#home-hero").innerHTML =
      '<p class="hero-kicker">A book by ' + esc(m.author) + "</p>" +
      "<h1>" + esc(m.title) + "</h1>" +
      '<p class="hero-sub">' + esc(m.subtitle) + "</p>" +
      '<div class="hero-lines">' +
      '  <p class="hl-1">' + esc(m.heroLines[0]) + ". " + esc(m.heroLines[1]) + ".</p>" +
      "  <p>" + esc(m.heroLines[2]) + "</p>" +
      "</div>" +
      '<div class="hero-badges">' + badges + "</div>" +
      '<div class="hero-actions">' +
      '  <a class="btn btn-solid" href="#/q/1">Start with Question 1</a>' +
      '  <button class="btn btn-ghost" data-random type="button">Surprise me</button>' +
      '  <a class="btn btn-ghost" href="#/contents">Browse contents</a>' +
      "</div>";

    var s = m.stats;
    $("#home-stats").innerHTML =
      '<div class="stat"><b>' + s.questions + "</b><span>Questions</span></div>" +
      '<div class="stat"><b>' + s.parts + "</b><span>Parts</span></div>" +
      '<div class="stat"><b>' + s.prompts + "</b><span>Copy-ready prompts</span></div>" +
      '<div class="stat"><b>' + s.moneySecrets + "</b><span>Money-secrets boxes</span></div>";

    $("#home-parts").innerHTML = LIB.parts.map(function (p) {
      var count = p.to - p.from + 1;
      var done = 0;
      for (var n = p.from; n <= p.to; n++) if (readSet.has(n)) done++;
      var pct = Math.round(done / count * 100);
      var secs = "";
      if (p.sections) {
        secs = '<p class="part-sections">' + p.sections.map(function (sx) { return "<span>" + esc(sx.title) + "</span>"; }).join("") + "</p>";
      }
      return '<a class="part-card" href="#/contents">' +
        '<div class="part-card-head"><span class="part-num">' + p.n + "</span><h3>" + esc(p.title) + '</h3><span class="part-range">Q' + p.from + "\u2013" + p.to + "</span></div>" +
        secs +
        '<div class="part-progress"><div class="part-progress-bar"><span style="width:' + pct + '%"></span></div>' +
        '<span class="part-progress-label">' + (done === count ? "Completed" : done + " of " + count + " read") + "</span></div>" +
        "</a>";
    }).join("");
  }

  function tocRowHTML(q) {
    var isRead = readSet.has(q.n);
    return '<a class="toc-row' + (isRead ? " is-read" : "") + '" href="#/q/' + q.n + '" data-num="' + q.n + '">' +
      '<span class="toc-check" aria-hidden="true">' + (isRead ? "\u2713" : "") + "</span>" +
      '<span class="toc-num">Q' + q.n + "</span>" +
      '<span class="toc-title">' + esc(q.title) + "</span>" +
      '<span class="toc-min">' + q.minutes + " min</span>" +
      "</a>";
  }

  function renderContents(filter) {
    var read = readSet.size;
    var pct = Math.round(read / TOTAL * 100);
    $("#contents-progress").innerHTML =
      '<span class="cp-text"><b>' + read + "</b> of " + TOTAL + " questions read</span>" +
      '<div class="cp-bar"><span style="width:' + pct + '%"></span></div>' +
      '<span class="cp-text">' + pct + "%</span>" +
      (read ? '<button class="btn btn-ghost btn-small" id="progress-reset" type="button">Reset progress</button>' : "");

    var f = (filter || "").trim().toLowerCase();
    var html = "";
    LIB.parts.forEach(function (p) {
      var qs = LIB.questions.filter(function (q) { return q.n >= p.from && q.n <= p.to; });
      var rows = "";
      var lastSec = null;
      qs.forEach(function (q) {
        if (f && (q.title + " " + plainOf(q)).toLowerCase().indexOf(f) === -1) return;
        if (p.sections && q.section !== lastSec) {
          rows += '<p class="toc-section-label">' + esc(q.section) + "</p>";
          lastSec = q.section;
        }
        rows += tocRowHTML(q);
      });
      if (!rows && f) return;
      html += '<div class="toc-part" data-part="' + p.n + '">' +
        '<div class="toc-part-head"><span class="pn">Part ' + p.n + "</span><h2>" + esc(p.title) + '</h2><span class="pr">Q' + p.from + "\u2013" + p.to + "</span></div>" +
        rows + "</div>";
    });
    $("#contents-list").innerHTML = html;
    $("#contents-empty").hidden = !!html;
    var reset = $("#progress-reset");
    if (reset) reset.addEventListener("click", function () {
      readSet.clear();
      saveRead();
      updateProgressChrome();
      renderContents($("#toc-filter").value);
      toast("Progress reset");
    });
  }

  function bubbleHTML(b) {
    var initial = (b.who || "?").trim().charAt(0).toUpperCase();
    return '<div class="bubble' + (b.sifu ? " bubble-sifu" : "") + '">' +
      '<div class="bubble-head">' +
      '<span class="bubble-avatar" aria-hidden="true">' + (b.sifu ? "SY" : esc(initial)) + "</span>" +
      '<span class="bubble-name">' + esc(b.who) + "</span>" +
      (b.role ? '<span class="bubble-role">' + esc(b.role) + "</span>" : "") +
      "</div>" +
      "<p>" + b.html + "</p>" +
      "</div>";
  }

  function renderReader(n) {
    var q = qByNum(n);
    var root = $("#reader");
    if (!q) {
      root.innerHTML =
        '<p class="back-link"><a href="#/contents">\u2190 Back to contents</a></p>' +
        '<div class="not-found"><h1>Question not found</h1><p>This book has ' + TOTAL + " questions.</p>" +
        '<a class="btn btn-ghost" href="#/contents">Open the contents</a></div>';
      return;
    }
    var p = partOf(q.n);
    var isRead = readSet.has(q.n);
    var prev = qByNum(q.n - 1), next = qByNum(q.n + 1);

    var blocksArr = q.blocks.map(function (b) {
      if (b.t === "d") return bubbleHTML(b);
      if (b.t === "p") return '<p class="block-p">' + b.html + "</p>";
      if (b.t === "prompt") return '<div class="prompt-block"><span class="prompt-label">AI PROMPT \u00B7 READY TO COPY</span>' +
        '<button class="prompt-copy" data-copy-prompt type="button">Copy</button><p>' + b.html + "</p></div>";
      if (b.t === "ul") return '<ul class="block-ul">' + b.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") + "</ul>";
      if (b.t === "ms") return '<div class="ms-panel"><div class="ms-head"><span class="ms-glyph" aria-hidden="true">\u2726</span>' +
        "<h3>Money Secrets</h3>" +
        '<button class="ms-copy" data-copy-ms="' + q.n + '" type="button">Copy all</button></div>' +
        "<ul>" + b.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") + "</ul></div>";
      return "";
    });
    var nPrompts = q.blocks.filter(function (b) { return b.t === "prompt"; }).length;

    root.innerHTML =
      '<div class="reader-head">' +
      '<p class="back-link"><a href="#/contents">\u2190 Contents</a></p>' +
      '<p class="crumbs"><a href="#/contents">Part ' + p.n + " \u00B7 " + esc(p.title) + "</a>" +
      (q.section ? " \u00B7 " + esc(q.section) : "") + "</p>" +
      '<div class="reader-title-row"><span class="reader-qnum">Q' + q.n + "</span>" +
      "<div><h1>" + esc(q.title) + "</h1>" +
      '<div class="reader-meta"><span class="chip">' + q.minutes + " min read</span>" +
      (nPrompts ? '<span class="chip chip-gold">' + nPrompts + " AI prompts inside</span>" : "") +
      '<button class="btn btn-small ' + (isRead ? "btn-ghost is-done" : "btn-gold") + '" id="mark-read" type="button">' +
      (isRead ? "\u2713 Read \u2014 tap to unmark" : "Mark as read") + "</button></div></div></div></div>" +
      '<div class="dialogue" aria-label="Coaching dialogue"></div>' +
      '<div class="reader-blocks"></div>' +
      '<div class="reader-foot">' +
      (prev ? '<a class="foot-nav" href="#/q/' + prev.n + '"><span class="fn-dir">\u2190 Previous</span><span class="fn-title">Q' + prev.n + " \u00B7 " + esc(prev.title) + "</span></a>"
            : '<span class="foot-nav fn-placeholder"><span class="fn-dir">\u2190 Previous</span><span class="fn-title">The beginning</span></span>') +
      (next ? '<a class="foot-nav fn-next" href="#/q/' + next.n + '"><span class="fn-dir">Next \u2192</span><span class="fn-title">Q' + next.n + " \u00B7 " + esc(next.title) + "</span></a>"
            : '<a class="foot-nav fn-next" href="#/afterword"><span class="fn-dir">Finish \u2192</span><span class="fn-title">Read the afterword</span></a>') +
      "</div>";

    // split blocks into dialogue vs after-blocks for cleaner layout
    var dlg = $(".dialogue", root), rest = $(".reader-blocks", root);
    q.blocks.forEach(function (b, idx) {
      var node = document.createElement("div");
      node.innerHTML = blocksArr[idx];
      var child = node.firstElementChild;
      if (!child) return;
      if (b.t === "d") dlg.appendChild(child);
      else rest.appendChild(child);
    });

    var mark = $("#mark-read");
    mark.addEventListener("click", function () {
      if (readSet.has(q.n)) { readSet.delete(q.n); toast("Marked as unread"); }
      else { readSet.add(q.n); toast("Q" + q.n + " marked as read"); }
      saveRead();
      updateProgressChrome();
      renderReader(q.n);
    });
  }

  function snippet(text, query) {
    var idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return esc(text.slice(0, 160)) + "\u2026";
    var start = Math.max(0, idx - 70);
    var frag = text.slice(start, Math.min(text.length, idx + 130));
    var out = esc(frag);
    var markRe = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    out = out.replace(markRe, function (m) { return "<mark>" + m + "</mark>"; });
    return (start > 0 ? "\u2026" : "") + out + (idx + 130 < text.length ? "\u2026" : "");
  }

  var searchTimer = null;
  function runSearch(val) {
    var f = val.trim().toLowerCase();
    var box = $("#search-results");
    if (!f) {
      box.innerHTML = "";
      $("#search-count").textContent = "";
      $("#search-empty").hidden = true;
      return;
    }
    var hits = [];
    LIB.questions.forEach(function (q) {
      var plain = plainOf(q).toLowerCase();
      var idx = plain.indexOf(f);
      if (idx !== -1) hits.push({ q: q, plain: plainOf(q), idx: idx });
    });
    $("#search-count").textContent = hits.length + (hits.length === 1 ? " question matches" : " questions match") + " \u201C" + val.trim() + "\u201D";
    $("#search-empty").hidden = hits.length !== 0;
    box.innerHTML = hits.slice(0, 50).map(function (h) {
      return '<a class="sr-item" href="#/q/' + h.q.n + '">' +
        '<div class="sr-head"><span class="sr-num">Q' + h.q.n + "</span><span class=\"sr-title\">" + esc(h.q.title) + "</span></div>" +
        '<p class="sr-snippet">' + snippet(h.plain, f) + "</p></a>";
    }).join("") + (hits.length > 50 ? '<p class="result-count">Showing the first 50 of ' + hits.length + " matches \u2014 refine your keyword.</p>" : "");
  }

  function renderAfterword() {
    var blocks = LIB.afterword;
    var html = "";
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.t === "h") html += '<h3 class="aw-h">' + b.html + "</h3>";
      else if (b.t === "p") {
        // a paragraph right after the signature goes inside the flow as normal text
        html += '<p class="block-p">' + b.html + "</p>";
      } else if (b.t === "ul") html += '<ul class="block-ul">' + b.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") + "</ul>";
      else if (b.t === "prompt") html += '<div class="prompt-block"><span class="prompt-label">AI PROMPT</span><p>' + b.html + "</p></div>";
      else if (b.t === "sig") {
        var line = "";
        var nx = blocks[i + 1];
        if (nx && nx.t === "p") { line = nx.html; i++; }
        html += '<div class="sig-card"><span class="seal" aria-hidden="true">SY</span>' +
          '<div><div class="sig-name">Sifu Yik</div><div class="sig-line">' + line + "</div></div></div>";
      }
    }
    html += '<div class="home-cta" style="margin-top:2.5rem"><h2>Now close the book. Open your laptop.</h2>' +
      "<p>One action is enough. Tomorrow, do a second one.</p>" +
      '<div class="hero-actions"><a class="btn btn-solid" href="#/q/1">Revisit Question 1</a>' +
      '<button class="btn btn-ghost" data-random type="button">Random question</button></div></div>';
    $("#afterword-body").innerHTML = html;
  }

  /* ---------- router ---------- */

  var VIEWS = ["home", "contents", "reader", "search", "afterword"];

  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/");
    if (!parts[0]) return { view: "home", arg: "" };
    return { view: parts[0], arg: decodeURIComponent(parts.slice(1).join("/")) };
  }

  function showView(name) {
    $$(".view").forEach(function (v) {
      v.hidden = v.getAttribute("data-view") !== name;
    });
    var navKey = name === "reader" ? "contents" : name;
    $$(".site-nav a").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === navKey);
    });
    $(".read-bar").classList.toggle("is-active", name === "reader");
  }

  function route() {
    var r = currentRoute();
    switch (r.view) {
      case "home": showView("home"); renderHome(); break;
      case "contents": showView("contents"); renderContents(""); $("#toc-filter").value = ""; break;
      case "q": showView("reader"); renderReader(r.arg); break;
      case "search": showView("search"); break;
      case "afterword": showView("afterword"); renderAfterword(); break;
      default: showView("home"); renderHome();
    }
    window.scrollTo(0, 0);
  }

  /* ---------- events ---------- */

  function bindEvents() {
    // global delegation: prompts, ms copy, random
    document.addEventListener("click", function (ev) {
      var el = ev.target.closest ? ev.target.closest("[data-copy-prompt],[data-copy-ms],[data-random]") : null;
      if (!el) return;
      if (el.hasAttribute("data-random")) {
        var n = 1 + Math.floor(Math.random() * TOTAL);
        location.hash = "#/q/" + n;
        return;
      }
      ev.preventDefault();
      var block = el.closest(".prompt-block") || el.closest(".ms-panel");
      var text = htmlToText(block.textContent.replace(/^AI PROMPT.*?(?=Please|The|You|Clients|Help|Give|Based|If|Tell|Describe|Write|Consider|Work)/s, "")).trim();
      if (el.hasAttribute("data-copy-ms")) {
        var q = qByNum(el.getAttribute("data-copy-ms"));
        var items = [];
        q.blocks.forEach(function (b) { if (b.t === "ms") items = items.concat(b.items.map(htmlToText)); });
        text = "Money Secrets \u2014 Q" + q.n + ": " + q.title + "\n\n" + items.map(function (x) { return "\u2022 " + x; }).join("\n") + "\n\n\u2014 Sifu Yik Chan, AI Sales Secrets";
        copyText(text, function (ok) { toast(ok ? "Money Secrets copied" : "Copy failed"); });
        return;
      }
      copyText(text, function (ok) { toast(ok ? "Prompt copied \u2014 paste it into your AI" : "Copy failed"); });
    });

    // contents filter
    $("#toc-filter").addEventListener("input", function () {
      renderContents(this.value);
    });
    $("#contents-clear").addEventListener("click", function () {
      $("#toc-filter").value = "";
      renderContents("");
      $("#toc-filter").focus();
    });

    // search
    $("#site-search").addEventListener("input", function () {
      var v = this.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { runSearch(v); }, 120);
    });

    // "/" focuses the nearest search input
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) {
        ev.preventDefault();
        var r = currentRoute();
        if (r.view === "search") $("#site-search").focus();
        else if (r.view === "contents") $("#toc-filter").focus();
        else location.hash = "#/search";
      }
      if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && currentRoute().view === "reader" &&
          !/input|textarea/i.test(document.activeElement.tagName)) {
        var m = location.hash.match(/^#\/q\/(\d+)/);
        if (m) {
          var n = Number(m[1]) + (ev.key === "ArrowRight" ? 1 : -1);
          if (n >= 1 && n <= TOTAL) location.hash = "#/q/" + n;
        }
      }
    });

    // reader scroll progress
    window.addEventListener("scroll", function () {
      if (currentRoute().view !== "reader") return;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      $("#read-bar-fill").style.width = pct + "%";
    }, { passive: true });

    window.addEventListener("hashchange", route);
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    $("#footer-meta").textContent =
      LIB.meta.stats.questions + " questions \u00B7 " + LIB.meta.stats.parts + " parts \u00B7 " +
      LIB.meta.stats.prompts + " copy-ready prompts \u00B7 by " + LIB.meta.author;
    updateProgressChrome();
    bindEvents();
    route();
  });
})();
