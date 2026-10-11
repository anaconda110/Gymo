package com.example.gymo.data

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/**
 * 备份文件的读写与分享。JSON 的编解码在 [BackupCodec]（可在纯 JVM 单测中验证），
 * 本类只负责文件与事务。
 *
 * 导出的文件遵循 docs/BACKUP-FORMAT.md 的信封 v1，两个客户端可互认。
 */
class BackupManager(private val dao: GymoDao) {

    suspend fun exportToJson(context: Context): File {
        val json = BackupCodec.encode(
            exercises = dao.getAllExercisesList(),
            sessions = dao.getAllSessionsList(),
            workoutExercises = dao.getAllWorkoutExercisesList(),
            sets = dao.getAllSetsList()
        )
        val file = File(context.cacheDir, "gymo_backup.json")
        FileOutputStream(file).use { fos ->
            fos.write(json.toByteArray())
        }
        return file
    }

    /**
     * 导入备份（规范信封或旧版 Android 文件）。
     * 返回有损点告警——规范 §7 要求在界面上如实告知，不得静默丢弃。
     * 任何解析错误都会在写入前抛出，不会留下半份数据。
     */
    suspend fun importFromJson(jsonString: String): List<String> {
        // 解析（纯函数，失败即抛，不触碰数据库）
        val payload = BackupCodec.decode(jsonString)
        // 写入（单个事务，逐行重分配 id 并重建外键）
        dao.importPayload(
            exercises = payload.exercises,
            sessions = payload.sessions,
            workoutExercises = payload.workoutExercises,
            sets = payload.sets
        )
        return payload.warnings
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
