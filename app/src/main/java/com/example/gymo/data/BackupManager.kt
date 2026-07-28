package com.example.gymo.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

class BackupManager(private val dao: GymoDao) {

    suspend fun exportToJson(context: Context): File {
        val exercises = dao.getAllExercisesList()
        val sessions = dao.getAllSessionsList()
        val workoutExercises = dao.getAllWorkoutExercisesList()
        val sets = dao.getAllSetsList()

        val json = JSONObject()
        json.put("version", 1)

        val exercisesArray = JSONArray()
        exercises.forEach { e ->
            exercisesArray.put(JSONObject().apply {
                put("id", e.id)
                put("name", e.name)
                put("targetMuscle", e.targetMuscle)
                put("category", e.category)
                put("isCustom", e.isCustom)
                put("isHidden", e.isHidden)
            })
        }
        json.put("exercises", exercisesArray)

        val sessionsArray = JSONArray()
        sessions.forEach { s ->
            sessionsArray.put(JSONObject().apply {
                put("id", s.id)
                put("startTime", s.startTime)
                put("endTime", s.endTime ?: JSONObject.NULL)
                put("note", s.note ?: JSONObject.NULL)
            })
        }
        json.put("sessions", sessionsArray)

        val workoutExercisesArray = JSONArray()
        workoutExercises.forEach { we ->
            workoutExercisesArray.put(JSONObject().apply {
                put("id", we.id)
                put("sessionId", we.sessionId)
                put("exerciseId", we.exerciseId)
                put("orderIndex", we.orderIndex)
            })
        }
        json.put("workoutExercises", workoutExercisesArray)

        val setsArray = JSONArray()
        sets.forEach { set ->
            setsArray.put(JSONObject().apply {
                put("id", set.id)
                put("workoutExerciseId", set.workoutExerciseId)
                put("setIndex", set.setIndex)
                put("weight", set.weight)
                put("reps", set.reps)
                put("type", set.type)
                put("isCompleted", set.isCompleted)
            })
        }
        json.put("sets", setsArray)

        val file = File(context.cacheDir, "gymo_backup.json")
        FileOutputStream(file).use { fos ->
            fos.write(json.toString(2).toByteArray())
        }
        return file
    }

    suspend fun importFromJson(jsonString: String) {
        val json = JSONObject(jsonString)

        val exercises = json.optJSONArray("exercises")
        if (exercises != null) {
            for (i in 0 until exercises.length()) {
                val obj = exercises.getJSONObject(i)
                val exercise = Exercise(
                    id = obj.getLong("id"),
                    name = obj.getString("name"),
                    targetMuscle = obj.getString("targetMuscle"),
                    category = obj.getString("category"),
                    isCustom = obj.getBoolean("isCustom"),
                    isHidden = obj.optBoolean("isHidden", false)
                )
                dao.insertExercise(exercise)
            }
        }

        val sessions = json.optJSONArray("sessions")
        if (sessions != null) {
            for (i in 0 until sessions.length()) {
                val obj = sessions.getJSONObject(i)
                val session = WorkoutSession(
                    id = obj.getLong("id"),
                    startTime = obj.getLong("startTime"),
                    endTime = if (obj.isNull("endTime")) null else obj.getLong("endTime"),
                    note = if (obj.isNull("note")) null else obj.getString("note")
                )
                dao.insertWorkoutSession(session)
            }
        }

        val workoutExercises = json.optJSONArray("workoutExercises")
        if (workoutExercises != null) {
            for (i in 0 until workoutExercises.length()) {
                val obj = workoutExercises.getJSONObject(i)
                val we = WorkoutExercise(
                    id = obj.getLong("id"),
                    sessionId = obj.getLong("sessionId"),
                    exerciseId = obj.getLong("exerciseId"),
                    orderIndex = obj.getInt("orderIndex")
                )
                dao.insertWorkoutExercise(we)
            }
        }

        val sets = json.optJSONArray("sets")
        if (sets != null) {
            for (i in 0 until sets.length()) {
                val obj = sets.getJSONObject(i)
                val set = ExerciseSet(
                    id = obj.getLong("id"),
                    workoutExerciseId = obj.getLong("workoutExerciseId"),
                    setIndex = obj.getInt("setIndex"),
                    weight = obj.getDouble("weight"),
                    reps = obj.getInt("reps"),
                    type = obj.optString("type", "NORMAL"),
                    isCompleted = obj.getBoolean("isCompleted")
                )
                dao.insertExerciseSet(set)
            }
        }
    }

    fun shareFile(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "分享 Gymo 备份文件"))
    }
}