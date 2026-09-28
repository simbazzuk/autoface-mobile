import ExpoModulesCore

public class AutoFaceLivenessModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AutoFaceLiveness")

    Constant("registrationMarker") {
      return "AUTOFACE_LOCAL_MODULE_OK"
    }

    AsyncFunction("start") { (_: String, _: String) in
      throw Exception(
        name: "AWS_LIVENESS_NOT_WIRED",
        description: "Native Expo module is registered. AWS Face Liveness wiring is the next step."
      )
    }
  }
}