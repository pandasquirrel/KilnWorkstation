# KilnWorkstation — fork 约定

本仓库是 [stablyai/orca](https://github.com/stablyai/orca) 的个人衍生版（非官方），
每日经 `vendor-sync` 自动跟随上游。上游共用的规则见 [AGENTS.md](./AGENTS.md)，
这里只写本 fork 特有的约定。

## 语言

对话回复用中文；提交信息沿用仓库现有英文风格（便于与上游历史对照），
PR 描述可用中文；代码注释沿用仓库现有语言。

## 上游跟随

- 改 vendor 机制前先读 [`scripts/vendor/README.md`](./scripts/vendor/README.md)。
- 吸收 PR（head = `vendor/sync-latest`）：agent 负责把 CI 跑绿并说明结论，
  **必须由人审阅后合并**，不得自行 merge。
- 只用 merge commit，禁止 rebase / squash（保留 SHA，rerere 才能复用解法）。
- 深改上游代码处标 `// FORK: <原因>`（YAML/Markdown 用 `<!-- FORK: ... -->`），
  供每月 `git grep -n "FORK:"` 审计；footprint 目标只减不增。
- **不要改 `AGENTS.md` 与 `docs/agents-md-refs/`**：上游 30 天改 26 次，
  写入会在吸收时持续冲突。fork 约定一律放本文件。

## 仓库设置变更要先问

禁用/启用 workflow、取消 CI run、改分支保护或仓库可见性等，
必须先取得用户明确同意再执行。

## CI 排障

- 下载 runner 日志用 `curl -sSL -H "Authorization: Bearer $(gh auth token)"`，
  `gh api .../logs` 直接输出到 stdout 会被截断。
- 给工具传递 runner 内置变量（`GITHUB_EVENT_NAME` 等）用 `env -u NAME`，
  **不要用 step 级 `env:` 覆盖**——覆盖值不会进入子进程（见 PR #10）。
- 定时 vendor-sync 会延迟数小时；上游无新提交时不开 PR 属正常。

## 导航

- 分支拓扑、吸收 SOP、冲突红线、footprint 审计：`scripts/vendor/README.md`
- 上游通用规范：`AGENTS.md`
