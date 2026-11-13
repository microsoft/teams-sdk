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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dump, JSON_SCHEMA, load } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAG_URL = 'https://devblogs.microsoft.com/microsoft365dev/tag/teams-ai-library/';
const BLOG_DIR = path.join(__dirname, '..', 'blog');
const EXTERNAL_URLS_FILE = path.join(__dirname, '..', 'src', 'data', 'externalBlogUrls.ts');
const DRY_RUN = process.argv.includes('--dry-run');

export interface DevBlogPost {
    title: string;
    url: string;
    date: string;
    description: string;
    tags: string[];
    slug: string;
    dateDir: string;
}

export interface SyncOptions {
    blogDir: string;
    externalUrlsFile: string;
    dryRun: boolean;
}

interface BlogAuthor {
    name: string;
    title: string;
}

interface ExternalPostMetadata {
    slug: string;
    title: string;
    external_url: string;
    date: string;
    authors: BlogAuthor[];
    tags: string[];
    description: string;
}

export interface ExternalEntry {
    slug: string;
    url: string;
    sourcePath: string;
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
        const postSlug = urlToSlug(url);
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
    const slug = validateExternalUrl(url, url).pathname.split('/').filter(Boolean).at(-1);
    if (!slug) throw new Error(`${url}: missing post pathname`);
    return slug;
}

function slugToDateDir(date: string, slug: string): string {
    return `${date}-${slug.slice(0, 50)}`;
}

function existingSlugs(blogDir: string): Set<string> {
    const slugs = new Set<string>();
    if (!fs.existsSync(blogDir)) return slugs;
    for (const entry of fs.readdirSync(blogDir)) {
        // Strip date prefix from dir name to get slug
        const slug = entry.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        slugs.add(slug);
        // Also track by full dir name
        slugs.add(entry);
    }
    return slugs;
}

export function buildMdx(post: DevBlogPost): string {
    validateExternalUrl(post.url, post.dateDir);
    const metadata: ExternalPostMetadata = {
        slug: post.slug,
        title: post.title,
        external_url: post.url,
        date: post.date,
        authors: [{ name: 'Microsoft 365 Dev', title: 'Microsoft' }],
        tags: post.tags,
        description: post.description,
    };
    const frontmatter = dump(metadata, {
        schema: JSON_SCHEMA,
        quotingType: '"',
        forceQuotes: true,
        lineWidth: -1,
        noRefs: true,
    });
    return `---\n${frontmatter}---\n\n` +
        "import ExternalRedirect from '@site/src/components/ExternalRedirect';\n\n" +
        `<ExternalRedirect to={${JSON.stringify(post.url)}} />\n`;
}

export function validateExternalUrl(value: string, sourcePath: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch (cause: unknown) {
        throw new Error(`${sourcePath}: invalid external URL`, { cause });
    }
    if (url.origin !== 'https://devblogs.microsoft.com') {
        throw new Error(`${sourcePath}: external URL must use https://devblogs.microsoft.com`);
    }
    return url;
}

export function readExternalEntry(source: string, sourcePath: string): ExternalEntry | undefined {
    const opening = /^\uFEFF?---(?:yaml|yml)?[ \t]*\r?\n/.exec(source);
    if (!opening) return undefined;
    const remaining = source.slice(opening[0].length);
    const closing = /^---[ \t]*\r?$/m.exec(remaining);
    if (!closing) throw new Error(`${sourcePath}: unclosed frontmatter`);
    let metadata: unknown;
    try {
        metadata = load(remaining.slice(0, closing.index), { schema: JSON_SCHEMA });
    } catch (cause: unknown) {
        throw new Error(`${sourcePath}: invalid YAML frontmatter`, { cause });
    }
    if (metadata === undefined) return undefined;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new Error(`${sourcePath}: frontmatter must be a mapping`);
    }
    if (!('external_url' in metadata)) return undefined;
    if (!('slug' in metadata) || typeof metadata.slug !== 'string' || !metadata.slug.trim() ||
        typeof metadata.external_url !== 'string' || !metadata.external_url.trim()) {
        throw new Error(`${sourcePath}: external posts require nonempty string slug and external_url`);
    }
    validateExternalUrl(metadata.external_url, sourcePath);
    return { slug: metadata.slug, url: metadata.external_url, sourcePath };
}

export function buildExternalUrlsSource(entries: readonly ExternalEntry[]): string {
    const sources = new Map<string, string>();
    for (const entry of entries) {
        const previous = sources.get(entry.slug);
        if (previous !== undefined) {
            throw new Error(`Duplicate slug ${entry.slug}: ${previous} and ${entry.sourcePath}`);
        }
        sources.set(entry.slug, entry.sourcePath);
    }
    const pairs = entries.map(({ slug, url }): [string, string] => [slug, url]);
    return '// Auto-generated by scripts/sync-devblogs.ts — do not edit manually\n' +
        `export const externalBlogUrls: Record<string, string> = Object.fromEntries(${JSON.stringify(pairs, null, 4)});\n`;
}

function regenerateExternalUrlsFile(blogDir: string, externalUrlsFile: string): void {
    const entries: ExternalEntry[] = [];
    if (fs.existsSync(blogDir)) {
        for (const entry of fs.readdirSync(blogDir)) {
            const mdx = path.join(blogDir, entry, 'index.mdx');
            if (!fs.existsSync(mdx)) continue;
            const content = fs.readFileSync(mdx, 'utf8');
            const external = readExternalEntry(content, mdx);
            if (external) entries.push(external);
        }
    }
    const src = buildExternalUrlsSource(entries);
    fs.mkdirSync(path.dirname(externalUrlsFile), { recursive: true });
    fs.writeFileSync(externalUrlsFile, src, 'utf8');
    console.log(`Updated src/data/externalBlogUrls.ts (${entries.length} entries)`);
}

export async function syncDevBlogs(options: SyncOptions): Promise<void> {
    console.log(`Fetching ${TAG_URL}...`);
    const html = await fetchTagPage(TAG_URL);
    const rawPosts = extractPosts(html);

    if (rawPosts.length === 0) {
        throw new Error('No posts found — the page structure may have changed.');
    }

    console.log(`Found ${rawPosts.length} post(s) on tag page.`);

    const existing = existingSlugs(options.blogDir);
    const newPosts: typeof rawPosts = [];
    const newSlugs = new Set<string>();
    const newPaths = new Map<string, string>();

    for (const post of rawPosts) {
        const slug = urlToSlug(post.url);
        const dateDir = slugToDateDir(post.date, slug);
        if (!existing.has(slug) && !existing.has(dateDir)) {
            if (newSlugs.has(slug)) throw new Error(`Duplicate incoming slug ${slug}: ${post.url}`);
            const previous = newPaths.get(dateDir);
            if (previous !== undefined) {
                throw new Error(`Duplicate generated post path ${dateDir}: ${previous} and ${post.url}`);
            }
            newSlugs.add(slug);
            newPaths.set(dateDir, post.url);
            newPosts.push(post);
        } else {
            console.log(`  skip (exists): ${slug}`);
        }
    }

    if (newPosts.length === 0) {
        console.log('Nothing new to add.');
        if (!options.dryRun) regenerateExternalUrlsFile(options.blogDir, options.externalUrlsFile);
        return;
    }

    console.log(`\n${newPosts.length} new post(s) to add:`);

    for (const raw of newPosts) {
        const slug = urlToSlug(raw.url);
        const dateDir = slugToDateDir(raw.date, slug);
        console.log(`  + ${dateDir}`);

        if (!options.dryRun) {
            console.log(`    Fetching tags from ${raw.url}...`);
            const tags = await fetchPostTags(raw.url);
            const post: DevBlogPost = { ...raw, slug, dateDir, tags };

            const dir = path.join(options.blogDir, dateDir);
            const mdx = buildMdx(post);
            readExternalEntry(mdx, path.join(dir, 'index.mdx'));
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'index.mdx'), mdx, 'utf8');
            console.log(`    Written: blog/${dateDir}/index.mdx (tags: ${tags.join(', ')})`);
        }
    }

    if (options.dryRun) {
        console.log('\nDry run — no files written.');
    } else {
        regenerateExternalUrlsFile(options.blogDir, options.externalUrlsFile);
        console.log('\nDone. Restart the dev server to pick up new posts.');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    syncDevBlogs({ blogDir: BLOG_DIR, externalUrlsFile: EXTERNAL_URLS_FILE, dryRun: DRY_RUN })
        .catch((e: unknown) => { console.error(e); process.exitCode = 1; });
}
