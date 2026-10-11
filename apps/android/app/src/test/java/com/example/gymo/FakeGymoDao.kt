package com.example.gymo

import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.GymoDao
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf

/** 内存版 DAO：为 reorderSets 与备份导入两条路径保留真实语义（自增 id、外键可查），
 *  其余方法为最小实现。供 ReorderSetsTest / BackupImportTest 共用。 */
internal class FakeGymoDao : GymoDao {
    val exercises = mutableListOf<Exercise>()
    val sessions = mutableListOf<WorkoutSession>()
    val workoutExercises = mutableListOf<WorkoutExercise>()
    val sets = mutableListOf<ExerciseSet>()
    var updateCount = 0
    private var nextId = 1_000L
    private fun newId(): Long = nextId++

    override fun getSetsForWorkoutExercise(workoutExerciseId: Long): Flow<List<ExerciseSet>> =
        flowOf(sets.filter { it.workoutExerciseId == workoutExerciseId }.sortedBy { it.setIndex })

    override suspend fun updateExerciseSet(exerciseSet: ExerciseSet) {
        updateCount++
        sets.replaceAll { if (it.id == exerciseSet.id) exerciseSet else it }
    }

    override suspend fun insertExerciseSet(exerciseSet: ExerciseSet) {
        sets.add(exerciseSet.copy(id = if (exerciseSet.id == 0L) newId() else exerciseSet.id))
    }

    override suspend fun deleteExerciseSet(exerciseSet: ExerciseSet) {
        sets.removeIf { it.id == exerciseSet.id }
    }

    // ===== 导入路径用到的方法：保留真实语义（自增 id）=====
    override fun getAllExercises(): Flow<List<Exercise>> = flowOf(exercises.toList())
    override suspend fun getAllExercisesList(): List<Exercise> = exercises.toList()
    override suspend fun insertExercise(exercise: Exercise): Long {
        val id = if (exercise.id == 0L) newId() else exercise.id
        exercises.add(exercise.copy(id = id))
        return id
    }

    override suspend fun insertWorkoutSession(session: WorkoutSession): Long {
        val id = if (session.id == 0L) newId() else session.id
        sessions.add(session.copy(id = id))
        return id
    }

    override suspend fun insertWorkoutExercise(workoutExercise: WorkoutExercise): Long {
        val id = if (workoutExercise.id == 0L) newId() else workoutExercise.id
        workoutExercises.add(workoutExercise.copy(id = id))
        return id
    }

    override fun getWorkoutExercisesForSession(sessionId: Long): Flow<List<WorkoutExercise>> =
        flowOf(workoutExercises.filter { it.sessionId == sessionId }.sortedBy { it.orderIndex })

    override suspend fun getAllWorkoutExercisesList(): List<WorkoutExercise> = workoutExercises.toList()
    override suspend fun getAllSessionsList(): List<WorkoutSession> = sessions.toList()

    override suspend fun updateExercise(exercise: Exercise) {}
    override suspend fun deleteCustomExercise(id: Long) {}
    override suspend fun hideExercise(id: Long) {}
    override suspend fun updateWorkoutSession(session: WorkoutSession) {}
    override fun getActiveSession(): Flow<WorkoutSession?> = flowOf(null)
    override fun getCompletedSessions(): Flow<List<WorkoutSession>> =
        flowOf(sessions.filter { it.endTime != null }.sortedByDescending { it.startTime })
    override suspend fun getAllSetsList(): List<ExerciseSet> = sets.toList()
    override fun getTotalWorkoutCount(): Flow<Int> = flowOf(0)
    override fun getTotalSetCount(): Flow<Int> = flowOf(0)
    override fun getTotalVolume(): Flow<Double> = flowOf(0.0)
}
