package com.example.gymo

import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.GymoDao
import com.example.gymo.data.GymoRepository
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import com.example.gymo.ui.WorkoutViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/**
 * reorderSets 的纯 JVM 单测：用内存版 GymoDao 验证
 * 「按传入 id 顺序重写 setIndex」这一行为，不依赖 Room 或设备。
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ReorderSetsTest {

    private val dispatcher = UnconfinedTestDispatcher()
    private lateinit var dao: FakeGymoDao
    private lateinit var viewModel: WorkoutViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        dao = FakeGymoDao()
        viewModel = WorkoutViewModel(GymoRepository(dao))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun setsOf(ids: LongRange) = ids.map { id ->
        ExerciseSet(
            id = id,
            workoutExerciseId = 1L,
            setIndex = (id - 1).toInt(),
            weight = 60.0,
            reps = 8
        )
    }

    @Test
    fun `重排后 setIndex 按新顺序重写`() {
        dao.sets.addAll(setsOf(1L..3L))

        viewModel.reorderSets(workoutExerciseId = 1L, orderedSetIds = listOf(3L, 1L, 2L))

        val byId = dao.sets.associateBy { it.id }
        assertEquals(0, byId[3L]!!.setIndex)
        assertEquals(1, byId[1L]!!.setIndex)
        assertEquals(2, byId[2L]!!.setIndex)
    }

    @Test
    fun `顺序未变化时不产生写库`() {
        dao.sets.addAll(setsOf(1L..3L))
        val before = dao.updateCount

        viewModel.reorderSets(workoutExerciseId = 1L, orderedSetIds = listOf(1L, 2L, 3L))

        assertEquals(before, dao.updateCount)
    }

    @Test
    fun `传入未知 id 时跳过而不崩溃`() {
        dao.sets.addAll(setsOf(1L..2L))

        viewModel.reorderSets(workoutExerciseId = 1L, orderedSetIds = listOf(99L, 1L, 2L))

        val byId = dao.sets.associateBy { it.id }
        assertEquals(0, byId[1L]!!.setIndex)
        assertEquals(1, byId[2L]!!.setIndex)
    }
}

/** 内存版 DAO：只实现 reorderSets 路径用到的方法，其余空实现。 */
private class FakeGymoDao : GymoDao {
    val sets = mutableListOf<ExerciseSet>()
    var updateCount = 0

    override fun getSetsForWorkoutExercise(workoutExerciseId: Long): Flow<List<ExerciseSet>> =
        flowOf(sets.filter { it.workoutExerciseId == workoutExerciseId }.sortedBy { it.setIndex })

    override suspend fun updateExerciseSet(exerciseSet: ExerciseSet) {
        updateCount++
        sets.replaceAll { if (it.id == exerciseSet.id) exerciseSet else it }
    }

    override suspend fun insertExerciseSet(exerciseSet: ExerciseSet) {
        sets.add(exerciseSet)
    }

    override suspend fun deleteExerciseSet(exerciseSet: ExerciseSet) {
        sets.removeIf { it.id == exerciseSet.id }
    }

    // ===== 与被测路径无关，最小实现 =====
    override fun getAllExercises(): Flow<List<Exercise>> = flowOf(emptyList())
    override fun getAllExercisesSorted(): Flow<List<Exercise>> = flowOf(emptyList())
    override suspend fun getAllExercisesList(): List<Exercise> = emptyList()
    override suspend fun insertExercise(exercise: Exercise): Long = 1L
    override suspend fun updateExercise(exercise: Exercise) {}
    override suspend fun deleteCustomExercise(id: Long) {}
    override suspend fun hideExercise(id: Long) {}
    override suspend fun insertWorkoutSession(session: WorkoutSession): Long = 1L
    override suspend fun updateWorkoutSession(session: WorkoutSession) {}
    override fun getLatestSession(): Flow<WorkoutSession?> = flowOf(null)
    override fun getActiveSession(): Flow<WorkoutSession?> = flowOf(null)
    override fun getCompletedSessions(): Flow<List<WorkoutSession>> = flowOf(emptyList())
    override suspend fun getAllSessionsList(): List<WorkoutSession> = emptyList()
    override suspend fun insertWorkoutExercise(workoutExercise: WorkoutExercise): Long = 1L
    override fun getWorkoutExercisesForSession(sessionId: Long): Flow<List<WorkoutExercise>> = flowOf(emptyList())
    override suspend fun getAllWorkoutExercisesList(): List<WorkoutExercise> = emptyList()
    override suspend fun getAllSetsList(): List<ExerciseSet> = sets.toList()
    override fun getTotalWorkoutCount(): Flow<Int> = flowOf(0)
    override fun getTotalSetCount(): Flow<Int> = flowOf(0)
    override fun getTotalVolume(): Flow<Double> = flowOf(0.0)
}
