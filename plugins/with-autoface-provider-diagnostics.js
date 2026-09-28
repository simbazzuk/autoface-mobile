const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

module.exports = function withAutoFaceProviderDiagnostics(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const files = walk(iosRoot);

      const interesting = files.filter((file) => {
        const name = path.basename(file);
        return (
          name === 'ExpoModulesProvider.swift' ||
          name === 'Podfile' ||
          name === 'Podfile.lock' ||
          name.endsWith('.podspec')
        );
      });

      console.log('[AutoFaceNativeDiag] iosRoot=' + iosRoot);
      console.log('[AutoFaceNativeDiag] interestingFiles=' + interesting.length);

      for (const file of interesting) {
        let text = '';
        try {
          text = fs.readFileSync(file, 'utf8');
        } catch {
          continue;
        }

        const hasLiveness =
          text.includes('AutoFaceLiveness') ||
          text.includes('AutoFaceLivenessModule');
        const hasControl =
          text.includes('AutofaceTest') ||
          text.includes('AutofaceTestModule');

        if (
          path.basename(file) === 'ExpoModulesProvider.swift' ||
          hasLiveness ||
          hasControl
        ) {
          console.log('[AutoFaceNativeDiag] FILE=' + file);
          console.log(
            '[AutoFaceNativeDiag] contains AutoFaceLiveness=' + hasLiveness +
            ' AutofaceTest=' + hasControl
          );

          const lines = text.split(/\r?\n/);
          lines.forEach((line, index) => {
            if (
              line.includes('AutoFaceLiveness') ||
              line.includes('AutofaceTest') ||
              line.includes('ExpoModulesProvider')
            ) {
              console.log(
                '[AutoFaceNativeDiag] ' +
                path.basename(file) +
                ':' +
                (index + 1) +
                ': ' +
                line.trim()
              );
            }
          });
        }
      }

      const providerFiles = files.filter(
        (file) => path.basename(file) === 'ExpoModulesProvider.swift'
      );

      if (providerFiles.length === 0) {
        console.log(
          '[AutoFaceNativeDiag] ExpoModulesProvider.swift not present at this prebuild stage'
        );
      }

      console.log(
        '[AutoFaceNativeDiag] RESULT providers=' +
        providerFiles.length +
        ' NOTE=this patch is diagnostics-only'
      );

      return modConfig;
    },
  ]);
};