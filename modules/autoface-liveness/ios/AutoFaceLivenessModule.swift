import ExpoModulesCore
import Foundation

public class AutoFaceLivenessModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AutoFaceLiveness")

    Constant("registrationMarker") {
      return "AUTOFACE_AWS_LIVENESS_BRIDGE"
    }

    AsyncFunction("start") { (sessionID: String, region: String) async throws -> Bool in
      let requestID = UUID().uuidString

      return try await withCheckedThrowingContinuation { continuation in
        var observer: NSObjectProtocol?

        observer = NotificationCenter.default.addObserver(
          forName: Notification.Name("AutoFaceLivenessResult"),
          object: nil,
          queue: nil
        ) { notification in
          guard
            let info = notification.userInfo,
            let returnedID = info["requestID"] as? String,
            returnedID == requestID
          else {
            return
          }

          if let observer {
            NotificationCenter.default.removeObserver(observer)
          }

          if let error = info["error"] as? String {
            continuation.resume(
              throwing: Exception(
                name: "AWS_LIVENESS_FAILED",
                description: error
              )
            )
          } else {
            continuation.resume(returning: true)
          }
        }

        DispatchQueue.main.async {
          NotificationCenter.default.post(
            name: Notification.Name("AutoFaceLivenessStart"),
            object: nil,
            userInfo: [
              "requestID": requestID,
              "sessionID": sessionID,
              "region": region
            ]
          )
        }
      }
    }
  }
}
