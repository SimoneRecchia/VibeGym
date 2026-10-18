require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "VibeAppIcon"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/SimoneRecchia/VibeGym"
  s.license      = package["license"]
  s.authors      = "SimoneRecchia"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/SimoneRecchia/VibeGym.git", :tag => s.version.to_s }
  s.source_files = "ios/**/*.{h,m,mm}"

  install_modules_dependencies(s)
end
