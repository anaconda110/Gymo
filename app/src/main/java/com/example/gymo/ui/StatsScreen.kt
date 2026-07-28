package com.example.gymo.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gymo.data.WorkoutSession
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsScreen(
    totalWorkoutCount: Int,
    totalSetCount: Int,
    totalVolume: Double,
    completedSessions: List<WorkoutSession>
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("训练统计", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("总览", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            StatItem("总训练次数", "$totalWorkoutCount")
                            StatItem("总组数", "$totalSetCount")
                            StatItem("总容量(kg)", String.format("%.0f", totalVolume))
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("训练频率", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        WeeklyHeatmap(completedSessions = completedSessions)
                    }
                }
            }

            item {
                Text(
                    "最近训练",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }

            items(completedSessions.take(10).size) { index ->
                val session = completedSessions[index]
                val dateStr = remember(session.startTime) {
                    SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                        .format(Date(session.startTime))
                }
                val durationMin = if (session.endTime != null) {
                    ((session.endTime - session.startTime) / 60000).coerceAtLeast(1)
                } else 0

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(dateStr, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                            Text("时长: $durationMin 分钟", fontSize = 12.sp, color = Color.Gray)
                        }
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = MaterialTheme.colorScheme.primary)
        Text(label, fontSize = 12.sp, color = Color.Gray)
    }
}

@Composable
fun WeeklyHeatmap(completedSessions: List<WorkoutSession>) {
    val weeksToShow = 12
    val daysInWeek = 7

    val trainingDays = remember(completedSessions) {
        val map = mutableMapOf<String, Int>()
        completedSessions.forEach { session ->
            val cal = Calendar.getInstance().apply { timeInMillis = session.startTime }
            val key = "${cal.get(Calendar.YEAR)}-${cal.get(Calendar.DAY_OF_YEAR)}"
            map[key] = (map[key] ?: 0) + 1
        }
        map
    }

    val cellSize = 16.dp
    val cellSpacing = 3.dp
    val primary = MaterialTheme.colorScheme.primary
    val surfaceVariant = MaterialTheme.colorScheme.surfaceVariant

    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height((cellSize.value * daysInWeek + cellSpacing.value * (daysInWeek - 1)).dp)
    ) {
        val cellPx = cellSize.toPx()
        val spacingPx = cellSpacing.toPx()

        val startCal = Calendar.getInstance().apply {
            add(Calendar.WEEK_OF_YEAR, -weeksToShow + 1)
            firstDayOfWeek = Calendar.MONDAY
            set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        }

        for (week in 0 until weeksToShow) {
            for (day in 0 until daysInWeek) {
                val cal = startCal.clone() as Calendar
                cal.add(Calendar.WEEK_OF_YEAR, week)
                cal.add(Calendar.DAY_OF_WEEK, day)

                val key = "${cal.get(Calendar.YEAR)}-${cal.get(Calendar.DAY_OF_YEAR)}"
                val count = trainingDays[key] ?: 0

                val x = week * (cellPx + spacingPx)
                val y = day * (cellPx + spacingPx)

                val color = when {
                    count == 0 -> surfaceVariant
                    count == 1 -> primary.copy(alpha = 0.3f)
                    count == 2 -> primary.copy(alpha = 0.6f)
                    else -> primary
                }

                drawRoundRect(
                    color = color,
                    topLeft = Offset(x, y),
                    size = Size(cellPx, cellPx),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f)
                )
            }
        }
    }
}