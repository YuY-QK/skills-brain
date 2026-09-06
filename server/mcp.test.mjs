import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

function request(method, params) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server/mcp.mjs'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    let errors = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const line = output.split('\n').find(Boolean);
      if (!line) return;
      child.kill();
      try {
        resolve(JSON.parse(line));
      } catch (cause) {
        reject(cause);
      }
    });
    child.stderr.on('data', (chunk) => {
      errors += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code && !output) reject(new Error(errors || `MCP exited ${code}`));
    });
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })}\n`,
    );
  });
}

test('MCP initializes with tools capability', async () => {
  const response = await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '1' },
  });
  assert.equal(response.result.serverInfo.name, 'skills-brain');
  assert.equal(response.result.capabilities.tools.listChanged, false);
});

test('MCP exposes five read-only catalog tools', async () => {
  const response = await request('tools/list');
  assert.deepEqual(
    response.result.tools.map((tool) => tool.name),
    [
      'skills_catalog_status',
      'skills_search',
      'skills_get',
      'skills_compare',
      'skills_recommend',
    ],
  );
  assert.ok(
    response.result.tools.every((tool) => tool.annotations.readOnlyHint),
  );
});
