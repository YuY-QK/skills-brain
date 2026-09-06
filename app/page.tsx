'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Network,
  Search,
  RefreshCw,
  ArrowUpRight,
  Globe,
  Folder,
  Plus,
  Minus,
  RotateCcw,
  Compass,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Code2,
  Layers,
  FileText,
  Orbit,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  BookOpen,
  Database,
  Wrench,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Switch } from '@/components/ui/switch';
type Skill = {
  id: string;
  name: string;
  description: string;
  group: string;
  source?: string;
  path?: string;
  content?: string;
  repo?: string;
  url?: string;
};
type Group = { id: string; name: string; color: string; words: string[] };
type Library = {
  skills: Skill[];
  groups: Group[];
  roots: string[];
  errors: { path: string; error: string }[];
  scannedAt: string;
};
const initialGroups: Group[] = [
  { id: 'design', name: '设计与创意', color: '#a89bff', words: [] },
  { id: 'build', name: '开发与构建', color: '#6aa8ff', words: [] },
  { id: 'docs', name: '文档与表达', color: '#ffbc75', words: [] },
  { id: 'knowledge', name: '知识与研究', color: '#66d6b1', words: [] },
  { id: 'data', name: '数据与分析', color: '#ed8fb8', words: [] },
  { id: 'tools', name: '工具与工作流', color: '#d2d778', words: [] },
];
const groupIcons = [Palette, Code2, FileText, BookOpen, Database, Wrench];
const centers = [
  [800, 230],
  [850, 540],
  [540, 760],
  [220, 570],
  [190, 230],
  [490, 100],
];
function keywords(s: Skill) {
  return new Set(
    (s.name + ' ' + s.description)
      .toLowerCase()
      .match(/[a-z][a-z0-9-]{3,}/g)
      ?.filter(
        (w) =>
          ![
            'with',
            'this',
            'that',
            'when',
            'from',
            'into',
            'skill',
            'skills',
            'using',
            'create',
            'used',
            'only',
            'such',
            'their',
            'user',
            'should',
            'includes',
            'available',
          ].includes(w),
      ) || [],
  );
}
function matching(a: Skill, b: Skill) {
  const aa = keywords(a),
    bb = keywords(b);
  const overlap = [...aa].filter((w) => bb.has(w));
  return {
    score: overlap.length + (a.group === b.group ? 3 : 0),
    overlap: overlap.slice(0, 4),
  };
}
export default function Home() {
  const [library, setLibrary] = useState<Library | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true);
  const [remote, setRemote] = useState<Skill[]>([]),
    [remoteState, setRemoteState] = useState('尚未连接'),
    [remoteBusy, setRemoteBusy] = useState(false);
  const [selected, setSelected] = useState<string>(''),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [web, setWeb] = useState(true),
    [view, setView] = useState('graph'),
    [panel, setPanel] = useState(true);
  const sidebarDrag = useRef<{
    x: number;
    collapsed: boolean;
    moved: boolean;
  } | null>(null);
  const [folderMessage, setFolderMessage] = useState('');
  async function openFolder(id: string) {
    try {
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || '无法打开文件夹');
      setFolderMessage('已打开技能所在文件夹');
    } catch (e) {
      setFolderMessage((e as Error).message);
    }
  }
  async function openLibraryRoot() {
    try {
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: true }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || '无法打开技能根目录');
      setFolderMessage('已打开本地技能根目录');
    } catch (e) {
      setFolderMessage((e as Error).message);
    }
  }
  const [collapsed, setCollapsed] = useState(false),
    [focusedSkill, setFocusedSkill] = useState<string | null>(null),
    [connectionQuery, setConnectionQuery] = useState(''),
    [compact, setCompact] = useState(false),
    [showRemote, setShowRemote] = useState(true),
    [showLocal, setShowLocal] = useState(true);
  const [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 });
  const { zoom } = camera,
    pan = { x: camera.x, y: camera.y };
  const cameraRef = useRef(camera),
    svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>()),
    moved = useRef(false),
    touchNode = useRef<string | null>(null),
    touchGroup = useRef<string | null>(null),
    startPoint = useRef({ x: 0, y: 0 });
  function updateCamera(next: typeof camera) {
    if (!Object.values(next).every(Number.isFinite)) return;
    cameraRef.current = next;
    setCamera(next);
  }
  function point(clientX: number, clientY: number) {
    const svg = svgRef.current,
      ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 530, y: 440 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }
  function zoomAt(factor: number, p = { x: 530, y: 440 }) {
    const c = cameraRef.current,
      z = Math.max(0.08, c.zoom * factor),
      ratio = z / c.zoom;
    updateCamera({
      zoom: z,
      x: p.x - 530 - (p.x - 530 - c.x) * ratio,
      y: p.y - 440 - (p.y - 440 - c.y) * ratio,
    });
  }
  function endPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (
      e.type === 'pointerup' &&
      e.pointerType === 'touch' &&
      !moved.current &&
      touchNode.current
    )
      chooseSkill(touchNode.current, false);
    if (
      e.type === 'pointerup' &&
      e.pointerType === 'touch' &&
      !moved.current &&
      touchGroup.current
    )
      chooseCategory(touchGroup.current);
    pointers.current.delete(e.pointerId);
    if (!pointers.current.size) {
      touchNode.current = null;
      touchGroup.current = null;
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function movePointer(e: React.PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const before = [...pointers.current.values()];
    const next = point(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, next);
    const after = [...pointers.current.values()];
    if (
      Math.hypot(
        e.clientX - startPoint.current.x,
        e.clientY - startPoint.current.y,
      ) > 4
    )
      moved.current = true;
    if (after.length === 2) {
      const distance = (ps: { x: number; y: number }[]) =>
        Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const mid = (ps: { x: number; y: number }[]) => ({
        x: (ps[0].x + ps[1].x) / 2,
        y: (ps[0].y + ps[1].y) / 2,
      });
      const a = mid(before),
        b = mid(after);
      if (distance(before) > 0) zoomAt(distance(after) / distance(before), a);
      const c = cameraRef.current;
      updateCamera({ ...c, x: c.x + b.x - a.x, y: c.y + b.y - a.y });
      moved.current = true;
    } else if (after.length === 1) {
      const c = cameraRef.current;
      updateCamera({
        ...c,
        x: c.x + next.x - previous.x,
        y: c.y + next.y - previous.y,
      });
    }
  }
  useEffect(() => {
    const media = matchMedia('(max-width: 850px)');
    const change = () => setCompact(media.matches);
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey)
        zoomAt(Math.exp(-e.deltaY * 0.01), point(e.clientX, e.clientY));
      else {
        const c = cameraRef.current;
        const a = point(0, 0),
          b = point(e.deltaX, e.deltaY);
        updateCamera({ ...c, x: c.x - (b.x - a.x), y: c.y - (b.y - a.y) });
      }
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [view]);

  const groups = library?.groups || initialGroups,
    skills = library?.skills || [],
    current = skills.find((s) => s.id === selected) || skills[0];
  async function scan() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/skills');
      if (!r.ok) throw new Error('本地技能读取失败');
      const data = (await r.json()) as Library;
      setLibrary(data);
      setSelected((s) =>
        data.skills.some((x: Skill) => x.id === s)
          ? s
          : (
              data.skills.find((x: Skill) => x.name === 'ui-ux-pro-max') ||
              data.skills[0]
            )?.id || '',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function discover() {
    setRemoteBusy(true);
    setRemoteState('正在读取公开技能目录…');
    try {
      const r = await fetch('/api/remote');
      if (!r.ok) throw new Error('无法连接网络技能库');
      const data = (await r.json()) as { skills: Skill[]; errors: string[] };
      setRemote(data.skills);
      setRemoteState(
        data.errors.length
          ? `已读取 ${data.skills.length} 个技能，部分来源暂不可用`
          : `已连接 · ${data.skills.length} 个网络技能`,
      );
    } catch (e) {
      setRemoteState((e as Error).message);
    } finally {
      setRemoteBusy(false);
    }
  }
  useEffect(() => {
    scan();
    discover();
  }, []);
  const filtered = skills.filter(
    (s) =>
      (category === 'all' || s.group === category) &&
      `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const recommendations = useMemo(
    () =>
      current
        ? remote
            .map((s) => ({ ...s, ...matching(current, s) }))
            .filter((s) => s.score >= 4)
            .sort((a, b) => b.score - a.score)
        : [],
    [current, remote],
  );
  const related = current
    ? skills
        .filter((s) => s.id !== current.id)
        .map((s) => ({ ...s, ...matching(current, s) }))
        .filter((s) => s.score >= 4)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    : [];
  const nodes = useMemo(
    () =>
      groups.flatMap((g, gi) => {
        const items = skills.filter((s) => s.group === g.id);
        return items.map((s, i) => {
          const ring = Math.floor(i / 8),
            angle = ((i % 8) / Math.min(items.length, 8)) * Math.PI * 2 - 1.1;
          const radius = 83 + ring * 53;
          return {
            ...s,
            x: centers[gi][0] + Math.cos(angle) * radius,
            y: centers[gi][1] + Math.sin(angle) * radius,
            color: g.color,
          };
        });
      }),
    [library],
  );
  const visible = new Set(filtered.map((s) => s.id));
  const activeGroup = groups.find((g) => g.id === current?.group);
  function reset() {
    updateCamera({ x: 0, y: 0, zoom: 1 });
  }
  function chooseCategory(id: string) {
    setCategory(id);
    setFocusedSkill(null);
    if (id === 'all') reset();
    else {
      const [x, y] = centers[groups.findIndex((g) => g.id === id)];
      updateCamera({ zoom: 1.65, x: (530 - x) * 1.65, y: (440 - y) * 1.65 });
    }
  }
  function chooseSkill(id: string, focus = true) {
    setSelected(id);
    setFocusedSkill(id);
    setConnectionQuery('');
    setPanel(true);
    const n = nodes.find((n) => n.id === id);
    if (n) {
      setCategory(n.group);
      if (focus)
        updateCamera({ zoom: 2, x: (530 - n.x) * 2, y: (440 - n.y) * 2 });
    }
  }
  const listSkills = focusedSkill
    ? skills.filter((s) => s.id === focusedSkill)
    : filtered;
  const matchesConnection = (s: Skill & { overlap: string[] }) =>
    (
      s.name +
      ' ' +
      s.description +
      ' ' +
      (s.repo || '') +
      ' ' +
      s.overlap.join(' ')
    )
      .toLowerCase()
      .includes(connectionQuery.toLowerCase());
  const shownRecommendations = recommendations.filter(matchesConnection),
    shownRelated = related.filter(matchesConnection);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <a className="brand" href="/" aria-label="Skills Brain 首页">
            <span className="brand-symbol">
              <Brain size={23} />
            </span>
            <strong>
              skills<span>brain</span>
            </strong>
            <span className="beta">LOCAL</span>
          </a>
          <button
            className="icon-button sync-button"
            title={busy ? '正在同步技能' : '同步技能'}
            aria-label={busy ? '正在同步技能' : '同步技能'}
            onClick={scan}
            disabled={busy}
          >
            <RefreshCw size={15} className={busy ? 'spin' : ''} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
          <div className="workspace-name">
            <Network size={18} />
            <span>我的技能宇宙</span>
            <button
              className="icon-button collapse-toggle"
              aria-label={collapsed ? '展开左侧栏' : '收起左侧栏'}
              title={collapsed ? '展开左侧栏' : '收起左侧栏'}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
          {collapsed && (
            <button
              className="icon-button collapsed-search"
              aria-label="展开搜索技能"
              title="搜索技能"
              onClick={() => setCollapsed(false)}
            >
              <Search size={18} />
            </button>
          )}
          <label className="search">
            <Search size={16} />
            <input
              aria-label="搜索技能"
              placeholder="搜索技能…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedSkill(null);
              }}
            />
            <kbd>/</kbd>
          </label>
          <div className="section-label">
            技能领域 <span>{groups.length}</span>
          </div>
          <button
            className={`category ${category === 'all' ? 'active' : ''}`}
            title="全部技能"
            aria-label="全部技能"
            onClick={() => chooseCategory('all')}
          >
            <Layers size={16} />
            <span className="category-name">全部技能</span>
            <span className="category-count">{skills.length}</span>
          </button>
          {groups.map((g, index) => {
            const Icon = groupIcons[index];
            return (
              <button
                key={g.id}
                className={`category ${category === g.id ? 'active' : ''}`}
                title={g.name}
                aria-label={g.name}
                onClick={() => chooseCategory(g.id)}
              >
                <Icon size={16} style={{ color: g.color }} />
                <span className="category-name">{g.name}</span>
                <span className="category-count">
                  {skills.filter((s) => s.group === g.id).length}
                </span>
              </button>
            );
          })}
          <div className="section-label list-label">
            {query ? '搜索结果' : '本地技能'} <span>{filtered.length}</span>
          </div>
          <div className="skill-list">
            {filtered.map((s) => (
              <div
                key={s.id}
                className={`skill-row-wrap ${current?.id === s.id ? 'selected' : ''}`}
              >
                <button
                  className="skill-row"
                  title={s.name}
                  aria-label={`选择 ${s.name}`}
                  onClick={() => chooseSkill(s.id)}
                >
                  <span
                    className="tiny-node"
                    style={{
                      color: groups.find((g) => g.id === s.group)?.color,
                    }}
                  >
                    ◇
                  </span>
                  <span>{s.name}</span>
                </button>
                <button
                  className="folder-jump"
                  title={`打开 ${s.name} 所在文件夹`}
                  aria-label={`打开 ${s.name} 所在文件夹`}
                  onClick={() => openFolder(s.id)}
                >
                  <FolderOpen size={14} />
                </button>
              </div>
            ))}
            {!busy && !filtered.length && (
              <p className="empty">没有匹配的技能，试试其他关键词。</p>
            )}
          </div>
          <button
            className="library-status"
            title="打开本地技能根目录"
            aria-label="打开本地技能根目录"
            onClick={openLibraryRoot}
          >
            <Folder size={17} />
            <div>
              本地技能库
              <small>{library?.roots.length || 3} 个目录 · 只读连接</small>
            </div>
            <i />
          </button>
        </aside>
        <div
          className="sidebar-edge"
          role="separator"
          aria-orientation="vertical"
          aria-label={
            collapsed
              ? '展开左侧栏，点击或向右拖动'
              : '收起左侧栏，点击或向左拖动'
          }
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={collapsed ? 0 : 1}
          tabIndex={0}
          onPointerDown={(e) => {
            sidebarDrag.current = { x: e.clientX, collapsed, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = sidebarDrag.current;
            if (!d) return;
            const delta = e.clientX - d.x;
            if (Math.abs(delta) > 24) {
              d.moved = true;
              if (delta > 24) setCollapsed(false);
              if (delta < -24) setCollapsed(true);
            }
          }}
          onPointerUp={(e) => {
            if (sidebarDrag.current && !sidebarDrag.current.moved)
              setCollapsed(!sidebarDrag.current.collapsed);
            sidebarDrag.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => (sidebarDrag.current = null)}
          onKeyDown={(e) => {
            if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
              setCollapsed(
                e.key === 'ArrowLeft'
                  ? true
                  : e.key === 'ArrowRight'
                    ? false
                    : !collapsed,
              );
            }
          }}
        >
          <span />
        </div>
        <ResizablePanelGroup
          orientation={compact ? 'vertical' : 'horizontal'}
          className="brain-panels"
        >
          <ResizablePanel
            id="brain-canvas"
            minSize={compact ? '450px' : '280px'}
          >
            <section className="main-area">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR KNOWLEDGE, CONNECTED</div>
                  <h1>
                    技能大脑 <span>Skills Brain</span>
                  </h1>
                  <p>让独立的技能，连接成完整的能力。</p>
                </div>
                {!panel && (
                  <button
                    className="icon-button panel-toggle"
                    aria-label="打开详情"
                    onClick={() => setPanel(true)}
                  >
                    <PanelRightOpen size={19} />
                  </button>
                )}
              </div>
              <Tabs value={view} onValueChange={setView} className="view-tabs">
                <div className="graph-toolbar">
                  <div className="stats toolbar-stats">
                    <div>
                      <strong>{skills.length.toString().padStart(2, '0')}</strong>
                      <span>本地技能</span>
                    </div>
                    <span className="stat-divider" />
                    <div>
                      <strong>06</strong>
                      <span>能力领域</span>
                    </div>
                    <span className="stat-divider" />
                    <div>
                      <strong>{remote.length.toString().padStart(2, '0')}</strong>
                      <span>网络技能</span>
                      <i className="live-dot" />
                    </div>
                  </div>
                  <div className="graph-toolbar-right">
                    <span className="toolbar-divider" />
                    {focusedSkill || category !== 'all' ? (
                      <button
                        className="clear-selection"
                        title="清除单个技能筛选"
                        onClick={() => chooseCategory('all')}
                      >
                        <span>
                          {focusedSkill
                            ? current?.name
                            : groups.find((g) => g.id === category)?.name}
                        </span>{' '}
                        <X size={12} />
                      </button>
                    ) : (
                      <span className="current-category">
                      {category === 'all'
                        ? '全部领域'
                        : groups.find((g) => g.id === category)?.name}
                      </span>
                    )}
                    <TabsList className="view-options">
                      <TabsTrigger value="graph">
                        <Network size={16} /> 脑图
                      </TabsTrigger>
                      <TabsTrigger value="list">
                        <Layers size={16} /> 列表
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
                <TabsContent value="graph" className="graph-panel">
                  <label className="graph-network-toggle" htmlFor="web-switch">
                    网络关联
                    <Switch
                      id="web-switch"
                      checked={web}
                      onCheckedChange={setWeb}
                    />
                  </label>
                  <div className="canvas-label">
                    <span className="live-dot" /> LIVE GRAPH{' '}
                    <small>{filtered.length} 个可见节点</small>
                  </div>
                  {busy && !library && (
                    <div className="canvas-message">正在读取本地 SKILL.md…</div>
                  )}
                  {error && (
                    <div className="canvas-message" role="alert">
                      {error} <button onClick={scan}>重试</button>
                    </div>
                  )}
                  <svg
                    ref={svgRef}
                    className="graph"
                    viewBox="-30 -40 1090 940"
                    aria-label="技能关系脑图，支持双击放大、双指缩放与拖动"
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      zoomAt(2, point(e.clientX, e.clientY));
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if (!pointers.current.size)
                        touchGroup.current =
                          (e.target as Element)
                            .closest('[data-group-id]')
                            ?.getAttribute('data-group-id') || null;
                      const target = (e.target as Element).closest(
                        '[data-skill-id]',
                      );
                      if (!pointers.current.size)
                        touchNode.current =
                          target?.getAttribute('data-skill-id') || null;
                      else moved.current = true;
                      if (pointers.current.size === 0) {
                        moved.current = false;
                        startPoint.current = { x: e.clientX, y: e.clientY };
                      }
                      pointers.current.set(
                        e.pointerId,
                        point(e.clientX, e.clientY),
                      );
                      if (
                        !(e.target as Element).closest('[data-node]') ||
                        e.pointerType === 'touch'
                      )
                        e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={movePointer}
                    onPointerUp={endPointer}
                    onPointerCancel={endPointer}
                    onPointerLeave={(e) => {
                      if (!e.currentTarget.hasPointerCapture(e.pointerId))
                        pointers.current.delete(e.pointerId);
                    }}
                  >
                    <defs>
                      <radialGradient id="core">
                        <stop stopColor="#302941" />
                        <stop offset="1" stopColor="#13171e" />
                      </radialGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="5" />
                      </filter>
                    </defs>
                    <g
                      transform={`translate(${530 + pan.x} ${440 + pan.y}) scale(${zoom}) translate(-530 -440)`}
                    >
                      {[150, 290, 440].map((r) => (
                        <circle
                          key={r}
                          cx="515"
                          cy="440"
                          r={r}
                          className="orbit-ring"
                        />
                      ))}
                      {groups.map((g, i) => (
                        <g
                          key={g.id}
                          opacity={
                            focusedSkill
                              ? 0.12
                              : category === 'all' || category === g.id
                                ? 1
                                : 0.1
                          }
                        >
                          <path
                            d={`M515 440 Q ${centers[i][0]} 440 ${centers[i][0]} ${centers[i][1]}`}
                            stroke={g.color}
                            className="branch"
                          />
                          {nodes
                            .filter((n) => n.group === g.id)
                            .map((n) => (
                              <path
                                key={n.id}
                                d={`M${centers[i][0]} ${centers[i][1]} Q ${n.x} ${centers[i][1]} ${n.x} ${n.y}`}
                                className="twig"
                                stroke={g.color}
                                opacity={visible.has(n.id) ? 0.4 : 0.08}
                              />
                            ))}
                          <g
                            className="parent-node"
                            data-node="true"
                            data-group-id={g.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`选择类别 ${g.name}`}
                            aria-pressed={category === g.id && !focusedSkill}
                            onClick={() => {
                              if (!moved.current) chooseCategory(g.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                chooseCategory(g.id);
                              }
                            }}
                          >
                            {category === g.id && !focusedSkill && (
                              <circle
                                cx={centers[i][0]}
                                cy={centers[i][1]}
                                r="23"
                                fill="none"
                                stroke={g.color}
                                strokeWidth="2"
                              />
                            )}
                            <circle
                              cx={centers[i][0]}
                              cy={centers[i][1]}
                              r="25"
                              fill={g.color}
                              opacity=".07"
                            />
                            <circle
                              cx={centers[i][0]}
                              cy={centers[i][1]}
                              r={category === g.id && !focusedSkill ? 13 : 7}
                              fill={g.color}
                            />
                            <text
                              x={centers[i][0]}
                              y={centers[i][1] + 35}
                              textAnchor="middle"
                              fill={g.color}
                              className="group-name"
                            >
                              {g.name}
                            </text>
                          </g>
                        </g>
                      ))}
                      <g opacity={focusedSkill?.length ? 0.12 : 1}>
                        <circle
                          cx="515"
                          cy="440"
                          r="61"
                          fill="#a89bff"
                          opacity=".04"
                        />
                        <circle
                          cx="515"
                          cy="440"
                          r="47"
                          fill="url(#core)"
                          stroke="#73668c"
                          strokeWidth="1"
                        />
                        <text
                          x="515"
                          y="438"
                          textAnchor="middle"
                          className="core-label"
                        >
                          SKILLS
                        </text>
                        <text
                          x="515"
                          y="459"
                          textAnchor="middle"
                          className="core-subtitle"
                        >
                          我的能力网络
                        </text>
                      </g>
                      {nodes.map((n) => (
                        <g
                          key={n.id}
                          data-node="true"
                          data-skill-id={n.id}
                          tabIndex={visible.has(n.id) ? 0 : -1}
                          role="button"
                          aria-label={`查看 ${n.name}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              chooseSkill(n.id, false);
                            }
                          }}
                          onClick={() => {
                            if (!moved.current) chooseSkill(n.id, false);
                          }}
                          style={{
                            animationDelay: `-${nodes.indexOf(n) * 0.37}s`,
                          }}
                          className={`graph-node ${n.id === focusedSkill ? 'is-selected' : ''}`}
                          opacity={
                            focusedSkill
                              ? n.id === focusedSkill
                                ? 1
                                : 0.07
                              : visible.has(n.id)
                                ? 1
                                : 0.07
                          }
                        >
                          <title>{n.name}</title>
                          {n.id === focusedSkill && (
                            <>
                              <circle
                                cx={n.x}
                                cy={n.y}
                                r="22"
                                fill={n.color}
                                opacity=".12"
                              />
                              <circle
                                cx={n.x}
                                cy={n.y}
                                r="15"
                                fill="none"
                                stroke={n.color}
                              />
                            </>
                          )}
                          <circle cx={n.x} cy={n.y} r="7" fill={n.color} />
                          <circle cx={n.x} cy={n.y} r="17" fill="transparent" />
                          <text
                            x={n.x}
                            y={n.y + 26}
                            fill={n.id === focusedSkill ? '#fff' : '#bac2d2'}
                            textAnchor="middle"
                          >
                            {n.name.length > 24
                              ? n.name.slice(0, 22) + '…'
                              : n.name}
                          </text>
                        </g>
                      ))}
                      {web &&
                        !focusedSkill &&
                        current &&
                        recommendations.slice(0, 2).map((s, i) => {
                          const n = nodes.find((n) => n.id === current.id);
                          if (!n || !visible.has(n.id)) return null;
                          const x = Math.min(
                              950,
                              Math.max(100, n.x + (i === 0 ? 155 : -140)),
                            ),
                            y = n.y - 75 - i * 24;
                          return (
                            <g key={s.id} className="remote-node">
                              <path
                                d={`M${n.x} ${n.y} Q${x} ${n.y} ${x} ${y}`}
                                stroke="#9c91c1"
                                strokeDasharray="4 5"
                                fill="none"
                              />
                              <circle
                                cx={x}
                                cy={y}
                                r="6"
                                fill="#10151d"
                                stroke="#baa6ea"
                              />
                              <text
                                x={x}
                                y={y - 15}
                                textAnchor="middle"
                                fill="#b8a6df"
                              >
                                {s.name.length > 24
                                  ? s.name.slice(0, 22) + '…'
                                  : s.name}
                              </text>
                            </g>
                          );
                        })}
                    </g>
                  </svg>
                  <div className="canvas-bottom">
                    <div className="canvas-legend">
                      <span className="graph-legend">
                        <i className="legend-solid" /> 本地技能{' '}
                        <i className="legend-hollow" /> 网络技能
                      </span>
                      <span className="graph-legend-note">
                        分类连线 · 虚线表示关键词关联
                      </span>
                    </div>
                    <div className="zoom-stack">
                      <div className="zoom-controls">
                        <button onClick={() => zoomAt(1 / 1.3)} aria-label="缩小">
                          <Minus size={16} />
                        </button>
                        <span>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => zoomAt(1.3)} aria-label="放大">
                          <Plus size={16} />
                        </button>
                        <button onClick={reset} aria-label="重置视图">
                          <RotateCcw size={15} />
                        </button>
                      </div>
                      <span className="graph-legend-note graph-hint">
                        拖动探索 · 双击放大 · 双指缩放
                      </span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="list" className="cards-panel">
                  {listSkills.map((s) => (
                    <button
                      key={s.id}
                      className="skill-card"
                      title={s.name}
                      aria-label={`选择 ${s.name}`}
                      onClick={() => chooseSkill(s.id)}
                    >
                      <span
                        className="pill"
                        style={{
                          color: groups.find((g) => g.id === s.group)?.color,
                        }}
                      >
                        {groups.find((g) => g.id === s.group)?.name}
                      </span>
                      <h3>{s.name}</h3>
                      <p>{s.description}</p>
                      <small>
                        {s.source}技能 <ArrowUpRight size={14} />
                      </small>
                    </button>
                  ))}
                  {!listSkills.length && (
                    <p className="empty">没有匹配的技能。</p>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </ResizablePanel>
          {panel && (
            <>
              <ResizableHandle
                withHandle
                className="detail-resizer"
                aria-label="拖拽调整技能详情宽度"
              />
              <ResizablePanel
                id="skill-inspector"
                defaultSize={compact ? '650px' : '360px'}
                minSize={compact ? '500px' : '300px'}
              >
                <aside className="detail-panel">
                  <div className="detail-fixed">
                    <div className="inspector-heading">
                      <div
                        className="skill-emblem"
                        style={{ color: activeGroup?.color }}
                      >
                        <Orbit size={20} />
                      </div>
                      <span>技能详情</span>
                      <button
                        className="icon-button panel-toggle inspector-toggle"
                        aria-label="关闭详情"
                        onClick={() => setPanel(false)}
                      >
                        <PanelRightClose size={19} />
                      </button>
                    </div>
                    {current && (
                      <>
                        <div className="detail-badges">
                          <span
                            className="pill"
                            style={{ color: activeGroup?.color }}
                          >
                            {activeGroup?.name}
                          </span>
                          <span className="source-badge">
                            {current.source}技能
                          </span>
                        </div>
                        <div className="skill-title-row">
                          <h2>{current.name}</h2>
                          <Dialog>
                            <DialogTrigger
                              className="icon-button source-trigger"
                              aria-label="查看技能原文"
                              title="查看技能原文"
                            >
                              <FileText size={19} />
                            </DialogTrigger>
                            <DialogContent className="source-dialog">
                              <DialogHeader>
                                <DialogTitle>{current.name}</DialogTitle>
                                <DialogDescription>
                                  技能原文 · 只读
                                </DialogDescription>
                              </DialogHeader>
                              <div className="source-path">
                                <FileText size={15} />
                                {current.path}
                              </div>
                              <pre className="source-content" tabIndex={0}>
                                {current.content}
                              </pre>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <p
                          className="skill-description"
                          title={current.description}
                        >
                          {current.description}
                        </p>
                      </>
                    )}
                    <div className="discovery-title">
                      <Compass size={17} />
                      <strong>关联发现</strong>
                      <span>
                        {shownRecommendations.length + shownRelated.length}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="刷新网络技能"
                        onClick={discover}
                        disabled={remoteBusy}
                      >
                        <RefreshCw
                          size={15}
                          className={remoteBusy ? 'spin' : ''}
                        />
                      </button>
                    </div>
                    <label className="search connection-search">
                      <Search size={15} />
                      <input
                        aria-label="搜索关联技能"
                        placeholder="搜索名称、用途或关键词…"
                        value={connectionQuery}
                        onChange={(e) => setConnectionQuery(e.target.value)}
                      />
                      {connectionQuery && (
                        <button
                          className="icon-button"
                          aria-label="清除关联搜索"
                          onClick={() => setConnectionQuery('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                  </div>
                  <div
                    className="connections-scroll"
                    tabIndex={0}
                    aria-label="关联发现列表"
                  >
                    <div className="recommend-heading" role="button" tabIndex={0} onClick={() => setShowRemote(!showRemote)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowRemote(!showRemote); }}>
                      <Globe size={16} />
                      <strong>网络相似技能</strong>
                      <span>{shownRecommendations.length}</span>
                      <button className="section-chevron" aria-label={showRemote ? '折叠网络相似技能' : '展开网络相似技能'} onClick={(e) => { e.stopPropagation(); setShowRemote(!showRemote); }}><ChevronDown size={15} className={showRemote ? '' : 'is-closed'} /></button>
                    </div>
                    {showRemote && <>
                    {remoteBusy && <p className="empty">正在连接公开技能库…</p>}
                    {!remoteBusy && !shownRecommendations.length && (
                      <p className="empty">
                        {connectionQuery
                          ? '没有匹配的网络技能。'
                          : remote.length
                            ? '暂未找到足够相关的技能。'
                            : '网络目录暂不可用，请刷新重试。'}
                      </p>
                    )}
                    {shownRecommendations.map((s) => (
                      <a
                        className="recommend-card"
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        key={s.id}
                      >
                        <div>
                          <Code2 size={15} />
                          <span>{s.name}</span>
                          <ArrowUpRight size={15} />
                        </div>
                        <small>{s.repo}</small>
                        <p>{s.description}</p>
                        <div className="keyword-section">
                          <span>共同关键词</span>
                          <div className="keyword-tags">
                            {s.overlap.length ? (
                              s.overlap.map((word) => (
                                <span key={word}>{word}</span>
                              ))
                            ) : (
                              <span>相同能力领域</span>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                    </>}
                    <div className="recommend-heading local-heading" role="button" tabIndex={0} onClick={() => setShowLocal(!showLocal)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowLocal(!showLocal); }}>
                      <Network size={17} />
                      <strong>本地关联</strong>
                      <span>{shownRelated.length}</span>
                      <button className="section-chevron" aria-label={showLocal ? '折叠本地关联' : '展开本地关联'} onClick={(e) => { e.stopPropagation(); setShowLocal(!showLocal); }}><ChevronDown size={15} className={showLocal ? '' : 'is-closed'} /></button>
                    </div>
                    {showLocal && <>
                    {shownRelated.map((s) => (
                      <button
                        key={s.id}
                        className="related-row"
                        onClick={() => chooseSkill(s.id)}
                      >
                        <i
                          style={{
                            background: groups.find((g) => g.id === s.group)
                              ?.color,
                          }}
                        />
                        <span>{s.name}</span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                    {!shownRelated.length && (
                      <p className="empty">没有匹配的本地关联。</p>
                    )}
                    </>}
                    <p className="remote-status">{remoteState}</p>
                    <p className="recommend-help">
                      关联依据：名称、描述中的共同关键词与能力领域。
                    </p>
                  </div>
                </aside>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      {folderMessage && (
        <div className="folder-feedback" role="status">
          {folderMessage}
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => setFolderMessage('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="bottom-bar">
        <span>
          <i />{' '}
          {library
            ? `最近同步 ${new Date(library.scannedAt).toLocaleTimeString('zh-CN')}`
            : '等待连接'}
          {library?.errors.length
            ? ` · ${library.errors.length} 个目录或文件未能读取`
            : ''}
        </span>
        <span>
          LOCAL FIRST <span className="bottom-dot">·</span> CONNECTED THINKING
        </span>
      </div>
    </main>
  );
}
