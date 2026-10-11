package com.example.gymo

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.gymo.data.AppDatabase
import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.GymoDao
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * 真 SQL 的 DAO 测试：在 JVM 上跑真实 SQLite（Robolectric），不需要模拟器。
 *
 * 覆盖此前完全没有测试的一层——SQL 谓词、`@Transaction` 导入的原子性与外键重建。
 * 统计口径这类"实现与 CONTEXT.md 定义是否一致"的问题正是靠这一层守住的。
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34]) // android-all 目前最高 16/API 36 尚未提供，34 足够覆盖 SQL 行为
class GymoDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: GymoDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.gymoDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun seed() = runBlocking {
        val exId = dao.insertExercise(
            Exercise(name = "杠铃卧推", targetMuscle = "胸部", category = "杠铃", isCustom = false)
        )
        val sId = dao.insertWorkoutSession(
            WorkoutSession(startTime = 1_751_000_000_000, endTime = 1_751_003_600_000)
        )
        val weId = dao.insertWorkoutExercise(
            WorkoutExercise(sessionId = sId, exerciseId = exId, orderIndex = 0)
        )
        dao.insertExerciseSet(
            ExerciseSet(workoutExerciseId = weId, setIndex = 0, weight = 60.0, reps = 12, isCompleted = true)
        )
        dao.insertExerciseSet(
            ExerciseSet(workoutExerciseId = weId, setIndex = 1, weight = 90.0, reps = 5, isCompleted = true)
        )
        dao.insertExerciseSet(
            ExerciseSet(workoutExerciseId = weId, setIndex = 2, weight = 100.0, reps = 3, isCompleted = false)
        )
        Triple(exId, sId, weId)
    }

    @Test
    fun `总组数只计已完成组`() = runBlocking {
        seed()
        assertEquals(2, dao.getTotalSetCount().first())
    }

    @Test
    fun `总容量只计已完成组`() = runBlocking {
        seed()
        // 60*12 + 90*5 = 1170，未完成的 100*3 不计
        assertEquals(1170.0, dao.getTotalVolume().first(), 0.0001)
    }

    @Test
    fun `总训练次数只计已结束的训练`() = runBlocking {
        seed()
        assertEquals(1, dao.getTotalWorkoutCount().first())
        // 追加一个进行中的训练，不应计入
        dao.insertWorkoutSession(WorkoutSession(startTime = 1_752_000_000_000))
        assertEquals(1, dao.getTotalWorkoutCount().first())
    }

    @Test
    fun `隐藏的动作不出现在动作库查询中`() = runBlocking {
        val (exId, _, _) = seed()
        assertEquals(1, dao.getAllExercises().first().size)
        dao.hideExercise(exId)
        assertEquals(0, dao.getAllExercises().first().size)
        // 但历史数据仍可读（隐藏是软删除）
        assertEquals(1, dao.getAllExercisesList().size)
    }

    @Test
    fun `事务导入逐行重分配 id 且外键重建`() = runBlocking {
        // 先有一份既有数据
        seed()

        // 导入一份"来自另一个库"的数据：id 与既有数据重叠
        val exercises = listOf(Exercise(id = 1, name = "深蹲", targetMuscle = "腿部", category = "杠铃", isCustom = false))
        val sessions = listOf(WorkoutSession(id = 10, startTime = 1_753_000_000_000, endTime = 1_753_003_600_000))
        val wes = listOf(WorkoutExercise(id = 100, sessionId = 10, exerciseId = 1, orderIndex = 0))
        val sets = listOf(
            ExerciseSet(id = 1000, workoutExerciseId = 100, setIndex = 0, weight = 100.0, reps = 5, isCompleted = true)
        )

        dao.importPayload(exercises, sessions, wes, sets)

        // 既有数据未被覆盖
        assertEquals(2, dao.getAllExercises().first().size)
        assertEquals(2, dao.getAllSessionsList().size)
        // 导入的行获得新 id（不与源 id 相同）
        val imported = dao.getAllSessionsList().first { it.startTime == 1_753_000_000_000L }
        assertTrue(imported.id != 10L)
        // 外键自洽：导入的组指向导入的动作实例
        val allSets = dao.getAllSetsList()
        val allWe = dao.getAllWorkoutExercisesList()
        val weIds = allWe.map { it.id }.toSet()
        for (s in allSets) assertTrue("悬空外键: $s", weIds.contains(s.workoutExerciseId))
        val sessionIds = dao.getAllSessionsList().map { it.id }.toSet()
        val exIds = dao.getAllExercisesList().map { it.id }.toSet()
        for (we in allWe) {
            assertTrue(sessionIds.contains(we.sessionId))
            assertTrue(exIds.contains(we.exerciseId))
        }
        // 统计随之更新：既有 2 组 + 导入 1 组
        assertEquals(3, dao.getTotalSetCount().first())
    }

    @Test
    fun `同一份数据导入两次各自独立`() = runBlocking {
        val exercises = listOf(Exercise(id = 1, name = "深蹲", targetMuscle = "腿部", category = "杠铃", isCustom = false))
        val sessions = listOf(WorkoutSession(id = 10, startTime = 1_753_000_000_000, endTime = 1_753_003_600_000))
        val wes = listOf(WorkoutExercise(id = 100, sessionId = 10, exerciseId = 1, orderIndex = 0))
        val sets = listOf(
            ExerciseSet(id = 1000, workoutExerciseId = 100, setIndex = 0, weight = 100.0, reps = 5, isCompleted = true)
        )
        dao.importPayload(exercises, sessions, wes, sets)
        dao.importPayload(exercises, sessions, wes, sets)

        assertEquals(2, dao.getAllSessionsList().size)
        assertEquals(2, dao.getAllExercisesList().size)
        assertEquals(2, dao.getAllWorkoutExercisesList().size)
        // 两次导入的组分别指向各自的动作实例，不串台
        val weIds = dao.getAllWorkoutExercisesList().map { it.id }.toSet()
        assertEquals(2, weIds.size)
        for (s in dao.getAllSetsList()) assertTrue(weIds.contains(s.workoutExerciseId))
    }
}
