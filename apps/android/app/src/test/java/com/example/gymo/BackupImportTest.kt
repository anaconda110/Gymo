package com.example.gymo

import com.example.gymo.data.BackupManager
import com.example.gymo.data.BackupCodec
import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * 跨端往返测试：读取 **Web 端真实导出**的备份（apps/android/app/src/test/resources/
 * web-backup-v1.json，由 Web 的 exportJSON 生成），在 Android 侧走完整导入路径。
 *
 * 这验证的是规范 docs/BACKUP-FORMAT.md 的核心承诺：一端导出的文件，另一端能导入。
 */
class BackupImportTest {

    private val fixture: String =
        File("src/test/resources/web-backup-v1.json").readText()

    @Test
    fun `Web 备份可被 Android 完整导入且外键自洽`() = runBlocking {
        val dao = FakeGymoDao()
        val warnings = BackupManager(dao).importFromJson(fixture)

        // 信封校验：确认测的确实是 Web 产物
        val root = JSONObject(fixture)
        assertEquals("web", root.getString("producer"))
        assertEquals(1, root.getInt("schemaVersion"))

        // 数据落库
        assertEquals(2, dao.exercises.size)
        assertEquals(1, dao.sessions.size)
        assertEquals(2, dao.workoutExercises.size)
        assertEquals(4, dao.sets.size)

        // 枚举映射：规范 -> Android
        val groups = dao.exercises.associate { it.name to it.targetMuscle }
        assertEquals("胸部", groups["Barbell Bench Press"])
        assertEquals("手臂", groups["Triceps Pushdown"]) // biceps/triceps 均并入「手臂」

        // 组类型映射
        val types = dao.sets.map { it.type }.toSet()
        assertTrue(types.containsAll(setOf("WARMUP", "NORMAL", "FAILURE")))

        // 外键自洽：每个组都能追到动作实例，每个实例都能追到训练日与动作
        val weIds = dao.workoutExercises.map { it.id }.toSet()
        for (s in dao.sets) assertTrue("组的外键悬空: $s", weIds.contains(s.workoutExerciseId))
        val sessionIds = dao.sessions.map { it.id }.toSet()
        val exIds = dao.exercises.map { it.id }.toSet()
        for (we in dao.workoutExercises) {
            assertTrue(sessionIds.contains(we.sessionId))
            assertTrue(exIds.contains(we.exerciseId))
        }

        // 数值保真
        val topSet = dao.sets.maxByOrNull { it.weight }!!
        assertEquals(90.0, topSet.weight, 0.0001)
        assertEquals(5, topSet.reps)
        assertEquals(1_751_000_000_000L, dao.sessions[0].startTime)
        assertEquals("状态不错，卧推有进步", dao.sessions[0].note)

        // 有损点必须全部告知（规范 §6）
        val joined = warnings.joinToString("\n")
        assertTrue("应提示 RPE/备注：$joined", joined.contains("RPE"))
        assertTrue("应提示组类型简化：$joined", joined.contains("组类型"))
        assertTrue("应提示模板：$joined", joined.contains("模板"))
        assertTrue("应提示身体测量：$joined", joined.contains("身体测量"))
        assertTrue("应提示设置：$joined", joined.contains("设置"))
        // name/durationSec 可由时间推导、notes 有对应列，故不得报训练日丢失（规范 §6）
        assertTrue("训练日不应被列为有损：$joined", !joined.contains("训练日"))
    }

    @Test
    fun `同一份 Web 备份重复导入不冲突`() = runBlocking {
        val dao = FakeGymoDao()
        val manager = BackupManager(dao)
        manager.importFromJson(fixture)
        manager.importFromJson(fixture)

        assertEquals(2, dao.sessions.size)
        assertEquals(4, dao.workoutExercises.size)
        assertEquals(8, dao.sets.size)
        // 第二次导入的组仍指向第二次的动作实例，不与第一次串台
        val weIds = dao.workoutExercises.map { it.id }
        assertEquals(weIds.distinct().size, weIds.size)
        val referenced = dao.sets.map { it.workoutExerciseId }.toSet()
        for (id in referenced) assertTrue(weIds.contains(id))
    }

    @Test
    fun `Android 导出可被自身重新导入（规范信封往返）`() = runBlocking {
        // 造一份 Android 原生数据 -> 编码为信封 -> 再解码导入
        val source = listOf(
            Exercise(id = 1, name = "杠铃卧推", targetMuscle = "胸部", category = "杠铃", isCustom = false)
        )
        val session = WorkoutSession(id = 10, startTime = 1_751_000_000_000, endTime = 1_751_003_600_000, note = "测试")
        val we = WorkoutExercise(id = 100, sessionId = 10, exerciseId = 1, orderIndex = 0)
        val sets = listOf(
            ExerciseSet(id = 1000, workoutExerciseId = 100, setIndex = 0, weight = 80.0, reps = 5,
                type = "NORMAL", isCompleted = true)
        )

        val envelope = BackupCodec.encode(source, listOf(session), listOf(we), sets)
        val envelopeRoot = JSONObject(envelope)
        assertEquals("android", envelopeRoot.getString("producer"))
        assertNotNull(envelopeRoot.getJSONObject("data").getJSONArray("workouts").getJSONObject(0).opt("name"))

        val dao = FakeGymoDao()
        val warnings = BackupManager(dao).importFromJson(envelope)
        assertEquals(1, dao.exercises.size)
        assertEquals(1, dao.sessions.size)
        assertEquals(1, dao.sets.size)
        assertEquals(80.0, dao.sets[0].weight, 0.0001)
        // 自产自销不应产生有损告警
        assertTrue("不应有告警，实际：$warnings", warnings.isEmpty())
    }
}
