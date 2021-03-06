import ConfigLoader, { socketGetConfig } from '@ecosystem/config';
import ModuleLoader from '@ecosystem/module-loader';
import _ from 'lodash';
import mergeConfiguration from 'merge-configuration';
import path from 'path';
import pkgDir from 'pkg-dir';
import rcConfig from 'rc-config';
import { environment } from 'js-info';
import ConfigPaths from './paths';
import ConfigPorts from './ports';
import defaultConfig from './defaultConfig';

export default function createConfig({ action, options = {} }) {
  options = sanitizeOptions(options);
  const { reactant, loaders } = createConfigLoader(options.config);
  const { socket } = reactant;
  let { config } = reactant;
  const [platformsLoader, pluginsLoader] = loaders;
  const platforms = getPlatforms(platformsLoader);
  const plugins = getPlugins(pluginsLoader);
  config = {
    ...config,
    env: environment.value,
    options,
    moduleName: config.moduleName
      ? config.moduleName
      : _.camelCase(config.title).replace(/_/g, '-'),
    envs: {
      ...config.envs,
      HOST: config.host,
      NODE_ENV: environment.value,
      PORT: config.port,
      __DEV__: !environment.production
    }
  };
  if (!action) return { config, platforms, plugins, socket };
  if (options.platform && !_.isBoolean(options.platform)) {
    config.platformName = options.platform;
  }
  const platform = config.platformName
    ? platforms[config.platforms[config.platformName]]
    : null;
  const configPaths = new ConfigPaths(config);
  const configPorts = new ConfigPorts(config);
  const eslint = rcConfig({ name: 'eslint' });
  const pkg = path.resolve(pkgDir.sync(process.cwd()), 'package.json');
  config = {
    ...config,
    action: action || config.action,
    babel: mergeConfiguration(pkg.babel, config.babel),
    paths: configPaths.paths,
    port: configPorts.basePort,
    ports: configPorts.ports,
    eslint: mergeConfiguration(
      mergeConfiguration(eslint, pkg.eslint),
      config.eslint
    )
  };
  reactant.appendConfig(config);
  return { config, platform, platforms, plugins, socket };
}

function createConfigLoader(
  optionsConfig,
  _moduleLoaderNames = ['reactantPlatform'],
  _plugins = null,
  _finished = false
) {
  const loaders = _.map(_moduleLoaderNames, moduleLoaderName => {
    const moduleLoader = new ModuleLoader(moduleLoaderName, {
      configPath: 'config',
      dependsOnPath: 'dependsOn'
    });
    if (moduleLoader === 'reactantPlugin') {
      const { modules } = moduleLoader;
      delete moduleLoader.modules;
      moduleLoader.modules = _.reduce(
        modules,
        (modules, module, moduleName) => {
          if (_.includes(_plugins, module.name)) modules[moduleName] = module;
          return modules;
        },
        {}
      );
    }
    return moduleLoader;
  });
  const reactant = new ConfigLoader('reactant', {
    defaultConfig,
    loaders,
    optionsConfig,
    socket: _finished ? {} : false
  });
  const { config } = reactant;
  if (!_plugins) {
    return createConfigLoader(
      optionsConfig,
      [..._moduleLoaderNames, 'reactantPlugin'],
      config.plugins
    );
  }
  if (!_finished) {
    return createConfigLoader(
      optionsConfig,
      _moduleLoaderNames,
      config.plugins,
      true
    );
  }
  return { reactant, loaders };
}

function getPlatforms(platformsLoader) {
  return _.reduce(
    platformsLoader.modules,
    (platforms, platform, platformName) => {
      platforms[platformName] = {
        ...platform,
        properties: {
          ...platform.properties,
          actions: _.reduce(
            platform.properties.actions,
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
          )
        }
      };
      return platforms;
    },
    {}
  );
}

function getPlugins(pluginsLoader) {
  return _.reduce(
    pluginsLoader.modules,
    (plugins, plugin, pluginName) => {
      plugins[pluginName] = plugin;
      return plugins;
    },
    {}
  );
}

export function rebuildConfig() {
  const config = socketGetConfig('reactant');
  return createConfig({ action: config.action, options: config.options });
}

function sanitizeOptions(options) {
  return _.reduce(
    options,
    (options, option, key) => {
      if (
        key.length &&
        key[0] !== '_' &&
        key !== 'Command' &&
        key !== 'Option' &&
        key !== 'args' &&
        key !== 'commands' &&
        key !== 'options' &&
        key !== 'rawArgs'
      ) {
        options[key] = option;
      }
      return options;
    },
    {}
  );
}
