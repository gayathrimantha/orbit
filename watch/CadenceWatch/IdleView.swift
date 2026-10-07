import SwiftUI

struct IdleView: View {
  let lastSession: Session?

  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "timer")
        .font(.system(size: 30, weight: .light))
        .foregroundStyle(PhaseKind.work.color)
      if let s = lastSession, s.finishedAt != nil {
        Text(s.routine.name).font(.headline)
        Text("Finished").font(.footnote).foregroundStyle(.secondary)
      } else {
        Text("Cadence").font(.headline)
        Text("Start a routine on your iPhone")
          .font(.footnote)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
    }
    .padding()
  }
}
