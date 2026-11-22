(() => {
  "use strict";

  if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
    import("https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js").catch(() => {});
  }

  const toastEl = document.getElementById("toast-live");
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 2500);
  }

  async function copyValue(val, msg) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(val);
      } else {
        const ta = document.createElement("textarea");
        ta.value = val;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showToast(msg);
    } catch {
      showToast(val);
    }
  }

  // Responsive Popover Navbar
  function initNavbar() {
    const header = document.querySelector(".site-header");
    const inner = header?.querySelector(".header-inner");
    const menu = document.getElementById("site-menu");
    if (!header || !inner || !menu) return;

    let lastCollapsedWidth = 0;

    function sync(force = false) {
      const wideNow = header.classList.contains("is-wide");
      const w = header.getBoundingClientRect().width;
      if (!wideNow && !force && w <= lastCollapsedWidth) return;

      const wasOpen = !wideNow && menu.matches(":popover-open, .\\:popover-open");
      header.classList.add("is-measuring", "is-wide");
      menu.removeAttribute("popover");

      if (inner.scrollWidth <= inner.clientWidth + 1) {
        lastCollapsedWidth = 0;
      } else {
        header.classList.remove("is-wide");
        menu.setAttribute("popover", "auto");
        lastCollapsedWidth = w;
        if (wasOpen && typeof menu.showPopover === "function") {
          try { menu.showPopover(); } catch {}
        }
      }
      window.requestAnimationFrame(() => header.classList.remove("is-measuring"));
    }

    const onScroll = () => {
      header.setAttribute("data-scrolled", window.scrollY > 8 ? "true" : "false");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    sync(true);
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => sync(false));
      ro.observe(header);
      ro.observe(menu);
    }
    document.fonts?.ready?.then(() => sync(true));
  }

  // Light-dismiss fallback for <dialog closedby="any">
  function initDialogs() {
    const dialogs = document.querySelectorAll('dialog[closedby="any"]');
    const outside = (e, d) => {
      const r = d.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    dialogs.forEach((d) => {
      d.addEventListener("close", () => { d.returnValue = ""; });
      if (!("closedBy" in HTMLDialogElement.prototype)) {
        let downOutside = false;
        d.addEventListener("pointerdown", (e) => { downOutside = outside(e, d); });
        d.addEventListener("pointerup", (e) => {
          if (downOutside && outside(e, d)) d.close();
          downOutside = false;
        });
      }
    });
  }

  // Hero Motion Pause Control (WCAG 2.2.2)
  function initMotionControls() {
    const toggleBtns = document.querySelectorAll("[data-toggle-motion]");
    if (toggleBtns.length === 0) return;

    let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const applyState = () => {
      document.body.classList.toggle("is-motion-paused", paused);
      toggleBtns.forEach((b) => {
        b.textContent = paused ? "Chạy hiệu ứng" : "Tạm dừng chuyển động";
      });
    };
    applyState();
    toggleBtns.forEach((b) => b.addEventListener("click", () => {
      paused = !paused;
      applyState();
    }));
  }

  // Gallery & Poster Modal Triggers
  function initModals() {
    const gDialog = document.getElementById("gallery-dialog");
    if (gDialog) {
      const gTitle = document.getElementById("gallery-dialog-title");
      const gStage = document.getElementById("gallery-dialog-stage");
      const gDesc = document.getElementById("gallery-dialog-desc");
      document.querySelectorAll("[data-gallery-card]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (gTitle) gTitle.textContent = btn.dataset.title || "";
          if (gDesc) gDesc.textContent = btn.dataset.desc || "";
          if (gStage) gStage.textContent = btn.dataset.slot || "Ảnh sắp cập nhật";
          gDialog.showModal();
        });
      });
    }

    const pBtn = document.getElementById("poster-zoom-btn");
    const pDialog = document.getElementById("poster-dialog");
    if (pBtn && pDialog) {
      pBtn.addEventListener("click", () => pDialog.showModal());
    }
  }

  // Copy & SVG/PNG Export
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportSvgAsPng(svgEl, width, height, filename) {
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((png) => {
          if (png) {
            downloadBlob(png, filename);
            showToast(`Đã tải xuống ${filename}`);
          }
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function initExportsAndCopy() {
    document.addEventListener("click", (e) => {
      const copyBtn = e.target.closest("[data-copy-value]");
      if (copyBtn) {
        copyValue(copyBtn.dataset.copyValue || "", copyBtn.dataset.copyLabel || "Đã sao chép");
      }

      const svgBtn = e.target.closest("[data-dl-svg]");
      if (svgBtn) {
        const el = document.getElementById(svgBtn.dataset.dlSvg || "");
        if (el) {
          const clone = el.cloneNode(true);
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const xml = new XMLSerializer().serializeToString(clone);
          downloadBlob(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }), `${svgBtn.dataset.dlName || "asset"}.svg`);
          showToast(`Đã tải ${svgBtn.dataset.dlName || "asset"}.svg`);
        }
      }

      const pngBtn = e.target.closest("[data-dl-png]");
      if (pngBtn) {
        const el = document.getElementById(pngBtn.dataset.dlPng || "");
        if (el) {
          const w = Number(pngBtn.dataset.dlW || 800);
          const h = Number(pngBtn.dataset.dlH || 800);
          exportSvgAsPng(el, w, h, `${pngBtn.dataset.dlName || "asset"}.png`);
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initDialogs();
    initMotionControls();
    initModals();
    initExportsAndCopy();
  });
})();
