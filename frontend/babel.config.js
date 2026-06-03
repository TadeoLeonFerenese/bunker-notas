module.exports = function (api) {
  const isWeb = api.caller((caller) => caller && caller.platform === 'web');
  const isTest = api.env('test');

  api.cache.using(() => `${isWeb}-${isTest}`);

  const plugins = [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ];

  // Solo aplicar transformaciones en modo suelto (loose) para Web y Tests (Node)
  // En nativo (Hermes), react-native-keychain y otras dependencias crashean
  // con "Cannot assign to read-only property 'NONE'" debido al modo loose.
  if (isWeb || isTest) {
    plugins.push(
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }]
    );
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
