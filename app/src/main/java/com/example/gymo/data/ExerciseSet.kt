package com.example.gymo.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exercise_sets")
data class ExerciseSet(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val workoutExerciseId: Long,  // 关联到本次训练中的哪一个动作 (WorkoutExercise.id)
    val setIndex: Int,            // 第几组（1, 2, 3...）
    val weight: Double,           // 重量 (kg)
    val reps: Int,                // 次数
    val type: String = "NORMAL",  // 组类型：WARMUP (热身组), NORMAL (正式组), FAILURE (力竭组)
    val isCompleted: Boolean = false // 是否已打勾完成
)