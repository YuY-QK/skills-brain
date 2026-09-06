#!/usr/bin/env node
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillSource = path.join(root, 'skills', 'skills-brain');
const skillTarget = path.join(homedir(), '.agents', 'skills', 'skills-brain');
const marker = path.join(skillTarget, '.skills-brain-managed');
const mcpName = 'skills-brain';
const action = process.argv[2] || 'doctor';

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function codex(...args) {
  return run('codex', args, { cwd: root });
}

async function installSkill() {
  await mkdir(path.dirname(skillTarget), { recursive: true });
  if (await exists(skillTarget)) {
    if (!(await exists(marker))) {
      throw new Error(
        `Refusing to replace unmanaged skill directory: ${skillTarget}`,
      );
    }
    await rm(skillTarget, { recursive: true });
  }
  await cp(skillSource, skillTarget, { recursive: true });
  await writeFile(marker, `${root}\n`, 'utf8');
}

async function registerMcp() {
  try {
    await codex('mcp', 'remove', mcpName);
  } catch {}
  await codex(
    'mcp',
    'add',
    mcpName,
    '--',
    process.execPath,
    path.join(root, 'server', 'mcp.mjs'),
  );
}

async function install() {
  if (Number(process.versions.node.split('.')[0]) < 22)
    throw new Error('Node.js 22.13 or later is required.');
  await installSkill();
  await registerMcp();
  console.log(`Installed Skills Brain skill at ${skillTarget}`);
  console.log(
    'Registered the skills-brain MCP server. Restart Codex to load it.',
  );
}

async function update() {
  if (
    (await exists(path.join(root, '.git'))) &&
    process.env.SKILLS_BRAIN_SKIP_PULL !== '1'
  ) {
    await run('git', ['pull', '--ff-only'], { cwd: root });
    await run('npm', ['ci'], { cwd: root });
  }
  await install();
}

async function uninstall() {
  if (await exists(marker)) await rm(skillTarget, { recursive: true });
  else if (await exists(skillTarget))
    console.log(`Kept unmanaged directory: ${skillTarget}`);
  try {
    await codex('mcp', 'remove', mcpName);
  } catch {}
  console.log('Removed the managed Skills Brain skill and MCP registration.');
  console.log(`The application checkout remains at ${root}`);
}

async function doctor() {
  const packageJson = JSON.parse(
    await readFile(path.join(root, 'package.json'), 'utf8'),
  );
  let mcpRegistered = false;
  try {
    mcpRegistered = (await codex('mcp', 'get', mcpName)).stdout.includes(
      mcpName,
    );
  } catch {}
  console.log(
    JSON.stringify(
      {
        version: packageJson.version,
        node: process.versions.node,
        nodeSupported: Number(process.versions.node.split('.')[0]) >= 22,
        checkout: root,
        dependenciesInstalled: await exists(path.join(root, 'node_modules')),
        skillInstalled: await exists(path.join(skillTarget, 'SKILL.md')),
        skillManaged: await exists(marker),
        mcpRegistered,
      },
      null,
      2,
    ),
  );
}

const actions = { install, update, uninstall, doctor };
if (!actions[action]) {
  console.error(
    'Usage: node scripts/manage.mjs <install|update|uninstall|doctor>',
  );
  process.exitCode = 2;
} else {
  actions[action]().catch((cause) => {
    console.error(cause.message);
    process.exitCode = 1;
  });
}
