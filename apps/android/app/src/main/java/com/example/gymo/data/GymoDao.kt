package com.example.gymo.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface GymoDao {

    // ==================== 1. 动作库操作 ====================
    @Query("SELECT * FROM exercises WHERE isHidden = 0 ORDER BY id DESC")
    fun getAllExercises(): Flow<List<Exercise>>

    @Query("SELECT * FROM exercises ORDER BY id ASC")
    suspend fun getAllExercisesList(): List<Exercise>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExercise(exercise: Exercise): Long

    @Update
    suspend fun updateExercise(exercise: Exercise)

    @Query("DELETE FROM exercises WHERE id = :id AND isCustom = 1")
    suspend fun deleteCustomExercise(id: Long)

    @Query("UPDATE exercises SET isHidden = 1 WHERE id = :id")
    suspend fun hideExercise(id: Long)

    // ==================== 2. 训练日志 Session 操作 ====================
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorkoutSession(session: WorkoutSession): Long

    @Update
    suspend fun updateWorkoutSession(session: WorkoutSession)

    @Query("SELECT * FROM workout_sessions WHERE endTime IS NULL ORDER BY startTime DESC LIMIT 1")
    fun getActiveSession(): Flow<WorkoutSession?>

    @Query("SELECT * FROM workout_sessions WHERE endTime IS NOT NULL ORDER BY startTime DESC")
    fun getCompletedSessions(): Flow<List<WorkoutSession>>

    @Query("SELECT * FROM workout_sessions ORDER BY id ASC")
    suspend fun getAllSessionsList(): List<WorkoutSession>

    // ==================== 3. 训练-动作关联 WorkoutExercise ====================
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorkoutExercise(workoutExercise: WorkoutExercise): Long

    @Query("SELECT * FROM workout_exercises WHERE sessionId = :sessionId ORDER BY orderIndex ASC")
    fun getWorkoutExercisesForSession(sessionId: Long): Flow<List<WorkoutExercise>>

    @Query("SELECT * FROM workout_exercises ORDER BY id ASC")
    suspend fun getAllWorkoutExercisesList(): List<WorkoutExercise>

    // ==================== 4. 组次 ExerciseSet 操作 ====================
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExerciseSet(exerciseSet: ExerciseSet)

    @Update
    suspend fun updateExerciseSet(exerciseSet: ExerciseSet)

    @Delete
    suspend fun deleteExerciseSet(exerciseSet: ExerciseSet)

    @Query("SELECT * FROM exercise_sets WHERE workoutExerciseId = :workoutExerciseId ORDER BY setIndex ASC")
    fun getSetsForWorkoutExercise(workoutExerciseId: Long): Flow<List<ExerciseSet>>

    @Query("SELECT * FROM exercise_sets ORDER BY id ASC")
    suspend fun getAllSetsList(): List<ExerciseSet>

    // ==================== 5. 备份导入 ====================
    /**
     * 按规范（docs/BACKUP-FORMAT.md §7）导入一份备份：逐行重新分配主键并重建外键，
     * 不覆盖已有数据；整个导入在单个事务内完成，任何失败都不会留下半份数据。
     */
    @Transaction
    suspend fun importPayload(
        exercises: List<Exercise>,
        sessions: List<WorkoutSession>,
        workoutExercises: List<WorkoutExercise>,
        sets: List<ExerciseSet>
    ) {
        val exerciseIdMap = mutableMapOf<Long, Long>()
        for (e in exercises) {
            exerciseIdMap[e.id] = insertExercise(e.copy(id = 0L))
        }
        val sessionIdMap = mutableMapOf<Long, Long>()
        for (s in sessions) {
            sessionIdMap[s.id] = insertWorkoutSession(s.copy(id = 0L))
        }
        val weIdMap = mutableMapOf<Long, Long>()
        for (we in workoutExercises) {
            weIdMap[we.id] = insertWorkoutExercise(
                we.copy(
                    id = 0L,
                    sessionId = sessionIdMap[we.sessionId] ?: we.sessionId,
                    exerciseId = exerciseIdMap[we.exerciseId] ?: we.exerciseId
                )
            )
        }
        for (set in sets) {
            insertExerciseSet(
                set.copy(
                    id = 0L,
                    workoutExerciseId = weIdMap[set.workoutExerciseId] ?: set.workoutExerciseId
                )
            )
        }
    }

    // ==================== 6. 统计查询 ====================
    @Query("SELECT COUNT(*) FROM workout_sessions WHERE endTime IS NOT NULL")
    fun getTotalWorkoutCount(): Flow<Int>

    // 统计口径：只算已完成的组（与 getTotalVolume、CONTEXT.md 的「组」定义一致）。
    // 原实现未加过滤，会把勾选前的组也计入"总组数"。
    @Query("SELECT COUNT(*) FROM exercise_sets WHERE isCompleted = 1")
    fun getTotalSetCount(): Flow<Int>

    @Query("SELECT COALESCE(SUM(weight * reps), 0) FROM exercise_sets WHERE isCompleted = 1")
    fun getTotalVolume(): Flow<Double>
}