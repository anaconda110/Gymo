package com.example.gymo.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.GymoRepository
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class WorkoutViewModel(private val repository: GymoRepository) : ViewModel() {

    val allExercises: StateFlow<List<Exercise>> = repository.allExercises.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val exerciseMap: StateFlow<Map<Long, Exercise>> = allExercises
        .map { list -> list.associateBy { it.id } }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyMap()
        )

    val currentSession: StateFlow<WorkoutSession?> = repository.activeSession.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = null
    )

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val workoutExercises: StateFlow<List<WorkoutExercise>> = currentSession
        .flatMapLatest { session ->
            if (session == null) kotlinx.coroutines.flow.flowOf(emptyList())
            else repository.getWorkoutExercisesForSession(session.id)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val completedSessions: StateFlow<List<WorkoutSession>> = repository.completedSessions.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    // ===== 统计 =====
    val totalWorkoutCount: StateFlow<Int> = repository.totalWorkoutCount.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 0
    )

    val totalSetCount: StateFlow<Int> = repository.totalSetCount.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 0
    )

    val totalVolume: StateFlow<Double> = repository.totalVolume.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 0.0
    )

    fun getSetsForExercise(workoutExerciseId: Long): Flow<List<ExerciseSet>> {
        return repository.getSetsForWorkoutExercise(workoutExerciseId)
    }

    fun getWorkoutExercisesForSession(sessionId: Long): Flow<List<WorkoutExercise>> {
        return repository.getWorkoutExercisesForSession(sessionId)
    }

    fun startWorkout() {
        viewModelScope.launch {
            repository.startNewSession()
        }
    }

    fun finishWorkout() {
        viewModelScope.launch {
            currentSession.value?.let { session ->
                repository.endSession(session)
            }
        }
    }

    fun addExercise(exerciseId: Long) {
        viewModelScope.launch {
            val sessionId = currentSession.value?.id
                ?: repository.startNewSession()
            val orderIndex = workoutExercises.value.size
            repository.addExerciseToSession(sessionId, exerciseId, orderIndex)
        }
    }

    fun addSet(workoutExerciseId: Long) {
        viewModelScope.launch {
            val existingSets = repository.getSetsForWorkoutExercise(workoutExerciseId).first()
            val lastSet = existingSets.lastOrNull()
            val weight = lastSet?.weight ?: 0.0
            val reps = lastSet?.reps ?: 0
            val nextSetIndex = existingSets.size
            repository.addSetToExercise(
                workoutExerciseId = workoutExerciseId,
                weight = weight,
                reps = reps,
                setIndex = nextSetIndex,
                type = "NORMAL"
            )
        }
    }

    fun updateSet(exerciseSet: ExerciseSet) {
        viewModelScope.launch {
            repository.updateSet(exerciseSet)
        }
    }

    fun deleteSet(exerciseSet: ExerciseSet) {
        viewModelScope.launch {
            repository.deleteSet(exerciseSet)
        }
    }

    // ===== 动作库管理 =====
    fun addCustomExercise(name: String, targetMuscle: String, category: String) {
        viewModelScope.launch {
            repository.addExercise(
                Exercise(
                    name = name,
                    targetMuscle = targetMuscle,
                    category = category,
                    isCustom = true
                )
            )
        }
    }

    fun updateExercise(exercise: Exercise) {
        viewModelScope.launch {
            repository.updateExercise(exercise)
        }
    }

    fun deleteExercise(exercise: Exercise) {
        viewModelScope.launch {
            if (exercise.isCustom) {
                repository.deleteCustomExercise(exercise.id)
            } else {
                repository.hideExercise(exercise.id)
            }
        }
    }
}