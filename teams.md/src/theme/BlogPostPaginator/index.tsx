import React from 'react';
import Link from '@docusaurus/Link';
import type { Props } from '@theme/BlogPostPaginator';

export default function BlogPostPaginator({ nextItem, prevItem }: Props) {
    if (!nextItem && !prevItem) return null;

    return (
        <nav className="sdev-post__paginator" aria-label="Blog post navigation">
            <div className="sdev-post__paginator-inner">
                {prevItem && (
                    <Link to={prevItem.permalink} className="sdev-post__pag-link sdev-post__pag-link--prev">
                        <span className="sdev-post__pag-label">← NEWER</span>
                        <span className="sdev-post__pag-title">{prevItem.title}</span>
                    </Link>
                )}
                {nextItem && (
                    <Link to={nextItem.permalink} className="sdev-post__pag-link sdev-post__pag-link--next">
                        <span className="sdev-post__pag-label">OLDER →</span>
                        <span className="sdev-post__pag-title">{nextItem.title}</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
