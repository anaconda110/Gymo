# ADR 0004：发布工程与版本治理（轻量）

日期：2026-10-07
状态：已接受

## 背景

Android 端曾在 Windows 机器上打出签名 release 包（v1.1.0，versionCode 2），
但签名配置（含明文密码）只存在于该工作区的未提交改动与 git stash 中——这是
本项目最脆弱的一份资产：仓库里没有，CI 里没有，换一台机器即失效。

同时存在三套并行版本号：仓库 tag（v1.1.0 / v1.2.0）、Android `versionName`
（仓库内 1.0，Windows 工作区未提交的 1.1.0）、Web `package.json`（0.1.0）。
且 `applicationId` 仍是占位的 `com.example.gymo`。

定位前提（用户确认）：项目为「自用 + 开源分享」，不上架 Play；主要使用端
是 Android。

## 决策

1. **版本治理**：仓库 tag `vX.Y.Z` 延续既有序列，作为多端仓库的快照标记；
   Android `versionCode/versionName` 对齐最近一次真实发布（2 / 1.1.0），
   每次发版随之递增；Web 版本以 `package.json` 为准，不与仓库 tag 强绑。
2. **签名**：`apps/android/app/build.gradle.kts` 从 gitignored 的
   `apps/android/keystore.properties` 读取签名参数（模板
   `keystore.properties.example` 已入库）；该文件不存在时 release 构建产出
   未签名 APK。真实密钥与密码只存在于持有它们的机器（当前为 Windows 工作区
   `D:\Program\05.android\Gymo` 及其 stash），绝不进入版本库。
3. **CI 发布物**：GitHub Actions 仅构建 debug APK 并作为 artifact 上传；
   签名 release 包在持有密钥的机器上手动构建。
4. **applicationId**：保留 `com.example.gymo`——不计划上架 Play；改动会
   破坏既有安装的升级路径，而当前收益为零。

## 取舍与代价

- **密钥不上 CI**：GitHub Secrets 方案（CI 直出签名包）技术上成熟，但需要
  把签名密钥上传到 GitHub，属于需明确授权的动作；自用规模下「在密钥所在
  机器手动签名」成本可接受。若未来改变：keystore base64 → Secrets →
  构建脚本读环境变量，`keystore.properties` 模式与之兼容，迁移平滑。
- **三套版本号并存**：Android 与 Web 是独立应用，各自版本独立演进是合理的；
  仓库 tag 只标记仓库快照点。代价是谈论版本时需要先说明指哪一端。
- **无签名 CI 产物**：未签名 release APK 无法直接安装，因此 CI 只出 debug
  包；想要签名包必须在本地构建。

## 遗留（需用户自行完成，涉及密钥故不代办）

> **2026-11-18 已解决**，走向见下方「修订」。

把 Windows 工作区 stash 中的签名参数填入 `apps/android/keystore.properties`
（`gymo-release.jks` 实物与明文配置都在那边，本仓库不含其副本），随后该
stash 可弃。填好后的本机 `./gradlew assembleRelease` 即产出可安装的签名包。

## 修订

### 2026-11-18：签名密钥重建

「遗留」一节的前提已不成立：Windows 工作区的口令 stash 消失（`refs/stash`
不存在、fsck 亦无悬挂对象），口令无法取回。经用户明确授权，**重建签名密钥**：

- 新密钥：PKCS12 `gymo-release.jks`（alias `gymo`，RSA 2048，有效期 30 年），
  位于持有密钥的机器 `/home/oraw/keys/`，口令另存于同目录文件（0600）；
  `keystore.properties` 按本文决策 2 配置完成。旧密钥（签署 v1.1.0）退役。
- 跨密钥不能在线升级：已装 v1.1.0 的设备升级到 v1.3.0+ 需卸载重装，数据先
  JSON 备份导出、装新版后导入（信封 v1，见 ADR 0005）。
- 决策 1 的 versionCode 序列延续：v1.3.0 = 3；决策 3（CI 只出 debug 包）
  与决策 4（applicationId 不变）不受影响。
- 同日补发两个历史 Release：v1.1.0 附从旧工作区找回的原始签名 APK
  （SHA-256 `dedc7c33…94a59004`，与 tag 对应的 versionCode 2 / versionName
  1.1.0）；v1.2.0 当时未构建产物，按 issue #2 预案只发 changelog。
