package com.example.gymo.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    completedSessions: List<WorkoutSession>,
    exerciseMap: Map<Long, Exercise>,
    getWorkoutExercisesFlow: (Long) -> Flow<List<WorkoutExercise>>,
    getSetsFlow: (Long) -> Flow<List<ExerciseSet>>,
    onExport: () -> Unit,
    onShare: () -> Unit
) {
    var expandedSessionId by remember { mutableStateOf<Long?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("训练历史", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onExport) {
                        Icon(Icons.Default.Star, contentDescription = "导出")
                    }
                    IconButton(onClick = onShare) {
                        Icon(Icons.Default.Share, contentDescription = "分享")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            )
        }
    ) { paddingValues ->
        if (completedSessions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Text("暂无历史训练记录，快去开启第一次训练吧！", color = Color.Gray)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(completedSessions, key = { it.id }) { session ->
                    val isExpanded = expandedSessionId == session.id
                    val dateStr = remember(session.startTime) {
                        SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                            .format(Date(session.startTime))
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                expandedSessionId = if (isExpanded) null else session.id
                            },
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(text = dateStr, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    val durationMin = if (session.endTime != null) {
                                        ((session.endTime - session.startTime) / 60000).coerceAtLeast(1)
                                    } else 0
                                    Text(text = "时长: $durationMin 分钟", fontSize = 12.sp, color = Color.Gray)
                                }
                                Text(
                                    text = if (isExpanded) "收起 ▲" else "展开 ▼",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }

                            AnimatedVisibility(visible = isExpanded) {
                                HistorySessionDetail(
                                    sessionId = session.id,
                                    exerciseMap = exerciseMap,
                                    getWorkoutExercisesFlow = getWorkoutExercisesFlow,
                                    getSetsFlow = getSetsFlow
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HistorySessionDetail(
    sessionId: Long,
    exerciseMap: Map<Long, Exercise>,
    getWorkoutExercisesFlow: (Long) -> Flow<List<WorkoutExercise>>,
    getSetsFlow: (Long) -> Flow<List<ExerciseSet>>
) {
    val workoutExercises by getWorkoutExercisesFlow(sessionId)
        .collectAsStateWithLifecycle(initialValue = emptyList())

    Column(modifier = Modifier.padding(top = 12.dp)) {
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        if (workoutExercises.isEmpty()) {
            Text("无训练动作记录", fontSize = 12.sp, color = Color.Gray)
        } else {
            workoutExercises.forEach { workoutExercise ->
                val exerciseName = exerciseMap[workoutExercise.exerciseId]?.name ?: "未知动作"
                val sets by getSetsFlow(workoutExercise.id)
                    .collectAsStateWithLifecycle(initialValue = emptyList())

                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    Text(text = exerciseName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    val completedSetsStr = sets.filter { it.isCompleted }.joinToString(" | ") { set ->
                        "${set.weight}kg × ${set.reps}次"
                    }
                    Text(
                        text = if (completedSetsStr.isEmpty()) "未完成任何组" else completedSetsStr,
                        fontSize = 12.sp,
                        color = Color.DarkGray,
                        modifier = Modifier.padding(start = 8.dp, top = 2.dp)
                    )
                }
            }
        }
    }
}