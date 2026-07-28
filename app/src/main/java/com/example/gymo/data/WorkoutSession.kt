package com.example.gymo.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "workout_sessions")
data class WorkoutSession(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val startTime: Long,          // 开始时间戳（System.currentTimeMillis()）
    val endTime: Long? = null,    // 结束时间戳
    val note: String? = null      // 训练心得/备注
)