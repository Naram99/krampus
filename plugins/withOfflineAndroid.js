const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

/** Keep Metro network access in debug builds; installed release builds run entirely offline. */
module.exports = function withOfflineAndroid(config) {
  config = withAndroidManifest(config, async config => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application['meta-data'] = (application['meta-data'] ?? []).filter(item => item.$['android:name'] !== 'firebase_messaging_auto_init_enabled');
    application['meta-data'].push({ $: { 'android:name': 'firebase_messaging_auto_init_enabled', 'android:value': 'false' } });
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    const directory = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'release');
    await fs.mkdir(directory, { recursive: true });
    const filename = path.join(directory, 'AndroidManifest.xml');
    let manifest;
    try {
      await fs.access(filename);
      manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(filename);
    }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      manifest = { manifest: { $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' } } };
    }
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const removed = ['android.permission.INTERNET', 'android.permission.SYSTEM_ALERT_WINDOW'];
    manifest.manifest['uses-permission'] = (manifest.manifest['uses-permission'] ?? [])
      .filter(item => !removed.includes(item.$['android:name']))
      .concat(removed.map(name => ({ $: { 'android:name': name, 'tools:node': 'remove' } })));
    await AndroidConfig.Manifest.writeAndroidManifestAsync(filename, manifest);
    return config;
  }]);
};
