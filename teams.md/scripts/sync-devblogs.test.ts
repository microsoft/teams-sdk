import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import { DEFAULT_PARSE_FRONT_MATTER } from '@docusaurus/utils';
import ts from 'typescript';
import type { DevBlogPost, SyncOptions } from './sync-devblogs';
import * as generator from './sync-devblogs';

const ordinaryPost: DevBlogPost = {
    title: 'Getting started with Teams',
    url: 'https://devblogs.microsoft.com/microsoft365dev/getting-started/',
    date: '2026-11-10',
    description: 'A practical introduction to building Teams applications.',
    tags: ['teams-ai-library'],
    slug: 'getting-started',
    dateDir: '2026-11-10-getting-started',
};

async function parseProductionMdx(source: string): Promise<{ frontMatter: unknown; content: string }> {
    return DEFAULT_PARSE_FRONT_MATTER({ filePath: 'fixture.mdx', fileContent: source });
}

test('import has no network or filesystem side effects', (): void => {
    const moduleUrl = new URL('./sync-devblogs.ts', import.meta.url).href;
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        globalThis.fetch = async () => { throw new Error('unexpected fetch on import'); };
        const imported = await import(${JSON.stringify(moduleUrl)});
        const module = imported.default ?? imported;
        assert.equal(typeof module.buildMdx, 'function');
        assert.equal(typeof module.syncDevBlogs, 'function');
    `], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
});

test('production parser rejects malformed YAML', async (): Promise<void> => {
    await assert.rejects(() => parseProductionMdx('---\ntitle: "unterminated\n---\nBody'));
});

test('production parser preserves ordinary generated metadata', async (): Promise<void> => {
    const { buildMdx } = await import('./sync-devblogs');
    const parsed = await parseProductionMdx(buildMdx(ordinaryPost));
    assert.ok(parsed.frontMatter && typeof parsed.frontMatter === 'object');
    assert.ok('title' in parsed.frontMatter);
    assert.equal(parsed.frontMatter.title, 'Getting started with Teams');
    assert.ok('tags' in parsed.frontMatter);
    assert.deepEqual(parsed.frontMatter.tags, ['teams-ai-library']);
    assert.ok('authors' in parsed.frontMatter);
    assert.deepEqual(parsed.frontMatter.authors, [{ name: 'Microsoft 365 Dev', title: 'Microsoft' }]);
    assert.equal(parsed.content,
        "import ExternalRedirect from '@site/src/components/ExternalRedirect';\n\n" +
        '<ExternalRedirect to={"https://devblogs.microsoft.com/microsoft365dev/getting-started/"} />');
});

for (const title of [
    'Ordinary title', 'Literal \\n', 'Trailing\\', 'Quote \\" and slash',
    'Line one\nLine two', 'CRLF\r\nTitle', 'Title\n---\nStill title',
    'Unicode \u2014 \u{1f680}', 'Inert {2 + 2} text', 'Control \u0000 text',
]) {
    test(`metadata round-trip: ${JSON.stringify(title)}`, async (): Promise<void> => {
        const post: DevBlogPost = { ...ordinaryPost, title, description: title, tags: ['a, b', 'x] # text'] };
        const parsed = await parseProductionMdx(generator.buildMdx(post));
        assert.deepEqual(parsed.frontMatter, {
            slug: 'getting-started',
            title,
            external_url: ordinaryPost.url,
            date: '2026-11-10',
            authors: [{ name: 'Microsoft 365 Dev', title: 'Microsoft' }],
            tags: ['a, b', 'x] # text'],
            description: title,
        });
        assert.equal(parsed.content,
            "import ExternalRedirect from '@site/src/components/ExternalRedirect';\n\n" +
            '<ExternalRedirect to={"https://devblogs.microsoft.com/microsoft365dev/getting-started/"} />');
    });
}

for (const slug of ['legacy', "'legacy'", '"legacy"']) {
    test(`legacy YAML scalar ${slug}`, (): void => {
        const source = `---\nslug: ${slug}\nexternal_url: '${ordinaryPost.url}'\ndate: 2026-11-10\nextra: true\n---\nBody`;
        assert.deepEqual(generator.readExternalEntry(source, 'legacy/index.mdx'), {
            slug: 'legacy', url: ordinaryPost.url, sourcePath: 'legacy/index.mdx',
        });
    });
}

test('ordinary internal posts are excluded without requiring optional fields', (): void => {
    assert.equal(generator.readExternalEntry('---\ntitle: Internal\n---\nBody', 'internal.mdx'), undefined);
    assert.equal(generator.readExternalEntry('Body without metadata', 'internal.mdx'), undefined);
    assert.deepEqual(generator.readExternalEntry(
        `\uFEFF---\r\nslug: legacy\r\nexternal_url: "${ordinaryPost.url}"\r\n---\r\nBody`, 'bom.mdx',
    ), { slug: 'legacy', url: ordinaryPost.url, sourcePath: 'bom.mdx' });
});

for (const yaml of [
    'slug: missing-close',
    'title: "unterminated\n---',
    `slug: first\nslug: second\nexternal_url: ${ordinaryPost.url}\n---`,
    `external_url: ${ordinaryPost.url}\n---`,
    `slug: ""\nexternal_url: ${ordinaryPost.url}\n---`,
    'a scalar\n---',
    '- list\n---',
    ...['false', '42', 'null', '[a]'].flatMap(value => [
        `slug: ${value}\nexternal_url: ${ordinaryPost.url}\n---`,
        `slug: legacy\nexternal_url: ${value}\n---`,
    ]),
]) {
    test(`invalid metadata rejects ${JSON.stringify(yaml)}`, (): void => {
        assert.throws(() => generator.readExternalEntry(`---\n${yaml}\nBody`, 'invalid/index.mdx'),
            /invalid\/index\.mdx/);
    });
}

for (const url of [
    'http://devblogs.microsoft.com/post/', '/relative',
    'https://devblogs.microsoft.com.example.com/post/',
    'https://devblogs.microsoft.com@other.example/post/',
]) {
    test(`invalid URL rejects ${url}`, (): void => {
        assert.throws(() => generator.validateExternalUrl(url, 'invalid/index.mdx'), /invalid\/index\.mdx/);
    });
}

function assertValidSource(source: string, scriptKind: ts.ScriptKind): ts.SourceFile {
    const result = ts.transpileModule(source, {
        compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
        fileName: scriptKind === ts.ScriptKind.TSX ? 'fixture.tsx' : 'fixture.ts',
        reportDiagnostics: true,
    });
    assert.deepEqual(result.diagnostics, []);
    return ts.createSourceFile('fixture.tsx', source, ts.ScriptTarget.Latest, true, scriptKind);
}

function readRedirectDestination(source: string): string {
    const ast = assertValidSource(source, ts.ScriptKind.TSX);
    assert.equal(ast.statements.length, 2);
    const [importStatement, redirectStatement] = ast.statements;
    assert.ok(ts.isImportDeclaration(importStatement));
    assert.ok(ts.isStringLiteral(importStatement.moduleSpecifier));
    assert.equal(importStatement.moduleSpecifier.text, '@site/src/components/ExternalRedirect');
    assert.equal(importStatement.importClause?.name?.text, 'ExternalRedirect');
    assert.ok(ts.isExpressionStatement(redirectStatement));
    assert.ok(ts.isJsxSelfClosingElement(redirectStatement.expression));
    const redirect = redirectStatement.expression;
    assert.equal(redirect.tagName.getText(), 'ExternalRedirect');
    assert.equal(redirect.attributes.properties.length, 1);
    const attribute = redirect.attributes.properties[0];
    assert.ok(ts.isJsxAttribute(attribute));
    assert.equal(attribute.name.getText(), 'to');
    const initializer = attribute.initializer;
    assert.ok(initializer);
    if (ts.isStringLiteral(initializer)) return initializer.text;
    assert.ok(ts.isJsxExpression(initializer) && initializer.expression);
    assert.ok(ts.isStringLiteral(initializer.expression));
    return initializer.expression.text;
}

function readExternalUrls(source: string): Map<string, string> {
    const ast = assertValidSource(source, ts.ScriptKind.TS);
    assert.equal(ast.statements.length, 1);
    const statement = ast.statements[0];
    assert.ok(ts.isVariableStatement(statement));
    assert.equal(statement.declarationList.declarations.length, 1);
    const declaration = statement.declarationList.declarations[0];
    assert.ok(ts.isIdentifier(declaration.name));
    assert.equal(declaration.name.text, 'externalBlogUrls');
    const initializer = declaration.initializer;
    assert.ok(initializer);
    const entries = new Map<string, string>();
    if (ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
            assert.ok(ts.isPropertyAssignment(property));
            assert.ok(ts.isStringLiteral(property.name) && ts.isStringLiteral(property.initializer));
            entries.set(property.name.text, property.initializer.text);
        }
    } else {
        assert.ok(ts.isCallExpression(initializer));
        assert.equal(initializer.expression.getText(), 'Object.fromEntries');
        assert.equal(initializer.arguments.length, 1);
        const argument = initializer.arguments[0];
        assert.ok(ts.isArrayLiteralExpression(argument));
        for (const pair of argument.elements) {
            assert.ok(ts.isArrayLiteralExpression(pair));
            assert.equal(pair.elements.length, 2);
            const [slug, url] = pair.elements;
            assert.ok(ts.isStringLiteral(slug) && ts.isStringLiteral(url));
            entries.set(slug.text, url.text);
        }
    }
    return entries;
}

test('redirect and map preserve exact destinations without evaluating generated source', async (): Promise<void> => {
    const url = "https://devblogs.microsoft.com/microsoft365dev/it's-a-post/?x=1#part";
    assert.equal(generator.validateExternalUrl(url, 'entry.mdx').origin, 'https://devblogs.microsoft.com');
    const parsed = await parseProductionMdx(generator.buildMdx({ ...ordinaryPost, url }));
    assert.equal(readRedirectDestination(parsed.content), url);
    const entries = ['legacy', '__proto__', 'constructor', "quote'\\key"].map(slug => ({
        slug, url, sourcePath: `${slug}/index.mdx`,
    }));
    assert.deepEqual([...readExternalUrls(generator.buildExternalUrlsSource(entries))], [
        ['legacy', url], ['__proto__', url], ['constructor', url], ["quote'\\key", url],
    ]);
    assert.throws(() => generator.buildExternalUrlsSource([
        { slug: 'same', url, sourcePath: 'first/index.mdx' },
        { slug: 'same', url, sourcePath: 'second/index.mdx' },
    ]), /first\/index\.mdx.*second\/index\.mdx/);
});

const listingUrl = 'https://devblogs.microsoft.com/microsoft365dev/tag/teams-ai-library/';

function listing(urls: readonly string[]): string {
    return urls.map(url => `<article class="post bg-white"><h3><a href="${url}">Imported title</a></h3>` +
        '<div class="d-flex align-items-left gap-4">Nov 10, 2026</div>' +
        '<p>A practical    introduction\n to building Teams applications.</p></article>').join('\n');
}

function tempSync(t: TestContext): SyncOptions {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'teams-devblogs-'));
    t.after((): void => fs.rmSync(root, { recursive: true, force: true }));
    t.mock.method(console, 'log', (): void => {});
    return { blogDir: path.join(root, 'blog'), externalUrlsFile: path.join(root, 'map.ts'), dryRun: false };
}

function writePost(options: SyncOptions, folder: string, source: string): void {
    const directory = path.join(options.blogDir, folder);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'index.mdx'), source);
}

function mockListing(t: TestContext, urls: readonly string[], tagBody: string | Error = ''): string[] {
    const requests: string[] = [];
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request): Promise<Response> => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        requests.push(url);
        if (url === listingUrl) return new Response(listing(urls));
        assert.ok(urls.includes(url), `Unexpected fetch: ${url}`);
        if (tagBody instanceof Error) throw tagBody;
        return new Response(tagBody);
    });
    return requests;
}

test('sync preserves manual entries, full route slugs and repeated-run bytes', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    const slug = 'a'.repeat(65);
    const url = `https://devblogs.microsoft.com/microsoft365dev/${slug}/?x=1#part`;
    const manual = `---\nslug: manual-route\nexternal_url: '${ordinaryPost.url}'\n---\nManual content\n`;
    writePost(options, '2026-01-01-manual', manual);
    mockListing(t, [url], [
        '<a href="https://devblogs.microsoft.com/microsoft365dev/tag/Teams-AI-Library/">tag</a>',
        '<a href="https://devblogs.microsoft.com/microsoft365dev/tag/teams-ai-library/">tag</a>',
        `<a href="https://devblogs.microsoft.com/microsoft365dev/tag/${slug}/">self</a>`,
    ].join('\n'));
    await generator.syncDevBlogs(options);
    const generatedPath = path.join(options.blogDir, `2026-11-10-${'a'.repeat(50)}`, 'index.mdx');
    const generated = fs.readFileSync(generatedPath, 'utf8');
    const parsed = await parseProductionMdx(generated);
    assert.ok(parsed.frontMatter && typeof parsed.frontMatter === 'object');
    assert.ok('slug' in parsed.frontMatter && 'tags' in parsed.frontMatter && 'description' in parsed.frontMatter);
    assert.equal(parsed.frontMatter.slug, slug);
    assert.deepEqual(parsed.frontMatter.tags, ['teams-ai-library']);
    assert.equal(parsed.frontMatter.description, 'A practical introduction to building Teams applications.');
    const map = fs.readFileSync(options.externalUrlsFile, 'utf8');
    assert.ok(map.includes('"manual-route"'));
    assert.ok(map.includes(JSON.stringify(url)));
    await generator.syncDevBlogs(options);
    assert.equal(fs.readFileSync(generatedPath, 'utf8'), generated);
    assert.equal(fs.readFileSync(path.join(options.blogDir, '2026-01-01-manual', 'index.mdx'), 'utf8'), manual);
    assert.equal(fs.readFileSync(options.externalUrlsFile, 'utf8'), map);
});

test('no-new-post run refreshes the map without rewriting existing posts', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    const existing = generator.buildMdx(ordinaryPost);
    writePost(options, ordinaryPost.dateDir, existing);
    fs.writeFileSync(options.externalUrlsFile, 'stale map');
    const requests = mockListing(t, [ordinaryPost.url]);
    await generator.syncDevBlogs(options);
    assert.equal(fs.readFileSync(path.join(options.blogDir, ordinaryPost.dateDir, 'index.mdx'), 'utf8'), existing);
    assert.ok(fs.readFileSync(options.externalUrlsFile, 'utf8').includes('"getting-started"'));
    assert.deepEqual(requests, [listingUrl]);
});

for (const opening of ['---yaml', '---yml']) {
    test(`map regeneration preserves external posts with ${opening} frontmatter`, async (t: TestContext): Promise<void> => {
        const options = tempSync(t);
        const source = `${opening}\nslug: getting-started\nexternal_url: ${ordinaryPost.url}\n---\nBody\n`;
        const parsed = await parseProductionMdx(source);
        assert.ok(parsed.frontMatter && typeof parsed.frontMatter === 'object' && 'slug' in parsed.frontMatter);
        assert.equal(parsed.frontMatter.slug, 'getting-started');
        writePost(options, ordinaryPost.dateDir, source);
        mockListing(t, [ordinaryPost.url]);

        await generator.syncDevBlogs(options);

        assert.deepEqual([...readExternalUrls(fs.readFileSync(options.externalUrlsFile, 'utf8'))],
            [['getting-started', ordinaryPost.url]]);
        assert.equal(fs.readFileSync(path.join(options.blogDir, ordinaryPost.dateDir, 'index.mdx'), 'utf8'), source);
    });
}

test('tag fetch failure retains the fallback tag', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    mockListing(t, [ordinaryPost.url], new Error('fixture tag fetch failure'));
    await generator.syncDevBlogs(options);
    const source = fs.readFileSync(path.join(options.blogDir, ordinaryPost.dateDir, 'index.mdx'), 'utf8');
    const parsed = await parseProductionMdx(source);
    assert.ok(parsed.frontMatter && typeof parsed.frontMatter === 'object' && 'tags' in parsed.frontMatter);
    assert.deepEqual(parsed.frontMatter.tags, ['teams-ai-library']);
});

test('dry-run creates no files and performs no tag fetch', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    const requests = mockListing(t, [ordinaryPost.url]);
    await generator.syncDevBlogs({ ...options, dryRun: true });
    assert.deepEqual(fs.readdirSync(path.dirname(options.blogDir)), []);
    assert.deepEqual(requests, [listingUrl]);
});

for (const broken of [
    '---\ntitle: "broken\n---\n',
    `---\nslug: getting-started\nexternal_url: ${ordinaryPost.url}\n---\n`,
    '---\nslug: other\nexternal_url: https://other.example/post/\n---\n',
    ...['---yaml', '---yml'].flatMap(opening => [
        `${opening}\ntitle: "broken\n---\n`,
        `${opening}\nslug: other\nexternal_url: ${ordinaryPost.url}\n`,
        `${opening}\nslug: other\nexternal_url: https://other.example/post/\n---\n`,
    ]),
]) {
    test(`invalid later entry preserves prior map: ${JSON.stringify(broken)}`, async (t: TestContext): Promise<void> => {
        const options = tempSync(t);
        writePost(options, ordinaryPost.dateDir, generator.buildMdx(ordinaryPost));
        writePost(options, 'broken', broken);
        fs.writeFileSync(options.externalUrlsFile, 'sentinel map');
        mockListing(t, [ordinaryPost.url]);
        await assert.rejects(() => generator.syncDevBlogs(options), /broken\/index\.mdx/);
        assert.equal(fs.readFileSync(options.externalUrlsFile, 'utf8'), 'sentinel map');
    });
}

test('invalid new URL writes nothing and never fetches the post', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    const requests = mockListing(t, ['https://devblogs.microsoft.com.example.com/post/']);
    await assert.rejects(() => generator.syncDevBlogs(options), /external URL/);
    assert.deepEqual(fs.readdirSync(path.dirname(options.blogDir)), []);
    assert.deepEqual(requests, [listingUrl]);
});

test('duplicate incoming slugs reject before conflicting writes', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    mockListing(t, [ordinaryPost.url, ordinaryPost.url]);
    await assert.rejects(() => generator.syncDevBlogs(options), /Duplicate.*getting-started/);
    assert.deepEqual(fs.readdirSync(path.dirname(options.blogDir)), []);
});

test('new posts with colliding truncated folders reject before overwriting', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    mockListing(t, [
        `https://devblogs.microsoft.com/microsoft365dev/${'a'.repeat(50)}-first/`,
        `https://devblogs.microsoft.com/microsoft365dev/${'a'.repeat(50)}-second/`,
    ]);
    await assert.rejects(() => generator.syncDevBlogs(options), /Duplicate.*post path/);
    assert.deepEqual(fs.readdirSync(path.dirname(options.blogDir)), []);
});

async function assertExternalArtifacts(blogDir: string, mapSource: string): Promise<void> {
    const expected = new Map<string, string>();
    for (const folder of fs.readdirSync(blogDir)) {
        const file = path.join(blogDir, folder, 'index.mdx');
        if (!fs.existsSync(file)) continue;
        const source = fs.readFileSync(file, 'utf8');
        const external = generator.readExternalEntry(source, file);
        if (!external) continue;
        assert.ok(!expected.has(external.slug), `Duplicate checked-in slug: ${external.slug}`);
        expected.set(external.slug, external.url);
        const parsed = await parseProductionMdx(source);
        assert.equal(readRedirectDestination(parsed.content), external.url);
    }
    assert.ok(expected.size > 0);
    assert.deepEqual(readExternalUrls(mapSource), expected);
}

test('artifact audit accepts a refreshed map without rewriting legacy posts', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    writePost(options, ordinaryPost.dateDir,
        `---\nslug: getting-started\nexternal_url: ${ordinaryPost.url}\n---\n\n` +
        "import ExternalRedirect from '@site/src/components/ExternalRedirect';\n\n" +
        `<ExternalRedirect to="${ordinaryPost.url}" />\n`);
    mockListing(t, [ordinaryPost.url]);
    await generator.syncDevBlogs(options);
    await assertExternalArtifacts(options.blogDir, fs.readFileSync(options.externalUrlsFile, 'utf8'));
});

test('artifact audit accepts mixed legacy and newly imported posts', async (t: TestContext): Promise<void> => {
    const options = tempSync(t);
    writePost(options, '2026-01-01-manual',
        `---\nslug: manual-route\nexternal_url: ${ordinaryPost.url}\n---\n\n` +
        "import ExternalRedirect from '@site/src/components/ExternalRedirect';\n\n" +
        `<ExternalRedirect to="${ordinaryPost.url}" />\n`);
    mockListing(t, [ordinaryPost.url]);
    await generator.syncDevBlogs(options);
    await assertExternalArtifacts(options.blogDir, fs.readFileSync(options.externalUrlsFile, 'utf8'));
});

test('checked-in external entries agree with the current map and redirect destinations', async (): Promise<void> => {
    await assertExternalArtifacts(
        fileURLToPath(new URL('../blog', import.meta.url)),
        fs.readFileSync(new URL('../src/data/externalBlogUrls.ts', import.meta.url), 'utf8'),
    );
});
