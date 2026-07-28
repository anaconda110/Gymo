package com.example.gymo.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.gymo.data.Exercise
import com.example.gymo.data.ExerciseSet
import com.example.gymo.data.WorkoutExercise
import com.example.gymo.data.WorkoutSession
import kotlinx.coroutines.flow.Flow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutScreen(
    currentSession: WorkoutSession?,
    workoutExercises: List<WorkoutExercise>,
    exerciseMap: Map<Long, Exercise>,
    allExercises: List<Exercise>,
    onStartWorkout: () -> Unit,
    onFinishWorkout: () -> Unit,
    onAddExercise: (Long) -> Unit,
    onAddSet: (Long) -> Unit,
    onUpdateSet: (ExerciseSet) -> Unit,
    onDeleteSet: (ExerciseSet) -> Unit,
    getSetsFlow: (Long) -> Flow<List<ExerciseSet>>
) {
    var showSelectDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gymo", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            if (currentSession == null && workoutExercises.isEmpty()) {
                // 空状态：点击开始训练（或直接添加动作自动建 Session）
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "今天练什么？",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = onStartWorkout,
                        modifier = Modifier
                            .fillMaxWidth(0.6f)
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("开始自由训练", fontSize = 18.sp)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedButton(
                        onClick = { showSelectDialog = true },
                        modifier = Modifier.fillMaxWidth(0.6f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("+ 添加动作直接开始")
                    }
                }
            } else {
                // 进行中的训练
                Column(modifier = Modifier.fillMaxSize()) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("进行中的训练", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("记录你的每一次突破", fontSize = 12.sp, color = Color.Gray)
                            }
                            Button(
                                onClick = onFinishWorkout,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Text("完成训练")
                            }
                        }
                    }

                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Text(
                                "已添加动作",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }

                        items(workoutExercises, key = { it.id }) { workoutExercise ->
                            val exercise = exerciseMap[workoutExercise.exerciseId]
                            ExerciseSetCard(
                                exerciseName = exercise?.name ?: "未知动作",
                                setsFlow = getSetsFlow(workoutExercise.id),
                                onAddSet = { onAddSet(workoutExercise.id) },
                                onUpdateSet = onUpdateSet,
                                onDeleteSet = onDeleteSet
                            )
                        }

                        item {
                            OutlinedButton(
                                onClick = { showSelectDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Filled.Add, contentDescription = null)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("添加动作")
                            }
                        }
                    }
                }
            }
        }
    }

    if (showSelectDialog) {
        ExerciseSelectDialog(
            allExercises = allExercises,
            onSelect = { exerciseId ->
                onAddExercise(exerciseId)
                showSelectDialog = false
            },
            onDismiss = { showSelectDialog = false }
        )
    }
}

@Composable
fun ExerciseSetCard(
    exerciseName: String,
    setsFlow: Flow<List<ExerciseSet>>,
    onAddSet: () -> Unit,
    onUpdateSet: (ExerciseSet) -> Unit,
    onDeleteSet: (ExerciseSet) -> Unit
) {
    val sets by setsFlow.collectAsStateWithLifecycle(initialValue = emptyList())

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = exerciseName, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("组次", modifier = Modifier.weight(0.8f), color = Color.Gray)
                Text("重量 (kg)", modifier = Modifier.weight(1.5f), color = Color.Gray)
                Text("次数", modifier = Modifier.weight(1.5f), color = Color.Gray)
                Text("完成", modifier = Modifier.weight(0.8f), color = Color.Gray)
                Spacer(modifier = Modifier.weight(0.5f))
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 用 forEachIndexed 显示序号，避免删除组次后跳号
            sets.forEachIndexed { index, set ->
                ExerciseSetRow(
                    indexDisplay = index + 1,
                    set = set,
                    onUpdateSet = onUpdateSet,
                    onDeleteSet = onDeleteSet
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            TextButton(onClick = onAddSet) {
                Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("添加一组")
            }
        }
    }
}

@Composable
fun ExerciseSetRow(
    indexDisplay: Int,
    set: ExerciseSet,
    onUpdateSet: (ExerciseSet) -> Unit,
    onDeleteSet: (ExerciseSet) -> Unit
) {
    // 按 set.id 记住输入文本态，防止 LazyColumn 重组丢字
    var weightText by remember(set.id) { mutableStateOf(set.weight.toString()) }
    var repsText by remember(set.id) { mutableStateOf(set.reps.toString()) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // 组次序号（用 indexDisplay 解决删除跳号问题）
        Text(
            text = "$indexDisplay",
            modifier = Modifier.weight(0.8f),
            fontWeight = FontWeight.Bold
        )

        // 重量输入框 (kg)
        OutlinedTextField(
            value = weightText,
            onValueChange = { newText ->
                weightText = newText
                // 解析失败仅更新本地态，跳过写库
                newText.toDoubleOrNull()?.let { newWeight ->
                    if (newWeight != set.weight) {
                        onUpdateSet(set.copy(weight = newWeight))
                    }
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier
                .weight(1.5f)
                .padding(end = 8.dp)
        )

        // 次数输入框
        OutlinedTextField(
            value = repsText,
            onValueChange = { newText ->
                repsText = newText
                newText.toIntOrNull()?.let { newReps ->
                    if (newReps != set.reps) {
                        onUpdateSet(set.copy(reps = newReps))
                    }
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier
                .weight(1.5f)
                .padding(end = 8.dp)
        )

        // 完成打勾
        Checkbox(
            checked = set.isCompleted,
            onCheckedChange = { isChecked ->
                onUpdateSet(set.copy(isCompleted = isChecked))
            },
            modifier = Modifier.weight(0.8f)
        )

        // 删除该组
        IconButton(
            onClick = { onDeleteSet(set) },
            modifier = Modifier.size(24.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Delete,
                contentDescription = "删除该组",
                tint = Color.Gray
            )
        }
    }
}

@Composable
fun ExerciseSelectDialog(
    allExercises: List<Exercise>,
    onSelect: (Long) -> Unit,
    onDismiss: () -> Unit
) {
    val grouped = allExercises.groupBy { it.targetMuscle }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text("选择动作", fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                grouped.forEach { (muscle, exercises) ->
                    item {
                        Text(
                            text = muscle,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp, bottom = 4.dp)
                        )
                    }
                    items(exercises, key = { it.id }) { exercise ->
                        TextButton(
                            onClick = { onSelect(exercise.id) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "${exercise.name}  ·  ${exercise.category}",
                                modifier = Modifier.fillMaxWidth(),
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }
        }
    )
}