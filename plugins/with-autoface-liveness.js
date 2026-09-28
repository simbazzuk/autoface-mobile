const { withXcodeProject, createRunOncePlugin } = require('expo/config-plugins');

const REPO='https://github.com/aws-amplify/amplify-ui-swift-liveness';
const REPO_NAME='amplify-ui-swift-liveness';
const PRODUCT='FaceLiveness';
const MIN_VERSION='1.4.5';

function addSpm(project) {
  const objects=project.hash.project.objects;
  objects.XCRemoteSwiftPackageReference ||= {};
  objects.XCSwiftPackageProductDependency ||= {};

  const existingRefKey=Object.keys(objects.XCRemoteSwiftPackageReference).find(k =>
    objects.XCRemoteSwiftPackageReference[k]?.repositoryURL===REPO);
  let refId=existingRefKey?.split(' ')[0];

  if(!refId){
    refId=project.generateUuid();
    objects.XCRemoteSwiftPackageReference[`${refId} /* XCRemoteSwiftPackageReference "${REPO_NAME}" */`]={
      isa:'XCRemoteSwiftPackageReference',
      repositoryURL:REPO,
      requirement:{kind:'upToNextMajorVersion',minimumVersion:MIN_VERSION}
    };

    const pbx=objects.PBXProject;
    const projectId=Object.keys(pbx).find(k=>!k.endsWith('_comment'));
    pbx[projectId].packageReferences ||= [];
    pbx[projectId].packageReferences.push({
      value:refId,
      comment:`XCRemoteSwiftPackageReference "${REPO_NAME}"`
    });
  }

  let productKey=Object.keys(objects.XCSwiftPackageProductDependency).find(k =>
    objects.XCSwiftPackageProductDependency[k]?.productName===PRODUCT);
  let productId=productKey?.split(' ')[0];

  if(!productId){
    productId=project.generateUuid();
    objects.XCSwiftPackageProductDependency[`${productId} /* ${PRODUCT} */`]={
      isa:'XCSwiftPackageProductDependency',
      package:`${refId} /* XCRemoteSwiftPackageReference "${REPO_NAME}" */`,
      productName:PRODUCT
    };
  }

  const target=project.getFirstTarget().firstTarget;
  target.packageProductDependencies ||= [];
  if(!target.packageProductDependencies.some(x => (x.value||x)===productId)){
    target.packageProductDependencies.push({value:productId,comment:PRODUCT});
  }

  const frameworks=project.pbxFrameworksBuildPhaseObj(target.uuid);
  frameworks.files ||= [];
  if(!frameworks.files.some(x => x.comment===`${PRODUCT} in Frameworks`)){
    const buildId=project.generateUuid();
    objects.PBXBuildFile ||= {};
    objects.PBXBuildFile[`${buildId} /* ${PRODUCT} in Frameworks */`]={
      isa:'PBXBuildFile',
      productRef:`${productId} /* ${PRODUCT} */`
    };
    frameworks.files.push({value:buildId,comment:`${PRODUCT} in Frameworks`});
  }
}

const plugin=(config)=>{
  config=withXcodeProject(config,c=>{
    addSpm(c.modResults);
    return c;
  });
  return config;
};

module.exports=createRunOncePlugin(
  plugin,
  'with-autoface-liveness',
  '0.1.16.2.1'
);
