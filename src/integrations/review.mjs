// Dev-only review comments. `npm run dev` serves a small JSON API at /__review
// that stores comments in review/<post>.json at the project root. Production
// builds never include it. Claude reads these files to apply edits and marks
// comments resolved with a reply.
import fs from 'node:fs/promises';
import path from 'node:path';

const DIR = path.resolve('review');
const SLUG = /^[a-z0-9-]+$/;

async function readComments(post) {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${post}.json`), 'utf8'));
  } catch {
    return [];
  }
}

async function writeComments(post, comments) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${post}.json`), JSON.stringify(comments, null, 2) + '\n');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const body = req.method === 'GET' || req.method === 'DELETE' ? {} : await readBody(req);
  const post = url.searchParams.get('post') ?? body.post;
  if (!post || !SLUG.test(post)) return send(res, 400, { error: 'invalid post' });

  const comments = await readComments(post);

  if (req.method === 'GET') return send(res, 200, comments);

  if (req.method === 'POST') {
    const note = String(body.note ?? '').trim();
    if (!note) return send(res, 400, { error: 'empty note' });
    const comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      kind: body.kind === 'figure' ? 'figure' : 'text',
      section: String(body.section ?? ''),
      quote: String(body.quote ?? ''),
      prefix: String(body.prefix ?? ''),
      suffix: String(body.suffix ?? ''),
      note,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    comments.push(comment);
    await writeComments(post, comments);
    return send(res, 201, comment);
  }

  if (req.method === 'PATCH') {
    const comment = comments.find((c) => c.id === body.id);
    if (!comment) return send(res, 404, { error: 'not found' });
    if (body.status === 'open' || body.status === 'resolved') comment.status = body.status;
    await writeComments(post, comments);
    return send(res, 200, comment);
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    await writeComments(
      post,
      comments.filter((c) => c.id !== id),
    );
    return send(res, 200, { ok: true });
  }

  return send(res, 405, { error: 'method not allowed' });
}

export default function review() {
  return {
    name: 'review-comments',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/__review', (req, res) => {
          handle(req, res).catch((err) => send(res, 500, { error: String(err) }));
        });
      },
    },
  };
}
