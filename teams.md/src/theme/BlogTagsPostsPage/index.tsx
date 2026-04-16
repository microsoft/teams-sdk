import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { HtmlClassNameProvider, ThemeClassNames, PageMetadata } from '@docusaurus/theme-common';
import clsx from 'clsx';
import type { Props } from '@theme/BlogTagsPostsPage';
import BlogPostRows from '@site/src/components/BlogPostRows';

export default function BlogTagsPostsPage({ tag, items }: Props): React.ReactNode {
    return (
        <HtmlClassNameProvider className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogTagPostListPage)}>
            <PageMetadata title={`${tag.label} — Teams SDK Blog`} />
            <Layout>
                <div className="sdev-blog">
                    <aside className="sdev-blog__sidebar">
                        <div className="sdev-blog__filter-label">/ TOPIC</div>
                        <div className="sdev-blog__divider" />
                        <div className="sdev-blog__tag-name">{tag.label}</div>
                        <div className="sdev-blog__tag-count">{tag.count} post{tag.count !== 1 ? 's' : ''}</div>
                        <Link to="/blog" className="sdev-blog__tag-back">← all posts</Link>
                    </aside>

                    <main className="sdev-blog__main">
                        <div className="sdev-blog__table-head">
                            <span className="sdev-blog__th sdev-blog__th--date">/ DATE</span>
                            <span className="sdev-blog__th sdev-blog__th--name">/ TITLE</span>
                        </div>
                        <BlogPostRows items={items} />
                    </main>
                </div>
            </Layout>
        </HtmlClassNameProvider>
    );
}
