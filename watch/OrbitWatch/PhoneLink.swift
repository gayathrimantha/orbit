import Foundation
import WatchConnectivity

/// Mirrors the phone's session. The phone pushes the whole session record
/// through the application context whenever it changes; controls tapped here
/// are applied immediately with the Swift engine and sent to the phone with
/// their timestamp, so both sides compute the same result.
@MainActor
final class PhoneLink: NSObject, ObservableObject {
  @Published private(set) var session: Session?

  enum Control: String { case pause, resume, skip, back }

  func activate() {
    guard WCSession.isSupported(), WCSession.default.activationState != .activated else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func control(_ action: Control) {
    guard let s = session else { return }
    let now = Int64(Date().timeIntervalSince1970 * 1000)
    switch action {
    case .pause: session = Engine.pause(s, now: now)
    case .resume: session = Engine.resume(s, now: now)
    case .skip: session = Engine.skip(s, now: now)
    case .back: session = Engine.back(s, now: now)
    }

    let message: [String: Any] = ["action": action.rawValue, "at": now]
    let wc = WCSession.default
    if wc.isReachable {
      wc.sendMessage(message, replyHandler: nil) { _ in wc.transferUserInfo(message) }
    } else {
      wc.transferUserInfo(message)
    }
  }

  fileprivate func apply(context: [String: Any]) {
    guard let json = context["session"] as? String else {
      session = nil
      return
    }
    session = try? JSONDecoder().decode(Session.self, from: Data(json.utf8))
  }
}

extension PhoneLink: WCSessionDelegate {
  nonisolated func session(
    _ session: WCSession,
    activationDidCompleteWith state: WCSessionActivationState,
    error: Error?
  ) {
    let context = session.receivedApplicationContext
    Task { @MainActor in self.apply(context: context) }
  }

  nonisolated func session(
    _ session: WCSession,
    didReceiveApplicationContext context: [String: Any]
  ) {
    Task { @MainActor in self.apply(context: context) }
  }
}
