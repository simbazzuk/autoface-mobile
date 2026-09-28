const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

module.exports = function withAutoFaceProviderFailDiagnostic(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const files = walk(iosRoot);
      const providerFiles = files.filter(
        (file) => path.basename(file) === 'ExpoModulesProvider.swift'
      );

      const evidence = [];
      evidence.push('AUTOFACE_PROVIDER_DIAGNOSTIC');
      evidence.push('iosRoot=' + iosRoot);
      evidence.push('providerCount=' + providerFiles.length);

      if (providerFiles.length === 0) {
        evidence.push('providerPresent=false');
        evidence.push('AutoFaceLivenessModule=NOT_CHECKABLE');
        evidence.push('AutofaceTestModule=NOT_CHECKABLE');
      } else {
        providerFiles.forEach((file, i) => {
          let text = '';
          try {
            text = fs.readFileSync(file, 'utf8');
          } catch (error) {
            evidence.push('provider[' + i + ']=READ_ERROR:' + String(error));
            return;
          }

          const hasLivenessClass = text.includes('AutoFaceLivenessModule');
          const hasLivenessModule = text.includes('AutoFaceLiveness');
          const hasControlClass = text.includes('AutofaceTestModule');
          const hasControlModule = text.includes('AutofaceTest');

          evidence.push('provider[' + i + ']=' + file);
          evidence.push('AutoFaceLivenessModule=' + hasLivenessClass);
          evidence.push('AutoFaceLivenessReference=' + hasLivenessModule);
          evidence.push('AutofaceTestModule=' + hasControlClass);
          evidence.push('AutofaceTestReference=' + hasControlModule);

          const matches = text
            .split(/\r?\n/)
            .filter(
              (line) =>
                line.includes('AutoFaceLiveness') ||
                line.includes('AutofaceTest')
            )
            .map((line) => line.trim());

          if (matches.length === 0) {
            evidence.push('providerMatches=NONE');
          } else {
            for (const line of matches.slice(0, 30)) {
              evidence.push('providerMatch=' + line);
            }
          }
        });
      }

      const podfiles = files.filter((file) => path.basename(file) === 'Podfile');
      evidence.push('podfileCount=' + podfiles.length);
      for (const file of podfiles) {
        let text = '';
        try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
        evidence.push(
          'Podfile AutoFaceLiveness=' + text.includes('AutoFaceLiveness')
        );
        evidence.push(
          'Podfile AutofaceTest=' + text.includes('AutofaceTest')
        );
      }

      throw new Error('\n' + evidence.join('\n') + '\nEND_AUTOFACE_PROVIDER_DIAGNOSTIC');
    },
  ]);
};