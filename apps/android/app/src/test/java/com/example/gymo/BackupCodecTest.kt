package com.example.gymo

import com.example.gymo.data.BackupCodec
import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 备份信封 v1 编解码的纯 JVM 单测（规范：docs/BACKUP-FORMAT.md）。
 * 不依赖 Room / 设备 / Android 框架（org.json 由 testImplementation 提供）。
 */
class BackupCodecTest {

    private val exercises = listOf(
        Exercise(id = 1, name = "杠铃卧推", targetMuscle = "胸部", category = "杠铃", isCustom = false),
        Exercise(id = 2, name = "坐姿哑铃弯举", targetMuscle = "手臂", category = "哑铃", isCustom = false),
        Exercise(id = 3, name = "仰卧杠铃臂屈伸", targetMuscle = "手臂", category = "杠铃", isCustom = false),
        Exercise(id = 4, name = "卷腹", targetMuscle = "核心", category = "自重", isCustom = false)
    )
    private val sessions = listOf(
        WorkoutSession(id = 10, startTime = 1_750_000_000_000, endTime = 1_750_003_600_000, note = "状态不错")
    )
    private val wes = listOf(
        WorkoutExercise(id = 100, sessionId = 10, exerciseId = 1, orderIndex = 0),
        WorkoutExercise(id = 101, sessionId = 10, exerciseId = 2, orderIndex = 1)
    )
    private val sets = listOf(
        ExerciseSet(id = 1000, workoutExerciseId = 100, setIndex = 0, weight = 60.0, reps = 8, type = "NORMAL", isCompleted = true),
        ExerciseSet(id = 1001, workoutExerciseId = 100, setIndex = 1, weight = 65.0, reps = 6, type = "FAILURE", isCompleted = true),
        ExerciseSet(id = 1002, workoutExerciseId = 101, setIndex = 0, weight = 30.0, reps = 10, type = "WARMUP", isCompleted = true)
    )

    private fun encoded(): JSONObject =
        JSONObject(BackupCodec.encode(exercises, sessions, wes, sets))

    // ==================== 编码 ====================

    @Test
    fun `信封含 app schemaVersion producer`() {
        val root = encoded()
        assertEquals("Gymo", root.getString("app"))
        assertEquals(BackupCodec.SCHEMA_VERSION, root.getInt("schemaVersion"))
        assertEquals("android", root.getString("producer"))
        assertTrue(root.has("exportedAt"))
        assertTrue(root.has("data"))
    }

    @Test
    fun `字段改名为规范命名`() {
        val data = encoded().getJSONObject("data")

        val workout = data.getJSONArray("workouts").getJSONObject(0)
        assertEquals(1_750_000_000_000, workout.getLong("date"))
        assertEquals(1_750_003_600_000, workout.getLong("endedAt"))
        assertEquals("状态不错", workout.getString("notes"))
        assertEquals(3600, workout.getInt("durationSec"))

        val we = data.getJSONArray("workoutExercises").getJSONObject(0)
        assertEquals(10L, we.getLong("workoutId"))
        assertEquals(0, we.getInt("order"))

        val set = data.getJSONArray("sets").getJSONObject(0)
        assertEquals(0, set.getInt("order"))
        assertEquals("normal", set.getString("setType"))
    }

    @Test
    fun `枚举译回规范取值：手臂按动作名细分`() {
        val exArr = encoded().getJSONObject("data").getJSONArray("exercises")
        fun groupOf(name: String): String {
            for (i in 0 until exArr.length()) {
                val o = exArr.getJSONObject(i)
                if (o.getString("name") == name) return o.getString("muscleGroup")
            }
            error("not found: $name")
        }
        assertEquals("chest", groupOf("杠铃卧推"))
        assertEquals("core", groupOf("卷腹"))
        assertEquals("biceps", groupOf("坐姿哑铃弯举"))
        assertEquals("triceps", groupOf("仰卧杠铃臂屈伸"))

        val setTypes = (0 until encoded().getJSONObject("data").getJSONArray("sets").length())
            .map { encoded().getJSONObject("data").getJSONArray("sets").getJSONObject(it).getString("setType") }
        assertTrue(setTypes.containsAll(listOf("normal", "failure", "warmup")))
    }

    // ==================== 解码 ====================

    @Test
    fun `自编自解往返不丢关键字段`() {
        val payload = BackupCodec.decode(BackupCodec.encode(exercises, sessions, wes, sets))
        assertEquals(4, payload.exercises.size)
        assertEquals(1, payload.sessions.size)
        assertEquals(2, payload.workoutExercises.size)
        assertEquals(3, payload.sets.size)
        assertEquals(1_750_000_000_000, payload.sessions[0].startTime)
        assertEquals("状态不错", payload.sessions[0].note)
    }

    @Test
    fun `解码时手臂合并回中文`() {
        // Web 端导出会区分 biceps/triceps，Android 的字典没有该维度，合并为「手臂」
        val webBackup = """
        {
          "app": "Gymo",
          "schemaVersion": 1,
          "exportedAt": "2026-10-10T00:00:00Z",
          "producer": "web",
          "data": {
            "exercises": [
              {"id": 1, "name": "Barbell Curl", "muscleGroup": "biceps", "equipment": "barbell", "isCustom": false},
              {"id": 2, "name": "Triceps Pushdown", "muscleGroup": "triceps", "equipment": "cable", "isCustom": false}
            ],
            "workouts": [{"id": 10, "date": 1750000000000, "name": "2026-06-16", "endedAt": 1750003600000}],
            "workoutExercises": [{"id": 100, "workoutId": 10, "exerciseId": 1, "order": 0}],
            "sets": [{"id": 1000, "workoutExerciseId": 100, "order": 0, "weight": 20.5, "reps": 12,
                      "setType": "dropset", "isCompleted": true, "rpe": 8, "note": "最后一组"}]
          }
        }
        """.trimIndent()

        val payload = BackupCodec.decode(webBackup)
        assertEquals("手臂", payload.exercises[0].targetMuscle)
        assertEquals("手臂", payload.exercises[1].targetMuscle)
        assertEquals("绳索", payload.exercises[1].category)
        assertEquals("NORMAL", payload.sets[0].type) // dropset 无对应值，降级为常规
        assertEquals(20.5, payload.sets[0].weight, 0.0001)
        assertEquals(1_750_000_000_000, payload.sessions[0].startTime)
    }

    @Test
    fun `有损点在告警中显式列出`() {
        val webBackup = """
        {
          "app": "Gymo",
          "schemaVersion": 1,
          "exportedAt": "2026-10-10T00:00:00Z",
          "producer": "web",
          "data": {
            "workouts": [{"id": 10, "date": 1750000000000, "name": "2026-06-16", "durationSec": 3600}],
            "sets": [{"id": 1000, "workoutExerciseId": 100, "order": 0, "weight": 20.5, "reps": 12,
                      "setType": "superset", "isCompleted": true, "rpe": 8}],
            "templates": [{"id": 5, "name": "推日"}],
            "templateExercises": [{"id": 6, "templateId": 5, "exerciseId": 1, "order": 0,
                                   "targetSets": 3, "targetReps": 8, "targetWeight": 60}],
            "bodyMeasurements": [{"id": 7, "date": 1750000000000, "bodyweight": 75}],
            "settings": [{"key": "unit", "value": "kg"}]
          }
        }
        """.trimIndent()

        val warnings = BackupCodec.decode(webBackup).warnings.joinToString("\n")
        assertTrue(warnings, warnings.contains("RPE"))
        assertTrue(warnings, warnings.contains("组类型"))
        assertTrue(warnings, warnings.contains("模板"))
        assertTrue(warnings, warnings.contains("身体测量"))
        assertTrue(warnings, warnings.contains("设置"))
    }

    @Test
    fun `旧版 Android 备份仍可导入`() {
        val legacy = """
        {
          "version": 1,
          "exercises": [{"id": 1, "name": "杠铃卧推", "targetMuscle": "胸部", "category": "杠铃", "isCustom": false}],
          "sessions": [{"id": 10, "startTime": 1750000000000, "endTime": null, "note": null}],
          "workoutExercises": [{"id": 100, "sessionId": 10, "exerciseId": 1, "orderIndex": 0}],
          "sets": [{"id": 1000, "workoutExerciseId": 100, "setIndex": 0, "weight": 60.0, "reps": 8,
                    "type": "NORMAL", "isCompleted": true}]
        }
        """.trimIndent()

        val payload = BackupCodec.decode(legacy)
        assertEquals(1, payload.exercises.size)
        assertEquals("胸部", payload.exercises[0].targetMuscle)
        assertEquals(null, payload.sessions[0].endTime)
        assertEquals(3_600_000_000L, payload.sets[0].weight.toLong() * 60_000_000) // 60.0 保真
        assertTrue(payload.warnings.joinToString("").contains("旧版"))
    }

    @Test
    fun `拒绝高于支持版本的文件`() {
        val future = """{"app":"Gymo","schemaVersion":99,"exportedAt":"x","data":{}}"""
        try {
            BackupCodec.decode(future)
            error("应当抛出 UnsupportedVersionException")
        } catch (e: BackupCodec.UnsupportedVersionException) {
            assertTrue(e.message!!.contains("99"))
        }
    }

    @Test
    fun `拒绝非 Gymo 文件`() {
        try {
            BackupCodec.decode("""{"foo":1}""")
            error("应当抛出 NotGymoBackupException")
        } catch (e: BackupCodec.NotGymoBackupException) {
            // ok
        }
    }
}
