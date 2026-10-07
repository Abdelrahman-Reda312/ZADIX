/* Zadix Control — admin dashboard (Supabase Auth + Database) */
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_LIB, isConfigured } from "./supabase-config.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const show = (id) => ["setup", "login", "app"].forEach((x) => ($("#" + x).hidden = x !== id));

const DEFAULT_STATS = { ports: 13, countries: 2, hours: 24, days: 365, med: 3, canal: 5, red: 5 };
const SITE_IMAGES = [
  "cargo-ships", "container-ship", "container-stack", "containers-port", "port-cranes", "port-2", "tanker",
  "ship-night", "ship-container", "warehouse", "forklift", "pallets-fruit", "fruit", "vegetables-2",
  "ropes", "life-buoy", "engine-room", "spare-parts",
];

const toast = (text, bad = false) => {
  const t = $("#toast");
  t.textContent = text;
  t.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = "toast"), 3200);
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

if (!isConfigured) {
  show("setup");
} else {
  boot();
}

async function boot() {
  const { createClient } = await import(SUPABASE_LIB);
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const must = ({ data, error }) => { if (error) throw error; return data; };
  const denied = (err) => toast("Could not complete that: " + (err?.message || err), true);

  /* ---------- Auth ---------- */
  let started = false;
  const enter = async (session) => {
    if (!session) { started = false; show("login"); return; }
    // Only accounts listed in the admins table may use the panel
    const { data: admin } = await sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (!admin) {
      $("#loginMsg").textContent = "This account is not an admin.";
      await sb.auth.signOut();
      return;
    }
    if (started) return;
    started = true;
    try { localStorage.setItem("zx_admin", "1"); } catch {}
    $("#who").textContent = session.user.email;
    show("app");
    loadVisits(); loadQuotes(); loadNews(); loadStats();
  };
  sb.auth.onAuthStateChange((event, session) => {
    // run outside the auth callback, as Supabase recommends
    if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) setTimeout(() => enter(session), 0);
  });

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    $("#loginMsg").textContent = "Signing in…";
    const { error } = await sb.auth.signInWithPassword({ email: f.get("email"), password: f.get("password") });
    $("#loginMsg").textContent = error ? "Wrong email or password." : "";
  });
  $("#logout").addEventListener("click", () => sb.auth.signOut());

  /* ---------- Tabs ---------- */
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => {
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".panel").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
  }));

  /* ---------- Visitors ---------- */
  async function loadVisits() {
    try {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const rows = [];
      // The API returns at most 1000 rows per request, so read in pages
      for (let from = 0; from < 20000; from += 1000) {
        const page = must(await sb.from("visits").select("page,ref,vid,is_new,device,tz,ts")
          .gte("ts", since).order("ts", { ascending: false }).range(from, from + 999));
        rows.push(...page);
        if (page.length < 1000) break;
      }
      renderVisits(rows.map((r) => ({ ...r, isNew: r.is_new, ts: new Date(r.ts) })));
    } catch (err) { denied(err); }
  }
  $("#refreshVisits").addEventListener("click", loadVisits);

  function renderVisits(v) {
    const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const today = dayKey(new Date());
    $("#kViews").textContent = v.length.toLocaleString();
    $("#kUnique").textContent = new Set(v.map((x) => x.vid)).size.toLocaleString();
    $("#kToday").textContent = v.filter((x) => dayKey(x.ts) === today).length.toLocaleString();
    $("#kNew").textContent = v.filter((x) => x.isNew).length.toLocaleString();

    // 14-day series
    const days = [...Array(14)].map((_, i) => {
      const d = new Date(Date.now() - (13 - i) * 864e5);
      return { key: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), n: 0 };
    });
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    v.forEach((x) => { const i = idx[dayKey(x.ts)]; if (i != null) days[i].n++; });
    drawBars(days);

    const PAGE_NAMES = { "index.html": "Home", "about.html": "About", "services.html": "Services", "ports.html": "Ports", "contact.html": "Contact" };
    rank("#topPages", count(v, (x) => PAGE_NAMES[x.page] || x.page));
    rank("#devices", count(v, (x) => x.device || "Unknown"));
    rank("#zones", count(v, (x) => zoneName(x.tz)));

    $("#recent").innerHTML = v.slice(0, 50).map((x) => `<tr>
      <td>${x.ts.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
      <td>${esc(PAGE_NAMES[x.page] || x.page)}</td><td>${esc(x.device)}</td><td>${esc(zoneName(x.tz))}</td>
      <td>${esc(x.ref || "Direct")}</td><td>${x.isNew ? '<span class="tag">New</span>' : "Returning"}</td></tr>`).join("")
      || `<tr><td colspan="6" class="empty">No visits recorded yet.</td></tr>`;
  }

  const count = (arr, fn) => {
    const m = {};
    arr.forEach((x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const zoneName = (tz) => {
    if (!tz) return "Unknown";
    const special = { "Africa/Cairo": "Egypt", "Europe/Athens": "Greece", "Europe/Sofia": "Bulgaria", "Europe/Bucharest": "Romania", "Europe/Istanbul": "Turkey", "Asia/Dubai": "UAE", "Asia/Riyadh": "Saudi Arabia", "Europe/London": "United Kingdom" };
    return special[tz] || tz.split("/").pop().replace(/_/g, " ");
  };
  function rank(sel, rows) {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    $(sel).innerHTML = rows.map(([k, n]) => `<li><div class="rk"><span>${esc(k)}</span><b>${n}</b></div><div class="rk-bar"><i style="width:${(n / max) * 100}%"></i></div></li>`).join("")
      || `<li class="empty">No data yet</li>`;
  }

  function drawBars(days) {
    const box = $("#dayChart"), tip = $("#dayTip");
    box.querySelector("svg")?.remove();
    const W = 700, H = 220, pad = { l: 34, r: 8, t: 14, b: 26 };
    const max = Math.max(4, ...days.map((d) => d.n));
    const step = Math.ceil(max / 4);
    const top = step * 4;
    const bw = (W - pad.l - pad.r) / days.length;
    const y = (n) => pad.t + (H - pad.t - pad.b) * (1 - n / top);
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = step * i, yy = y(v);
      g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" class="grid"/><text x="${pad.l - 8}" y="${yy + 4}" class="ax" text-anchor="end">${v}</text>`;
    }
    days.forEach((d, i) => {
      const x = pad.l + i * bw + bw * 0.22, w = bw * 0.56, yy = y(d.n), h = Math.max(H - pad.b - yy, d.n ? 2 : 0);
      g += `<path class="bar" d="M${x},${H - pad.b} V${yy + Math.min(4, h)} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${H - pad.b} Z" ${h ? "" : 'style="display:none"'}/>`;
      g += `<rect class="hit" x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" data-i="${i}"/>`;
      if (i % 2 === 1 || days.length <= 7) g += `<text x="${pad.l + i * bw + bw / 2}" y="${H - 8}" class="ax" text-anchor="middle">${d.label}</text>`;
    });
    box.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Page views per day for the last 14 days">${g}</svg>`);
    $$(".hit", box).forEach((r) => {
      r.addEventListener("mouseenter", () => {
        const d = days[+r.dataset.i];
        tip.innerHTML = `<b>${d.n}</b> view${d.n === 1 ? "" : "s"} · ${d.label}`;
        const bb = r.getBoundingClientRect(), cb = box.getBoundingClientRect();
        tip.style.left = bb.left - cb.left + bb.width / 2 + "px";
        tip.style.top = "0px";
        tip.classList.add("show");
        r.classList.add("on");
      });
      r.addEventListener("mouseleave", () => { tip.classList.remove("show"); r.classList.remove("on"); });
    });
  }

  /* ---------- Quote requests ---------- */
  async function loadQuotes() {
    try {
      const items = must(await sb.from("quotes").select("*").order("created_at", { ascending: false }).limit(200));
      const fresh = items.filter((q) => q.status === "new").length;
      $("#newQuotes").hidden = !fresh;
      $("#newQuotes").textContent = fresh;
      $("#quoteList").innerHTML = items.map((q) => `
        <article class="quote ${q.status === "new" ? "is-new" : ""}" data-id="${q.id}">
          <header>
            <div><h4>${esc(q.name)} ${q.company ? `<small>· ${esc(q.company)}</small>` : ""}</h4>
            <time>${q.created_at ? new Date(q.created_at).toLocaleString("en-GB") : ""}</time></div>
            <span class="tag ${q.status === "new" ? "" : "done"}">${q.status === "new" ? "New" : "Handled"}</span>
          </header>
          <dl>
            <div><dt>Vessel</dt><dd>${esc(q.vessel) || "—"}</dd></div>
            <div><dt>Port</dt><dd>${esc(q.port) || "—"}</dd></div>
            <div><dt>ETA</dt><dd>${esc(q.eta) || "—"}</dd></div>
            <div><dt>Phone</dt><dd>${esc(q.phone) || "—"}</dd></div>
          </dl>
          <p>${esc(q.message)}</p>
          <footer>
            <a class="btn sm" href="mailto:${esc(q.email)}?subject=${encodeURIComponent("Re: your quote request — " + (q.vessel || "Zadix"))}"><i class="fa-solid fa-reply"></i>Reply</a>
            <button class="btn sm ghost" data-act="toggle">${q.status === "new" ? "Mark handled" : "Mark new"}</button>
            <button class="btn sm danger" data-act="del"><i class="fa-solid fa-trash"></i></button>
          </footer>
        </article>`).join("") || `<p class="empty">No requests yet.</p>`;
    } catch (err) { denied(err); }
  }
  $("#refreshQuotes").addEventListener("click", loadQuotes);
  $("#quoteList").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const card = b.closest(".quote"), id = card.dataset.id;
    try {
      if (b.dataset.act === "toggle") {
        must(await sb.from("quotes").update({ status: card.classList.contains("is-new") ? "handled" : "new" }).eq("id", id));
      } else if (confirm("Delete this request permanently?")) {
        must(await sb.from("quotes").delete().eq("id", id));
      } else return;
      loadQuotes();
    } catch (err) { denied(err); }
  });

  /* ---------- News ---------- */
  const nf = $("#newsForm");
  $("#imagePick").innerHTML = `<option value="">No image</option>` +
    SITE_IMAGES.map((n) => `<option value="assets/images/${n}.webp">${n.replace(/-/g, " ")}</option>`).join("") +
    `<option value="__url">Other (paste image link)…</option>`;
  $("#imagePick").addEventListener("change", () => ($("#imageUrlWrap").hidden = $("#imagePick").value !== "__url"));

  const openNews = (n = {}) => {
    nf.hidden = false;
    nf.id.value = n.id || "";
    nf.title.value = n.title || "";
    nf.date.value = n.date || new Date().toISOString().slice(0, 10);
    nf.body.value = n.body || "";
    nf.published.checked = n.published ?? true;
    const known = !n.image || SITE_IMAGES.some((s) => n.image === `assets/images/${s}.webp`);
    nf.imagePick.value = known ? n.image || "" : "__url";
    nf.imageUrl.value = known ? "" : n.image;
    $("#imageUrlWrap").hidden = known;
    $("#newsMsg").textContent = "";
    nf.scrollIntoView({ behavior: "smooth", block: "start" });
    nf.title.focus();
  };
  $("#newNews").addEventListener("click", () => openNews());
  $("#cancelNews").addEventListener("click", () => (nf.hidden = true));

  nf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const image = nf.imagePick.value === "__url" ? nf.imageUrl.value.trim() : nf.imagePick.value;
    const data = { title: nf.title.value.trim(), date: nf.date.value, body: nf.body.value.trim(), image, published: nf.published.checked, updated_at: new Date().toISOString() };
    try {
      if (nf.id.value) must(await sb.from("news").update(data).eq("id", nf.id.value));
      else must(await sb.from("news").insert(data));
      nf.hidden = true;
      toast("News saved");
      loadNews();
    } catch (err) { denied(err); }
  });

  let newsCache = [];
  async function loadNews() {
    try {
      newsCache = must(await sb.from("news").select("*").order("date", { ascending: false }).limit(100));
      $("#newsList").innerHTML = newsCache.map((n) => `
        <article class="news-item" data-id="${n.id}">
          ${n.image ? `<img src="${esc(n.image)}" alt="">` : `<div class="noimg"><i class="fa-solid fa-newspaper"></i></div>`}
          <div class="ni-body">
            <time>${esc(n.date)}</time>
            <h4>${esc(n.title)}</h4>
            <p>${esc(n.body).slice(0, 180)}${(n.body || "").length > 180 ? "…" : ""}</p>
          </div>
          <div class="ni-actions">
            <span class="tag ${n.published ? "" : "done"}">${n.published ? "Published" : "Draft"}</span>
            <button class="btn sm ghost" data-act="edit"><i class="fa-solid fa-pen"></i>Edit</button>
            <button class="btn sm ghost" data-act="pub">${n.published ? "Unpublish" : "Publish"}</button>
            <button class="btn sm danger" data-act="del"><i class="fa-solid fa-trash"></i></button>
          </div>
        </article>`).join("") || `<p class="empty">No news yet — click “Add news” to write the first one.</p>`;
    } catch (err) { denied(err); }
  }
  $("#newsList").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const id = b.closest(".news-item").dataset.id;
    const n = newsCache.find((x) => x.id === id);
    if (b.dataset.act === "edit") return openNews(n);
    try {
      if (b.dataset.act === "pub") must(await sb.from("news").update({ published: !n.published }).eq("id", id));
      else if (confirm(`Delete “${n.title}”?`)) must(await sb.from("news").delete().eq("id", id));
      else return;
      loadNews();
    } catch (err) { denied(err); }
  });

  /* ---------- Statistics ---------- */
  const sf = $("#statsForm");
  async function loadStats() {
    try {
      const row = must(await sb.from("site_stats").select("*").eq("id", 1).maybeSingle());
      ["ports", "countries", "hours", "days", "med", "canal", "red"].forEach((k) => (sf[k].value = row?.[k] ?? DEFAULT_STATS[k]));
    } catch (err) { denied(err); }
  }
  sf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = (k) => Number(sf[k].value);
    try {
      const saved = must(await sb.from("site_stats").update({
        ports: n("ports"), countries: n("countries"), hours: n("hours"), days: n("days"),
        med: n("med"), canal: n("canal"), red: n("red"),
        updated_at: new Date().toISOString(),
      }).eq("id", 1).select("id"));
      if (!saved?.length) throw new Error("the statistics row is missing — re-run supabase-setup.sql");
      toast("Statistics saved — live on the home page");
    } catch (err) { denied(err); }
  });
}
