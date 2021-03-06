import _ from 'lodash';
import path from 'path';

function loadReactantPlatform(config, platformName) {
  if (_.isArray(platformName) && platformName.length) {
    [platformName] = platformName;
  }
  const { paths } = config;
  const rootPath = path.resolve(paths.root, 'node_modules', platformName);
  const packagePkg = require(path.resolve(rootPath, 'package.json'));
  let platform = require(path.resolve(rootPath, packagePkg.reactantPlatform));
  if (platform.__esModule) platform = platform.default;
  platform = {
    ...platform,
    actions: _.reduce(
      platform.actions,
      (actions, action, key) => {
        if (action.run) {
          if (!action.dependsOn) {
            action = { ...action, dependsOn: [] };
          }
        } else {
          action = { run: action, dependsOn: [] };
        }
        actions[key] = action;
        return actions;
      },
      {}
    ),
    rootPath
  };
  return platform;
}

function getReactantPlatforms(config) {
  const { paths } = config;
  const platformNames = _.keys(
    require(path.resolve(paths.root, 'package.json')).dependencies
  );
  return _.filter(platformNames, platformName => {
    return !!require(path.resolve(
      paths.root,
      'node_modules',
      platformName,
      'package.json'
    )).reactantPlatform;
  });
}

export { loadReactantPlatform, getReactantPlatforms };
export default { loadReactantPlatform, getReactantPlatforms };
