import rss from '@astrojs/rss';
import { getPosts, withBase } from '../lib/posts';
import { SITE } from '../site.config';

// RSS feed of published posts (drafts are excluded by getPosts in production).
export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: new URL(withBase('/'), context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: withBase(`posts/${post.id}/`),
    })),
  });
}
