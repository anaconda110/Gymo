package com.example.gymo.data

import kotlinx.coroutines.flow.Flow

class GymoRepository(private val dao: GymoDao) {

    // 动作库操作
    val allExercises: Flow<List<Exercise>> = dao.getAllExercises()

    suspend fun addExercise(exercise: Exercise): Long {
        return dao.insertExercise(exercise)
    }

    suspend fun updateExercise(exercise: Exercise) {
        dao.updateExercise(exercise)
    }

    suspend fun deleteCustomExercise(id: Long) {
        dao.deleteCustomExercise(id)
    }

    suspend fun hideExercise(id: Long) {
        dao.hideExercise(id)
    }

    // 训练日志 Session 操作
    val latestSession: Flow<WorkoutSession?> = dao.getLatestSession()

    // 当前进行中的训练 Session
    val activeSession: Flow<WorkoutSession?> = dao.getActiveSession()

    // 已完成的训练 Session 列表（用于历史页）
    val completedSessions: Flow<List<WorkoutSession>> = dao.getCompletedSessions()

    suspend fun startNewSession(): Long {
        val session = WorkoutSession(startTime = System.currentTimeMillis())
        return dao.insertWorkoutSession(session)
    }

    suspend fun endSession(session: WorkoutSession) {
        val updatedSession = session.copy(endTime = System.currentTimeMillis())
        dao.updateWorkoutSession(updatedSession)
    }

    // 训练-动作关联 WorkoutExercise 操作
    fun getWorkoutExercisesForSession(sessionId: Long): Flow<List<WorkoutExercise>> {
        return dao.getWorkoutExercisesForSession(sessionId)
    }

    suspend fun addExerciseToSession(sessionId: Long, exerciseId: Long, orderIndex: Int): Long {
        val workoutExercise = WorkoutExercise(
            sessionId = sessionId,
            exerciseId = exerciseId,
            orderIndex = orderIndex
        )
        return dao.insertWorkoutExercise(workoutExercise)
    }

    // 组次 Set 操作
    fun getSetsForWorkoutExercise(workoutExerciseId: Long): Flow<List<ExerciseSet>> {
        return dao.getSetsForWorkoutExercise(workoutExerciseId)
    }

    suspend fun addSet(exerciseSet: ExerciseSet) {
        dao.insertExerciseSet(exerciseSet)
    }

    suspend fun addSetToExercise(
        workoutExerciseId: Long,
        weight: Double,
        reps: Int,
        setIndex: Int,
        type: String = "NORMAL"
    ) {
        val set = ExerciseSet(
            workoutExerciseId = workoutExerciseId,
            setIndex = setIndex,
            weight = weight,
            reps = reps,
            type = type
        )
        dao.insertExerciseSet(set)
    }

    suspend fun updateSet(exerciseSet: ExerciseSet) {
        dao.updateExerciseSet(exerciseSet)
    }

    suspend fun deleteSet(exerciseSet: ExerciseSet) {
        dao.deleteExerciseSet(exerciseSet)
    }
}