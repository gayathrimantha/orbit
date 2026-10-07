package com.gayathrimantha.orbit.wear

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.gayathrimantha.orbit.engine.Engine
import com.gayathrimantha.orbit.engine.PhaseKind
import com.gayathrimantha.orbit.engine.Session
import com.gayathrimantha.orbit.engine.Status
import kotlinx.coroutines.delay
import kotlin.math.ceil

@Composable
fun OrbitWearApp(session: Session?, onControl: (PhoneLink.Control) -> Unit) {
    MaterialTheme {
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            if (session != null && session.finishedAt == null) {
                TimerScreen(session, onControl)
            } else {
                IdleScreen(session)
            }
        }
    }
}

@Composable
private fun TimerScreen(session: Session, onControl: (PhoneLink.Control) -> Unit) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(session) {
        while (true) {
            now = System.currentTimeMillis()
            delay(250)
        }
    }
    val snap = Engine.snapshot(session, now)
    val tint = snap.phase.kind.color
    val paused = snap.status == Status.PAUSED

    PhaseCue(snap.phaseIndex, snap.phase.kind, snap.status)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
    ) {
        Text(
            snap.phase.kind.label.uppercase(),
            color = tint,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.5.sp,
        )
        Spacer(Modifier.height(4.dp))
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(104.dp)) {
            Canvas(Modifier.fillMaxSize()) {
                val stroke = 6.dp.toPx()
                drawArc(tint.copy(alpha = 0.18f), 0f, 360f, false, style = Stroke(stroke))
                drawArc(
                    tint,
                    startAngle = -90f,
                    sweepAngle = -360f * (1 - snap.phaseProgress.toFloat()),
                    useCenter = false,
                    style = Stroke(stroke, cap = StrokeCap.Round),
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    clock(snap.phaseRemainingMs),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Light,
                    color = Color.White,
                    modifier = Modifier.alpha(if (paused) 0.45f else 1f),
                )
                snap.phase.round?.let {
                    Text("$it of ${session.routine.totalRounds}", fontSize = 11.sp, color = Color(0xFF8C929C))
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            SmallControl("⏮", "Previous") { onControl(PhoneLink.Control.BACK) }
            Button(
                onClick = { onControl(if (paused) PhoneLink.Control.RESUME else PhoneLink.Control.PAUSE) },
                colors = ButtonDefaults.buttonColors(backgroundColor = tint),
                modifier = Modifier.size(44.dp).semantics { contentDescription = if (paused) "Resume" else "Pause" },
            ) {
                Text(if (paused) "▶" else "❚❚", color = Color.Black, fontSize = 16.sp)
            }
            SmallControl("⏭", "Skip") { onControl(PhoneLink.Control.SKIP) }
        }
    }
}

@Composable
private fun SmallControl(glyph: String, label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF1B1E25)),
        modifier = Modifier.size(34.dp).semantics { contentDescription = label },
    ) {
        Text(glyph, color = Color.White, fontSize = 12.sp)
    }
}

@Composable
private fun IdleScreen(last: Session?) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(16.dp)) {
        Box(Modifier.size(10.dp).background(PhaseKind.WORK.color, CircleShape))
        Spacer(Modifier.height(10.dp))
        if (last?.finishedAt != null) {
            Text(last.routine.name, fontWeight = FontWeight.SemiBold, color = Color.White)
            Text("Finished", fontSize = 12.sp, color = Color(0xFF8C929C))
        } else {
            Text("Orbit", fontWeight = FontWeight.SemiBold, color = Color.White)
            Text(
                "Start a routine on your phone",
                fontSize = 12.sp,
                color = Color(0xFF8C929C),
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** Buzzes when the phase changes while the screen is open. */
@Composable
private fun PhaseCue(index: Int, kind: PhaseKind, status: Status) {
    val context = LocalContext.current
    val last = remember { intArrayOf(index) }
    LaunchedEffect(index) {
        if (index != last[0] && status == Status.RUNNING) {
            val active = kind == PhaseKind.WORK || kind == PhaseKind.FOCUS
            context.getSystemService(Vibrator::class.java)?.vibrate(
                if (active) VibrationEffect.createWaveform(longArrayOf(0, 120, 80, 120), -1)
                else VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE),
            )
        }
        last[0] = index
    }
}

private fun clock(ms: Long): String {
    val total = ceil(ms.coerceAtLeast(0) / 1000.0).toInt()
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

val PhaseKind.label: String
    get() = when (this) {
        PhaseKind.WARMUP -> "Warm up"
        PhaseKind.WORK -> "Work"
        PhaseKind.REST -> "Rest"
        PhaseKind.COOLDOWN -> "Cool down"
        PhaseKind.FOCUS -> "Focus"
        PhaseKind.BREAK -> "Break"
    }

// Matches src/theme.ts phaseColor.
val PhaseKind.color: Color
    get() = when (this) {
        PhaseKind.WARMUP -> Color(0xFFF5B759)
        PhaseKind.WORK -> Color(0xFFFF6B5A)
        PhaseKind.REST -> Color(0xFF3CC9B0)
        PhaseKind.COOLDOWN -> Color(0xFF7C9CFF)
        PhaseKind.FOCUS -> Color(0xFFA98BFF)
        PhaseKind.BREAK -> Color(0xFF4FD18B)
    }
