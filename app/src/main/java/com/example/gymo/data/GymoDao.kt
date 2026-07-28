package com.example.gymo.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface GymoDao {

    // ==================== 1. 动作库操作 ====================
    @Query("SELECT * FROM exercises WHERE isHidden = 0 ORDER BY id DESC")
    fun getAllExercises(): Flow<List<Exercise>>

    @Query("SELECT * FROM exercises WHERE isHidden = 0 ORDER BY targetMuscle, name")
    fun getAllExercisesSorted(): Flow<List<Exercise>>

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

    @Query("SELECT * FROM workout_sessions ORDER BY startTime DESC LIMIT 1")
    fun getLatestSession(): Flow<WorkoutSession?>

    @Query("SELECT * FROM workout_sessions WHERE endTime IS NULL ORDER BY startTime DESC LIMIT 1")
    fun getActiveSession(): Flow<WorkoutSession?>

    @Query("SELECT * FROM workout_sessions WHERE endTime IS NOT NULL ORDER BY startTime DESC")
    fun getCompletedSessions(): Flow<List<WorkoutSession>>

    // ==================== 3. 训练-动作关联 WorkoutExercise ====================
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorkoutExercise(workoutExercise: WorkoutExercise): Long

    @Query("SELECT * FROM workout_exercises WHERE sessionId = :sessionId ORDER BY orderIndex ASC")
    fun getWorkoutExercisesForSession(sessionId: Long): Flow<List<WorkoutExercise>>

    // ==================== 4. 组次 ExerciseSet 操作 ====================
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExerciseSet(exerciseSet: ExerciseSet)

    @Update
    suspend fun updateExerciseSet(exerciseSet: ExerciseSet)

    @Delete
    suspend fun deleteExerciseSet(exerciseSet: ExerciseSet)

    @Query("SELECT * FROM exercise_sets WHERE workoutExerciseId = :workoutExerciseId ORDER BY setIndex ASC")
    fun getSetsForWorkoutExercise(workoutExerciseId: Long): Flow<List<ExerciseSet>>

    // ==================== 5. 统计查询 ====================
    @Query("SELECT COUNT(*) FROM workout_sessions WHERE endTime IS NOT NULL")
    fun getTotalWorkoutCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM exercise_sets")
    fun getTotalSetCount(): Flow<Int>

    @Query("SELECT COALESCE(SUM(weight * reps), 0) FROM exercise_sets WHERE isCompleted = 1")
    fun getTotalVolume(): Flow<Double>
}