import SwiftUI

@main
struct CadenceWatchApp: App {
  @StateObject private var link = PhoneLink()

  var body: some Scene {
    WindowGroup {
      Group {
        if let session = link.session, session.finishedAt == nil {
          TimerView(session: session, onControl: link.control)
        } else {
          IdleView(lastSession: link.session)
        }
      }
      .onAppear { link.activate() }
    }
  }
}
