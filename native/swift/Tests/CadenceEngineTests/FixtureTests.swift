import XCTest

@testable import CadenceEngine

final class FixtureTests: XCTestCase {
  struct Fixture: Decodable {
    struct Case: Decodable {
      let now: Int64
      let snapshot: Snapshot
    }
    let name: String
    let session: Session
    let cases: [Case]
  }

  func testMatchesTypeScriptEngine() throws {
    let url = try XCTUnwrap(Bundle.module.url(forResource: "engine", withExtension: "json"))
    let fixtures = try JSONDecoder().decode([Fixture].self, from: Data(contentsOf: url))
    XCTAssertFalse(fixtures.isEmpty)
    for f in fixtures {
      for c in f.cases {
        XCTAssertEqual(
          Engine.snapshot(f.session, now: c.now), c.snapshot,
          "\(f.name) at +\(c.now - f.session.startedAt)ms")
      }
    }
  }

  func testPauseResumeSkipMirrorTypeScript() throws {
    let url = try XCTUnwrap(Bundle.module.url(forResource: "engine", withExtension: "json"))
    let fresh = try JSONDecoder().decode([Fixture].self, from: Data(contentsOf: url))
      .first { $0.name == "tabata fresh" }!.session
    let t0 = fresh.startedAt

    let paused = Engine.pause(fresh, now: t0 + 83_000)
    XCTAssertEqual(Engine.snapshot(paused, now: t0 + 500_000).totalElapsedMs, 83_000)

    let resumed = Engine.resume(Engine.pause(fresh, now: t0 + 65_000), now: t0 + 400_000)
    XCTAssertEqual(Engine.snapshot(resumed, now: t0 + 400_000).totalElapsedMs, 65_000)

    let skipped = Engine.skip(fresh, now: t0 + 5_000)
    XCTAssertEqual(Engine.snapshot(skipped, now: t0 + 5_000).phaseIndex, 1)
    XCTAssertEqual(Engine.snapshot(skipped, now: t0 + 5_000).phaseElapsedMs, 0)

    let rewound = Engine.back(skipped, now: t0 + 6_000)
    XCTAssertEqual(Engine.snapshot(rewound, now: t0 + 6_000).phaseIndex, 0)
  }
}
