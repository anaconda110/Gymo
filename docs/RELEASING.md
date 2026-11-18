# 发布手册（RELEASING）

适用对象：本项目唯一的维护者。目标是把「发布」变成一条可重复执行的流程，
而不是一次性的手工操作。

## 前置：一次性配置签名（在持有密钥的机器上）

签名密钥与其口令只存在于持有它们的机器上。**这些内容永不进入版本库。**

**当前状态（2026-11-18）**：持有密钥的机器为 WSL 工作区。签名库为重建后的
`/home/oraw/keys/gymo-release.jks`（PKCS12，alias `gymo`，RSA 2048，有效期
30 年），口令在同目录 `gymo-keystore-password.txt`（0600）；`apps/android/keystore.properties`
已配置完成并指向该密钥库。本机 `./gradlew assembleRelease` 即产出签名包，
`keystore.properties` 不存在时（如 CI）产出未签名包。

换到新机器发布时：复制 `gymo-release.jks` 与口令过去（或重建
`keystore.properties` 指向其路径），确认 `./gradlew assembleRelease` 产物
签名可验证后继续。

> 密钥遗失 = 已发布版本无法在线升级（Android 不允许换签名）。请在离线介质上
> 保留一份 `gymo-release.jks` 备份，口令另行保管、不要与密钥放在同一处。

> 历史注记：v1.1.0 由旧密钥（Windows `D:\Program\05.android\Gymo\gymo-release.jks`）
> 签署，其口令原记载于该工作区的 git stash——stash 已消失、无法取回，故
> 2026-11-18 经授权重建了新密钥（决策见 ADR 0004 修订）。旧签名版本升级到
> 新签名版本需卸载重装，数据先用 JSON 备份导出、装新版后导入。

## 每次发布

1. **确认状态**：`main` 上 CI 为绿，工作树干净。

2. **改版本号**：编辑 `apps/android/app/build.gradle.kts`，`versionCode` 递增
   （整数，每次发布 +1），`versionName` 改为新版本（如 `1.2.0`）。提交：

   ```bash
   git commit -am "chore(android): bump version to 1.2.0"
   git push
   ```

3. **更新 CHANGELOG**：在 `CHANGELOG.md` 顶部把「未发布」小节改为本次版本与
   日期，并开一个新的空「未发布」小节。随版本号一起提交。

4. **打 tag 并推送**（tag 指向已含版本号与 changelog 的提交）：

   ```bash
   git tag -a v1.2.0 -m "Gymo v1.2.0"
   git push origin v1.2.0
   ```

5. **构建签名产物**（在持有密钥的机器上）：

   ```bash
   cd apps/android
   ./gradlew clean assembleRelease
   # 产物：app/build/outputs/apk/release/app-release.apk
   ```

6. **发布 Release**，附上 APK 与本版 changelog：

   ```bash
   gh release create v1.2.0 \
     apps/android/app/build/outputs/apk/release/app-release.apk \
     --title "Gymo v1.2.0" --notes-file - <<'NOTES'
   （粘贴 CHANGELOG 中本版小节）
   NOTES
   ```

7. **安装验证**：在真机上安装 Release 里的 APK——升级安装应保留数据；打开
   后手动过一遍核心流程（开始训练 → 记录一组 → 查看历史）。

## Web 端（apps/web）

Web 没有「安装包」：`npm run build` 的 `dist/` 即产物。当前未部署到任何
托管服务；若将来需要在线可用版本，GitHub Pages 是最低成本的选择——但那是
一项独立决策（会引入公开 URL 与缓存策略问题），届时先写 ADR。

## 版本号在哪

| 位置 | 含义 |
|---|---|
| `apps/android/app/build.gradle.kts` 的 `versionCode/versionName` | Android 应用版本，用户可见 |
| 仓库 tag `vX.Y.Z` | 仓库快照标记，与 Android 版本号同步递增 |
| `apps/web/package.json` 的 `version` | Web 端版本，独立演进 |

三套版本号并存是有意的：两端是独立应用，各自发布节奏不同；仓库 tag 标记
的是「两端代码的某个组合状态」。
