/**
 * Syncs posts tagged "teams-ai-library" from devblogs.microsoft.com into the local blog directory.
 * Fetches the tag page, diffs against existing slugs, and creates MDX files for any new posts.
 *
 * Usage:
 *   npx tsx scripts/sync-devblogs.ts
 *   npx tsx scripts/sync-devblogs.ts --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAG_URL = 'https://devblogs.microsoft.com/microsoft365dev/tag/teams-ai-library/';
const BLOG_DIR = path.join(__dirname, '..', 'blog');
const EXTERNAL_URLS_FILE = path.join(__dirname, '..', 'src', 'data', 'externalBlogUrls.ts');
const DRY_RUN = process.argv.includes('--dry-run');

interface DevBlogPost {
    title: string;
    url: string;
    date: string;
    description: string;
    tags: string[];
    slug: string;
    dateDir: string;
}

async function fetchTagPage(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
}

function parseDate(raw: string): string {
    // "Nov 18, 2025" → "2025-11-18"
    const d = new Date(raw.trim());
    if (isNaN(d.getTime())) return raw.trim();
    return d.toISOString().split('T')[0];
}

function extractPosts(html: string): Omit<DevBlogPost, 'tags' | 'slug' | 'dateDir'>[] {
    const posts: Omit<DevBlogPost, 'tags' | 'slug' | 'dateDir'>[] = [];

    // Split on article card boundaries (devblogs uses <article class="post bg-white ...">)
    const blocks = html.split(/<article class="post bg-white/i).slice(1);

    for (const block of blocks) {
        // Title + URL: <h3 class="fs-24 mb-16"><a ... href="URL" ...>Title</a></h3>
        const titleMatch = /<h3[^>]*>\s*<a[^>]+href="(https:\/\/devblogs\.microsoft\.com[^"]+)"[^>]*>([^<]+)<\/a>/i.exec(block);
        // Date: <div class="d-flex align-items-left gap-4">Nov 18, 2025</div>
        const dateMatch = /class="d-flex align-items-left gap-4">\s*([A-Za-z]+ \d+, \d{4})\s*<\/div>/i.exec(block);

        if (!titleMatch || !dateMatch) continue;

        const url = titleMatch[1].trim();
        const title = titleMatch[2].trim();
        const date = parseDate(dateMatch[1]);

        // Description: first <p> with meaningful text after the title block
        const descMatch = /<p[^>]*>([\s\S]{30,400}?)<\/p>/i.exec(block);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

        posts.push({ url, title, date, description });
    }

    return posts;
}

async function fetchPostTags(url: string): Promise<string[]> {
    try {
        const html = await fetchTagPage(url);
        const tags: string[] = [];
        // Extract all /tag/slug/ links from the post page, excluding the page's own tag URL
        const postSlug = url.replace(/\/$/, '').split('/').pop() ?? '';
        const tagPattern = /href="https:\/\/devblogs\.microsoft\.com\/microsoft365dev\/tag\/([^/"]+)\/"/gi;
        let m: RegExpExecArray | null;
        while ((m = tagPattern.exec(html)) !== null) {
            const tag = m[1].trim().toLowerCase();
            if (tag && tag !== postSlug) tags.push(tag);
        }
        return [...new Set(tags)];
    } catch {
        return ['teams-ai-library'];
    }
}

function urlToSlug(url: string): string {
    return url.replace(/\/$/, '').split('/').pop() ?? '';
}

function slugToDateDir(date: string, slug: string): string {
    return `${date}-${slug.slice(0, 50)}`;
}

function existingSlugs(): Set<string> {
    const slugs = new Set<string>();
    if (!fs.existsSync(BLOG_DIR)) return slugs;
    for (const entry of fs.readdirSync(BLOG_DIR)) {
        // Strip date prefix from dir name to get slug
        const slug = entry.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        slugs.add(slug);
        // Also track by full dir name
        slugs.add(entry);
    }
    return slugs;
}

function buildMdx(post: DevBlogPost): string {
    const tagsYaml = post.tags.join(', ');
    const titleEscaped = post.title.replace(/"/g, '\\"');
    return `---
slug: ${post.slug}
title: "${titleEscaped}"
external_url: ${post.url}
date: ${post.date}
authors:
  - name: Microsoft 365 Dev
    title: Microsoft
tags: [${tagsYaml}]
description: "${post.description.replace(/"/g, '\\"')}"
---

import ExternalRedirect from '@site/src/components/ExternalRedirect';

<ExternalRedirect to="${post.url}" />
`;
}

function regenerateExternalUrlsFile() {
    const map: Record<string, string> = {};
    if (fs.existsSync(BLOG_DIR)) {
        for (const entry of fs.readdirSync(BLOG_DIR)) {
            const mdx = path.join(BLOG_DIR, entry, 'index.mdx');
            if (!fs.existsSync(mdx)) continue;
            const content = fs.readFileSync(mdx, 'utf8');
            const slugMatch = /^slug:\s*(.+)$/m.exec(content);
            const urlMatch = /^external_url:\s*(.+)$/m.exec(content);
            if (slugMatch && urlMatch) {
                map[slugMatch[1].trim()] = urlMatch[1].trim();
            }
        }
    }
    const entries = Object.entries(map)
        .map(([slug, url]) => `    '${slug}': '${url}',`)
        .join('\n');
    const src = `// Auto-generated by scripts/sync-devblogs.ts — do not edit manually\nexport const externalBlogUrls: Record<string, string> = {\n${entries}\n};\n`;
    fs.mkdirSync(path.dirname(EXTERNAL_URLS_FILE), { recursive: true });
    fs.writeFileSync(EXTERNAL_URLS_FILE, src, 'utf8');
    console.log(`Updated src/data/externalBlogUrls.ts (${Object.keys(map).length} entries)`);
}

async function main() {
    console.log(`Fetching ${TAG_URL}...`);
    const html = await fetchTagPage(TAG_URL);
    const rawPosts = extractPosts(html);

    if (rawPosts.length === 0) {
        console.error('No posts found — the page structure may have changed.');
        process.exit(1);
    }

    console.log(`Found ${rawPosts.length} post(s) on tag page.`);

    const existing = existingSlugs();
    const newPosts: typeof rawPosts = [];

    for (const post of rawPosts) {
        const slug = urlToSlug(post.url);
        const dateDir = slugToDateDir(post.date, slug);
        if (!existing.has(slug) && !existing.has(dateDir)) {
            newPosts.push(post);
        } else {
            console.log(`  skip (exists): ${slug}`);
        }
    }

    if (newPosts.length === 0) {
        console.log('Nothing new to add.');
        if (!DRY_RUN) regenerateExternalUrlsFile();
        return;
    }

    console.log(`\n${newPosts.length} new post(s) to add:`);

    for (const raw of newPosts) {
        const slug = urlToSlug(raw.url);
        const dateDir = slugToDateDir(raw.date, slug);
        console.log(`  + ${dateDir}`);

        if (!DRY_RUN) {
            console.log(`    Fetching tags from ${raw.url}...`);
            const tags = await fetchPostTags(raw.url);
            const post: DevBlogPost = { ...raw, slug, dateDir, tags };

            const dir = path.join(BLOG_DIR, dateDir);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'index.mdx'), buildMdx(post), 'utf8');
            console.log(`    Written: blog/${dateDir}/index.mdx (tags: ${tags.join(', ')})`);
        }
    }

    if (DRY_RUN) {
        console.log('\nDry run — no files written.');
    } else {
        regenerateExternalUrlsFile();
        console.log('\nDone. Restart the dev server to pick up new posts.');
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
