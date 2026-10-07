// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "OrbitEngine",
  platforms: [.macOS(.v13), .iOS(.v15), .watchOS(.v9)],
  products: [.library(name: "OrbitEngine", targets: ["OrbitEngine"])],
  targets: [
    .target(name: "OrbitEngine"),
    .testTarget(
      name: "OrbitEngineTests",
      dependencies: ["OrbitEngine"],
      resources: [.copy("engine.json")]
    ),
  ]
)
