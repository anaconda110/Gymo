package com.example.gymo.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [Exercise::class, WorkoutSession::class, WorkoutExercise::class, ExerciseSet::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun gymoDao(): GymoDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "gymo_database"
                )
                    .addCallback(AppDatabaseCallback())
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private class AppDatabaseCallback : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    CoroutineScope(Dispatchers.IO).launch {
                        prepopulateExercises(database.gymoDao())
                    }
                }
            }

            private suspend fun prepopulateExercises(dao: GymoDao) {
                val presetExercises = listOf(
                    // ===== 胸·三头·腹肌 (13) =====
                    Exercise(name = "杠铃卧推", targetMuscle = "胸部", category = "杠铃", isCustom = false),
                    Exercise(name = "哑铃卧推", targetMuscle = "胸部", category = "哑铃", isCustom = false),
                    Exercise(name = "上斜哑铃卧推", targetMuscle = "胸部", category = "哑铃", isCustom = false),
                    Exercise(name = "上斜哑铃飞鸟(锤式)", targetMuscle = "胸部", category = "哑铃", isCustom = false),
                    Exercise(name = "反手上斜哑铃卧推", targetMuscle = "胸部", category = "哑铃", isCustom = false),
                    Exercise(name = "上斜杠铃卧推", targetMuscle = "胸部", category = "杠铃", isCustom = false),
                    Exercise(name = "窄距卧推(靠近式)", targetMuscle = "手臂", category = "杠铃", isCustom = false),
                    Exercise(name = "哑铃过头臂屈伸", targetMuscle = "手臂", category = "哑铃", isCustom = false),
                    Exercise(name = "仰卧杠铃臂屈伸", targetMuscle = "手臂", category = "杠铃", isCustom = false),
                    Exercise(name = "窄距俯卧撑", targetMuscle = "胸部", category = "自重", isCustom = false),
                    Exercise(name = "卷腹", targetMuscle = "核心", category = "自重", isCustom = false),
                    Exercise(name = "平板卷腹收腹", targetMuscle = "核心", category = "自重", isCustom = false),
                    Exercise(name = "平躺抬腿", targetMuscle = "核心", category = "自重", isCustom = false),

                    // ===== 背·二头 (12) =====
                    Exercise(name = "引体向上", targetMuscle = "背部", category = "自重", isCustom = false),
                    Exercise(name = "反手杠铃划船", targetMuscle = "背部", category = "杠铃", isCustom = false),
                    Exercise(name = "杠铃划船", targetMuscle = "背部", category = "杠铃", isCustom = false),
                    Exercise(name = "俯卧反手哑铃划船", targetMuscle = "背部", category = "哑铃", isCustom = false),
                    Exercise(name = "T杆划船(窄)", targetMuscle = "背部", category = "杠铃", isCustom = false),
                    Exercise(name = "哑铃划船", targetMuscle = "背部", category = "哑铃", isCustom = false),
                    Exercise(name = "站姿哑铃划船", targetMuscle = "背部", category = "哑铃", isCustom = false),
                    Exercise(name = "杠铃弯举", targetMuscle = "手臂", category = "杠铃", isCustom = false),
                    Exercise(name = "坐姿哑铃弯举", targetMuscle = "手臂", category = "哑铃", isCustom = false),
                    Exercise(name = "哑铃轮换弯举", targetMuscle = "手臂", category = "哑铃", isCustom = false),
                    Exercise(name = "上斜锤式弯举", targetMuscle = "手臂", category = "哑铃", isCustom = false),
                    Exercise(name = "集中弯举", targetMuscle = "手臂", category = "哑铃", isCustom = false),

                    // ===== 腿·肩膀 (11) =====
                    Exercise(name = "深蹲", targetMuscle = "腿部", category = "杠铃", isCustom = false),
                    Exercise(name = "硬拉", targetMuscle = "背·腿", category = "杠铃", isCustom = false),
                    Exercise(name = "哑铃保加利亚蹲", targetMuscle = "腿部", category = "哑铃", isCustom = false),
                    Exercise(name = "杠铃箭步蹲", targetMuscle = "腿部", category = "杠铃", isCustom = false),
                    Exercise(name = "哑铃直腿硬拉", targetMuscle = "腿部", category = "哑铃", isCustom = false),
                    Exercise(name = "站姿杠铃推举", targetMuscle = "肩部", category = "杠铃", isCustom = false),
                    Exercise(name = "哑铃推肩", targetMuscle = "肩部", category = "哑铃", isCustom = false),
                    Exercise(name = "阿诺德推肩", targetMuscle = "肩部", category = "哑铃", isCustom = false),
                    Exercise(name = "侧平举", targetMuscle = "肩部", category = "哑铃", isCustom = false),
                    Exercise(name = "俯身飞鸟", targetMuscle = "肩部", category = "哑铃", isCustom = false),
                    Exercise(name = "半俯身侧平举", targetMuscle = "肩部", category = "哑铃", isCustom = false)
                )

                presetExercises.forEach { dao.insertExercise(it) }
            }
        }
    }
}