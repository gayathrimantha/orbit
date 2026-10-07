import SwiftUI
import WatchKit

struct TimerView: View {
  let session: Session
  let onControl: (PhoneLink.Control) -> Void
  @State private var lastPhaseIndex: Int?

  var body: some View {
    TimelineView(.periodic(from: .now, by: 0.25)) { context in
      let snap = Engine.snapshot(session, now: context.date.millis)
      let tint = snap.phase.kind.color

      VStack(spacing: 6) {
        Text(snap.phase.kind.label.uppercased())
          .font(.system(size: 13, weight: .semibold))
          .tracking(1.6)
          .foregroundStyle(tint)

        ZStack {
          Circle().stroke(tint.opacity(0.18), lineWidth: 7)
          Circle()
            .trim(from: 0, to: 1 - snap.phaseProgress)
            .stroke(tint, style: StrokeStyle(lineWidth: 7, lineCap: .round))
            .rotationEffect(.degrees(-90))
          VStack(spacing: 0) {
            Text(clock(snap.phaseRemainingMs))
              .font(.system(size: 38, weight: .light).monospacedDigit())
              .opacity(snap.status == .paused ? 0.45 : 1)
            if let round = snap.phase.round {
              Text("\(round) of \(session.routine.totalRounds)")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
            }
          }
        }
        .padding(.horizontal, 10)

        HStack(spacing: 10) {
          ControlButton(symbol: "backward.end.fill", label: "Previous") { onControl(.back) }
          ControlButton(
            symbol: snap.status == .paused ? "play.fill" : "pause.fill",
            label: snap.status == .paused ? "Resume" : "Pause",
            tint: tint
          ) { onControl(snap.status == .paused ? .resume : .pause) }
          ControlButton(symbol: "forward.end.fill", label: "Skip") { onControl(.skip) }
        }
      }
      .onChange(of: snap.phaseIndex) { _, index in
        if let last = lastPhaseIndex, last != index, snap.status == .running {
          WKInterfaceDevice.current().play(snap.phase.kind.isActive ? .start : .stop)
        }
        lastPhaseIndex = index
      }
    }
  }

  private func clock(_ ms: Int64) -> String {
    let total = Int((Double(max(ms, 0)) / 1000).rounded(.up))
    let h = total / 3600, m = (total % 3600) / 60, s = total % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
  }
}

private struct ControlButton: View {
  let symbol: String
  let label: String
  var tint: Color? = nil
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: symbol)
        .font(.system(size: tint == nil ? 14 : 18, weight: .semibold))
        .frame(maxWidth: .infinity, minHeight: tint == nil ? 34 : 40)
        .foregroundStyle(tint == nil ? Color.primary : Color.black)
        .background(tint ?? Color.white.opacity(0.12), in: Capsule())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(label)
  }
}

extension PhaseKind {
  var label: String {
    switch self {
    case .warmup: "Warm up"
    case .work: "Work"
    case .rest: "Rest"
    case .cooldown: "Cool down"
    case .focus: "Focus"
    case .breakTime: "Break"
    }
  }

  var isActive: Bool { self == .work || self == .focus }

  // Matches src/theme.ts phaseColor.
  var color: Color {
    switch self {
    case .warmup: Color(hex: 0xF5B759)
    case .work: Color(hex: 0xFF6B5A)
    case .rest: Color(hex: 0x3CC9B0)
    case .cooldown: Color(hex: 0x7C9CFF)
    case .focus: Color(hex: 0xA98BFF)
    case .breakTime: Color(hex: 0x4FD18B)
    }
  }
}

extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255)
  }
}

extension Date {
  var millis: Int64 { Int64(timeIntervalSince1970 * 1000) }
}
