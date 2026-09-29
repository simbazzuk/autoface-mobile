const {
  withXcodeProject,
  withDangerousMod,
  withAppDelegate,
  createRunOncePlugin,
} = require('expo/config-plugins');

const fs = require('fs');
const path = require('path');

const LIVENESS_REPO =
  'https://github.com/aws-amplify/amplify-ui-swift-liveness';
const LIVENESS_REPO_NAME = 'amplify-ui-swift-liveness';
const LIVENESS_VERSION = '1.4.5';

const AMPLIFY_REPO =
  'https://github.com/aws-amplify/amplify-swift';
const AMPLIFY_REPO_NAME = 'amplify-swift';
const AMPLIFY_VERSION = '2.62.0';

function idFromKey(key) {
  return key ? key.split(' ')[0] : null;
}

function addPackageReference(
  project,
  repositoryURL,
  repositoryName,
  minimumVersion
) {
  const objects = project.hash.project.objects;

  objects.XCRemoteSwiftPackageReference ||= {};

  const existingKey = Object.keys(
    objects.XCRemoteSwiftPackageReference
  ).find((key) => {
    const item = objects.XCRemoteSwiftPackageReference[key];
    return (
      item &&
      typeof item === 'object' &&
      item.repositoryURL === repositoryURL
    );
  });

  if (existingKey) {
    return idFromKey(existingKey);
  }

  const refId = project.generateUuid();

  objects.XCRemoteSwiftPackageReference[
    `${refId} /* XCRemoteSwiftPackageReference "${repositoryName}" */`
  ] = {
    isa: 'XCRemoteSwiftPackageReference',
    repositoryURL,
    requirement: {
      kind: 'upToNextMajorVersion',
      minimumVersion,
    },
  };

  const pbxProjects = objects.PBXProject;
  const projectKey = Object.keys(pbxProjects).find(
    (key) =>
      !key.endsWith('_comment') &&
      pbxProjects[key] &&
      typeof pbxProjects[key] === 'object'
  );

  const pbxProject = pbxProjects[projectKey];

  pbxProject.packageReferences ||= [];

  const alreadyReferenced = pbxProject.packageReferences.some(
    (entry) => (entry.value || entry) === refId
  );

  if (!alreadyReferenced) {
    pbxProject.packageReferences.push({
      value: refId,
      comment: `XCRemoteSwiftPackageReference "${repositoryName}"`,
    });
  }

  return refId;
}

function addPackageProduct(
  project,
  target,
  packageRefId,
  productName
) {
  const objects = project.hash.project.objects;

  objects.XCSwiftPackageProductDependency ||= {};
  objects.PBXBuildFile ||= {};

  let productKey = Object.keys(
    objects.XCSwiftPackageProductDependency
  ).find((key) => {
    const item = objects.XCSwiftPackageProductDependency[key];

    return (
      item &&
      typeof item === 'object' &&
      item.productName === productName
    );
  });

  let productId = idFromKey(productKey);

  if (!productId) {
    productId = project.generateUuid();

    objects.XCSwiftPackageProductDependency[
      `${productId} /* ${productName} */`
    ] = {
      isa: 'XCSwiftPackageProductDependency',
      package:
        `${packageRefId} /* XCRemoteSwiftPackageReference */`,
      productName,
    };
  }

  target.packageProductDependencies ||= [];

  if (
    !target.packageProductDependencies.some(
      (entry) => (entry.value || entry) === productId
    )
  ) {
    target.packageProductDependencies.push({
      value: productId,
      comment: productName,
    });
  }

  const frameworks =
    project.pbxFrameworksBuildPhaseObj(target.uuid);

  frameworks.files ||= [];

  const frameworkComment = `${productName} in Frameworks`;

  if (
    !frameworks.files.some(
      (entry) => entry.comment === frameworkComment
    )
  ) {
    const buildId = project.generateUuid();

    objects.PBXBuildFile[
      `${buildId} /* ${frameworkComment} */`
    ] = {
      isa: 'PBXBuildFile',
      productRef: `${productId} /* ${productName} */`,
    };

    frameworks.files.push({
      value: buildId,
      comment: frameworkComment,
    });
  }
}

function addSwiftSource(project, target, filePath) {
  const objects = project.hash.project.objects;

  objects.PBXFileReference ||= {};
  objects.PBXBuildFile ||= {};

  const filename = path.basename(filePath);

  let fileKey = Object.keys(objects.PBXFileReference).find(
    (key) => {
      const item = objects.PBXFileReference[key];

      return (
        item &&
        typeof item === 'object' &&
        (item.path === filePath ||
          item.path === filename)
      );
    }
  );

  let fileId = idFromKey(fileKey);

  if (!fileId) {
    fileId = project.generateUuid();

    objects.PBXFileReference[
      `${fileId} /* ${filename} */`
    ] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'sourcecode.swift',
      name: filename,
      path: filePath,
      sourceTree: '"<group>"',
    };

    const mainGroup =
      project.getFirstProject().firstProject.mainGroup;

    const group =
      project.getPBXGroupByKey(mainGroup);

    group.children ||= [];

    group.children.push({
      value: fileId,
      comment: filename,
    });
  }

  const sources =
    project.pbxSourcesBuildPhaseObj(target.uuid);

  sources.files ||= [];

  if (
    !sources.files.some(
      (entry) =>
        entry.comment === `${filename} in Sources`
    )
  ) {
    const buildId = project.generateUuid();

    objects.PBXBuildFile[
      `${buildId} /* ${filename} in Sources */`
    ] = {
      isa: 'PBXBuildFile',
      fileRef: `${fileId} /* ${filename} */`,
    };

    sources.files.push({
      value: buildId,
      comment: `${filename} in Sources`,
    });
  }
}

function addResource(project, target, filePath) {
  const objects = project.hash.project.objects;

  objects.PBXFileReference ||= {};
  objects.PBXBuildFile ||= {};

  const filename = path.basename(filePath);

  let fileKey = Object.keys(objects.PBXFileReference).find(
    (key) => {
      const item = objects.PBXFileReference[key];

      return (
        item &&
        typeof item === 'object' &&
        (item.path === filePath ||
          item.path === filename)
      );
    }
  );

  let fileId = idFromKey(fileKey);

  if (!fileId) {
    fileId = project.generateUuid();

    objects.PBXFileReference[
      `${fileId} /* ${filename} */`
    ] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.json',
      name: filename,
      path: filePath,
      sourceTree: '"<group>"',
    };

    const mainGroup =
      project.getFirstProject().firstProject.mainGroup;

    const group =
      project.getPBXGroupByKey(mainGroup);

    group.children ||= [];

    group.children.push({
      value: fileId,
      comment: filename,
    });
  }

  const resources =
    project.pbxResourcesBuildPhaseObj(target.uuid);

  resources.files ||= [];

  if (
    !resources.files.some(
      (entry) =>
        entry.comment === `${filename} in Resources`
    )
  ) {
    const buildId = project.generateUuid();

    objects.PBXBuildFile[
      `${buildId} /* ${filename} in Resources */`
    ] = {
      isa: 'PBXBuildFile',
      fileRef: `${fileId} /* ${filename} */`,
    };

    resources.files.push({
      value: buildId,
      comment: `${filename} in Resources`,
    });
  }
}

const plugin = (config) => {
  /*
   * Copy generated native files into ios/AutoFace.
   */
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const root = config.modRequest.projectRoot;

      const iosAppDirectory = path.join(
        root,
        'ios',
        'AutoFace'
      );

      fs.mkdirSync(iosAppDirectory, {
        recursive: true,
      });

      fs.copyFileSync(
        path.join(
          root,
          'native',
          'AutoFaceLivenessPresenter.swift'
        ),
        path.join(
          iosAppDirectory,
          'AutoFaceLivenessPresenter.swift'
        )
      );

      fs.copyFileSync(
        path.join(
          root,
          'amplifyconfiguration.json'
        ),
        path.join(
          iosAppDirectory,
          'amplifyconfiguration.json'
        )
      );

      return config;
    },
  ]);

  /*
   * Install the native Face Liveness presenter when iOS launches.
   * This makes the change survive expo prebuild --clean.
   */
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'AutoFace liveness requires a Swift AppDelegate.'
      );
    }

    let contents = config.modResults.contents;

    if (
      !contents.includes(
        'AutoFaceLivenessPresenter.shared.install()'
      )
    ) {
      const needle =
        '    return super.application(application, didFinishLaunchingWithOptions: launchOptions)';

      if (!contents.includes(needle)) {
        throw new Error(
          'Could not find AppDelegate launch insertion point.'
        );
      }

      contents = contents.replace(
        needle,
        `    // Install the native AWS Face Liveness presenter.
    AutoFaceLivenessPresenter.shared.install()

${needle}`
      );

      config.modResults.contents = contents;
    }

    return config;
  });

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const target = project.getFirstTarget().firstTarget;

    const livenessRef = addPackageReference(
      project,
      LIVENESS_REPO,
      LIVENESS_REPO_NAME,
      LIVENESS_VERSION
    );

    const amplifyRef = addPackageReference(
      project,
      AMPLIFY_REPO,
      AMPLIFY_REPO_NAME,
      AMPLIFY_VERSION
    );

    addPackageProduct(
      project,
      target,
      livenessRef,
      'FaceLiveness'
    );

    addPackageProduct(
      project,
      target,
      amplifyRef,
      'Amplify'
    );

    addPackageProduct(
      project,
      target,
      amplifyRef,
      'AWSCognitoAuthPlugin'
    );

    addSwiftSource(
      project,
      target,
      'AutoFace/AutoFaceLivenessPresenter.swift'
    );

    addResource(
      project,
      target,
      'AutoFace/amplifyconfiguration.json'
    );

    return config;
  });

  return config;
};

module.exports = createRunOncePlugin(
  plugin,
  'with-autoface-liveness',
  '0.1.16.3.1'
);
