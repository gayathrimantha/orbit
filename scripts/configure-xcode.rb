# Adds the Apple Watch app and the phone-side native modules to the Xcode project.
# Idempotent: re-running leaves an already-configured project unchanged.
#
#   cd ios && bundle exec ruby ../scripts/configure-xcode.rb

require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
project = Xcodeproj::Project.open(File.join(ROOT, 'ios/Orbit.xcodeproj'))
app = project.targets.find { |t| t.name == 'Orbit' }

def ensure_file(group, path, target)
  ref = group.files.find { |f| f.real_path.to_s == File.expand_path(path) } ||
        group.new_reference(path)
  target.add_file_references([ref]) unless target.source_build_phase.files_references.include?(ref)
  ref
end

# Phone side: native modules the JS layer talks to.
app_group = project.main_group['Orbit']
%w[WatchBridge.swift WatchBridge.m PhaseAlerts.swift PhaseAlerts.m].each do |name|
  ensure_file(app_group, File.join(ROOT, 'ios/Orbit', name), app)
end

# Watch app target.
watch = project.targets.find { |t| t.name == 'OrbitWatch' }
unless watch
  watch = project.new_target(:application, 'OrbitWatch', :watchos, '10.0')
  watch.build_configurations.each do |config|
    s = config.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.gayathrimantha.orbit.watchkitapp'
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['GENERATE_INFOPLIST_FILE'] = 'YES'
    s['INFOPLIST_KEY_CFBundleDisplayName'] = 'Orbit'
    s['INFOPLIST_KEY_WKCompanionAppBundleIdentifier'] = 'com.gayathrimantha.orbit'
    s['INFOPLIST_KEY_UISupportedInterfaceOrientations'] = 'UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown'
    s['MARKETING_VERSION'] = '1.0'
    s['CURRENT_PROJECT_VERSION'] = '1'
    s['SWIFT_VERSION'] = '5.0'
    s['SDKROOT'] = 'watchos'
    s['TARGETED_DEVICE_FAMILY'] = '4'
    s['WATCHOS_DEPLOYMENT_TARGET'] = '10.0'
    s['SKIP_INSTALL'] = 'YES'
    s['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
    s['CODE_SIGN_STYLE'] = 'Automatic'
  end
end

watch_group = project.main_group['OrbitWatch'] ||
              project.main_group.new_group('OrbitWatch', File.join(ROOT, 'watch/OrbitWatch'))
Dir[File.join(ROOT, 'watch/OrbitWatch/*.swift')].sort.each do |path|
  ensure_file(watch_group, path, watch)
end
catalog_path = File.join(ROOT, 'watch/OrbitWatch/Assets.xcassets')
catalog = watch_group.files.find { |f| f.real_path.to_s == catalog_path } ||
          watch_group.new_reference(catalog_path)
unless watch.resources_build_phase.files_references.include?(catalog)
  watch.resources_build_phase.add_file_reference(catalog)
end

engine_group = project.main_group['OrbitEngine'] ||
               project.main_group.new_group('OrbitEngine', File.join(ROOT, 'native/swift/Sources/OrbitEngine'))
ensure_file(engine_group, File.join(ROOT, 'native/swift/Sources/OrbitEngine/Engine.swift'), watch)

# Build the watch app with the phone app and embed it, as the App Store expects.
app.add_dependency(watch) unless app.dependencies.any? { |d| d.target == watch }
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Watch Content' }
unless embed
  embed = app.new_copy_files_build_phase('Embed Watch Content')
  embed.dst_subfolder_spec = '16'
  embed.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
end
unless embed.files_references.include?(watch.product_reference)
  build_file = embed.add_file_reference(watch.product_reference)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

project.save
puts 'Xcode project configured.'
