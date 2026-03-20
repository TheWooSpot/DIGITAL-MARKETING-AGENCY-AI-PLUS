# Enrichment API research — AnyDoor Engine diagnostics

**Purpose:** Compare affordable third-party APIs that can **ground** URL/domain diagnostics in real signals (performance, SEO, local, market) instead of relying only on LLM inference.

**Last updated:** March 2026 (verify pricing on vendor sites before purchasing).

---

## Summary: recommended TOP 2 (integrate first)

| Rank | API | Why first |
|------|-----|-----------|
| **1** | **Google PageSpeed Insights API** | **~$0 marginal cost** with generous free quota; **directly improves “Website Health”** and technical credibility; **one GET request**; returns Lighthouse + (where available) field metrics. |
| **2** | **DataForSEO** | **Low per-call cost** on many endpoints; **highest signal-per-dollar** for organic/SERP/backlink-style facts that LLMs often get wrong; REST + predictable JSON; **pay-as-you-go** (minimum top-up applies). |

**Why not the others first?**

- **BrightLocal** — Strong for **local** depth, but **subscription + higher per-report API fees**; best as a **phase 2** when you optimize for GBP/citations.
- **SimilarWeb** — Full **traffic/competitive** APIs are **enterprise-priced**; the **free DigitalRank** tier is useful but **narrow** (mostly rank), not a full traffic picture.
- **SEMrush** — Excellent data, but **tied to SEMrush subscriptions + API units**; typically **higher total cost** than DataForSEO for a **per-scan** product unless you already pay for SEMrush.

---

## 1. Google PageSpeed Insights API

### What it costs

- **No per-request fee** in the usual sense: billing is through **Google Cloud** with **free quota** on the PageSpeed Insights API (typical project defaults are on the order of **~25,000 calls/day** and **~240/minute** — confirm in **Google Cloud Console → APIs & Services → Quotas**).
- You still need a **Google Cloud project** and an **API key** (or OAuth for some setups). **Production usage should always use a key** so you get quota and stable behavior.

> **Note:** Google’s docs also show a **keyless `fetch` demo** for quick experiments, but **do not rely on that for production**. Enable **“PageSpeed Insights API”** for your project and pass `key=`.

### What data you get for a URL/domain

- **Lab data (Lighthouse):** performance score (and optionally accessibility / best-practices / SEO categories), **Core Web Vitals–related lab metrics** (LCP, CLS, TBT, etc.), opportunities/diagnostics.
- **Field data (where available):** Chrome UX Report (CrUX) metrics such as **FCP / INP / CLS** style categories — **Google has announced reducing/ending some CrUX inclusion in this API over time**; for long-term field metrics, plan on the **CrUX API** as well ([CrUX API guide](https://developer.chrome.com/docs/crux/api)).

**Input:** A full page URL (e.g. `https://example.com/`). For “domain” diagnostics, **pick a canonical URL** (homepage + `strategy=mobile` and/or `desktop`).

### API complexity

- **Low:** single **GET**, query parameters only.
- **Caveat:** Response JSON is **large** (full Lighthouse result). Store **summaries** in your pipeline, not the raw blob, unless you need it.

### Endpoint

- **Docs reference:** `GET https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed`
- **Also commonly documented as:** `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` (same API; prefer the hostname Google lists in current REST docs).

### Code snippet (Node / TypeScript)

```ts
const API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY!;

/** Normalize user input like `example.com` to a fetchable URL */
function toOriginUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export async function fetchPageSpeedSummary(domainOrUrl: string) {
  const url = toOriginUrl(domainOrUrl);
  const endpoint = new URL("https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", API_KEY);
  endpoint.searchParams.set("strategy", "mobile"); // or "desktop"
  endpoint.searchParams.set("category", "performance");
  // Add more categories: &category=seo&category=accessibility

  const res = await fetch(endpoint.toString());
  if (!res.ok) throw new Error(`PageSpeed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as any;

  const lh = json.lighthouseResult;
  const perf = lh?.categories?.performance?.score; // 0–1

  return {
    requestedUrl: json.id,
    performanceScore: perf != null ? Math.round(perf * 100) : null,
    lighthouseVersion: lh?.lighthouseVersion,
    // Example audits (paths differ slightly by Lighthouse version)
    fcp: lh?.audits?.["first-contentful-paint"]?.displayValue ?? null,
    lcp: lh?.audits?.["largest-contentful-paint"]?.displayValue ?? null,
    cls: lh?.audits?.["cumulative-layout-shift"]?.displayValue ?? null,
    tbt: lh?.audits?.["total-blocking-time"]?.displayValue ?? null,
    // Field layer (may be absent for small origins)
    originLoadingExperience: json.originLoadingExperience ?? null,
  };
}
```

### Example response shape (truncated)

```json
{
  "kind": "pagespeedonline#result",
  "id": "https://example.com/",
  "lighthouseResult": {
    "categories": {
      "performance": { "score": 0.72, "title": "Performance" }
    },
    "audits": {
      "largest-contentful-paint": { "displayValue": "2.8 s" },
      "cumulative-layout-shift": { "displayValue": "0.05" }
    }
  },
  "originLoadingExperience": {
    "metrics": {
      "LARGEST_CONTENTFUL_PAINT_MS": { "percentile": 2200, "category": "FAST" }
    }
  }
}
```

**Official references:** [Get started](https://developers.google.com/speed/docs/insights/v5/get-started), [runPagespeed reference](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed).

---

## 2. DataForSEO API

### What it costs

- **Pay-as-you-go**; **minimum top-up** is commonly **$50** (verify on [dataforseo.com/pricing](https://dataforseo.com/pricing)). New accounts sometimes receive a **small trial credit** (e.g. **$1** — verify at signup).
- **Per-request cost depends on product + mode** (standard queue vs live). Indicative order-of-magnitude from public pricing pages (not a guarantee):
  - **SERP API:** from about **$0.0006 / request** (standard) up to roughly **$0.002** for **live** mode on some SERP calls.
  - **Domain Analytics / Labs / Backlinks:** often **task-based** or **per-item** — read the specific endpoint’s pricing row before coding.

For **one diagnostic scan**, a practical “starter bundle” might be:

- 1× **technology / on-page / domain-type** call *or*
- 1× **ranked keywords (limited)** *or*
- 1× **backlinks summary**

…each chosen to stay **well under a cent** if you pick the cheapest mode — **but always confirm** in the dashboard pricing for that exact method.

### What data you get for a URL/domain

Depends on endpoint, but collectively DataForSEO can supply:

- **Organic keyword visibility**, SERP features, ranking pages (Labs / SERP APIs).
- **Backlink counts, referring domains, anchor snapshots** (Backlinks API).
- **Traffic estimates / competitive overlaps** on some analytics endpoints (check current product matrix).

**Input:** Usually **`target` as domain** (`example.com`) without scheme for many endpoints; some tasks want keyword + location.

### API complexity

- **Medium:** REST, JSON bodies, **Basic auth** (login:password often shown as `base64` in docs), sometimes **“task POST → task GET”** async pattern depending on endpoint.
- **Higher** than PageSpeed if you chain multiple tasks per scan.

### Code snippet (Node / TypeScript) — pattern: live SERP (illustrative)

> Replace with the exact endpoint you purchase (SERP, Labs, Backlinks, etc.). This shows the **auth + POST** shape.

```ts
const DFS_LOGIN = process.env.DATAFORSEO_LOGIN!;
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD!;

function dfsAuthHeader() {
  const token = Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

/** Example: Google Organic SERP live — verify current path + payload in DataForSEO docs */
export async function fetchSerpForBrandedQuery(domain: string) {
  const clean = domain.replace(/^https?:\/\//, "").split("/")[0];
  const q = encodeURIComponent(clean);

  const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: {
      Authorization: dfsAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        language_code: "en",
        location_code: 2840, // example: US — pick per product needs
        keyword: clean,
        device: "mobile",
      },
    ]),
  });

  const json = await res.json();
  return json;
}
```

### Example response shape (illustrative — real schema is versioned)

```json
{
  "version": "0.1.20250315",
  "status_code": 20000,
  "tasks": [
    {
      "result": [
        {
          "items": [
            {
              "type": "organic",
              "rank_group": 1,
              "rank_absolute": 1,
              "url": "https://example.com/",
              "title": "Example Domain"
            }
          ]
        }
      ]
    }
  ]
}
```

**Official references:** [Pricing hub](https://dataforseo.com/pricing), product docs in the DataForSEO knowledge base.

---

## 3. BrightLocal API

### What it costs

- **Not a pure pay-per-call API for casual use:** access is generally for customers on **paid plans** (e.g. Track / Manage / Grow / Enterprise — verify on [brightlocal.com/pricing](https://www.brightlocal.com/pricing)).
- **Per-use API fees** (indicative — verify on BrightLocal’s API pricing table):
  - **Local / organic rankings:** ~**$0.01 / request** (order-of-magnitude).
  - **Citation-type reports:** can be **much higher per report** (e.g. **$0.40+** class for some report-style calls in public marketing materials).
  - **Reviews API:** higher per-request fees in some tiers.

### What data you get for a URL/domain

- **Local SEO–centric:** citation consistency signals, local rankings, review aggregation across many directories, GBP-related workflows (depending on product).
- **Best when** the prospect is **local/service-area** and you need **ground truth** beyond “the website looks fine.”

### API complexity

- **Medium–high:** multiple products, report IDs, locations, and account context.

### Code snippet (illustrative — fictional path)

BrightLocal’s exact paths and payloads change by product; **copy from your BrightLocal API console** after you enable API access.

```ts
const BRIGHTLOCAL_API_KEY = process.env.BRIGHTLOCAL_API_KEY!;

export async function fetchBrightLocalExample(locationId: string) {
  // Pseudocode — replace URL + body with your enabled endpoint
  const res = await fetch(`https://api.brightlocal.com/v2/your-endpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BRIGHTLOCAL_API_KEY}`,
    },
    body: JSON.stringify({ location_id: locationId }),
  });
  return res.json();
}
```

### Example response shape (illustrative)

```json
{
  "success": true,
  "data": {
    "citations_found": 42,
    "nap_consistency_score": 78,
    "reviews": { "average_rating": 4.6, "count": 128 }
  }
}
```

**Official references:** [BrightLocal APIs overview](https://brightlocal.com/local-seo-apis).

---

## 4. SimilarWeb API

### What it costs

- **Enterprise / sales-led** for full **Similarweb API** access; pricing is usually **not public** for broad datasets.
- **Exception — DigitalRank API:** Similarweb has marketed a **free tier** with a **monthly data point budget** (commonly cited as **~100 data points / month** for free accounts — confirm in current developer docs).
- **Paid APIs** often use a **monthly data credit** model where cost scales with **domains × endpoint × date range × granularity**.

### What data you get for a URL/domain

- **Traffic & engagement estimates** (visits, sources, geography) on paid datasets.
- **Industry / competitor benchmarks** on higher tiers.
- **DigitalRank (free tier):** more limited — useful for **popularity / rank-style** signals, not a full traffic workbook.

### API complexity

- **Low–medium** for a single rank endpoint; **high** when composing multi-endpoint competitive reports.

### Code snippet (illustrative Similarweb-style GET)

> Replace host + path with the exact version from your Similarweb developer portal.

```ts
const SIMILARWEB_API_KEY = process.env.SIMILARWEB_API_KEY!;

export async function fetchSimilarWebTrafficEstimate(domain: string) {
  const d = domain.replace(/^https?:\/\//, "").split("/")[0];
  const url = `https://api.similarweb.com/v1/website/${d}/total-traffic/visits?api_key=${SIMILARWEB_API_KEY}`;
  const res = await fetch(url);
  return res.json();
}
```

### Example response shape (illustrative)

```json
{
  "site_name": "example.com",
  "visits": [
    { "date": "2025-12-01", "visits": 125000 },
    { "date": "2026-01-01", "visits": 132000 }
  ]
}
```

**Official references:** [Similarweb API / DigitalRank docs](https://developers.similarweb.com/), [data credits guide](https://docs.similarweb.com/).

---

## 5. SEMrush API

### What it costs

- **Requires a SEMrush subscription tier that includes API access** + **API units** (monthly pool). Unused units may not roll over depending on plan.
- **Consumption model:** charges are often **per line / per row / per request** depending on the report type — check each method in [SEMrush API reference](https://developer.semrush.com/api/).

### What data you get for a URL/domain

- **Organic keywords**, **paid keywords**, **backlinks**, **authority / rank metrics**, **competitive overlap** — very strong commercially.

### API complexity

- **Medium:** simple HTTP GET with `type=` report parameters for many legacy-style endpoints, but **large matrix of report types** and **unit costs** to learn.

### Code snippet (illustrative GET report)

```ts
const SEMRUSH_KEY = process.env.SEMRUSH_API_KEY!;

export async function fetchSemrushDomainOrganic(domain: string) {
  const d = domain.replace(/^https?:\/\//, "").split("/")[0];
  const params = new URLSearchParams({
    type: "domain_organic",
    key: SEMRUSH_KEY,
    domain: d,
    database: "us",
    display_limit: "10",
    export_columns: "Ph,Po,Nq,Cp,Ur",
  });

  const res = await fetch(`https://api.semrush.com/?${params}`);
  const text = await res.text(); // often CSV, not JSON
  return text;
}
```

### Example response shape (CSV excerpt)

```text
Keyword;Position;Search Volume;CPC;Url
example brand;1;1900;0.15;https://example.com/
```

**Official references:** [SEMrush API documentation](https://developer.semrush.com/api/).

---

## Cost per diagnostic scan (rough planning)

Assumptions: **1 scan = 1 domain**, you store **summaries**, and you cap expensive calls.

| Stack | Ballpark incremental cost |
|-------|---------------------------|
| **PageSpeed only (mobile + desktop)** | **~$0** within Google free quota |
| **+ 1 cheap DataForSEO call** | **~$0.0006 – $0.002+** depending on product/mode |
| **+ BrightLocal deep citation report** | **often $0.40+ per report-class call** (verify) |
| **+ SEMrush** | **depends on units** — can be **cheap per call** on some reports but **plan-level minimums** dominate |
| **+ SimilarWeb full traffic** | **typically not “affordable”** at small scale unless negotiated |

---

## Implementation notes for AnyDoor Engine

1. **Always normalize input** (`domain.com` → `https://domain.com/`).
2. **Run enrichment server-side** (Edge Function / API route), never expose all vendor keys to the browser.
3. **Cache results** (e.g. 24–168h keyed by domain + endpoint) to cut cost and rate-limit issues.
4. Map API outputs into your existing pillars:
   - **Visibility:** keywords, SERP, backlinks, local rankings.
   - **Engagement:** content/tech signals + (if available) traffic proxies.
   - **Conversion:** PageSpeed, CWV, mobile UX, form/checkout hints from Lighthouse SEO/best-practices.

---

## Changelog

- **2026-03-20:** Initial research doc for AnyDoor Engine enrichment planning.
