export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    `Sitemap: ${url.origin}/sitemap.xml`,
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
