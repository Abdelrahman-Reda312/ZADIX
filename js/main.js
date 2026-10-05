/* ZADIX — site interactions */
(function () {
  const body = document.body;
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Preloader → reveal hero (doesn't wait for videos to finish downloading) */
  setTimeout(() => {
    document.querySelector(".preloader")?.classList.add("done");
    body.classList.remove("loading");
    body.classList.add("ready");
  }, 1400);

  /* Page wipe transition between internal pages */
  const wipe = document.querySelector(".page-wipe");
  document.querySelectorAll('a[href$=".html"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || a.target === "_blank") return;
      e.preventDefault();
      wipe?.classList.add("active");
      setTimeout(() => (window.location.href = a.getAttribute("href")), 600);
    });
  });
  window.addEventListener("pageshow", () => wipe?.classList.remove("active"));

  /* All scroll-driven effects batched into one animation frame */
  const header = document.querySelector(".header");
  const progress = document.querySelector(".progress");
  const toTop = document.querySelector(".to-top");
  const heroVideo = document.querySelector(".hero-video");
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  const timeline = document.querySelector(".timeline");
  const fill = timeline?.querySelector(".fill");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    header?.classList.toggle("scrolled", y > 60);
    toTop?.classList.toggle("show", y > 700);
    const max = document.documentElement.scrollHeight - vh;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (heroVideo && y < vh && !reduceMotion) heroVideo.style.transform = `translate3d(0,${y * 0.3}px,0) scale(1.05)`;
    parallaxEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate3d(0,${(r.top - vh / 2) * -(parseFloat(el.dataset.parallax) || 0.1)}px,0)`;
    });
    if (fill) {
      const r = timeline.getBoundingClientRect();
      fill.style.height = Math.min(Math.max((vh * 0.6 - r.top) / r.height, 0), 1) * 100 + "%";
    }
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* Mobile menu */
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".menu");
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu.classList.toggle("open");
    body.style.overflow = menu.classList.contains("open") ? "hidden" : "";
  });

  /* Reveal on scroll */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }),
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  const observeReveal = (root) => root.querySelectorAll(".reveal:not(.in)").forEach((el) => {
    if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + "ms";
    io.observe(el);
  });
  observeReveal(document);

  /* Videos: load only when near the viewport, pause when off-screen */
  const videoIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    const v = en.target;
    if (en.isIntersecting) {
      if (v.dataset.src) { v.src = v.dataset.src; v.removeAttribute("data-src"); }
      v.play?.().catch(() => {});
    } else if (!v.paused) {
      v.pause();
    }
  }), { rootMargin: "300px 0px" });
  document.querySelectorAll("video").forEach((v) => videoIO.observe(v));

  /* Animated counters */
  const animateCount = (el) => {
    el.dataset.done = "1";
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = el.dataset.count + suffix; return; }
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / 2000, 1);
      el.textContent = Math.round(+el.dataset.count * (1 - Math.pow(1 - p, 4))) + suffix; // reads live value
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const countIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { animateCount(en.target); countIO.unobserve(en.target); }
  }), { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

  /* Segmented gold rings (one segment per port / country / hour / month) */
  const buildRing = (ring) => {
    ring.querySelector("svg")?.remove();
    const n = Math.max(1, Math.min(+ring.dataset.segments || 1, 40));
    const r = 76, C = 2 * Math.PI * r, gap = n > 12 ? 10 : 12;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 170 170");
    svg.innerHTML = `<defs><linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9a7a3a"/><stop offset="0.5" stop-color="#f1dca4"/><stop offset="1" stop-color="#c9a45c"/></linearGradient></defs>
      <circle class="inner" cx="85" cy="85" r="62"/>`;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "seg");
      c.setAttribute("cx", 85); c.setAttribute("cy", 85); c.setAttribute("r", r);
      c.setAttribute("stroke-dasharray", `${Math.max(C / n - gap, 2)} ${C}`);
      c.setAttribute("stroke-dashoffset", -(i * C) / n);
      c.style.transitionDelay = `${i * (1400 / n)}ms`;
      svg.appendChild(c);
    }
    ring.prepend(svg);
  };
  const rings = document.querySelectorAll(".ring[data-segments]");
  rings.forEach(buildRing);
  const ringIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("on"); ringIO.unobserve(en.target); }
  }), { threshold: 0.5 });
  rings.forEach((r) => ringIO.observe(r));

  /* Region donut + bars (linked hover) */
  const panel = document.querySelector(".insight-panel");
  let drawPanel = () => {};
  if (panel) {
    const donut = panel.querySelector(".donut");
    const tip = panel.querySelector(".chart-tip");
    const rows = [...panel.querySelectorAll(".bars li")];
    const r = 80, C = 2 * Math.PI * r, gap = 2.5;
    let arcs = [], shown = false;

    const focus = (i, on) => {
      arcs.forEach((a, j) => { a.classList.toggle("dim", on && j !== i); a.classList.toggle("hot", on && j === i); });
      rows.forEach((li, j) => li.classList.toggle("dim", on && j !== i));
      if (on && arcs[i]) {
        const total = rows.reduce((s, li) => s + +li.dataset.value, 0);
        const li = rows[i], v = +li.dataset.value, a = arcs[i];
        tip.innerHTML = `<b>${li.dataset.region}</b> · ${v} of ${total} (${Math.round((v / total) * 100)}%)`;
        tip.style.left = 50 + Math.cos(a._mid) * 40 + "%";
        tip.style.top = 50 + Math.sin(a._mid) * 40 + "%";
      }
      tip.classList.toggle("show", on);
    };
    rows.forEach((li, i) => {
      li.addEventListener("mouseenter", () => focus(i, true));
      li.addEventListener("mouseleave", () => focus(i, false));
    });

    const reveal = () => {
      const max = Math.max(...rows.map((li) => +li.dataset.value), 1);
      arcs.forEach((a, i) => setTimeout(() => a.setAttribute("stroke-dasharray", `${a.dataset.len} ${C}`), i * 250));
      rows.forEach((li) => (li.querySelector(".bar-fill").style.width = (+li.dataset.value / max) * 100 + "%"));
    };

    drawPanel = () => {
      arcs.forEach((a) => a.remove());
      const total = rows.reduce((s, li) => s + +li.dataset.value, 0) || 1;
      let acc = 0;
      arcs = rows.map((li, i) => {
        const len = (+li.dataset.value / total) * C;
        const arc = document.createElementNS(NS, "circle");
        arc.setAttribute("class", "arc");
        arc.setAttribute("cx", 100); arc.setAttribute("cy", 100); arc.setAttribute("r", r);
        arc.setAttribute("stroke", li.dataset.color);
        arc.setAttribute("stroke-dasharray", `0 ${C}`);
        arc.setAttribute("stroke-dashoffset", -acc);
        arc.dataset.len = Math.max(len - gap, 0);
        arc._mid = ((acc + len / 2) / C) * 2 * Math.PI - Math.PI / 2;
        arc.addEventListener("mouseenter", () => focus(i, true));
        arc.addEventListener("mouseleave", () => focus(i, false));
        acc += len;
        donut.appendChild(arc);
        return arc;
      });
      if (shown) requestAnimationFrame(reveal);
    };
    drawPanel();

    const panelIO = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      shown = true; reveal(); panelIO.disconnect();
    }, { threshold: 0.4 });
    panelIO.observe(panel);
  }

  /* Hook for live data (js/live.js) to redraw stats after loading them */
  window.Zadix = {
    refreshStats() {
      rings.forEach(buildRing);
      document.querySelectorAll("[data-count]").forEach((el) => {
        if (el.dataset.done) el.textContent = el.dataset.count + (el.dataset.suffix || "");
      });
      drawPanel();
    },
    observeReveal,
  };

  /* Custom cursor — runs only while the mouse is moving */
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  if (cursor && matchMedia("(hover: hover)").matches && !reduceMotion) {
    let mx = 0, my = 0, cx = 0, cy = 0, running = false;
    const loop = () => {
      cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(mx - cx) + Math.abs(my - cy) > 0.3) requestAnimationFrame(loop);
      else running = false;
    };
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add("on"); dot.classList.add("on");
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener("mouseover", (e) => {
      cursor.classList.toggle("hover", !!e.target.closest("a, button, .card, .product, .g, summary, .news-card"));
    });
  }

  /* Ship sailing along the voyage route (ports page) — paused when off-screen */
  const route = document.querySelector(".route");
  if (route && !reduceMotion) {
    const path = route.querySelector(".path-draw");
    const ship = route.querySelector(".ship-icon");
    const len = path.getTotalLength();
    let t = 0, visible = false;
    const sail = () => {
      if (!visible) return;
      t = (t + 0.0011) % 1;
      const pt = path.getPointAtLength(t * len);
      const ahead = path.getPointAtLength(Math.min(t * len + 2, len));
      const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
      ship.setAttribute("transform", `translate(${pt.x},${pt.y}) rotate(${angle})`);
      requestAnimationFrame(sail);
    };
    new IntersectionObserver((en) => {
      const was = visible; visible = en[0].isIntersecting;
      if (visible && !was) requestAnimationFrame(sail);
    }).observe(route);
  }

  /* Quote form → delivered to the company Gmail via FormSubmit (and saved for the admin panel) */
  const form = document.querySelector("#enquiry");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = form.querySelector(".form-note");
    const btn = form.querySelector('button[type="submit"]');
    const d = Object.fromEntries(new FormData(form));
    if (d._honey) return; // bot
    delete d._honey;
    btn.disabled = true;
    note.classList.remove("error");
    note.textContent = "Sending your enquiry…";
    const payload = {
      _subject: `New quote request — ${d.vessel || "Vessel"} @ ${d.port || "Port"}`,
      _template: "table",
      Name: d.name, Company: d.company, Email: d.email, Phone: d.phone,
      Vessel: d.vessel, Port: d.port, ETA: d.eta, Requirements: d.message,
      _replyto: d.email,
    };
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${form.dataset.to}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || String(out.success) === "false") throw new Error(out.message || "send failed");
      document.dispatchEvent(new CustomEvent("zadix:quote", { detail: d }));
      note.textContent = "Thank you — your enquiry has been sent. Our team will reply shortly.";
      form.reset();
    } catch (err) {
      note.classList.add("error");
      note.innerHTML = `Sorry, we couldn't send that right now. Please email us at <a href="mailto:${form.dataset.to}">${form.dataset.to}</a>.`;
    } finally {
      btn.disabled = false;
    }
  });
})();
