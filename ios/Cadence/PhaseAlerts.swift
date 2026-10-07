import Foundation
import React
import UserNotifications

/// Schedules a local notification for each remaining phase change while the
/// app is in the background. See src/alerts.ts for when JS calls this.
@objc(PhaseAlerts)
final class PhaseAlerts: NSObject {
  private static let prefix = "cadence.phase."
  private let center = UNUserNotificationCenter.current()
  private let lock = NSLock()
  /// Removal is by identifier, synchronously, so a cancel can never overtake
  /// the schedule that follows it (an async lookup of pending requests could).
  private var scheduled: Set<String> = []

  override init() {
    super.init()
    // Clear anything left over from a previous launch.
    center.getPendingNotificationRequests { requests in
      let ids = requests.map(\.identifier).filter { $0.hasPrefix(Self.prefix) }
      self.center.removePendingNotificationRequests(withIdentifiers: ids)
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
      resolve(granted)
    }
  }

  @objc func schedule(_ alerts: [[String: Any]]) {
    let now = Date().timeIntervalSince1970
    for alert in alerts {
      guard let id = alert["id"] as? String,
        let at = alert["at"] as? Double,
        let title = alert["title"] as? String
      else { continue }
      let delay = at / 1000 - now
      guard delay > 0.5 else { continue }

      let content = UNMutableNotificationContent()
      content.title = title
      content.body = alert["body"] as? String ?? ""
      content.sound = .default
      content.threadIdentifier = "cadence.session"

      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
      let identifier = Self.prefix + id
      lock.withLock { _ = scheduled.insert(identifier) }
      center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: trigger))
    }
  }

  @objc func cancelAll() {
    let ids = lock.withLock {
      defer { scheduled.removeAll() }
      return Array(scheduled)
    }
    guard !ids.isEmpty else { return }
    center.removePendingNotificationRequests(withIdentifiers: ids)
    center.removeDeliveredNotifications(withIdentifiers: ids)
  }
}
