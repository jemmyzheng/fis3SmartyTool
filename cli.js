#!/usr/bin/env node

/**
 * Created by zhengwei on 16/7/19.
 * PanshiTool
 * 基于fis3-smarty解决方案的定制化开发命令集合
 */
var path = require('path');
var fs = require('fs');
var program = require('commander');
var Liftoff = require('liftoff');
var fis3 = require('fis3');
var fis3Cli = require('./lib/fis3cli');
var utils = require('./lib/utils');
var packageConf = require('./package.json');

/*
 * 实例化一个Liftoff对象,用来加载fis
 * */
var cli = new Liftoff({
  name: 'fis3',
  processTitle: 'fis',
  moduleName: 'fis3',
  configName: 'fis-conf',

  // only js supported!
  extensions: {
    '.js': null
  }
});
var lunchEnv = function (argv) {
  return {
    cwd: argv.r || argv.root,
    configPath: argv.f || argv.file
  }
};
var runFis = function (argv) {
  return function (env) {
    /*
     * 不使用全局fis3,保持fis3的版本由该工具控制
     * */
    fis3.require.paths.unshift(path.join(__dirname, 'node_modules'));
    fis3.cli.name = this.name;
    fis3.cli.run(argv, env);
  }
};
/*
 * 启动(重启)测试服务器
 * */
var server = function (comd,opt) {
  var fisArgv = {_:['server']};
  fisArgv._.push(comd);
  fisArgv.port = opt || 8686;
  fis.log.info('%s本地开发服务器: 端口%s', comd === 'start' ? '启动':'关闭',fisArgv.port);
  cli.launch({}, runFis(fisArgv));
};
/*
* 获取模块目录下的所有fis3配置文件
* */
var getFisConfigs = function (p) {
  return utils.getFisConfigs(process.cwd(),p || '')
    .then(function (fileNames) {
      if (!fileNames.length) {
        fis.log.warn('当前目录[%s]未检索到模块,请检查是否正确配置fis3', p || '项目根目录');
        return false;
      }
      return fileNames;
    });
};
/*
 * 根据模块配置信息依次编译
 * */
var release = function (module,env) {
  var fisArgv = {_:['release']};
  fisArgv.r = program.root ? path.join(program.root, module) : module;
  if (env) {
    fisArgv.d = path.join('.','.output');
    fisArgv._.push(env);
  }
  fis.log.info('当前编译的模块: %s', module);
  cli.launch(lunchEnv(fisArgv), runFis(fisArgv));
  return true;
};
var releaseAll = function (configs, env) {
  configs.every(function (fileFullName) {
    var moduleDir = path.basename(path.dirname(fileFullName));
    var fisArgv = {_:['release']};
    fisArgv.r = program.root ? path.join(program.root, moduleDir) : moduleDir;
    if (env) {
      fisArgv.d = path.join('.','.output');
      fisArgv._.push(env);
    }
    fis.log.info('当前编译的模块: %s', moduleDir);
    var runFuc = runFis(fisArgv);
    cli.launch(lunchEnv(fisArgv), runFuc);
    return true;
  });
};
/*
* 在某一模块下,启动fis3的文件监听。
* */
var watch = function (reload) {
  var fisArgv = {_:['release'],w:true};
  fisArgv.L = reload || false;
  if (~process.argv.indexOf('--child-flag')){
    fis.log.info('监听启动:');
  }
  cli.launch({},runFis(fisArgv));
};
/*var devFunc = function devFunc() {
  getFisConfigs(program.root).then(function (fileNames) {
    releaseAll(fileNames);
    server("start",program.port);
  });
};*/
var devFunc = function devFunc(p) {
  var modulePath = p || '';
  utils.getFisConfigs(process.cwd(),modulePath)
    .then(function (fileNames) {
      if (!fileNames.length) {
        fis.log.warn('当前目录[%s]未检索到模块,请检查是否正确配置fis3', modulePath || '项目根目录');
      }
      fileNames.every(function (fileFullName) {
        var moduleDir = path.basename(path.dirname(fileFullName));
        var fisArgv = {_:[]};
        fisArgv._.push('release');
        fisArgv.r = modulePath ? path.join(modulePath, moduleDir) : moduleDir;
        cli.launch({
          cwd: fisArgv.r || fisArgv.root,
          configPath: fisArgv.f || fisArgv.file
        }, function (env) {
          /*
           * 不使用全局fis3,保持fis3的版本由该工具控制
           * */
          fis3.require.paths.unshift(path.join(__dirname, 'node_modules'));
          fis3.cli.name = this.name;
          fis3.cli.run(fisArgv, env);
        });
        return true;
      });
    });
};

var outPutAll = function outPut(todo) {
  getFisConfigs(program.root).then(function (fileNames) {
    releaseAll(fileNames,todo)
  });
};

fis3.cli = fis3Cli;

program
  .version(packageConf.version + ' 基于fis3-' + fis3Cli.info.version)
  .usage('[command] [options]')
  .option('-R, --root <path>', 'set the root path of modules')
  .option('-P, --port <port>', 'set the port of local server,default 8686')
  .option('-L, --live', 'use for the watch command, reload browser after release')
  .option('-M, --major', 'deploy the major change')
  .option('-m, --minor', 'deploy the minor change')
  .option('-p, --patch', 'deploy the patch change')
  .option('--child-flag','(no need set!)run the watch as child process');
program
  .command('dev [options]')
  .description('release module as development and start local test server')
  .action(function () {
    if (!program.root) {
      fis.log.info('你未指定模块们所在目录,工具将以项目根目录为检索对象');
    }
    devFunc(program.root);
  });
program
  .command('server <toDo>')
  .description('start or stop the local server')
  .action(function (toDo) {
    if (~['start','stop'].indexOf(toDo)){
      server(toDo);
    } else {
      fis.log.error('没有你要的[%s]操作,请查看帮助信息',toDo);
    }
  });
program
  .command('watch [options]')
  .description('watch files change,after changed will release automatic')
  .action(function () {watch(program.live || false);});
program
  .command('deploy [modulePath] [options...]')
  .description('deploy to the server side,this way will minify asset files ,uglify scripts and update version')
  .action(function (modulePath) {
    var confPath = path.join(process.cwd(),'fst.config');
    var ftsConf = require(confPath);
    outPutAll(modulePath,'prod');
    //console.log(ftsConf);
  })
;
program.parse(process.argv);
