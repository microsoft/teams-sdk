import React from 'react';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import ReadMoreLink from '@theme/BlogPostItem/Footer/ReadMoreLink';

export default function BlogPostItemFooter() {
    const { metadata, isBlogPostPage } = useBlogPost();
    const { title, hasTruncateMarker } = metadata;

    // Post page: tags shown in header; list view without truncation: nothing to show
    if (isBlogPostPage || !hasTruncateMarker) return null;

    return (
        <footer className="row docusaurus-mt-lg">
            <div className="col text--right">
                <ReadMoreLink blogPostTitle={title} to={metadata.permalink} />
            </div>
        </footer>
    );
}
