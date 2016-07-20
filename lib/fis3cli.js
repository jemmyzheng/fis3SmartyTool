/**
 * Created by zhengwei on 16/7/19.
 */
/**
 * 命令行相关的信息和工具类方法暴露在此模块中。
 * @namespace fis.cli
 */
var fis3cli = module.exports = require('fis3/lib/cli');

var path = require('path');

/**
 * fis命令行执行入口。
 * @param  {Array} argv 由 {@link https://github.com/substack/minimist minimist} 解析得到的 argv, 已经转换成了对象。
 * @param  {Array} env  liftoff env
 * @name run
 * @memberOf fis.cli
 * @function
 */
fis3cli.run = function(argv, env) {
  var cmdName = argv._[0];
  if (argv.verbose) {
    fis.log.level = fis.log.L_ALL;
  }

  fis.set('options', argv);
  fis.project.setProjectRoot(env.cwd);

  // 如果指定了 media 值
  if (~['release', 'inspect'].indexOf(cmdName) && argv._[1]) {
    fis.project.currentMedia(argv._[1]);
  }

  env.configPath = env.configPath || argv.f || argv.file;
  fis.log.throw = cmdName !== 'release';

  if (env.configPath) {
    try {
      require(env.configPath);
    } catch (e) {
      if (~['release', 'inspect'].indexOf(cmdName)) {
        fis.log.error('Load %s error: %s \n %s', env.configPath, e.message, e.stack);
      } else {
        fis.log.warn('Load %s error: %s', env.configPath, e.message);
      }
    }

    fis.emit('conf:loaded');
    if (fis.project.currentMedia() !== 'dev' && !~Object.keys(fis.config._groups).indexOf(fis.project.currentMedia())) {
      fis.log.warn('You don\'t have any configurations under the media `%s`, are you sure?', fis.project.currentMedia());
    }
  }

  if (fis.media().get('options.color') === false) {
    fis3cli.colors.mode = 'none';
  }

  var location = env.modulePath ? path.dirname(env.modulePath) : path.join(__dirname, '../');
  fis.log.info('正在执行 %s (%s)', fis3cli.name, location);
  fis.log.info('当前编译的模块: %s', path.basename(argv.r));
  if (!argv._.length) {
    fis3cli[argv.v || argv.version ? 'version' : 'help']();
  } else {
    // tip
    // if (cmdName === 'release' && !env.modulePath) {
    //   fis.log.warning('Local `fis3` not found, use global version instead.');
    // }

    //register command
    var commander = fis3cli.commander = require('commander');
    var cmd = fis.require('command', cmdName);

    if (cmd.register) {
      // [node, realPath(bin/fis.js)]
      var argvRaw = process.argv;
      //fix args
      var p = argvRaw.indexOf('--no-color');
      ~p && argvRaw.splice(p, 1);

      p = argvRaw.indexOf('--media');
      ~p && argvRaw.splice(p, argvRaw[p + 1][0] === '-' ? 1 : 2);

      // 兼容旧插件。
      cmd.register(
        commander
          .command(cmd.name || first)
          .usage(cmd.usage)
          .description(cmd.desc)
      );
      commander.parse(argvRaw);
    } else {
      cmd.run(argv, fis3cli, env);
    }
  }
};