const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();
const ios = path.join(root, "ios");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function inspect(stage) {
  const files = walk(ios);
  const providers = files.filter(f => path.basename(f) === "ExpoModulesProvider.swift");
  const podlocks = files.filter(f => path.basename(f) === "Podfile.lock");
  const lines = [];
  lines.push("AUTOFACE_POST_PODS_DIAGNOSTIC");
  lines.push("stage=" + stage);
  lines.push("iosExists=" + fs.existsSync(ios));
  lines.push("providerCount=" + providers.length);
  lines.push("podfileLockCount=" + podlocks.length);

  for (const f of providers) {
    const text = fs.readFileSync(f, "utf8");
    lines.push("provider=" + f);
    lines.push("AutoFaceLivenessModule=" + text.includes("AutoFaceLivenessModule"));
    lines.push("AutoFaceLivenessImport=" + /import\s+AutoFaceLiveness\b/.test(text));
    lines.push("AutofaceTestModule=" + text.includes("AutofaceTestModule"));
    lines.push("AutofaceTestImport=" + /import\s+AutofaceTest\b/.test(text));
    for (const line of text.split(/\r?\n/)) {
      if (line.includes("AutoFaceLiveness") || line.includes("AutofaceTest")) {
        lines.push("providerMatch=" + line.trim());
      }
    }
  }

  for (const f of podlocks) {
    const text = fs.readFileSync(f, "utf8");
    lines.push("podfileLock=" + f);
    lines.push("PodLock AutoFaceLiveness=" + text.includes("AutoFaceLiveness"));
    lines.push("PodLock AutofaceTest=" + text.includes("AutofaceTest"));
  }

  lines.push("END_AUTOFACE_POST_PODS_DIAGNOSTIC");
  return { lines, providers, podlocks };
}

if (!fs.existsSync(ios)) {
  console.log(inspect("hook-before-prebuild").lines.join("\n"));
  process.exit(0);
}

let result = inspect("before-pod-install");
if (result.providers.length === 0 || result.podlocks.length === 0) {
  console.log("[AutoFacePostPods] Running pod install to generate post-pods evidence...");
  try {
    cp.execFileSync("pod", ["install"], {
      cwd: ios,
      stdio: "inherit",
      env: process.env
    });
  } catch (e) {
    console.error("[AutoFacePostPods] pod install failed: " + e.message);
    const failed = inspect("pod-install-failed");
    console.error(failed.lines.join("\n"));
    process.exit(1);
  }
  result = inspect("after-pod-install");
}

console.error(result.lines.join("\n"));
process.exit(1);