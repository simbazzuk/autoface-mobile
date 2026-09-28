Pod::Spec.new do |s|
  s.name           = 'AutoFaceLiveness'
  s.version        = '0.1.16.2.9'
  s.summary        = 'AutoFace native liveness Expo module'
  s.description    = 'Expo module registration baseline for AutoFace Face Liveness.'
  s.author         = 'AutoFace'
  s.homepage       = 'https://mip.chat'
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end