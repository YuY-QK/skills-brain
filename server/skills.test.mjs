import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  parseSkill,
  classify,
  scanSkills,
  openSkillFolder,
  searchCatalog,
  recommendSkills,
} from './skills.mjs';
test('reads quoted and folded YAML descriptions without absorbing fields', () => {
  assert.deepEqual(
    parseSkill(
      '---\nname: "Example"\ndescription: >\n  First line\n  second line\nlicense: MIT\n---\nBody',
      'fallback',
    ),
    {
      name: 'Example',
      description: 'First line second line',
      content:
        '---\nname: "Example"\ndescription: >\n  First line\n  second line\nlicense: MIT\n---\nBody',
    },
  );
  assert.equal(parseSkill('No metadata', 'fallback').name, 'fallback');
});
test('specific skill intent takes precedence over generic design words', () => {
  assert.equal(classify('spreadsheets', 'design a workbook'), 'data');
  assert.equal(classify('notion-research-documentation'), 'knowledge');
  assert.equal(classify('ui-ux-pro-max'), 'design');
});
test('local scan produces unique readable skill records', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'skills-brain-test-'));
  try {
    await mkdir(path.join(fixture, 'example'));
    await writeFile(
      path.join(fixture, 'example', 'SKILL.md'),
      '---\nname: example\ndescription: Example skill\n---\nBody',
    );
    const r = await scanSkills([fixture]);
    assert.equal(r.skills.length, 1);
    assert.equal(new Set(r.skills.map((s) => s.id)).size, r.skills.length);
    for (const s of r.skills) {
      assert.ok(s.path.endsWith('/SKILL.md'));
      assert.ok(s.content);
      assert.ok(r.groups.some((g) => g.id === s.group));
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('folder opening accepts only indexed IDs and passes a literal directory argument', async () => {
  let call;
  const launch = async (...args) => {
    call = args;
  };
  const skills = [{ id: 'known', path: '/tmp/skill $(literal)/SKILL.md' }];
  await openSkillFolder('known', skills, launch, 'darwin');
  assert.deepEqual(call, ['open', ['/tmp/skill $(literal)']]);
  call = null;
  await assert.rejects(openSkillFolder('../../etc', skills, launch, 'darwin'));
  assert.equal(call, null);
});

test('search and recommendation support English and Chinese task language', () => {
  const skills = [
    {
      id: 'design',
      name: 'frontend-design',
      description: 'Design a polished user interface',
      group: 'design',
    },
    {
      id: 'sheet',
      name: 'spreadsheets',
      description: 'Create and analyze Excel workbooks',
      group: 'data',
    },
  ];
  assert.equal(searchCatalog(skills, 'frontend')[0].id, 'design');
  assert.equal(recommendSkills(skills, '设计一个网页界面')[0].id, 'design');
  assert.equal(recommendSkills(skills, '分析财务表格')[0].id, 'sheet');
});
