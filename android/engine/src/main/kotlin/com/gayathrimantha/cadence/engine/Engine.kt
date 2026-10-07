// Kotlin port of src/engine/session.ts. Held to identical output by the shared
// fixtures in fixtures/engine.json; change both together.

package com.gayathrimantha.cadence.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
enum class PhaseKind {
    @SerialName("warmup") WARMUP,
    @SerialName("work") WORK,
    @SerialName("rest") REST,
    @SerialName("cooldown") COOLDOWN,
    @SerialName("focus") FOCUS,
    @SerialName("break") BREAK,
}

@Serializable
data class Phase(val kind: PhaseKind, val durationMs: Long, val round: Int? = null)

@Serializable
data class RoutineInfo(val id: String, val name: String, val spec: Spec) {
    @Serializable
    data class Spec(val type: String, val rounds: Int? = null, val cycles: Int? = null)

    val totalRounds: Int get() = spec.rounds ?: spec.cycles ?: 0
}

@Serializable
data class Session(
    val routine: RoutineInfo,
    val phases: List<Phase>,
    val startedAt: Long,
    val pausedAt: Long? = null,
    val pausedTotalMs: Long,
    val skippedMs: Long,
    val finishedAt: Long? = null,
) {
    val totalMs: Long get() = phases.sumOf { it.durationMs }
}

@Serializable
enum class Status {
    @SerialName("running") RUNNING,
    @SerialName("paused") PAUSED,
    @SerialName("finished") FINISHED,
}

@Serializable
data class Snapshot(
    val status: Status,
    val phaseIndex: Int,
    val phase: Phase,
    val next: Phase?,
    val phaseElapsedMs: Long,
    val phaseRemainingMs: Long,
    val totalElapsedMs: Long,
    val totalRemainingMs: Long,
    val phaseProgress: Double,
    val totalProgress: Double,
)

object Engine {
    val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    fun elapsedMs(s: Session, now: Long): Long {
        val end = s.finishedAt ?: s.pausedAt ?: now
        val raw = end - s.startedAt - s.pausedTotalMs + s.skippedMs
        return raw.coerceIn(0, s.totalMs)
    }

    fun snapshot(s: Session, now: Long): Snapshot {
        val total = s.totalMs
        val elapsed = elapsedMs(s, now)
        val finished = s.finishedAt != null || elapsed >= total

        var index = 0
        var phaseStart = 0L
        while (index < s.phases.size - 1 && elapsed >= phaseStart + s.phases[index].durationMs) {
            phaseStart += s.phases[index].durationMs
            index++
        }
        val phase = s.phases[index]
        val phaseElapsed = minOf(elapsed - phaseStart, phase.durationMs)

        return Snapshot(
            status = when {
                finished -> Status.FINISHED
                s.pausedAt != null -> Status.PAUSED
                else -> Status.RUNNING
            },
            phaseIndex = index,
            phase = phase,
            next = s.phases.getOrNull(index + 1),
            phaseElapsedMs = phaseElapsed,
            phaseRemainingMs = phase.durationMs - phaseElapsed,
            totalElapsedMs = elapsed,
            totalRemainingMs = total - elapsed,
            phaseProgress = if (phase.durationMs > 0) phaseElapsed.toDouble() / phase.durationMs else 1.0,
            totalProgress = if (total > 0) elapsed.toDouble() / total else 1.0,
        )
    }

    fun pause(s: Session, now: Long): Session {
        if (s.pausedAt != null || s.finishedAt != null) return s
        return settle(s.copy(pausedAt = now), now)
    }

    fun resume(s: Session, now: Long): Session {
        val pausedAt = s.pausedAt ?: return s
        if (s.finishedAt != null) return s
        return s.copy(pausedTotalMs = s.pausedTotalMs + (now - pausedAt), pausedAt = null)
    }

    fun skip(s: Session, now: Long): Session {
        if (s.finishedAt != null) return s
        return settle(s.copy(skippedMs = s.skippedMs + snapshot(s, now).phaseRemainingMs), now)
    }

    fun back(s: Session, now: Long, graceMs: Long = 2_000): Session {
        if (s.finishedAt != null) return s
        val snap = snapshot(s, now)
        var rewind = snap.phaseElapsedMs
        if (snap.phaseElapsedMs < graceMs && snap.phaseIndex > 0) {
            rewind += s.phases[snap.phaseIndex - 1].durationMs
        }
        return s.copy(skippedMs = s.skippedMs - rewind)
    }

    fun settle(s: Session, now: Long): Session {
        if (s.finishedAt != null || elapsedMs(s, now) < s.totalMs) return s
        val reachedEndAt = s.startedAt + s.pausedTotalMs - s.skippedMs + s.totalMs
        return s.copy(finishedAt = minOf(reachedEndAt, s.pausedAt ?: now))
    }
}
