import UIKit
import SwiftUI
import Amplify
import AWSCognitoAuthPlugin
import FaceLiveness

final class AutoFaceLivenessPresenter {
  static let shared = AutoFaceLivenessPresenter()

  private var observer: NSObjectProtocol?
  private var hostingController: UIViewController?
  private var amplifyConfigured = false

  private init() {}

  func install() {
    guard observer == nil else { return }

    observer = NotificationCenter.default.addObserver(
      forName: Notification.Name("AutoFaceLivenessStart"),
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.handle(notification)
    }

    print("[AutoFaceLiveness] presenter installed")
  }

  private func configureAmplifyIfNeeded() throws {
    guard !amplifyConfigured else { return }

    do {
      try Amplify.add(plugin: AWSCognitoAuthPlugin())
      try Amplify.configure()
      amplifyConfigured = true
      print("[AutoFaceLiveness] Amplify configured")
    } catch {
      throw NSError(
        domain: "AutoFaceLiveness",
        code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Unable to configure AWS Amplify: \(error.localizedDescription)"
        ]
      )
    }
  }

  private func handle(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let requestID = info["requestID"] as? String,
      let sessionID = info["sessionID"] as? String,
      let region = info["region"] as? String
    else {
      return
    }

    do {
      try configureAmplifyIfNeeded()
    } catch {
      finish(
        requestID: requestID,
        error: error.localizedDescription
      )
      return
    }

    let view = AutoFaceLivenessView(
      sessionID: sessionID,
      region: region
    ) { [weak self] result in
      self?.hostingController?.dismiss(animated: true) {
        self?.hostingController = nil

        switch result {
        case .success:
          self?.finish(requestID: requestID, error: nil)

        case .failure(let error):
          self?.finish(
            requestID: requestID,
            error: String(describing: error)
          )
        }
      }
    }

    let controller = UIHostingController(rootView: view)
    controller.modalPresentationStyle = .fullScreen

    guard let presenter = topViewController() else {
      finish(
        requestID: requestID,
        error: "Unable to find an iOS view controller to present Face Liveness."
      )
      return
    }

    hostingController = controller
    presenter.present(controller, animated: true)
  }

  private func finish(requestID: String, error: String?) {
    var info: [String: Any] = [
      "requestID": requestID
    ]

    if let error {
      info["error"] = error
    }

    NotificationCenter.default.post(
      name: Notification.Name("AutoFaceLivenessResult"),
      object: nil,
      userInfo: info
    )
  }

  private func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }

    let root = scenes
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }?
      .rootViewController

    return topViewController(from: root)
  }

  private func topViewController(
    from controller: UIViewController?
  ) -> UIViewController? {
    if let presented = controller?.presentedViewController {
      return topViewController(from: presented)
    }

    if let navigation = controller as? UINavigationController {
      return topViewController(from: navigation.visibleViewController)
    }

    if let tab = controller as? UITabBarController {
      return topViewController(from: tab.selectedViewController)
    }

    return controller
  }
}

private struct AutoFaceLivenessView: View {
  let sessionID: String
  let region: String
  let completion:
    (Result<Void, FaceLivenessDetectionError>) -> Void

  @State private var isPresented = true

  var body: some View {
    FaceLivenessDetectorView(
      sessionID: sessionID,
      region: region,
      isPresented: $isPresented,
      onCompletion: completion
    )
  }
}
