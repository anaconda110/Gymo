# 发布手册（RELEASING）

适用对象：本项目唯一的维护者。目标是把「发布」变成一条可重复执行的流程，
而不是一次性的手工操作。

## 前置：一次性配置签名（在持有密钥的机器上）

签名密钥（`gymo-release.jks`）与其口令只存在于持有它们的机器上——当前是
Windows 工作区的 `D:\Program\05.android\Gymo`（密钥本体在仓库根，口令在该
工作区的 git stash 里）。**这些内容永不进入版本库。**

在该机器上：

1. 克隆/更新仓库，进入 `apps/android/`。
2. 复制模板并填入真实值：

   ```bash
   cp keystore.properties.example keystore.properties
   # 编辑 keystore.properties：storeFile / storePassword / keyAlias / keyPassword
   # storeFile 相对 apps/android/ 解析，例如 ../../gymo-release.jks 或绝对路径
   ```

3. 验证签名可用：

   ```bash
   ./gradlew assembleRelease
   ls app/build/outputs/apk/release/app-release.apk
   ```

   `keystore.properties` 存在时自动启用 release 签名；不存在时产出未签名包。
   确认无误后，Windows 侧那份只含签名配置的 stash 即可弃用。

> 密钥遗失 = 已发布版本无法在线升级（Android 不允许换签名）。请在离线介质上
> 保留一份备份，口令另行保管。

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
