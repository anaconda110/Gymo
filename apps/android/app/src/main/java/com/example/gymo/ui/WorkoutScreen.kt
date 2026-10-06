package com.example.gymo.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
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
    onAddCustomExercise: (String, String, String) -> Unit,
    onUpdateExercise: (Exercise) -> Unit,
    onDeleteExercise: (Exercise) -> Unit,
    getSetsFlow: (Long) -> Flow<List<ExerciseSet>>
) {
    var showSelectDialog by remember { mutableStateOf(false) }
    var showManageDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gymo", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showManageDialog = true }) {
                        Icon(Icons.Default.Edit, contentDescription = "动作管理")
                    }
                },
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

    if (showManageDialog) {
        ExerciseManageDialog(
            allExercises = allExercises,
            onAddCustomExercise = { name, muscle, category ->
                onAddCustomExercise(name, muscle, category)
            },
            onUpdateExercise = onUpdateExercise,
            onDeleteExercise = onDeleteExercise,
            onDismiss = { showManageDialog = false }
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
    var weightText by remember(set.id) { mutableStateOf(set.weight.toString()) }
    var repsText by remember(set.id) { mutableStateOf(set.reps.toString()) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = "$indexDisplay",
            modifier = Modifier.weight(0.8f),
            fontWeight = FontWeight.Bold
        )

        OutlinedTextField(
            value = weightText,
            onValueChange = { newText ->
                weightText = newText
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

        Checkbox(
            checked = set.isCompleted,
            onCheckedChange = { isChecked ->
                onUpdateSet(set.copy(isCompleted = isChecked))
            },
            modifier = Modifier.weight(0.8f)
        )

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseSelectDialog(
    allExercises: List<Exercise>,
    onSelect: (Long) -> Unit,
    onDismiss: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedMuscle by remember { mutableStateOf<String?>(null) }

    val muscles = remember(allExercises) {
        allExercises.map { it.targetMuscle }.distinct()
    }

    val filteredExercises = remember(allExercises, searchQuery, selectedMuscle) {
        allExercises.filter { exercise ->
            (selectedMuscle == null || exercise.targetMuscle == selectedMuscle) &&
            (searchQuery.isEmpty() || exercise.name.contains(searchQuery, ignoreCase = true) ||
                exercise.targetMuscle.contains(searchQuery, ignoreCase = true))
        }
    }

    val grouped = filteredExercises.groupBy { it.targetMuscle }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text("选择动作", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("搜索动作或肌群") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                )

                if (muscles.isNotEmpty()) {
                    ScrollableTabRow(
                        selectedTabIndex = if (selectedMuscle == null) 0 else muscles.indexOf(selectedMuscle) + 1,
                        edgePadding = 0.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Tab(
                            selected = selectedMuscle == null,
                            onClick = { selectedMuscle = null },
                            text = { Text("全部", fontSize = 12.sp) }
                        )
                        muscles.forEach { muscle ->
                            Tab(
                                selected = selectedMuscle == muscle,
                                onClick = { selectedMuscle = muscle },
                                text = { Text(muscle, fontSize = 12.sp) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

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
        }
    )
}

@Composable
fun ExerciseManageDialog(
    allExercises: List<Exercise>,
    onAddCustomExercise: (String, String, String) -> Unit,
    onUpdateExercise: (Exercise) -> Unit,
    onDeleteExercise: (Exercise) -> Unit,
    onDismiss: () -> Unit
) {
    var showAddDialog by remember { mutableStateOf(false) }
    var editingExercise by remember { mutableStateOf<Exercise?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("添加自定义动作")
            }
        },
        title = { Text("动作管理", fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(allExercises, key = { it.id }) { exercise ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = exercise.name,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = "${exercise.targetMuscle} · ${exercise.category}" +
                                    if (exercise.isCustom) " · 自定义" else "",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                        IconButton(
                            onClick = { editingExercise = exercise },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = "编辑", tint = MaterialTheme.colorScheme.primary)
                        }
                        IconButton(
                            onClick = { onDeleteExercise(exercise) },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "删除", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    )

    if (showAddDialog) {
        ExerciseEditDialog(
            exercise = null,
            onConfirm = { name, muscle, category ->
                onAddCustomExercise(name, muscle, category)
                showAddDialog = false
            },
            onDismiss = { showAddDialog = false }
        )
    }

    editingExercise?.let { exercise ->
        ExerciseEditDialog(
            exercise = exercise,
            onConfirm = { name, muscle, category ->
                onUpdateExercise(exercise.copy(name = name, targetMuscle = muscle, category = category))
                editingExercise = null
            },
            onDismiss = { editingExercise = null }
        )
    }
}

@Composable
fun ExerciseEditDialog(
    exercise: Exercise?,
    onConfirm: (String, String, String) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(exercise?.name ?: "") }
    var targetMuscle by remember { mutableStateOf(exercise?.targetMuscle ?: "") }
    var category by remember { mutableStateOf(exercise?.category ?: "杠铃") }

    val categories = listOf("杠铃", "哑铃", "器械", "自重")

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isNotBlank() && targetMuscle.isNotBlank()) {
                        onConfirm(name.trim(), targetMuscle.trim(), category)
                    }
                }
            ) {
                Text("确定")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        },
        title = { Text(if (exercise == null) "添加自定义动作" else "编辑动作", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("动作名称") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                )
                OutlinedTextField(
                    value = targetMuscle,
                    onValueChange = { targetMuscle = it },
                    label = { Text("目标肌群") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                )
                Text("动作类型", fontSize = 14.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    categories.forEach { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat, fontSize = 13.sp) }
                        )
                    }
                }
            }
        }
    )
}