package com.example.gymo

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * 守护「数据只留在本设备」这一产品承诺的测试。
 *
 * Android 的自动备份默认会把应用数据库上传到用户的云备份；一旦有人把
 * allowBackup 改回 true（IDE 模板的默认值就是 true），数据就会离开设备，
 * 与本项目的核心承诺冲突。这条断言让这种回归无法悄悄合入。
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PrivacyConfigTest {

    @Test
    fun `应用不允许系统云备份`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appInfo = context.applicationInfo
        val flags = appInfo.flags
        val allowBackup = (flags and android.content.pm.ApplicationInfo.FLAG_ALLOW_BACKUP) != 0
        assertFalse(
            "allowBackup 必须为 false：训练数据不得被系统云备份上传（见 README「数据与隐私」）",
            allowBackup
        )
    }

    @Test
    fun `应用不声明任何网络权限`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        // 读 manifest 的 requestedPermissions（编译期信息，与运行时 packageManager 查询无关）
        val requested = context.packageManager
            .getPackageInfo(context.packageName, 0)
            .requestedPermissions
            ?.toList()
            .orEmpty()
        val networkPerms = requested.filter { it.contains("INTERNET") }
        assertEquals("不应申请网络权限（纯本地承诺）：$networkPerms", emptyList<String>(), networkPerms)
    }
}
