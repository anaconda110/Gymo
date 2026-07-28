package com.example.gymo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.gymo.data.AppDatabase
import com.example.gymo.data.GymoRepository
import com.example.gymo.ui.GymoViewModelFactory
import com.example.gymo.ui.HistoryScreen
import com.example.gymo.ui.StatsScreen
import com.example.gymo.ui.WorkoutScreen
import com.example.gymo.ui.WorkoutViewModel
import com.example.gymo.ui.theme.GymoTheme
import java.io.File

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val database = AppDatabase.getDatabase(this)
        val repository = GymoRepository(database.gymoDao())

        setContent {
            GymoTheme {
                val viewModel: WorkoutViewModel = viewModel(
                    factory = GymoViewModelFactory(repository)
                )

                val currentSession by viewModel.currentSession.collectAsStateWithLifecycle()
                val allExercises by viewModel.allExercises.collectAsStateWithLifecycle()
                val workoutExercises by viewModel.workoutExercises.collectAsStateWithLifecycle()
                val exerciseMap by viewModel.exerciseMap.collectAsStateWithLifecycle()
                val completedSessions by viewModel.completedSessions.collectAsStateWithLifecycle()
                val totalWorkoutCount by viewModel.totalWorkoutCount.collectAsStateWithLifecycle()
                val totalSetCount by viewModel.totalSetCount.collectAsStateWithLifecycle()
                val totalVolume by viewModel.totalVolume.collectAsStateWithLifecycle()

                var selectedTab by remember { mutableIntStateOf(0) }
                var exportedFile by remember { mutableStateOf<File?>(null) }

                Scaffold(
                    bottomBar = {
                        NavigationBar {
                            NavigationBarItem(
                                selected = selectedTab == 0,
                                onClick = { selectedTab = 0 },
                                icon = { Icon(Icons.Default.PlayArrow, contentDescription = "训练") },
                                label = { Text("训练") }
                            )
                            NavigationBarItem(
                                selected = selectedTab == 1,
                                onClick = { selectedTab = 1 },
                                icon = { Icon(Icons.Default.DateRange, contentDescription = "历史") },
                                label = { Text("历史") }
                            )
                            NavigationBarItem(
                                selected = selectedTab == 2,
                                onClick = { selectedTab = 2 },
                                icon = { Icon(Icons.Default.Star, contentDescription = "统计") },
                                label = { Text("统计") }
                            )
                        }
                    }
                ) { innerPadding ->
                    Surface(modifier = Modifier.padding(innerPadding)) {
                        when (selectedTab) {
                            0 -> WorkoutScreen(
                                currentSession = currentSession,
                                workoutExercises = workoutExercises,
                                exerciseMap = exerciseMap,
                                allExercises = allExercises,
                                onStartWorkout = { viewModel.startWorkout() },
                                onFinishWorkout = { viewModel.finishWorkout() },
                                onAddExercise = { viewModel.addExercise(it) },
                                onAddSet = { viewModel.addSet(it) },
                                onUpdateSet = { viewModel.updateSet(it) },
                                onDeleteSet = { viewModel.deleteSet(it) },
                                onAddCustomExercise = { name, muscle, category ->
                                    viewModel.addCustomExercise(name, muscle, category)
                                },
                                onUpdateExercise = { viewModel.updateExercise(it) },
                                onDeleteExercise = { viewModel.deleteExercise(it) },
                                getSetsFlow = { viewModel.getSetsForExercise(it) }
                            )
                            1 -> HistoryScreen(
                                completedSessions = completedSessions,
                                exerciseMap = exerciseMap,
                                getWorkoutExercisesFlow = { viewModel.getWorkoutExercisesForSession(it) },
                                getSetsFlow = { viewModel.getSetsForExercise(it) },
                                onExport = {
                                    viewModel.exportData(this@MainActivity) { file ->
                                        exportedFile = file
                                    }
                                },
                                onShare = {
                                    exportedFile?.let { file ->
                                        viewModel.shareData(this@MainActivity, file)
                                    }
                                }
                            )
                            2 -> StatsScreen(
                                totalWorkoutCount = totalWorkoutCount,
                                totalSetCount = totalSetCount,
                                totalVolume = totalVolume,
                                completedSessions = completedSessions
                            )
                        }
                    }
                }
            }
        }
    }
}