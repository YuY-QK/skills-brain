<div align="center">

# Skills Brain · 技能大脑

**把分散的 Agent Skills，连接成可探索的能力网络。**

本地优先 · 交互脑图 · 网络关联 · 原文阅读

[English](README.md) | **简体中文**

[快速安装](#快速安装) · [Codex 集成](#codex-集成) · [功能](#功能) · [配置](#配置) · [贡献指南](CONTRIBUTING.md)

</div>

Skills Brain 是一个运行在电脑上的技能浏览器。它读取本地 `SKILL.md`，按用途生成脑图，并从公开 GitHub 技能目录中寻找相关能力。适合希望整理技能库、了解技能用途、发现替代方案的 Agent 用户。

**无需 API Key。无需数据库。本地技能内容不上传。**

## 功能

| 能力           | 使用方式                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| 本地技能扫描   | 自动读取个人、系统和插件缓存目录，按内容哈希去重；点击「同步技能」刷新   |
| 六大能力领域   | 设计与创意、开发与构建、文档与表达、知识与研究、数据与分析、工具与工作流 |
| 交互脑图       | 选择类别聚焦星簇；点击父节点高亮；选择技能单独高亮                       |
| 缩放与移动     | 拖动平移、连续双击放大、触控板/触屏双指缩放、按钮缩放和重置              |
| 列表筛选       | 名称和描述搜索；选择具体技能后列表仅显示它；关闭选中标签返回全部         |
| 可收起左栏     | 标题按钮、侧栏边缘点击、左右拖拽；收起后保留图标                         |
| 文件夹跳转     | 本地条目右侧按钮打开技能所在文件夹                                       |
| 原文阅读       | 技能名称旁的文档按钮打开独立阅读窗口，支持键盘关闭                       |
| 网络关联       | 按名称、描述关键词与能力领域匹配，显示 GitHub 来源和关键词标签           |
| 可调整详情面板 | 拖拽分隔条调整宽度，桌面最小 300px；详情固定，仅关联列表滚动             |
| 键盘与动态效果 | 键盘选择节点和调节分隔条；系统减少动态效果时停止节点动画                 |

## 快速安装

### 环境要求

- Node.js **22.13 或更新版本**，建议使用受维护的 LTS 版本。
- npm（随 Node.js 安装）和 Git；也可以下载 ZIP，不需要 Git。
- macOS、Windows 或带图形桌面的 Linux。文件夹跳转分别使用 `open`、`explorer.exe`、`xdg-open`。当前开发验证在 macOS 完成。

### 方式一：克隆源码

```sh
git clone https://github.com/YuY-QK/skills-brain.git
cd skills-brain
npm ci
npm start
```

打开 **[http://127.0.0.1:5173](http://127.0.0.1:5173)**。保持终端运行；按 `Ctrl+C` 停止服务。

### 方式二：下载 ZIP

1. [下载 main 分支源码 ZIP](https://github.com/YuY-QK/skills-brain/archive/refs/heads/main.zip)，或在仓库页面选择 **Code → Download ZIP**。
2. 解压，在包含 `package.json` 的目录打开终端。
3. 运行 `npm ci`，然后运行 `npm start`。
4. 打开本地地址。

这是源码安装的本地应用，尚未提供独立桌面安装包，也未发布到 npm 注册表。

### Codex 引导式安装

克隆项目并执行 `npm ci` 后，注册随项目提供的 Skill 与本地 MCP：

```sh
npm run setup
```

完成后重启 Codex。使用 `npm run doctor` 检查安装状态。安装器不会覆盖并非由它创建的同名技能目录。

请在引导式安装和下方 marketplace 安装之间选择一种；两种都安装会出现重复的 `skills-brain` 条目。

### 更新

在保留个人配置的前提下，停止服务，然后执行：

```sh
npm run update
```

若修改了源码，先提交或备份自己的改动再更新。

移除由安装器管理的 Skill 和 MCP 注册，同时保留应用源码：

```sh
npm run uninstall
```

此命令只移除引导式安装。通过 marketplace 安装的插件请使用 `codex plugin remove skills-brain@personal` 管理。

## Codex 集成

v0.3 提供只读本地 MCP。执行 `npm run setup` 并重启 Codex 后，即使未打开脑图页面，Codex 也可以使用五个工具：

| 工具                    | 用途                                       |
| ----------------------- | ------------------------------------------ |
| `skills_catalog_status` | 查看技能数量、分类、扫描目录和错误         |
| `skills_search`         | 按任务、能力、分类或来源搜索本地技能       |
| `skills_get`            | 读取单个本地技能；完整原文需要明确请求     |
| `skills_compare`        | 比较 2–5 个本地技能及共同关键词            |
| `skills_recommend`      | 为具体任务推荐本地技能和可选的公开候选技能 |

例如可以询问：“为分析财务表格并制作汇报推荐本地技能，并说明使用顺序。”推荐采用确定性的关键词和分类规则，Codex 会结合任务解释候选结果，但不会自动启用或安装技能。

仓库也通过 [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) 提供 Codex Plugin 包装，将 Skill 与 MCP 放在同一个包内。当前源码版本推荐使用 `npm run setup`，安装路径最明确。

也可以不运行 `npm run setup`，直接通过仓库内的 marketplace 安装：

```sh
codex plugin marketplace add YuY-QK/skills-brain --ref main
codex plugin add skills-brain@personal
```

安装后重启 Codex。使用 `codex plugin marketplace upgrade personal` 获取新的 marketplace 快照，再通过 Codex 重新安装插件。插件包自带 MCP 运行文件，从 Codex 插件缓存中即可运行，不依赖原始源码目录。

## 作为 Agent Skill 安装

仓库根目录提供标准 [`SKILL.md`](SKILL.md)，用于指导支持 Agent Skills 的助手安装、启动和使用 Skills Brain。**安装 Skill 指令不会自动安装或启动网页应用。**

手动安装时，将 `SKILL.md` 复制到你的 Agent 技能目录的 `skills-brain/` 子目录。例如，在 macOS / Linux 的仓库目录内：

```sh
mkdir -p ~/.agents/skills/skills-brain
cp SKILL.md ~/.agents/skills/skills-brain/SKILL.md
```

如果 Agent 使用其他目录，将目标替换为其支持的技能路径。重新加载技能后，可以说：

> 使用 skills-brain 帮我打开本地技能脑图，并查看设计类技能的相似能力。

应用源码仍需按「快速安装」单独安装。不要把整个 `node_modules` 复制进技能目录。

只安装 `SKILL.md` 可以指导启动和浏览，但不会注册五个 MCP 工具；完整 v0.3 集成请使用 `npm run setup`。

## 配置

当前配置集中在 [`server/skills.mjs`](server/skills.mjs)。修改后本地开发服务会重新加载。

### 本地目录

默认扫描当前用户主目录下的：

```text
~/.agents/skills
~/.codex/skills
~/.codex/plugins/cache
```

可以修改 `roots` 数组，增加其他 Agent 的技能目录或项目内目录，例如 `path.join(homedir(), '.claude/skills')`。不要添加包含无关文件的整个主目录。

扫描最多深入 9 层，跳过 `.git`、`node_modules`、`references`、`scripts`、`assets` 等目录。插件缓存中可能有未启用的技能，因此扫描结果不等于某个 Agent 当前会话的启用列表。内容完全一致的技能合并显示，保留先扫描到的路径。当前不递归跟随目录符号链接。

### 网络来源

默认读取：

- [anthropics/skills](https://github.com/anthropics/skills)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)

可以修改 `repositories` 数组，使用 `owner/repository` 格式。当前读取 `main` 分支，每个来源最多 60 个 `SKILL.md`；结果保存在进程内存中 1 小时，重启清除缓存。刷新按钮在缓存有效期内会复用缓存。

匹配使用**英文关键词交集 + 同领域加权**，不是 embedding 模型，也不是全网搜索。共同关键词说明关联依据，不代表质量评分或安全背书。未达到阈值时不显示推荐。

### 端口

默认端口为 5173。如被占用：

```sh
npm run dev -- --port 5174
```

使用终端输出的地址。服务仅监听 `127.0.0.1`；不要将其暴露到公网。

## 数据与权限

- 本地文件只读；应用不安装、修改或执行技能内容。
- 本地技能名称、描述和原文通过本机接口交给浏览器，不上传至 GitHub。
- 网络请求仅下载已配置的公开仓库目录和技能文件；GitHub 能看到正常请求信息，如 IP。
- 文件夹按钮只接受扫描结果中的技能 ID，以独立参数调用系统文件管理器，不接受任意路径或 Shell 命令。
- 文件夹打开接口要求同源 JSON POST；本地读取接口拒绝跨源请求。
- 打开外部来源链接会跳转至对应 GitHub 页面。

## 常见问题

**没有找到技能？** 检查 `roots` 指向实际技能目录，文件名应为 `SKILL.md`，再点击同步。缺失或无权限目录会在底部状态显示读取错误。

**网络技能为 0 或只有部分结果？** 检查网络；匿名 GitHub API 有配额，稍后刷新。离线时仍可查看本地技能。

**点击文件夹没有反应？** 查看界面提示。Linux 需要图形桌面和 `xdg-open`。SSH、容器或无桌面服务环境不能保证打开文件管理器。

**缩放后找不到节点？** 点击右下角环形箭头「重置视图」。选中标签右侧的 × 会取消单个技能/类别筛选。

**能部署到云端吗？** 当前版本需要本机文件系统和桌面能力。`npm run build` 验证前端编译，不会生成可在云端扫描你电脑的服务。完整应用使用 `npm start` 运行。

## 开发

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

核心结构：

```text
app/page.tsx             脑图、选择状态、两侧面板与手势
app/globals.css          主题、布局与动画
server/skills.mjs        扫描、匹配来源读取、本地接口和文件夹打开
server/mcp.mjs           供 Codex 调用的只读 stdio MCP
scripts/manage.mjs       安装、更新、诊断与卸载生命周期
server/*.test.mjs        扫描、匹配、文件夹调用和 MCP 协议测试
components/ui/          可访问的基础组件
skills/skills-brain/    Plugin 内置 Agent Skill
SKILL.md                独立 Agent Skill 入口
```

技术栈：React 19、TypeScript、Vinext / Vite、Tailwind CSS、Base UI、Lucide、react-resizable-panels。浏览器交互和不同操作系统的文件管理器行为仍建议在目标设备上验证。

## CI 模板

[`docs/ci-workflow.yml`](docs/ci-workflow.yml) 包含自动安装依赖、类型检查、测试和构建配置。当前尚未启用：首次推送所用令牌不具备 GitHub `workflow` 权限。具备权限的维护者可将该文件复制到 `.github/workflows/ci.yml` 并提交，即可启用 GitHub Actions。

## 贡献与许可证

欢迎通过 [Issues](https://github.com/YuY-QK/skills-brain/issues) 提交问题，或参考 [CONTRIBUTING.md](CONTRIBUTING.md) 提交改进。

项目采用 [MIT License](LICENSE)。依赖及远程技能保留各自的许可证；本仓库不重新分发你的本地技能或远程技能正文。
