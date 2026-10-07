// Swift port of src/engine/session.ts. Held to identical output by the shared
// fixtures in fixtures/engine.json; change both together.

import Foundation

public enum PhaseKind: String, Codable, Sendable {
  case warmup, work, rest, cooldown, focus
  case breakTime = "break"
}

public struct Phase: Codable, Equatable, Sendable {
  public var kind: PhaseKind
  public var durationMs: Int64
  public var round: Int?
}

public struct RoutineInfo: Codable, Equatable, Sendable {
  public var id: String
  public var name: String
  public var spec: Spec

  public struct Spec: Codable, Equatable, Sendable {
    public var type: String
    public var rounds: Int?
    public var cycles: Int?
  }

  public var totalRounds: Int { spec.rounds ?? spec.cycles ?? 0 }
}

public struct Session: Codable, Equatable, Sendable {
  public var routine: RoutineInfo
  public var phases: [Phase]
  public var startedAt: Int64
  public var pausedAt: Int64?
  public var pausedTotalMs: Int64
  public var skippedMs: Int64
  public var finishedAt: Int64?

  public var totalMs: Int64 { phases.reduce(0) { $0 + $1.durationMs } }
}

public enum Status: String, Codable, Sendable { case running, paused, finished }

public struct Snapshot: Codable, Equatable, Sendable {
  public var status: Status
  public var phaseIndex: Int
  public var phase: Phase
  public var next: Phase?
  public var phaseElapsedMs: Int64
  public var phaseRemainingMs: Int64
  public var totalElapsedMs: Int64
  public var totalRemainingMs: Int64
  public var phaseProgress: Double
  public var totalProgress: Double
}

public enum Engine {
  public static func elapsedMs(_ s: Session, now: Int64) -> Int64 {
    let end = s.finishedAt ?? s.pausedAt ?? now
    let raw = end - s.startedAt - s.pausedTotalMs + s.skippedMs
    return min(max(raw, 0), s.totalMs)
  }

  public static func snapshot(_ s: Session, now: Int64) -> Snapshot {
    let total = s.totalMs
    let elapsed = elapsedMs(s, now: now)
    let finished = s.finishedAt != nil || elapsed >= total

    var index = 0
    var phaseStart: Int64 = 0
    while index < s.phases.count - 1,
      elapsed >= phaseStart + s.phases[index].durationMs
    {
      phaseStart += s.phases[index].durationMs
      index += 1
    }
    let phase = s.phases[index]
    let phaseElapsed = min(elapsed - phaseStart, phase.durationMs)

    return Snapshot(
      status: finished ? .finished : (s.pausedAt != nil ? .paused : .running),
      phaseIndex: index,
      phase: phase,
      next: index + 1 < s.phases.count ? s.phases[index + 1] : nil,
      phaseElapsedMs: phaseElapsed,
      phaseRemainingMs: phase.durationMs - phaseElapsed,
      totalElapsedMs: elapsed,
      totalRemainingMs: total - elapsed,
      phaseProgress: phase.durationMs > 0
        ? Double(phaseElapsed) / Double(phase.durationMs) : 1,
      totalProgress: total > 0 ? Double(elapsed) / Double(total) : 1
    )
  }

  public static func pause(_ s: Session, now: Int64) -> Session {
    guard s.pausedAt == nil, s.finishedAt == nil else { return s }
    var next = s
    next.pausedAt = now
    return settle(next, now: now)
  }

  public static func resume(_ s: Session, now: Int64) -> Session {
    guard let pausedAt = s.pausedAt, s.finishedAt == nil else { return s }
    var next = s
    next.pausedTotalMs += now - pausedAt
    next.pausedAt = nil
    return next
  }

  public static func skip(_ s: Session, now: Int64) -> Session {
    guard s.finishedAt == nil else { return s }
    var next = s
    next.skippedMs += snapshot(s, now: now).phaseRemainingMs
    return settle(next, now: now)
  }

  public static func back(_ s: Session, now: Int64, graceMs: Int64 = 2_000) -> Session {
    guard s.finishedAt == nil else { return s }
    let snap = snapshot(s, now: now)
    var rewind = snap.phaseElapsedMs
    if snap.phaseElapsedMs < graceMs, snap.phaseIndex > 0 {
      rewind += s.phases[snap.phaseIndex - 1].durationMs
    }
    var next = s
    next.skippedMs -= rewind
    return next
  }

  public static func settle(_ s: Session, now: Int64) -> Session {
    guard s.finishedAt == nil, elapsedMs(s, now: now) >= s.totalMs else { return s }
    var next = s
    let reachedEndAt = s.startedAt + s.pausedTotalMs - s.skippedMs + s.totalMs
    next.finishedAt = min(reachedEndAt, s.pausedAt ?? now)
    return next
  }
}
