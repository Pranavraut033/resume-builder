import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { getBase } from '../consts';

export async function GET(context: APIContext) {
  const base = getBase(import.meta.env.BASE_URL);
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return rss({
    title: 'Udaan · Writing',
    description: 'Notes on building Udaan: ATS screening, local-first architecture, and how the app is put together.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `${base}blog/${post.id}/`,
    })),
  });
}
