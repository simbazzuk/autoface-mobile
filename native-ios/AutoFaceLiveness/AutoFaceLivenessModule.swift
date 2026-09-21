import ExpoModulesCore
import SwiftUI
import UIKit
import FaceLiveness

public class AutoFaceLivenessModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AutoFaceLiveness")

    AsyncFunction("start") { (sessionId: String, region: String, promise: Promise) in
      DispatchQueue.main.async {
        guard let presenter = Self.topViewController() else {
          promise.reject("NO_VIEW_CONTROLLER", "Unable to present Face Liveness")
          return
        }

        let holder = LivenessHolder(sessionId: sessionId, region: region) { result in
          switch result {
          case .success:
            promise.resolve(["completed": true])
          case .failure(let error):
            promise.reject("LIVENESS_FAILED", error.message)
          }
        }
        let host = UIHostingController(rootView: holder.view)
        host.modalPresentationStyle = .fullScreen
        holder.host = host
        objc_setAssociatedObject(host, &AssociatedKeys.holder, holder, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        presenter.present(host, animated: true)
      }
    }
  }

  private static func topViewController(_ root: UIViewController? = UIApplication.shared.connectedScenes
    .compactMap { ($0 as? UIWindowScene)?.keyWindow }.first?.rootViewController) -> UIViewController? {
    if let nav = root as? UINavigationController { return topViewController(nav.visibleViewController) }
    if let tab = root as? UITabBarController { return topViewController(tab.selectedViewController) }
    if let presented = root?.presentedViewController { return topViewController(presented) }
    return root
  }
}

private enum AssociatedKeys { static var holder: UInt8 = 0 }

private final class LivenessHolder {
  weak var host: UIViewController?
  private let completion: (Result<Void, FaceLivenessDetectionError>) -> Void
  lazy var view = AnyView(LivenessScreen(sessionId: sessionId, region: region) { [weak self] result in
    self?.host?.dismiss(animated: true) { self?.completion(result) }
  })
  private let sessionId: String
  private let region: String
  init(sessionId: String, region: String, completion: @escaping (Result<Void, FaceLivenessDetectionError>) -> Void) {
    self.sessionId=sessionId; self.region=region; self.completion=completion
  }
}

private struct LivenessScreen: View {
  let sessionId: String
  let region: String
  let completion: (Result<Void, FaceLivenessDetectionError>) -> Void
  @State private var presented = true
  var body: some View {
    FaceLivenessDetectorView(
      sessionID: sessionId,
      region: region,
      isPresented: $presented,
      onCompletion: completion
    )
  }
}
