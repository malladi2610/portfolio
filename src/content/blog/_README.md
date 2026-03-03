# Blog Template Usage

1. Copy `TEMPLATE.md` and rename it to your new post slug, for example `my-first-post.md`.
2. Fill in the frontmatter fields at the top of the file.
3. Place images in `/public/images/blog/` and link them with `/images/blog/...`.
4. Set `draft: false` when the post is ready to publish.

## Frontmatter Fields

- `title`: The post title shown on the page.
- `description`: Short summary used in previews and SEO.
- `pubDate`: Publish date in `YYYY-MM-DD`.
- `updatedDate`: Optional update date in `YYYY-MM-DD`.
- `topics`: Preferred. One or more of `electronics`, `ai`, `robotics`.
- `topic`: Legacy single-topic field (still supported for older posts).
- `tags`: Optional list of tags.
- `heroImage`: Optional hero image path.
- `showHeroOnPost`: Optional. Set to `false` to hide the top hero image on the blog page while keeping it in previews.
- `draft`: Set to `true` to hide the post.
