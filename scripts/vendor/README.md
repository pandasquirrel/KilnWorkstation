# 上游跟随机制（vendoring）运维手册

本目录与 `.github/workflows/vendor-*.yml` 构成 Orca 定制版跟随官方
`stablyai/orca` 的机制。原则：**跟踪全自动、吸收人工审、只 merge 不 rebase、
定制 footprint 只减不增。**

## 名词速查（非工程背景也能懂）

| 名词                | 大白话                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 仓库（repo）        | 装着整个软件全部代码与历史的文件夹；本仓库是公开仓库 `pandasquirrel/KilnWorkstation`（原 `orcaZero`，2026-10 改名） |
| Git                 | 管代码历史的"时光机"：记录每次改动，可回到任意旧版本                                                                |
| 提交（commit）      | 一次存盘，带唯一编号（如 `067c6147643`）和说明；软件历史就是一长串存盘                                              |
| 分支（branch）      | 同一代码的平行世界；主线叫 `main`，开新分支实验不影响主线                                                           |
| tag                 | 给某个提交贴的"正式发布版 vX.Y.Z"贴纸                                                                               |
| 上游 / fork         | 上游 = 源头官方仓库 `stablyai/orca`；fork = 从它派生的本仓库                                                        |
| **PR**              | "我改了一条分支，请检查后并入主线"的申请单；可看改动、讨论、跑自动检查、点按钮合并                                  |
| merge（合并）       | 把一条分支的改动并回主线；两边都改了同一行且写法不同 = **冲突**，需人裁决                                           |
| rebase / squash     | 两种改写历史的合并方式；本机制**故意不用**，只用 merge 保留原历史                                                   |
| keep-ours           | 解冲突时"保留自己这版"；CODEOWNERS 的固定判法                                                                       |
| issue（工单）       | 仓库的意见箱；机器人用带 `vendor-conflict` 标签的 issue 报告冲突                                                    |
| CI                  | 推送后云端自动编译、跑测试的"机器人员工"；全绿才能合并                                                              |
| workflow（Actions） | 定义机器人定时任务的脚本，在 `.github/workflows/`                                                                   |
| 镜像分支            | 与上游内容完全一致、每日强制对齐的分支，只当"官方最新内容"的传真件                                                  |
| PAT                 | 机器人推代码用的密码钥匙（fine-grained token），有有效期，需定期换                                                  |
| typecheck           | 不运行软件、只读代码查"零件接口是否对得上"的机器审查                                                                |
| rerere              | Git 的"记住冲突判法"功能；CODEOWNERS 同处再冲突时自动套用 keep-ours                                                 |
| 物化（materialize） | 跨版本测试把旧发布版的**完整源码树**下载到磁盘上当真实对端跑                                                        |
| footprint           | 本地相对上游的改动总量；深改点统一标 `// FORK:`，目标只减不增                                                       |

## 分支

| 分支                 | 写入者      | 说明                                       |
| -------------------- | ----------- | ------------------------------------------ |
| `vendor/upstream`    | 机器人      | 官方 main 纯镜像，force 快进，禁止承载定制 |
| `vendor/stable`      | 机器人      | 官方最新 stable tag 镜像，发布基线         |
| `vendor/sync-latest` | 机器人      | 每日吸收 PR 的分支                         |
| `main`               | 人（经 PR） | 集成分支，受保护，只允许 merge commit      |
| `vendor/init-backup` | —           | 建仓时 GitHub 初始提交的备份               |

## 自动化产物

- 无冲突：刷新 PR `vendor: absorb upstream through <tag>`，正文是
  `.vendor-report.md`（未吸收提交数、双方同改文件清单及相关定制提交）。
- 有文本冲突：不开 PR，改为创建带 `vendor-conflict` 标签的 issue。
- PR 门禁：`vendor-ci` 跑 `pnpm tc`、变更检查、变更区测试。吸收 PR
  （head = `vendor/sync-latest`）有专门语义：变更检查的基线不是 main
  而是 `vendor/upstream` 镜像尖，即**只审 fork footprint**——否则上游
  存量 lint 欠账（早于规则落地的行、需要单独 mobile 安装的类型告警）
  会被整段吸收 diff 误判为"新增"而挡门；变更区测试在吸收 PR 上跳过，
  回归由合并后的 main 全量通道负责。普通功能 PR 不受影响。main 推送后
  跑两条测试通道（单 runner 跑不完，单片 60 分钟上限）：
  - `full-test`：4 分片常规单测，`ORCA_BALANCE_UNIT_SHARDS=1`
    （沿用上游 `UNIT_EXCLUDE`：不含跨版本、live-PTY、electron 探针测试）；
    fork 追加的排除项以 `// FORK:` 标注在
    `config/scripts/ci-unit-files.mjs`（4 个审计上游 pr.yml/workflow 清单
    的元测试 + 1 个依赖定制 runner 镜像前提的 node-gyp 断言），
    吸收上游时在此处解冲突
  - `cross-version-test`：跨版本兼容测试，单 runner 整目录运行（与上游
    一致，分片会在清理后留下游离帧 rejection）；blob:none 部分克隆 +
    用 Node 跑（不能用 run-vitest 的 bun 通道，物化的发布源码依赖
    `node:module` 的 stripTypeScriptTypes）

测试环境依赖（缺了会一片红，但不是回归）：

- Bun（`config/.bun-version` 锁定）：部分测试直接 spawn `bun`
- 磁盘：跨版本测试会物化多份完整发布树，job 先删除 runner 自带的
  Android/Go/dotnet/Docker 等无用工具链（约 20GB）
- 上游历史 refs：`cross-version-wire` 测试要解析已发布 tag/SHA，
  job 会 `git fetch upstream --tags`
- live-PTY、electron 探针等测试不跑：上游用定制 Blacksmith runner 与
  打包 job 串行执行，标准 GitHub runner 环境不满足；如需可手动 dispatch。

手动触发：`gh workflow run vendor-sync.yml -R pandasquirrel/KilnWorkstation`

### 必需 secret：`VENDOR_SYNC_TOKEN`

GitHub Actions 自带的 GITHUB_TOKEN 无权推送含 `.github/workflows/` 变更的
引用，而镜像分支包含完整上游树。需要一把 fine-grained PAT 存入仓库 secret：

- Repository access：仅 `pandasquirrel/KilnWorkstation`（改名前建的 token 仍有效，仓库 ID 不变）
- Permissions：Contents **Read and write**、Workflows **Read and write**、
  Pull requests **Read and write**（吸收分支带上游 workflow 改动，
  GITHUB_TOKEN 建/改这种 PR 会 403，且它建的 PR 不触发 CI）、
  Metadata Read-only（自动附带）
- 建议设过期时间并在日历上标注轮换

写入：仓库 Settings → Secrets and variables → Actions → New repository secret，
名称 `VENDOR_SYNC_TOKEN`。

## 每周吸收流程

1. 打开 absorb PR，阅读第 2 节「语义重叠」文件清单（文本能合并 ≠ 行为兼容）。
2. 本地验证：

   ```bash
   git fetch origin
   git checkout vendor/sync-latest
   pnpm install --frozen-lockfile
   pnpm tc
   pnpm run check:code-quality:changed
   pnpm run verify:rpc-params-catalog
   pnpm run verify:acp-protocol
   ```

3. 走查 UI 定制区域（后台启动，遵守 AGENTS.md：`ORCA_BACKGROUND_LAUNCH=1`）。
4. 以 **merge commit** 合并；merge-base 自动前进，无需维护标记文件。

## 冲突处理

- `*.generated.ts` 冲突：`git checkout --theirs` 后重新生成，禁止手改。
- 品牌/feed/图标冲突：保留己方，确认上游未新增必需字段。
- `app-shell/`、`right-sidebar/` 深改：阅读上游对应 PR 的意图后手工对齐。
- 红线（升级讨论，不要默默解冲突）：`protocol-version.ts`、daemon 协议号、
  `rpc-contract/` 不兼容改动、profile-state/journal 存储迁移、experimental 功能重写。

## 每月 footprint 审计

```bash
git diff --stat vendor/stable...main -- ':!*.generated.ts'
git grep -n "FORK:"
```

深改点统一标注 `// FORK: <原因>；上游PR: <url>`。目标：把深改改写成通用扩展点
向上游提 PR，合并后删除本地深改，让 footprint 只减不增。

## 本地生成报告

```bash
git fetch upstream && bash scripts/vendor/sync-report.sh && cat .vendor-report.md
```
