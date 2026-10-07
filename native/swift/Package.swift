// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "CadenceEngine",
  platforms: [.macOS(.v13), .iOS(.v15), .watchOS(.v9)],
  products: [.library(name: "CadenceEngine", targets: ["CadenceEngine"])],
  targets: [
    .target(name: "CadenceEngine"),
    .testTarget(
      name: "CadenceEngineTests",
      dependencies: ["CadenceEngine"],
      resources: [.copy("engine.json")]
    ),
  ]
)
