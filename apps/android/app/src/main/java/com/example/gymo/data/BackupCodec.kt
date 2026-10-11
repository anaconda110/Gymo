package com.example.gymo.data

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * 备份信封 v1 的编解码（规范源：docs/BACKUP-FORMAT.md）。
 *
 * 只做 JSON <-> Android 实体的纯转换，不触碰文件系统与数据库，因此可在
 * 纯 JVM 单测中直接验证。文件读写与落库分别由 BackupManager 负责。
 *
 * 两个方向：
 * - [encode]：Android 实体 -> 规范信封（字段改名、中文枚举译回规范枚举）
 * - [decode]：规范信封 或 旧版 Android 文件 -> Android 实体 + 有损点告警
 */
object BackupCodec {

    const val SCHEMA_VERSION = 1
    private const val APP = "Gymo"

    class UnsupportedVersionException(message: String) : Exception(message)
    class NotGymoBackupException(message: String) : Exception(message)

    /** 解码结果。warnings 是规范 §6 要求"如实告知"的有损点，不得静默丢弃。 */
    data class Payload(
        val exercises: List<Exercise>,
        val sessions: List<WorkoutSession>,
        val workoutExercises: List<WorkoutExercise>,
        val sets: List<ExerciseSet>,
        val warnings: List<String>
    )

    // ==================== 取值映射（规范 §5）====================

    private val MUSCLE_TO_SPEC = listOf(
        "胸" to "chest",
        "背" to "back",
        "肩" to "shoulders",
        "腿" to "legs",
        "核心" to "core",
        "腹" to "core",
        "全身" to "fullbody"
    )

    private val SPEC_TO_MUSCLE = mapOf(
        "chest" to "胸部",
        "back" to "背部",
        "shoulders" to "肩部",
        "biceps" to "手臂",
        "triceps" to "手臂",
        "legs" to "腿部",
        "core" to "核心",
        "fullbody" to "全身"
    )

    private val EQUIPMENT_TO_SPEC = listOf(
        "杠铃" to "barbell",
        "哑铃" to "dumbbell",
        "器械" to "machine",
        "自重" to "bodyweight",
        "壶铃" to "kettlebell",
        "绳索" to "cable"
    )

    private val SPEC_TO_EQUIPMENT = mapOf(
        "barbell" to "杠铃",
        "dumbbell" to "哑铃",
        "machine" to "器械",
        "bodyweight" to "自重",
        "kettlebell" to "壶铃",
        "cable" to "绳索",
        "other" to "其他"
    )

    private val BICEPS_HINTS = Regex("弯举")
    private val TRICEPS_HINTS = Regex("臂屈伸|下压|窄距|俯卧撑")
    private val SPEC_ONLY_SET_TYPES = setOf("superset", "dropset", "restpause", "working", "drop")

    /** 规范肌群 -> Android 中文（二头/三头都并入「手臂」，规范 §5.2） */
    internal fun muscleToAndroid(spec: String): String = SPEC_TO_MUSCLE[spec] ?: "全身"

    /** Android 中文 -> 规范肌群；「手臂」按动作名细分二头/三头（规范 §5.2） */
    internal fun muscleToSpec(android: String, exerciseName: String): String {
        for ((needle, spec) in MUSCLE_TO_SPEC) {
            if (android.contains(needle)) return spec
        }
        if (android.contains("臂")) {
            return when {
                BICEPS_HINTS.containsMatchIn(exerciseName) -> "biceps"
                TRICEPS_HINTS.containsMatchIn(exerciseName) -> "triceps"
                else -> "biceps"
            }
        }
        return "fullbody"
    }

    internal fun equipmentToSpec(android: String): String {
        for ((needle, spec) in EQUIPMENT_TO_SPEC) {
            if (android.contains(needle)) return spec
        }
        return "other"
    }

    internal fun equipmentToAndroid(spec: String): String = SPEC_TO_EQUIPMENT[spec] ?: "其他"

    internal fun setTypeToSpec(android: String): String = when (android) {
        "WARMUP" -> "warmup"
        "FAILURE" -> "failure"
        else -> "normal"
    }

    internal fun setTypeToAndroid(spec: String): String = when (spec) {
        "warmup" -> "WARMUP"
        "failure" -> "FAILURE"
        else -> "NORMAL"
    }

    private val NAME_FORMATTER: DateTimeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault())

    // ==================== 编码：Android -> 规范信封 ====================

    fun encode(
        exercises: List<Exercise>,
        sessions: List<WorkoutSession>,
        workoutExercises: List<WorkoutExercise>,
        sets: List<ExerciseSet>
    ): String {
        val data = JSONObject()

        data.put("exercises", JSONArray().apply {
            exercises.forEach { e ->
                put(JSONObject().apply {
                    put("id", e.id)
                    put("name", e.name)
                    put("muscleGroup", muscleToSpec(e.targetMuscle, e.name))
                    put("equipment", equipmentToSpec(e.category))
                    put("isCustom", e.isCustom)
                })
            }
        })

        data.put("workouts", JSONArray().apply {
            sessions.forEach { s ->
                put(JSONObject().apply {
                    put("id", s.id)
                    put("date", s.startTime)
                    put("name", NAME_FORMATTER.format(Instant.ofEpochMilli(s.startTime)))
                    s.endTime?.let { put("endedAt", it) }
                    s.note?.let { put("notes", it) }
                    s.endTime?.let { put("durationSec", (it - s.startTime) / 1000) }
                })
            }
        })

        data.put("workoutExercises", JSONArray().apply {
            workoutExercises.forEach { we ->
                put(JSONObject().apply {
                    put("id", we.id)
                    put("workoutId", we.sessionId)
                    put("exerciseId", we.exerciseId)
                    put("order", we.orderIndex)
                })
            }
        })

        data.put("sets", JSONArray().apply {
            sets.forEach { s ->
                put(JSONObject().apply {
                    put("id", s.id)
                    put("workoutExerciseId", s.workoutExerciseId)
                    put("order", s.setIndex)
                    put("weight", s.weight)
                    put("reps", s.reps)
                    put("setType", setTypeToSpec(s.type))
                    put("isCompleted", s.isCompleted)
                })
            }
        })

        val root = JSONObject().apply {
            put("app", APP)
            put("schemaVersion", SCHEMA_VERSION)
            put("exportedAt", Instant.now().toString())
            put("producer", "android")
            put("data", data)
        }
        return root.toString(2)
    }

    // ==================== 解码：规范信封 / 旧版 -> Android ====================

    fun decode(jsonString: String): Payload {
        val root = JSONObject(jsonString)
        if (root.optString("app") == APP) return decodeSpec(root)
        if (root.has("sessions")) return decodeLegacyAndroid(root)
        throw NotGymoBackupException("不是 Gymo 备份文件")
    }

    private fun decodeSpec(root: JSONObject): Payload {
        val version = root.optInt("schemaVersion", root.optInt("version", 1))
        if (version > SCHEMA_VERSION) {
            throw UnsupportedVersionException(
                "备份文件版本 $version 高于本应用支持的 $SCHEMA_VERSION，请升级后再导入"
            )
        }

        val data = root.optJSONObject("data") ?: JSONObject()
        val warnings = mutableListOf<String>()

        val exArr = data.optJSONArray("exercises") ?: JSONArray()
        val exercises = ArrayList<Exercise>(exArr.length())
        var droppedExFields = 0
        for (i in 0 until exArr.length()) {
            val o = exArr.getJSONObject(i)
            if (o.has("notes") || o.has("image") || o.has("createdAt")) droppedExFields++
            exercises.add(
                Exercise(
                    id = o.optLong("id", 0L),
                    name = o.getString("name"),
                    targetMuscle = muscleToAndroid(o.optString("muscleGroup", "fullbody")),
                    category = equipmentToAndroid(o.optString("equipment", "other")),
                    isCustom = o.optBoolean("isCustom", true),
                    isHidden = false
                )
            )
        }

        val wArr = data.optJSONArray("workouts") ?: JSONArray()
        val sessions = ArrayList<WorkoutSession>(wArr.length())
        var droppedWorkoutFields = 0
        for (i in 0 until wArr.length()) {
            val o = wArr.getJSONObject(i)
            if (o.has("name") || o.has("durationSec")) droppedWorkoutFields++
            val start = o.getLong("date")
            val endTime = if (o.has("endedAt") && !o.isNull("endedAt")) o.getLong("endedAt") else start
            sessions.add(
                WorkoutSession(
                    id = o.optLong("id", 0L),
                    startTime = start,
                    endTime = endTime,
                    note = if (o.has("notes") && !o.isNull("notes")) o.getString("notes") else null
                )
            )
        }

        val weArr = data.optJSONArray("workoutExercises") ?: JSONArray()
        val wes = ArrayList<WorkoutExercise>(weArr.length())
        var droppedWeFields = 0
        for (i in 0 until weArr.length()) {
            val o = weArr.getJSONObject(i)
            if (o.has("notes") || o.has("restSec") || o.has("supersetGroup")) droppedWeFields++
            wes.add(
                WorkoutExercise(
                    id = o.optLong("id", 0L),
                    sessionId = o.getLong("workoutId"),
                    exerciseId = o.getLong("exerciseId"),
                    orderIndex = o.optInt("order", 0)
                )
            )
        }

        val setArr = data.optJSONArray("sets") ?: JSONArray()
        val sets = ArrayList<ExerciseSet>(setArr.length())
        var droppedSetFields = 0
        var simplifiedSetTypes = 0
        for (i in 0 until setArr.length()) {
            val o = setArr.getJSONObject(i)
            if (o.has("rpe") || o.has("note") || o.has("completedAt") || o.has("restSec")) {
                droppedSetFields++
            }
            val specType = o.optString("setType", "normal")
            if (specType in SPEC_ONLY_SET_TYPES) simplifiedSetTypes++
            sets.add(
                ExerciseSet(
                    id = o.optLong("id", 0L),
                    workoutExerciseId = o.getLong("workoutExerciseId"),
                    setIndex = o.optInt("order", 0),
                    weight = o.getDouble("weight"),
                    reps = o.getInt("reps"),
                    type = setTypeToAndroid(specType),
                    isCompleted = o.optBoolean("isCompleted", false)
                )
            )
        }

        if (droppedSetFields > 0) {
            warnings.add("$droppedSetFields 组的 RPE/备注/完成时间等字段在 Android 端无对应，已忽略")
        }
        if (simplifiedSetTypes > 0) {
            warnings.add("$simplifiedSetTypes 组的组类型（超级组/递减组等）Android 不支持，已简化为常规组")
        }
        if (droppedWorkoutFields > 0) {
            warnings.add("$droppedWorkoutFields 个训练日的名称/时长未导入（时间与备注已保留）")
        }
        if (droppedWeFields > 0) {
            warnings.add("$droppedWeFields 个动作实例的备注/组间休息/超级组标记未导入")
        }
        if (droppedExFields > 0) {
            warnings.add("$droppedExFields 个动作的备注/演示图未导入")
        }
        val templateCount = (data.optJSONArray("templates")?.length() ?: 0)
        val templateExCount = (data.optJSONArray("templateExercises")?.length() ?: 0)
        if (templateCount > 0 || templateExCount > 0) {
            warnings.add("$templateCount 个模板与 $templateExCount 条模板动作未导入（Android 端暂无模板功能）")
        }
        val bodyCount = data.optJSONArray("bodyMeasurements")?.length() ?: 0
        if (bodyCount > 0) {
            warnings.add("$bodyCount 条身体测量未导入（Android 端暂无此功能）")
        }
        val settingsCount = data.optJSONArray("settings")?.length() ?: 0
        if (settingsCount > 0) {
            warnings.add("$settingsCount 项设置未导入（两端设置项不通用）")
        }

        return Payload(exercises, sessions, wes, sets, warnings)
    }

    /** 旧版 Android 备份：顶层并列数组、Android 命名、无信封（规范 §7.2） */
    private fun decodeLegacyAndroid(root: JSONObject): Payload {
        val warnings = mutableListOf("源文件为旧版 Android 备份格式（无信封），已按兼容规则导入")

        val exArr = root.optJSONArray("exercises") ?: JSONArray()
        val exercises = ArrayList<Exercise>(exArr.length())
        for (i in 0 until exArr.length()) {
            val o = exArr.getJSONObject(i)
            exercises.add(
                Exercise(
                    id = o.optLong("id", 0L),
                    name = o.getString("name"),
                    targetMuscle = o.optString("targetMuscle", "全身"),
                    category = o.optString("category", "其他"),
                    isCustom = o.optBoolean("isCustom", true),
                    isHidden = o.optBoolean("isHidden", false)
                )
            )
        }

        val sArr = root.optJSONArray("sessions") ?: JSONArray()
        val sessions = ArrayList<WorkoutSession>(sArr.length())
        for (i in 0 until sArr.length()) {
            val o = sArr.getJSONObject(i)
            sessions.add(
                WorkoutSession(
                    id = o.optLong("id", 0L),
                    startTime = o.getLong("startTime"),
                    endTime = if (o.has("endTime") && !o.isNull("endTime")) o.getLong("endTime") else null,
                    note = if (o.has("note") && !o.isNull("note")) o.getString("note") else null
                )
            )
        }

        val weArr = root.optJSONArray("workoutExercises") ?: JSONArray()
        val wes = ArrayList<WorkoutExercise>(weArr.length())
        for (i in 0 until weArr.length()) {
            val o = weArr.getJSONObject(i)
            wes.add(
                WorkoutExercise(
                    id = o.optLong("id", 0L),
                    sessionId = o.getLong("sessionId"),
                    exerciseId = o.getLong("exerciseId"),
                    orderIndex = o.optInt("orderIndex", 0)
                )
            )
        }

        val setArr = root.optJSONArray("sets") ?: JSONArray()
        val sets = ArrayList<ExerciseSet>(setArr.length())
        for (i in 0 until setArr.length()) {
            val o = setArr.getJSONObject(i)
            sets.add(
                ExerciseSet(
                    id = o.optLong("id", 0L),
                    workoutExerciseId = o.getLong("workoutExerciseId"),
                    setIndex = o.optInt("setIndex", 0),
                    weight = o.getDouble("weight"),
                    reps = o.getInt("reps"),
                    type = o.optString("type", "NORMAL"),
                    isCompleted = o.optBoolean("isCompleted", false)
                )
            )
        }

        return Payload(exercises, sessions, wes, sets, warnings)
    }
}
