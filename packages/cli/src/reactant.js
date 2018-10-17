import _ from 'lodash';
import commander from 'commander';
import action from './action';
import { handleError, ERR_NO_ACTION, ERR_NO_PLATFORM } from './errors';
import { createConfig } from './config';
import { version } from '../package';
import { loadReactantPlatform, getReactantPlatforms } from './platform';

let isAction = false;

function getActions() {
  const config = createConfig({});
  let actions = [];
  _.each(getReactantPlatforms(config), platformName => {
    const platform = loadReactantPlatform(config, platformName);
    _.each(_.keys(platform.actions), action => {
      actions = _.uniq([...actions, action]);
    });
  });
  return actions;
}

_.each(getActions(), action => {
  commander.command(action);
});
commander.version(version);
commander.option('--action [action]', 'override default action');
commander.option('--clean', 'clean');
commander.option('--device [device]', 'run on device');
commander.option('--expo-platform [name]', 'expo platform name');
commander.option('--inotify', 'increase inotify');
commander.option('--inspect', 'inspect');
commander.option('--inspect-brk', 'inpsect break');
commander.option('--offline', 'offline');
commander.option('--simulator [simulator]', 'run on simulator');
commander.option('-a --analyze', 'analyze bundle');
commander.option('-c --config [config]', 'config');
commander.option('-d --debug', 'debug logging');
commander.option('-p --platform [name]', 'platform name');
commander.option('-s --storybook', 'storybook');
commander.option('-v --verbose', 'verbose logging');
commander.action((cmd, options) => {
  try {
    isAction = true;
    if (!options) throw ERR_NO_ACTION;
    if (!options.platform) throw ERR_NO_PLATFORM;
    return action(cmd, options).catch(handleError);
  } catch (err) {
    return handleError(err);
  }
});
commander.parse(process.argv);

if (!isAction) {
  handleError(ERR_NO_ACTION);
}
