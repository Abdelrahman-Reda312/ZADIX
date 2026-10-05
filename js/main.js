/* ZADIX — site interactions */
(function () {
  const body = document.body;

  /* Preloader → reveal hero (doesn't wait for videos to finish downloading) */
  setTimeout(() => {
    document.querySelector(".preloader")?.classList.add("done");
    body.classList.remove("loading");
    body.classList.add("ready");
  }, 1600);

  /* Page wipe transition between internal pages */
  const wipe = document.querySelector(".page-wipe");
  document.querySelectorAll('a[href$=".html"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || a.target === "_blank") return;
      e.preventDefault();
      wipe?.classList.add("active");
      setTimeout(() => (window.location.href = a.getAttribute("href")), 650);
    });
  });
  window.addEventListener("pageshow", () => wipe?.classList.remove("active"));

  /* Header state, progress bar, back-to-top */
  const header = document.querySelector(".header");
  const progress = document.querySelector(".progress");
  const toTop = document.querySelector(".to-top");
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle("scrolled", y > 60);
    toTop?.classList.toggle("show", y > 700);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
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
  document.querySelectorAll(".reveal").forEach((el, i) => {
    if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + "ms";
    io.observe(el);
  });

  /* Animated counters */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      const start = performance.now();
      const dur = 2000;
      const tick = (t) => {
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

  /* Custom cursor */
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  if (cursor && matchMedia("(hover: hover)").matches) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add("on"); dot.classList.add("on");
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    });
    const loop = () => {
      cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.querySelectorAll("a, button, .card, .product, .g, summary").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("hover"));
    });
  }

  /* Subtle parallax on hero video and [data-parallax] */
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  const heroVideo = document.querySelector(".hero-video");
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (heroVideo && y < window.innerHeight) heroVideo.style.transform = `translateY(${y * 0.3}px) scale(1.05)`;
    parallaxEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      el.style.transform = `translateY(${(r.top - window.innerHeight / 2) * -speed}px)`;
    });
  }, { passive: true });

  /* Timeline progress line (about page) */
  const timeline = document.querySelector(".timeline");
  const fill = timeline?.querySelector(".fill");
  if (timeline && fill) {
    window.addEventListener("scroll", () => {
      const r = timeline.getBoundingClientRect();
      const p = Math.min(Math.max((window.innerHeight * 0.6 - r.top) / r.height, 0), 1);
      fill.style.height = p * 100 + "%";
    }, { passive: true });
  }

  /* Ship sailing along the voyage route (ports page) */
  const route = document.querySelector(".route");
  if (route) {
    const path = route.querySelector(".path-draw");
    const ship = route.querySelector(".ship-icon");
    const len = path.getTotalLength();
    let t = 0;
    const sail = () => {
      t = (t + 0.0011) % 1;
      const pt = path.getPointAtLength(t * len);
      const ahead = path.getPointAtLength(Math.min(t * len + 2, len));
      const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
      ship.setAttribute("transform", `translate(${pt.x},${pt.y}) rotate(${angle})`);
      requestAnimationFrame(sail);
    };
    sail();
  }

  /* Contact form → opens the visitor's email app with the enquiry filled in */
  const form = document.querySelector("#enquiry");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = `Supply enquiry — ${d.get("vessel") || "Vessel"} @ ${d.get("port") || "Port"}`;
    const lines = [
      `Name: ${d.get("name")}`,
      `Company: ${d.get("company")}`,
      `Email: ${d.get("email")}`,
      `Phone: ${d.get("phone")}`,
      `Vessel: ${d.get("vessel")}`,
      `Port: ${d.get("port")}`,
      `ETA: ${d.get("eta")}`,
      "",
      `${d.get("message")}`,
    ];
    window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    form.querySelector(".form-note").textContent = "Thank you — your email app is opening with your enquiry ready to send.";
  });

  /* Year in footer */
  document.querySelectorAll(".year").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
