/* Zadix Control — admin dashboard (Firebase Auth + Firestore) */
import { firebaseConfig, isConfigured, FIREBASE_BASE } from "./firebase-config.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const show = (id) => ["setup", "login", "app"].forEach((x) => ($("#" + x).hidden = x !== id));

const DEFAULT_STATS = { ports: 13, countries: 5, hours: 24, days: 365, regions: { med: 3, canal: 5, red: 5 } };
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
  t._h = setTimeout(() => (t.className = "toast"), 2600);
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

if (!isConfigured) {
  show("setup");
} else {
  boot();
}

async function boot() {
  const base = FIREBASE_BASE;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, Timestamp } = F;

  /* ---------- Auth ---------- */
  A.onAuthStateChanged(auth, (user) => {
    if (!user) { show("login"); return; }
    try { localStorage.setItem("zx_admin", "1"); } catch {}
    $("#who").textContent = user.email;
    show("app");
    loadVisits(); loadQuotes(); loadNews(); loadStats();
  });

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    $("#loginMsg").textContent = "Signing in…";
    try {
      await A.signInWithEmailAndPassword(auth, f.get("email"), f.get("password"));
      $("#loginMsg").textContent = "";
    } catch (err) {
      $("#loginMsg").textContent = "Wrong email or password.";
    }
  });
  $("#logout").addEventListener("click", () => A.signOut(auth));

  /* ---------- Tabs ---------- */
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => {
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".panel").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
  }));

  const denied = (err) => {
    if (String(err?.code).includes("permission")) toast("This account is not the admin (check firestore.rules UID).", true);
    else toast("Could not load data: " + (err?.message || err), true);
  };

  /* ---------- Visitors ---------- */
  async function loadVisits() {
    try {
      const since = Timestamp.fromDate(new Date(Date.now() - 30 * 864e5));
      const qs = await getDocs(query(collection(db, "visits"), where("ts", ">=", since), orderBy("ts", "desc"), limit(5000)));
      renderVisits(qs.docs.map((d) => ({ ...d.data(), ts: d.data().ts?.toDate?.() || new Date() })));
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
      const qs = await getDocs(query(collection(db, "quotes"), orderBy("createdAt", "desc"), limit(200)));
      const items = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      const fresh = items.filter((q) => q.status === "new").length;
      $("#newQuotes").hidden = !fresh;
      $("#newQuotes").textContent = fresh;
      $("#quoteList").innerHTML = items.map((q) => `
        <article class="quote ${q.status === "new" ? "is-new" : ""}" data-id="${q.id}">
          <header>
            <div><h4>${esc(q.name)} ${q.company ? `<small>· ${esc(q.company)}</small>` : ""}</h4>
            <time>${q.createdAt?.toDate ? q.createdAt.toDate().toLocaleString("en-GB") : ""}</time></div>
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
    if (b.dataset.act === "toggle") {
      await updateDoc(doc(db, "quotes", id), { status: card.classList.contains("is-new") ? "handled" : "new" });
    } else if (confirm("Delete this request permanently?")) {
      await deleteDoc(doc(db, "quotes", id));
    } else return;
    loadQuotes();
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
    const data = { title: nf.title.value.trim(), date: nf.date.value, body: nf.body.value.trim(), image, published: nf.published.checked, updatedAt: serverTimestamp() };
    try {
      if (nf.id.value) await updateDoc(doc(db, "news", nf.id.value), data);
      else await addDoc(collection(db, "news"), { ...data, createdAt: serverTimestamp() });
      nf.hidden = true;
      toast("News saved");
      loadNews();
    } catch (err) { denied(err); }
  });

  let newsCache = [];
  async function loadNews() {
    try {
      const qs = await getDocs(query(collection(db, "news"), orderBy("date", "desc"), limit(100)));
      newsCache = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      if (b.dataset.act === "pub") await updateDoc(doc(db, "news", id), { published: !n.published });
      else if (confirm(`Delete “${n.title}”?`)) await deleteDoc(doc(db, "news", id));
      else return;
      loadNews();
    } catch (err) { denied(err); }
  });

  /* ---------- Statistics ---------- */
  const sf = $("#statsForm");
  async function loadStats() {
    try {
      const snap = await getDoc(doc(db, "site", "stats"));
      const s = snap.exists() ? { ...DEFAULT_STATS, ...snap.data() } : DEFAULT_STATS;
      ["ports", "countries", "hours", "days"].forEach((k) => (sf[k].value = s[k]));
      ["med", "canal", "red"].forEach((k) => (sf[k].value = s.regions?.[k] ?? DEFAULT_STATS.regions[k]));
    } catch (err) { denied(err); }
  }
  sf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = (k) => Number(sf[k].value);
    try {
      await setDoc(doc(db, "site", "stats"), {
        ports: n("ports"), countries: n("countries"), hours: n("hours"), days: n("days"),
        regions: { med: n("med"), canal: n("canal"), red: n("red") },
        updatedAt: serverTimestamp(),
      });
      toast("Statistics saved — live on the home page");
    } catch (err) { denied(err); }
  });
}
