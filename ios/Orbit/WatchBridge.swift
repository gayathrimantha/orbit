import Foundation
import React
import WatchConnectivity

/// Phone end of the watch link. JS hands over the session record on every
/// change; it goes to the watch as application context, which the system
/// delivers even if the watch app isn't running. Controls tapped on the watch
/// come back as `watchControl` events carrying the tap's own timestamp.
@objc(WatchBridge)
final class WatchBridge: RCTEventEmitter, WCSessionDelegate {
  private var hasListeners = false
  private var pendingControls: [[String: Any]] = []
  private var pendingContext: [String: Any]?

  override init() {
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! { ["watchControl"] }

  override func startObserving() {
    hasListeners = true
    pendingControls.forEach { sendEvent(withName: "watchControl", body: $0) }
    pendingControls.removeAll()
  }

  override func stopObserving() { hasListeners = false }

  @objc func sendSession(_ json: String?) {
    // A changing timestamp guarantees delivery even when the payload repeats.
    var context: [String: Any] = ["sentAt": Date().timeIntervalSince1970]
    if let json { context["session"] = json }
    pendingContext = context
    flushContext()
  }

  private func flushContext() {
    let wc = WCSession.default
    guard WCSession.isSupported(), wc.activationState == .activated,
      wc.isPaired, wc.isWatchAppInstalled, let context = pendingContext
    else { return }
    do {
      try wc.updateApplicationContext(context)
      pendingContext = nil
    } catch {
      NSLog("[WatchBridge] updateApplicationContext failed: \(error)")
    }
  }

  private func forward(_ payload: [String: Any]) {
    guard payload["action"] is String, payload["at"] is NSNumber else { return }
    DispatchQueue.main.async {
      if self.hasListeners {
        self.sendEvent(withName: "watchControl", body: payload)
      } else {
        self.pendingControls.append(payload)
      }
    }
  }

  // MARK: WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith state: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async { self.flushContext() }
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    DispatchQueue.main.async { self.flushContext() }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    forward(message)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    forward(userInfo)
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    WCSession.default.activate()
  }
}
