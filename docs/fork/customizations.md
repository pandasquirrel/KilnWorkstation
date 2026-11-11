# Kiln 定制地图与决策记录

本文件是 KilnWorkstation（`stablyai/orca` 的非官方衍生版）相对上游
**全部架构级定制与决策的唯一仓库级索引**。代码里的 `// FORK:` 注释解释
"这行为什么不同"，本文件解释**整体方案、选型理由、吸收风险和挂起项**。

> **维护规则（强制）**：凡是架构变动、方案选型、关键决策——包括"决定不做
> 什么"和挂起项——必须在**同一个 PR** 内更新本文件（对应章节 + 文末决策
> 日志）。仅写代码注释不算落地。此规则随仓库走，换机、换人、换 agent
> 均生效。例行跟随上游的吸收不需要新决策日志，但暴露了新的吸收高风险触点
> 时要补第 7 节。

最后更新：2026-11-11（吸收上游至 v1.4.256 后）

## 1. 总览

| #   | 区域                            | 性质                       | 触点规模                                        |
| --- | ------------------------------- | -------------------------- | ----------------------------------------------- |
| 1   | 品牌与身份（Kiln / 海狸）       | 产品个性化                 | 最大，~25 文件                                  |
| 2   | 终端侧会话（Side Conversation） | **唯一的自有产品功能**     | 3 源文件 + 测试                                 |
| 3   | 与官方 Orca 共存的隔离层        | 安装/运行时基建            | ~15 文件                                        |
| 4   | 更新策略                        | 禁用官方更新，预留自建通道 | 4 文件                                          |
| 5   | vendor 跟随机制                 | 每日吸收上游的自动化       | `.github/workflows/vendor-*`、`scripts/vendor/` |
| 6   | 测试守护                        | 保留/新增的 FORK 测试      | 19 个测试文件                                   |

深改点统一标 `// FORK: <原因>`（NSIS 用 `; FORK:`，YAML/Markdown 用
`<!-- FORK: -->`），每月用 `git grep -n "FORK:"` 审计，footprint 目标只减不增。

## 2. 品牌与身份

### 2.1 运行时改名（核心架构决策）

**方案：上游 i18n catalog 一字不改，品牌名在翻译收口统一替换。**

- 收口位置：`src/shared/orca-i18n-instance.ts` 工厂的 `translate()`
  （2026-11-03 上游把 main/renderer 两套 i18n 收敛成这个共享工厂；**不要再
  去旧的 main-i18n.ts / renderer i18n.ts 挂改写**）。
- 改写器：`src/shared/fork-brand.ts` 的 `rebrandProductName()`。
- 测试与 e2e 构建用构建常量 `KILN_BRAND_RENAME_DISABLED` 编译掉改写
  （vitest 与 Playwright 断言的是上游原文）；define 在 `electron.vite.config.ts`
  里按 `--mode e2e` 注入，main 与 renderer 两个 build 都要注入。

**为什么这样选**：catalog 与上游逐字一致 → 吸收时新增/修改文案零冲突；
品牌词表只维护 `fork-brand.ts` 一处。代价：品牌逻辑依赖收口位置，上游若
再次重构 i18n 实例，需要重新挂载（见第 7 节）。

### 2.2 身份矩阵

| 维度                           | 值 / 处理                                                                                  | 文件                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| appId（Win）/ bundle id（mac） | `com.kilnworkstation.kiln`（dev: `.dev` 等）                                               | `config/electron-builder.config.cjs`、`src/main/startup/dev-instance-identity.ts`                                                                     |
| Windows AUMID                  | `com.kilnworkstation.kiln`，dev 应用名 `Kiln Dev`                                          | `dev-instance-identity.ts`（含守护测试，上游 #36600 删过，我们保留）                                                                                  |
| 窗口默认标题                   | `Kiln`                                                                                     | `src/main/window/createMainWindow.ts`                                                                                                                 |
| Linux WM class                 | 跟随产品名                                                                                 | 身份/窗口相关文件                                                                                                                                     |
| 托盘                           | 文案/tooltip 用 Kiln；glyph 为 22×22 方形海狸（不是上游 22×14 wordmark），角标布局相应调整 | `src/main/tray/system-tray.ts`、`tray-dev-badge.ts`                                                                                                   |
| 通知标题（含 mobile push）     | Kiln                                                                                       | `src/main/ipc/notification-system-settings-link.ts`、`src/main/runtime/push/push-dispatcher.ts`、`config/scripts/build-notification-status-macos.mjs` |
| macOS 隐私用途描述             | "Kiln allows …" 全套                                                                       | `electron-builder.config.cjs`                                                                                                                         |
| helper / 终端 host bundle      | 带 fork 名（隐私弹窗用户可见）                                                             | `config/scripts/macos-terminal-host-bundle.cjs`、`dev-electron-bundle-identity.mjs`                                                                   |
| launchd 标签                   | fork bundle 身份，与官方 Orca 不互踩                                                       | `src/main/daemon/macos-daemon-job-label.ts`                                                                                                           |
| 图标                           | 海狸：全平台应用图标 + 应用内标志（全彩，不套 invert 滤镜）                                | `src/shared/app-icon.ts`、settings/onboarding/sidebar 等渲染组件、`src/renderer/src/assets/main.css`                                                  |

### 2.3 有意保留的上游身份

- **`orca:` 深度链接协议不改**：已有链接与 OAuth 回调依赖它
  （`src/shared/external-conversation-link.ts` 等按此假设工作）。
- **package.json 的 `name` 保持 `orca`**：安装期差异由 NSIS 钩子收口
  （见 3.1），避免牵动大量以上游包名为前提的脚本与缓存逻辑。
- 文档关联 ProgID `Orca.Markdown` / `Orca.Tabular` 暂不改（见第 8 节挂起项）。

## 3. 与官方 Orca 共存的隔离层

目标：同一台 Windows 机器上，Kiln 与正式版 Orca 可同时安装、同时运行、
数据与窗口互不干扰。2026-11-04 安装实测全项通过。

| 维度                             | Kiln 落点                                    | 实现文件                                                                                                                                                   |
| -------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 安装目录                         | `%LOCALAPPDATA%\Programs\Kiln`               | `config/nsis/orca-installer-hooks.nsh` 顶部 `!undef` 重定义 `APP_FILENAME`/`APP_PACKAGE_NAME`（守护测试 `config/scripts/nsis-install-isolation.test.mjs`） |
| 更新器下载缓存                   | `%LOCALAPPDATA%\Kiln-updater\installer.exe`  | 同上，重定义 `APP_INSTALLER_STORE_FILE`                                                                                                                    |
| userData / 单实例锁              | `%APPDATA%\Kiln`                             | `src/main/startup/configure-process.ts` 打包分支 `app.setPath('userData', …)`，**必须在请求单实例锁之前**                                                  |
| daemon host（Win）               | `%LOCALAPPDATA%\Kiln\daemon-host{-profiles}` | `src/main/daemon/daemon-host-relocation.ts`；NSIS 卸载只 RMDir 自己这两个，绝不删官方 Orca 的副本                                                          |
| daemon 数据根 / XDG（mac/Linux） | fork 自己的根、`~/.kiln`                     | `src/main/orcad/orcad-app-paths.ts`（守护测试是上游 #36894 删掉后我们加回的）                                                                              |
| profiles                         | fork 自己的根                                | orcad 相关                                                                                                                                                 |
| 语音模型共享缓存（Win）          | `%PROGRAMDATA%\Kiln\speech-models`           | `src/main/speech/model-cache-path.ts`（含 ASCII 路径守护测试）                                                                                             |
| 日志目录                         | fork 名称                                    | `src/main/observability/logs-directory.ts`                                                                                                                 |
| macOS TCC 监听                   | 只监听自己的 bundle id 集合                  | `src/main/macos-permissions/macos-tcc-prompt-watch.ts`（含守护测试）                                                                                       |
| CLI 启动器回收                   | `/opt/Kiln` 加入识别列表（旧变体保留）       | `src/main/cli/cli-command-inspection.ts`                                                                                                                   |
| CLI dev 路径（Win）              | `Programs\Kiln Dev\bin`                      | `src/main/cli/cli-install-location.ts`                                                                                                                     |

**单实例隔离原理**：Electron 单实例锁按 userData 路径加锁。两边 userData
分离后，双击 Orca 时官方 Orca 拿自己的锁、开自己的窗口，Kiln 收不到
second-instance 事件。2026-11-04 实测：Kiln 运行中启动 Orca，前台窗口属
`Programs\orca\Orca.exe`；二次启动 Kiln 仅出现瞬时交接 PID。

**打包/安装验收红线**（源于 2026-11-03 的覆盖事故）：只看 exe 名/元数据
不够，必须实际安装后核对安装目录、更新缓存目录、两个 appData 根、锁文件、
快捷方式目标。electron-builder 26 oneClick 的这些路径取 **package.json
`name` 的 sanitizedName**，不看 productName/executableName。

## 4. 更新策略

**决策：Kiln 没有自己的签名发布通道之前，彻底不查询官方更新。**

接受官方"更新"会下载/安装官方 Orca（早期还会直接覆盖 Kiln 安装）。

- 总开关：`src/shared/fork-updates.ts` 的 `FORK_UPSTREAM_UPDATES_ENABLED`
  ——生产 `false`；测试运行时 `true`（上游更新逻辑的测试覆盖保持有效）。
- 三处短路：`updater/lifecycle/updater-setup.ts`（打包后不装配 autoUpdater、
  release feed 指向 fork）、`updater-menu-checks.ts`（手动检查回
  `not-available`，本地构建检查保留）、`updater-scheduling.ts`（后台检查
  立即返回 false）。守护测试：`src/main/updater/updater.fork-updates-disabled.test.ts`。
- 打包 `publish` 指向 `pandasquirrel/KilnWorkstation`
  （`config/electron-builder.config.cjs`）。
- 重新启用的前提：Kiln 自己的签名发布产物 + feed 就绪；届时翻转开关并处理
  挂起项（第 8 节）。

## 5. 终端侧会话（自有功能）

终端面板里把当前 agent 会话**分叉到分屏新 pane 继续对话**；源 pane 保持
原会话唯一写入者（CLI fork 出新 agent id 保证安全）。

- 渲染侧：`src/renderer/src/lib/agent-side-conversation-fork.ts`、
  `src/renderer/src/components/terminal-pane/pane-agent-session-id.ts`、
  `use-terminal-pane-projection.ts`（右键菜单入口 + 不可分叉提示）。
- argv 构造：`src/shared/agent-launch/startup/agent-resume-argv.ts`
  （2026-11-04 起的新路径；上游目录重组频繁，import 路径是吸收高风险点）。
- 新增 i18n 键直接进 en.json（`sideConversation.*` 等），非品牌词不经
  运行时改写。

## 6. vendor 跟随机制

详见 `scripts/vendor/README.md`（分支拓扑、secret、CI 分片、吸收 SOP、
冲突红线、术语表）。要点：每日机器人镜像+开吸收 PR；冲突开
`vendor-conflict` issue；只 merge 不 rebase；吸收 PR 的质量门禁只审 fork
footprint；main 推送跑 4 分片全量 + cross-version；吸收带进来的上游
workflow 自动禁用（只留 vendor-ci/vendor-sync）。

## 7. 吸收高风险触点 checklist

每次解吸收冲突时按此走查（都是实际踩过的）：

1. **i18n 收口**：确认 `rebrandProductName` 仍挂在共享 translate 工厂。
2. **目录重组 + 我方文件**：上游按"owner"重组目录（updater→lifecycle/
   releases/…，browser→guest-lifecycle/…，shared/agent-launch/…）时：
   - 函数体内的 FORK 改动通常被 git 自动保留（rename+modify 三方合并），
     冲突多在 import 段——跟随新路径、修正相对深度即可；
   - **我方新增的测试/文件也要一起搬家并更新 mock 路径**（本次 fork
     updater 测试从 `src/main/` 搬进 `src/main/updater/`）；
   - **fork 自有文件不在上游 rename 集合里，import 不会被自动改**：
     2026-11-05 吸收 v1.4.249 时 `shared/agent-status-types`
     →`agent-status/contracts/…`、`shared/stable-pane-id`
     →`workspace-layout/stable-pane-id`、`shared/ai-vault-types`
     →`ai-vault/contracts/…`，两个侧会话文件的旧路径 import 全靠完整
     `pnpm tc` 才抓到（grep `from '…shared/<旧模块名>` 可提前定位）。
   - **2026-11-11 吸收 v1.4.256 的 owner 重组**：terminal-pane 拆成
     `context-menu/`、`controller/`、`chat/`、`session-fork/`、
     `session-continuation/`、`layout/split/`，`pane-agent-session-id`
     → `lib/agent-session/identity/`；daemon host 模块
     → `daemon/executable-host/windows/`；CI/打包脚本
     → `config/scripts/ci/unit-selection/dependency-graph/`、
     `config/scripts/desktop-distribution/macos/`。侧会话的
     `use-terminal-pane-context-menu`/`use-terminal-pane-projection`
     改动过大，没被识别成 rename（旧文件被上游删除、我方修改留在原地）：
     要把 fork 改动手工并进新 owner 路径（菜单 hook 的
     `onOpenSideConversation`、`chat/use-terminal-pane-chat-projection.ts`
     的菜单 gate）后再删旧文件。
3. **本地验证必须跑完整 `pnpm tc`**（含 renderer 项目），`tc:node` 会漏掉
   渲染侧定制文件的坏 import；随后跑受影响目标测试。
4. **merge commit 前必须 `git add -A`**：index 快照早于后续修复会造成
   "本地绿、CI 红"。
5. **上游"低价值测试清理"删除的文件**：若承载我方身份/路径断言，按
   FORK 保留并加注释（已有先例：dev-instance-identity、orcad-app-paths、
   macos-tcc-prompt-watch）；若被删测试不含我方断言（如 2026-11-05 的
   `pane-agent-session-id.test.ts`，只覆盖上游 id 函数），随上游删除、
   不保留——判据是 `git log <base>..origin/main -- <file>` 有无 fork 提交。
   2026-11-11 又遇批量删除（552 个注册 + 58 个套件）：上游删掉整个
   `TerminalContextMenu.test.tsx` 与 press-and-hold 组件套件，但其中
   含侧会话菜单项与 Kiln bundle domain 断言，于是只迁走这些 FORK 用例
   （到 `context-menu/TerminalContextMenu.test.tsx` 和
   `macos-press-and-hold-default.test.ts` 的 fork domain 用例），
   其余上游用例不保留；保留的测试要跟着 owner 路径搬家。
6. **mobile 工作区**：吸收后 `cd mobile && pnpm install --frozen-lockfile`，
   上游可能加依赖（expo-localization 先例），否则 build:mobile-web 失败。
7. **Electron 小版本升级**：同主版本 ABI 不变时（如 43.8.1→43.8.6，
   ABI 148）`native/*/bin/win32-x64-<abi>/` 可直接复用，
   `ORCA_REUSE_PREPARED_NATIVE_RUNTIME=1` 打包即可。
8. **语义重叠文件**：issue 报告第 2 节每个文件都要人工过一遍，文本能合
   ≠ 行为对。

## 8. 挂起项与触发条件

| 挂起项                                                             | 现状影响                                                 | 什么时候做                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| electron-updater 缓存目录名仍是 `orca-updater`（取 package name）  | 无（更新整体禁用，不访问网络），但与官方版共享缓存目录名 | 自建发布通道时，改自定义 `updaterCacheDirName` 并验证与旧缓存的关系        |
| 文件关联 ProgID 仍是 `Orca.Markdown`/`Orca.Tabular`                | 与官方版共享 OpenWith 注册；卸载一方可能清掉另一方关联   | 扩大分发前决定是否改 Kiln ProgID（`config/nsis/orca-installer-hooks.nsh`） |
| Kiln 自建签名发布 feed                                             | 更新功能关闭中                                           | 有签名产物后翻转 `FORK_UPSTREAM_UPDATES_ENABLED`，发布指向 fork            |
| 冲突自动解的 A/B/C 档方案（rerere 判法入库 + 红线守卫 + draft PR） | 冲突仍需人开 issue 后手工解                              | 用户明确批准后改 vendor-sync 机制（改前必须先问）                          |
| 安装面板版本号显示 1.4.214                                         | 纯展示；上游 main 的 package.json 停在旧版，tag 才跳版   | Kiln 首次自己 cut release                                                  |
| `%APPDATA%\Orca` 里旧 Kiln 混用数据                                | 2026-11-04 起 Kiln 改用 `%APPDATA%\Kiln`，旧数据未迁移   | 如需迁移，写一次性迁移并明确来源数据归属（可能与官方版混在一起，默认不迁） |

## 9. 决策日志

| 日期       | 决策                                                           | 理由                                                     | 载体                                  |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| 2026-10-26 | vendoring 只 merge 不 rebase/squash                            | 保留上游 SHA，rerere 可复用判法                          | `scripts/vendor/README.md`、CLAUDE.md |
| 2026-10-26 | 深改点统一 `// FORK:` 标记，footprint 只减不增                 | 每月可审计，目标是做成扩展点向上游提 PR 后删除           | 全仓库                                |
| 2026-10-28 | 吸收 PR 质量门禁只审 fork footprint（基线=vendor/upstream 尖） | 上游存量 lint 欠账不该挡住吸收；回归归 main 全量通道     | vendor-ci.yml                         |
| 2026-10-31 | 品牌名运行时改写，catalog 保持上游原样                         | 吸收零冲突、词表单点维护                                 | §2.1                                  |
| 2026-10-31 | 保留 `orca:` deep-link scheme                                  | 兼容已有链接/OAuth                                       | §2.3                                  |
| 2026-11-03 | package.json `name` 不改，安装差异用 NSIS `!undef` 收口        | electron-builder 路径全由 name 推导；改名牵动面太大      | §2.3、§3                              |
| 2026-11-03 | 安装隔离必须实测路径，不看元数据                               | 静默安装曾覆盖官方 Orca 程序文件                         | §3 验收红线                           |
| 2026-11-04 | userData/单实例锁固定 `%APPDATA%\Kiln`，旧数据不迁移           | 彻底消除与官方版的锁与数据共用；旧数据可能已与官方版混用 | §3、§8                                |
| 2026-11-04 | 自建 feed 前禁用一切官方更新查询                               | 官方"更新"会装回 Orca，与 Kiln 冲突                      | §4                                    |
| 2026-11-04 | 架构/决策必须随 PR 记入本文件（跨机/跨人生效）                 | 决策只存在个人记忆里会随机器丢失                         | 本文件顶部维护规则                    |
