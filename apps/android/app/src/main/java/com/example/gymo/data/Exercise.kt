package com.example.gymo.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exercises")
data class Exercise(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,             // 动作名称，如：杠铃卧推
    val targetMuscle: String,     // 目标肌群，如：胸部
    val category: String,         // 动作类型，如：杠铃、哑铃、器械、自重
    val isCustom: Boolean = true, // 是否为用户自定义动作
    val isHidden: Boolean = false // 是否隐藏（软删除）
)