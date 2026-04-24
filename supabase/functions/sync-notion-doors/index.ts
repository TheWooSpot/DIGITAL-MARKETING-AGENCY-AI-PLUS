/**
 * sync-notion-doors — one-shot function.
 * Updates 3 Notion pages with canonical door names from Session 18b.
 * Also queries Resend domain status.
 */

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

const CANONICAL_MAP: Record<string, string> = {
  "The Mirror": "The Lens",
  "The Self-Discovery": "The Mirror",
  "The AI IQ": "The Compass",
  "AI IQ™": "The Compass",
  "The AI IQ™": "The Compass",
  "The Calculator": "The Workbench",
  "The Quote": "The Rival",
  "The Dream": "The Architect's Studio",
  "DreamScape™": "The Architect's Studio",
  "The DreamScape": "The Architect's Studio",
  "The Referral Landing": "The Handshake",
  "The Ad Response": "The Thread",
};

const PAGE_IDS = [
  "339ce12e-0631-813f-abf9-ca0e1a89cac5",
  "340ce12e-0631-8140-94a2-de4a66121666",
  "339ce12e-0631-81eb-9faf-ff5686b641c2",
];

type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
};

type NotionRichText = {
  type: string;
  text?: { content: string; link?: unknown };
  plain_text?: string;
  annotations?: unknown;
  href?: unknown;
};

function replaceInText(text: string): { newText: string; changes: string[] } {
  let result = text;
  const changes: string[] = [];
  for (const [oldName, newName] of Object.entries(CANONICAL_MAP)) {
    if (result.includes(oldName)) {
      result = result.split(oldName).join(newName);
      changes.push(`"${oldName}" → "${newName}"`);
    }
  }
  return { newText: result, changes };
}

async function notionGet(token: string, path: string) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion GET ${path}: ${res.status} - ${err}`);
  }
  return res.json();
}

async function notionPatch(token: string, path: string, body: unknown) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion PATCH ${path}: ${res.status} - ${err}`);
  }
  return res.json();
}

function processRichTextArray(rtArr: NotionRichText[]): { updated: NotionRichText[]; changes: string[] } {
  const allChanges: string[] = [];
  const updated = rtArr.map((rt) => {
    if (rt.type === "text" && rt.text?.content) {
      const { newText, changes } = replaceInText(rt.text.content);
      if (changes.length > 0) {
        allChanges.push(...changes);
        return { ...rt, text: { ...rt.text, content: newText }, plain_text: newText };
      }
    }
    return rt;
  });
  return { updated, changes: allChanges };
}

async function processBlock(
  token: string,
  block: NotionBlock,
  log: string[],
  depth = 0
): Promise<void> {
  if (depth > 3) return; // safety limit

  const textTypes = ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "toggle", "quote", "callout"];

  for (const blockType of textTypes) {
    const blockData = block[blockType] as { rich_text?: NotionRichText[] } | undefined;
    if (blockType === block.type && blockData?.rich_text && Array.isArray(blockData.rich_text)) {
      const { updated, changes } = processRichTextArray(blockData.rich_text);
      if (changes.length > 0) {
        try {
          await notionPatch(token, `/blocks/${block.id}`, {
            [blockType]: { ...blockData, rich_text: updated },
          });
          log.push(`  Block ${block.id} (${blockType}): ${changes.join(", ")}`);
        } catch (e) {
          log.push(`  Block ${block.id} PATCH ERROR: ${e}`);
        }
      }
    }
  }

  // Process children
  if (block.has_children) {
    try {
      const childrenRes = await notionGet(token, `/blocks/${block.id}/children?page_size=100`) as { results: NotionBlock[] };
      for (const child of childrenRes.results) {
        await processBlock(token, child, log, depth + 1);
      }
    } catch (e) {
      log.push(`  Children fetch error for ${block.id}: ${e}`);
    }
  }
}

async function updatePageTitle(token: string, pageId: string, log: string[]) {
  try {
    const page = await notionGet(token, `/pages/${pageId}`) as { properties?: Record<string, { type: string; title?: NotionRichText[] }> };
    const titleProp = page.properties?.title || page.properties?.Name;
    if (titleProp?.title && Array.isArray(titleProp.title)) {
      const { updated, changes } = processRichTextArray(titleProp.title);
      if (changes.length > 0) {
        const propKey = page.properties?.title ? "title" : "Name";
        await notionPatch(token, `/pages/${pageId}`, {
          properties: { [propKey]: { title: updated } },
        });
        log.push(`  Page title: ${changes.join(", ")}`);
      }
    }
  } catch (e) {
    log.push(`  Title update error: ${e}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const NOTION_TOKEN = Deno.env.get("NOTION_TOKEN") ?? "";
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!NOTION_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing NOTION_TOKEN" }), { status: 500, headers: CORS });
  }

  const results: Record<string, { log: string[]; error?: string }> = {};

  // Process each page
  for (const pageId of PAGE_IDS) {
    const log: string[] = [];
    try {
      log.push(`Processing page ${pageId}...`);

      // Update page title
      await updatePageTitle(NOTION_TOKEN, pageId, log);

      // Get all top-level blocks
      let cursor: string | undefined;
      let totalBlocks = 0;
      do {
        const url = `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
        const blocksRes = await notionGet(NOTION_TOKEN, url) as { results: NotionBlock[]; has_more: boolean; next_cursor?: string };
        for (const block of blocksRes.results) {
          await processBlock(NOTION_TOKEN, block, log);
          totalBlocks++;
        }
        cursor = blocksRes.has_more ? blocksRes.next_cursor : undefined;
      } while (cursor);

      log.push(`Processed ${totalBlocks} top-level blocks`);
    } catch (e) {
      log.push(`ERROR: ${e}`);
    }
    results[pageId] = { log };
  }

  // Resend domain check
  let resendStatus: unknown = null;
  if (RESEND_API_KEY) {
    try {
      const resendRes = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      resendStatus = await resendRes.json();
    } catch (e) {
      resendStatus = { error: String(e) };
    }
  } else {
    resendStatus = { error: "RESEND_API_KEY not set" };
  }

  return new Response(JSON.stringify({ notion_results: results, resend_domains: resendStatus }), { status: 200, headers: CORS });
});
