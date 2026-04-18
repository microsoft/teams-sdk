import React, { useEffect } from 'react';
import Link from '@docusaurus/Link';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import { formatBlogDate } from '@site/src/utils/blogDate';

export default function BlogPostItemHeader() {
    const { metadata, isBlogPostPage } = useBlogPost();

    useEffect(() => {
        if (isBlogPostPage) {
            document.documentElement.classList.add('blog-post-page');
            return () => document.documentElement.classList.remove('blog-post-page');
        }
    }, [isBlogPostPage]);
    const { permalink, title, date, authors, readingTime, tags } = metadata;

    const dateStr = formatBlogDate(date);
    const minRead = readingTime ? ` · ${Math.ceil(readingTime)} min read` : '';
    const authorNames = authors.map((a) => a.name).filter(Boolean);

    return (
        <header className="sdev-post__header">
            <div className="sdev-post__meta">
                <span className="sdev-post__date">{dateStr}{minRead}</span>
            </div>
            {isBlogPostPage ? (
                <h1 className="sdev-post__title">{title}</h1>
            ) : (
                <h2 className="sdev-post__title">
                    <Link to={permalink}>{title}</Link>
                </h2>
            )}
            <div className="sdev-post__info-row">
                {authorNames.length > 0 && (
                    <div className="sdev-post__info-item">
                        <span className="sdev-post__label">AUTHOR :</span>
                        <span className="sdev-post__value">{authorNames.join(', ')}</span>
                    </div>
                )}
                {tags.length > 0 && (
                    <div className="sdev-post__info-item">
                        <span className="sdev-post__label">TOPICS :</span>
                        <div className="sdev-post__tags">
                            {tags.map((tag) => (
                                <Link key={tag.permalink} to={tag.permalink} className="sdev-post__tag">
                                    {tag.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
