/* Live content for the public site: statistics, news, visit counter, quote archive.
   Loads after the page is interactive and does nothing until Supabase is configured. */
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_LIB, isConfigured } from "./supabase-config.js";

/* Hidden admin entrance: type "zadix" anywhere on the site (outside form fields) */
let typed = "";
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, select")) return;
  typed = (typed + e.key.toLowerCase()).slice(-5);
  if (typed === "zadix") window.location.href = "zx-control.html";
});

const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));

if (isConfigured) idle(start);

async function start() {
  const { createClient } = await import(SUPABASE_LIB);
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const clip = (v, n) => String(v || "").slice(0, n);

  /* 1. Visit counter (skipped for the admin's own browser) */
  try {
    let isAdmin = false, vid = "anon", isNew = false;
    try {
      isAdmin = localStorage.getItem("zx_admin") === "1";
      vid = localStorage.getItem("zx_vid");
      if (!vid) { vid = crypto.randomUUID(); localStorage.setItem("zx_vid", vid); isNew = true; }
    } catch { vid = "anon"; }
    if (!isAdmin) {
      const w = window.innerWidth;
      let ref = "";
      try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
      if (ref === location.hostname) ref = "";
      db.from("visits").insert({
        page: clip(location.pathname.split("/").pop() || "index.html", 60),
        ref: clip(ref, 120),
        vid: clip(vid, 40),
        is_new: isNew,
        device: w < 700 ? "Mobile" : w < 1100 ? "Tablet" : "Desktop",
        lang: clip(navigator.language, 10),
        tz: clip(Intl.DateTimeFormat().resolvedOptions().timeZone, 40),
      }).then(() => {});
    }
  } catch {}

  /* 2. Statistics edited in the admin panel */
  if (document.querySelector(".insights")) {
    const { data } = await db.from("site_stats").select("*").eq("id", 1).maybeSingle();
    if (data) applyStats({ ...data, regions: { med: data.med, canal: data.canal, red: data.red } });
  }

  /* 3. News */
  const newsSec = document.querySelector("#news");
  if (newsSec) {
    const { data } = await db.from("news").select("title,date,body,image").eq("published", true).order("date", { ascending: false }).limit(3);
    if (data?.length) renderNews(newsSec, data);
  }

  /* 4. Keep a copy of each quote request for the admin panel */
  document.addEventListener("zadix:quote", (e) => {
    const d = e.detail || {};
    db.from("quotes").insert({
      name: clip(d.name, 120), company: clip(d.company, 160), email: clip(d.email, 160), phone: clip(d.phone, 60),
      vessel: clip(d.vessel, 120), port: clip(d.port, 80), eta: clip(d.eta, 80), message: clip(d.message, 4000),
    }).then(() => {});
  });
}

function applyStats(s) {
  const set = (key, value, segments) => {
    const ring = document.querySelector(`.ring[data-stat="${key}"]`);
    if (!ring || value == null || value === "") return;
    ring.querySelector(".num").dataset.count = value;
    if (segments) ring.dataset.segments = segments;
  };
  set("ports", s.ports, s.ports);
  set("countries", s.countries, s.countries);
  set("hours", s.hours);
  set("days", s.days);
  const regions = s.regions || {};
  let total = 0;
  document.querySelectorAll(".bars li[data-key]").forEach((li) => {
    const v = regions[li.dataset.key];
    if (v != null && v !== "") {
      li.dataset.value = v;
      const unit = li.dataset.key === "canal" ? "location" : "port";
      li.querySelector("em").textContent = `${v} ${unit}${+v === 1 ? "" : "s"}`;
    }
    total += +li.dataset.value;
  });
  const t = document.querySelector(".donut-total");
  if (t) t.textContent = total;
  window.Zadix?.refreshStats();
}

function renderNews(section, items) {
  const grid = section.querySelector(".news-grid");
  grid.textContent = "";
  items.forEach((n, i) => {
    const card = document.createElement("article");
    card.className = "news-card reveal";
    card.dataset.delay = i * 120;
    if (n.image) {
      const ph = document.createElement("div");
      ph.className = "ph";
      const img = document.createElement("img");
      img.src = n.image; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      ph.appendChild(img);
      card.appendChild(ph);
    }
    const body = document.createElement("div");
    body.className = "body";
    const time = document.createElement("time");
    time.dateTime = n.date || "";
    time.textContent = n.date ? new Date(n.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
    const h = document.createElement("h3"); h.textContent = n.title || "";
    const p = document.createElement("p"); p.textContent = n.body || "";
    body.append(time, h, p);
    card.appendChild(body);
    grid.appendChild(card);
  });
  section.hidden = false;
  window.Zadix?.observeReveal(section);
}
