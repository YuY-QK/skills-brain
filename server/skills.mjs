import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const runFile = promisify(execFile);
export const roots = [
  path.join(homedir(), '.agents/skills'),
  path.join(homedir(), '.codex/skills'),
  path.join(homedir(), '.codex/plugins/cache'),
];
export const groups = [
  {
    id: 'design',
    name: '设计与创意',
    color: '#a89bff',
    words: [
      'design',
      'brand',
      'canvas',
      'banner',
      'image',
      'icon',
      'styling',
      'ux',
      'visual',
    ],
  },
  {
    id: 'build',
    name: '开发与构建',
    color: '#6aa8ff',
    words: [
      'code',
      'frontend',
      'react',
      'web',
      'site',
      'build',
      'test',
      'review',
      'api',
      'plugin',
    ],
  },
  {
    id: 'docs',
    name: '文档与表达',
    color: '#ffbc75',
    words: [
      'document',
      'pdf',
      'slide',
      'presentation',
      'docx',
      'pptx',
      'writing',
    ],
  },
  {
    id: 'knowledge',
    name: '知识与研究',
    color: '#66d6b1',
    words: ['notion', 'research', 'knowledge', 'meeting', 'spec'],
  },
  {
    id: 'data',
    name: '数据与分析',
    color: '#ed8fb8',
    words: [
      'sheet',
      'excel',
      'data',
      'analysis',
      'financial',
      'forecast',
      'pipeline',
    ],
  },
  {
    id: 'tools',
    name: '工具与工作流',
    color: '#d2d778',
    words: ['skill', 'template', 'installer', 'creator', 'workflow'],
  },
];
export function classify(name, description = '') {
  const n = name.toLowerCase();
  if (/sheet|excel|financial|forecast|pipeline/.test(n)) return 'data';
  if (/notion|research|knowledge|meeting/.test(n)) return 'knowledge';
  if (/doc|pdf|slide|presentation|letterhead|memorandum/.test(n)) return 'docs';
  if (/skill|template|installer|creator/.test(n)) return 'tools';
  if (/design|brand|banner|image|styling|visual|ux/.test(n)) return 'design';
  if (/site|code|plugin|review/.test(n)) return 'build';
  return groups
    .map((g) => [
      g.id,
      g.words.filter((w) => (n + ' ' + description.toLowerCase()).includes(w))
        .length,
    ])
    .sort((a, b) => b[1] - a[1])[0][0];
}
export function parseSkill(raw, fallback) {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const field = (key) => {
    const lines = (fm?.[1] || '').split(/\r?\n/);
    const index = lines.findIndex((line) => line.startsWith(key + ':'));
    if (index < 0) return '';
    let value = lines[index].slice(key.length + 1).trim();
    for (
      let i = index + 1;
      i < lines.length && (/^\s/.test(lines[i]) || !lines[i].trim());
      i++
    )
      value += '\n' + lines[i];
    return value
      .replace(/^[>|][-+]?\s*\n?/, '')
      .replace(/\n\s+/g, ' ')
      .trim()
      .replace(/^(['"])([\s\S]*)\1$/, '$2');
  };
  return {
    name: field('name') || fallback,
    description: field('description') || '未提供技能描述',
    content: raw,
  };
}
export async function scanSkills(scanRoots = roots) {
  const result = [],
    errors = [],
    seen = new Set();
  async function walk(dir, depth = 0) {
    if (depth > 9) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (e) {
      errors.push({ path: dir, error: e.code });
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (
        entry.isDirectory() &&
        !['node_modules', '.git', 'references', 'scripts', 'assets'].includes(
          entry.name,
        )
      )
        await walk(full, depth + 1);
      if (entry.isFile() && entry.name === 'SKILL.md') {
        try {
          const raw = await readFile(full, 'utf8');
          const item = parseSkill(raw, path.basename(dir));
          const hash = createHash('sha256').update(raw).digest('hex');
          if (seen.has(hash)) continue;
          seen.add(hash);
          result.push({
            ...item,
            id: hash.slice(0, 16),
            path: full,
            group: classify(item.name, item.description),
            source: full.includes('/plugins/')
              ? '插件'
              : full.includes('/.system/')
                ? '系统'
                : '个人',
            updated: (await stat(full)).mtime.toISOString(),
          });
        } catch (e) {
          errors.push({ path: full, error: e.code });
        }
      }
    }
  }
  for (const root of scanRoots) await walk(root);
  return {
    skills: result.sort((a, b) => a.name.localeCompare(b.name)),
    groups,
    roots: scanRoots,
    errors,
    scannedAt: new Date().toISOString(),
  };
}
export async function openSkillFolder(
  id,
  skills,
  launch = runFile,
  platform = process.platform,
) {
  const skill = skills.find((s) => s.id === id);
  if (!skill) throw new Error('技能不存在，请重新同步');
  const folder = path.dirname(skill.path);
  const command =
    platform === 'darwin'
      ? 'open'
      : platform === 'win32'
        ? 'explorer.exe'
        : 'xdg-open';
  await launch(command, [folder]);
  return { ok: true };
}
export const repositories = ['anthropics/skills', 'vercel-labs/agent-skills'];
export async function remoteSkills() {
  const skills = [],
    errors = [];
  await Promise.all(
    repositories.map(async (repo) => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`,
          {
            headers: { Accept: 'application/vnd.github+json' },
            signal: AbortSignal.timeout(12000),
          },
        );
        if (!response.ok) throw new Error(`GitHub ${response.status}`);
        const data = await response.json();
        const paths = (data.tree || [])
          .filter((x) => x.path.endsWith('/SKILL.md'))
          .slice(0, 60);
        for (let offset = 0; offset < paths.length; offset += 6)
          await Promise.all(
            paths.slice(offset, offset + 6).map(async (entry) => {
              try {
                const r = await fetch(
                  `https://raw.githubusercontent.com/${repo}/main/${entry.path}`,
                  { signal: AbortSignal.timeout(10000) },
                );
                if (!r.ok) throw new Error(String(r.status));
                const raw = await r.text();
                const parsed = parseSkill(raw, entry.path.split('/').at(-2));
                skills.push({
                  id: repo + ':' + entry.path,
                  name: parsed.name,
                  description: parsed.description,
                  group: classify(parsed.name, parsed.description),
                  repo,
                  url: `https://github.com/${repo}/blob/main/${entry.path}`,
                });
              } catch (e) {
                errors.push(`${repo}/${entry.path}: ${e.message}`);
              }
            }),
          );
      } catch (e) {
        errors.push(`${repo}: ${e.message}`);
      }
    }),
  );
  return { skills, errors, fetchedAt: new Date().toISOString() };
}
export default function skillsPlugin() {
  let cache = null;
  return {
    name: 'local-skills',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!['/api/skills', '/api/remote', '/api/open-folder'].includes(url))
          return next();
        // Local read-only endpoints. Cross-origin pages cannot read the skill library.
        const host = req.headers.host;
        if (
          !host ||
          !/^localhost:\d+$|^127\.0\.0\.1:\d+$|^\[::1\]:\d+$/.test(host)
        ) {
          res.statusCode = 403;
          return res.end('Local access only');
        }
        if (
          req.headers.origin &&
          ![`http://${host}`, `https://${host}`].includes(req.headers.origin)
        ) {
          res.statusCode = 403;
          return res.end('Origin rejected');
        }
        if (url === '/api/open-folder') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            return res.end('POST only');
          }
          if (
            req.headers.origin !== `http://${host}` &&
            req.headers.origin !== `https://${host}`
          ) {
            res.statusCode = 403;
            return res.end('Same-origin request required');
          }
          if (!req.headers['content-type']?.startsWith('application/json')) {
            res.statusCode = 415;
            return res.end('JSON required');
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            let body = '';
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 1024) {
                res.statusCode = 413;
                return res.end(JSON.stringify({ error: '请求过长' }));
              }
            }
            const { id } = JSON.parse(body);
            if (typeof id !== 'string' || !/^[a-f0-9]{16}$/.test(id)) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: '无效的技能 ID' }));
            }
            const { skills } = await scanSkills();
            res.end(JSON.stringify(await openSkillFolder(id, skills)));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }
        if (req.method !== 'GET') {
          res.statusCode = 405;
          return res.end('GET only');
        }
        try {
          let data;
          if (url === '/api/skills') data = await scanSkills();
          else {
            if (!cache || Date.now() - cache.time > 3600000) {
              const value = await remoteSkills();
              if (value.skills.length) cache = { value, time: Date.now() };
              data = value;
            } else data = cache.value;
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(data));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}
