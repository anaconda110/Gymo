package com.example.gymo

import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.GymoRepository
import com.example.gymo.ui.WorkoutViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
