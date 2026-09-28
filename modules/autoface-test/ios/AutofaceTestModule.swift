import ExpoModulesCore

public class AutofaceTestModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AutofaceTest")

    Constant("registrationMarker") {
      return "AUTOFACE_EXPO_GENERATED_MODULE_OK"
    }
  }
}