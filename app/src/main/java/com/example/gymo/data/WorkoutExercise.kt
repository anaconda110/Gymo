package com.example.gymo.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "workout_exercises")
data class WorkoutExercise(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sessionId: Long,          // 关联到哪一次训练 (WorkoutSession.id)
    val exerciseId: Long,         // 关联到哪一个动作 (Exercise.id)
    val orderIndex: Int           // 动作在本次训练中的显示顺序（第1个做、第2个做）
)