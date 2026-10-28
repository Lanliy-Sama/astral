# Astral (Tauri + Svelte 5 移植版)

将 [Astral](https://github.com/ldoubil/astral)（Flutter + Rust/EasyTier 的 P2P 联机工具）的**前端**完整移植到 **Tauri 2 + Svelte 5 + TypeScript** 技术栈，目标是 GUI 界面与功能与原版完全一致，用户无法体感出变化。

## 移植范围一览

| 原 Flutter 模块 | 移植后 (Svelte 5) | 说明 |
|---|---|---|
| `lib/app.dart` + 主题 | `src/App.svelte` + `src/lib/theme/scheme.ts` | Material 3 `colorSchemeSeed` 色板用 `@material/material-color-utilities` 的 TonalSpot 方案逐角色复刻（与 Flutter `ColorScheme.fromSeed` 输出完全一致），MiSans 字体、亮/暗/跟随系统、19 色主题选择器 + HSV 自定义色 |
| `main_screen` / `left_nav` / `bottom_nav` / `status_bar` | `src/features/shell/*` | 宽>480 桌面布局（80px 左侧导航 + 36px 状态栏 + 窗口控制），≤480 移动布局（底部导航），IndexedStack 页面保活，渐变标题、圣诞彩蛋、窗口拖动 |
| `home/*` | `src/features/home/*` | 用户信息卡（用户名/房间选择/虚拟IP+DHCP）、快捷网络配置、一言（真实 API）、关于卡（版本比较+新版本箭头）、三态连接按钮（尺寸/颜色/图标旋转/15s 进度条动画）、房间选择弹窗（CanvasJump）、Npcap 守卫 |
| `rooms/*` | `src/features/rooms/*` | 房间卡片（选中态 HSL 亮度背景）、添加/编辑/删除、分享（gzip+base64url 分享码、`astral://room?code=` 链接、高级选项、网络配置确认导入）、排序 Sheet、房间设置 Sheet、三种用户卡（简约/详细/列表，含 NAT 双显示体系、延迟丢包配色、流量统计、连接路径）、网络拓扑图（点阵网格、贝塞尔连线+粒子动画、确定性轨道布局、平移缩放、图例） |
| `servers/*` | `src/features/servers/*` | 服务器卡片（状态色条 30s 周期检测、拖拽排序、屏蔽服务器 `***`）、添加/编辑对话框（11 种协议开关） |
| `nat_test` / `tools` | `src/features/nat` / `tools` | NAT 类型检测（进页自动测试、IPv4/IPv6 双结果、类型配色与描述）、工具页（魔法墙仅 Windows 显示） |
| `magic_wall/*` | `src/features/magicwall/*` | 魔法墙（引擎控制、规则组/规则 CRUD、规则描述算法、非 Windows 平台禁用+警示、底部弹层/桌面弹窗自适应） |
| `settings/*` | `src/features/settings/*` | 设置主页 + 全部子页：自启动、软件设置（列表样式/重试次数/减少动画）、更新设置（GitHub 检查更新、下载加速测速、版本信息）、日志（复制/清空/单条复制/滚到底）、历史版本（astral.fan/downloads.json）、高级网络设置（协议/加密联动MTU/SOCKS5端口）、VPN 网段（Android）、监听列表、端口白名单 |
| `core/states` (signals) | `src/lib/core/states/index.svelte.ts` | 15 个 State 全部映射为 Svelte 5 runes（`$state`/`$derived`），字段、默认值与原版一一对应 |
| `core/services` | `src/lib/core/services/*` | ServiceManager 组合根、连接编排（15s 超时、1s 轮询、自动重试、激活服务器标记）、防火墙聚合、GitHub 更新检查、镜像测速 |
| Isar 数据库 | `src/lib/core/storage/storage.ts` | localStorage 持久化，集合语义（自增 id、sortOrder、单例 id=1）与默认种子（默认房间 6 位随机号、`[小探][可中转A]` 服务器、屏蔽列表）与 Isar DAO 对齐 |
| easy_localization | `src/lib/i18n/*` | zh/en 双语，回退 zh，`{placeholder}` 插值，持久化语言选择 |

> 原项目房间模块/魔法墙/设置页大量**硬编码中文**（未走 i18n），移植版原样保留，保证界面逐像素一致。

## 架构与后端桥接

```
┌────────────────────────── Svelte 5 前端 (本工程) ──────────────────────────┐
│  features/* (页面)  →  core/states (runes)  →  core/services (业务编排)    │
│                                              ↘  core/bridge (统一后端接口)  │
└──────────────────────────────────────────────────┬────────────────────────┘
                          Tauri IPC (invoke)       │  浏览器直接运行时
┌──────────────────────────────────────────────────┴────────────────────────┐
│  src-tauri/src/commands.rs  ←签名逐一对齐原 rust/src/api/** (FRB 绑定)     │
│   ├─ 默认: 内置确定性 mock (驱动完整 UI 流程: 连接/节点/延迟/NAT/魔法墙)     │
│   └─ real-backend feature: 直连原工程 rust/ crate (EasyTier 核心)          │
└───────────────────────────────────────────────────────────────────────────┘
```

- **纯浏览器运行**（`npm run dev`）：自动回退 TS MockBackend，可完整体验连接、房间成员、拓扑图、NAT 测试等全部 UI 行为。
- **Tauri 运行**（`npm run tauri dev`）：调用 Rust 命令；默认 Rust 侧同样是 mock，**接入真实 EasyTier 核心只需**在 `src-tauri/Cargo.toml` 中打开 `rust_lib_astral` 路径依赖，并把 `commands.rs` 中各函数体替换为对原 API 的直接调用（函数签名已对齐，注释中标明了原函数名）。

## 快速开始

```bash
npm install

# 浏览器开发 (纯前端 + Mock 后端)
npm run dev

# 生产构建 (前端)
npm run build

# Tauri 桌面应用 (需要 Rust 工具链)
npm run tauri dev
npm run tauri build
```

## 目录结构

```
├── src/
│   ├── App.svelte                 # MaterialApp 等价物
│   ├── app.css                    # M3 排版/阴影/涟漪/滚动条 全局样式
│   ├── assets/fonts/              # MiSans + Material Icons (woff2)
│   ├── lib/
│   │   ├── theme/scheme.ts        # M3 TonalSpot 色板 → CSS 变量
│   │   ├── i18n/                  # zh/en
│   │   ├── ui/                    # M3 组件库: Button/Switch/TextField/Dialog/
│   │   │                          #   Menu/Dropdown/Checkbox/FAB/Progress/
│   │   │                          #   Segmented/ExpansionTile/BottomSheet/
│   │   │                          #   SnackBar + ripple/tooltip actions
│   │   ├── core/
│   │   │   ├── models/types.ts    # Room/ServerMod/KVNodeInfo/FlagsC/...
│   │   │   ├── states/            # 15 个 State (runes)
│   │   │   ├── services/          # ServiceManager/连接编排/更新服务
│   │   │   ├── storage/           # Isar 语义持久化
│   │   │   └── bridge/            # Tauri IPC + MockBackend
│   │   ├── utils/                 # 随机名/分享码(gzip+base64url)/NAT配色/...
│   │   └── platform.ts            # 平台检测 (对应 Platform.is*)
│   └── features/
│       ├── shell/                 # 主屏/状态栏/导航/主题选择器/路由栈
│       ├── home/  rooms/  servers/  tools/  nat/  magicwall/  settings/
└── src-tauri/
    ├── tauri.conf.json            # 960×540 无边框窗口 + 托盘 (对应原 window_manager)
    └── src/{main,lib,commands,tray}.rs
```

## 与原版的已知差异

1. **持久化**：Isar → localStorage（Tauri WebView 持久存储，数据模型/默认值语义一致）。
2. **后端**：默认 mock（UI 全流程可用）；真实 EasyTier 接入点已留好（见上）。
3. **平台能力**：Android VPN/通知/小组件、系统托盘右键细节等平台专有行为按原逻辑做了平台门控（非对应平台自动隐藏或禁用）。
4. **字体注册怪癖**：原 pubspec 将 MiSans-Demibold 设为默认字重、MiSans-Regular 映射到 w800，本移植按同语义注册（`100-799 → Demibold`，`800-900 → Regular`）。

## 许可

遵循原项目 [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) 许可。
