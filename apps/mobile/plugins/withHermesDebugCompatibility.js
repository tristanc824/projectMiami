const { withPodfile } = require('expo/config-plugins');

// SDK 58's bundled Hermes V1 binary does not export the CDP debugger API used by
// RN 0.88's Debug adapter. Keep runtime/JS behavior; omit only that native adapter.
// Production configurations already omit it. Remove this when the binary exports CDPAgent.
const marker = '# Nest: packaged Hermes V1 has no CDP debugger exports';
const patch = `
    ${marker}
    installer.pods_project.targets.each do |target|
      next unless ['React-hermes', 'React-RuntimeHermes'].include?(target.name)
      target.build_configurations.each do |build_config|
        next unless build_config.name == 'Debug'
        definitions = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = Array(definitions).map { |value| value.gsub(/\\bHERMES_ENABLE_DEBUGGER=1\\b/, '').strip }.reject(&:empty?)
      end
    end
`;
module.exports = config => withPodfile(config, result => {
  if (result.modResults.contents.includes(marker)) return result;
  const anchor = '      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )';
  if (!result.modResults.contents.includes(anchor)) throw new Error('Nest Hermes compatibility plugin needs the SDK 58 post_install template.');
  result.modResults.contents = result.modResults.contents.replace(anchor, anchor + patch);
  return result;
});
module.exports.patch = patch;
