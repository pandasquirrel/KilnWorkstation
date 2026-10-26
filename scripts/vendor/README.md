# 上游跟随机制（vendoring）运维手册

本目录与 `.github/workflows/vendor-*.yml` 构成 Orca 定制版跟随官方
`stablyai/orca` 的机制。原则：**跟踪全自动、吸收人工审、只 merge 不 rebase、
定制 footprint 只减不增。**

## 分支

| 分支 | 写入者 | 说明 |
|---|---|---|
| `vendor/upstream` | 机器人 | 官方 main 纯镜像，force 快进，禁止承载定制 |
| `vendor/stable` | 机器人 | 官方最新 stable tag 镜像，发布基线 |
| `vendor/sync-latest` | 机器人 | 每日吸收 PR 的分支 |
| `main` | 人（经 PR） | 集成分支，受保护，只允许 merge commit |
| `vendor/init-backup` | — | 建仓时 GitHub 初始提交的备份 |

## 自动化产物

- 无冲突：刷新 PR `vendor: absorb upstream through <tag>`，正文是
  `.vendor-report.md`（未吸收提交数、双方同改文件清单及相关定制提交）。
- 有文本冲突：不开 PR，改为创建带 `vendor-conflict` 标签的 issue。
- PR 门禁：`vendor-ci` 跑 `pnpm tc`、变更检查、变更区测试；main 推送后
  跑两条测试通道（单 runner 跑不完，单片 60 分钟上限）：
  - `full-test`：4 分片常规单测，`ORCA_BALANCE_UNIT_SHARDS=1`
    （沿用上游 `UNIT_EXCLUDE`：不含跨版本、live-PTY、electron 探针测试），
    使用 `scripts/vendor/vitest-fork-unit.config.ts` 追加排除两个审计
    上游 workflow 清单的测试（fork 里这些 workflow 已被替换）
  - `cross-version-test`：2 分片跨版本兼容测试，独立 runner

测试环境依赖（缺了会一片红，但不是回归）：

- Bun（`config/.bun-version` 锁定）：部分测试直接 spawn `bun`
- 磁盘：跨版本测试会物化多份完整发布树，job 先删除 runner 自带的
  Android/Go/dotnet/Docker 等无用工具链（约 20GB）
- 上游历史 refs：`cross-version-wire` 测试要解析已发布 tag/SHA，
  job 会 `git fetch upstream --tags`
- live-PTY、electron 探针等测试不跑：上游用定制 Blacksmith runner 与
  打包 job 串行执行，标准 GitHub runner 环境不满足；如需可手动 dispatch。

手动触发：`gh workflow run vendor-sync.yml -R pandasquirrel/orcaZero`

### 必需 secret：`VENDOR_SYNC_TOKEN`

GitHub Actions 自带的 GITHUB_TOKEN 无权推送含 `.github/workflows/` 变更的
引用，而镜像分支包含完整上游树。需要一把 fine-grained PAT 存入仓库 secret：

- Repository access：仅 `pandasquirrel/orcaZero`
- Permissions：Contents **Read and write**、Workflows **Read and write**、
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
