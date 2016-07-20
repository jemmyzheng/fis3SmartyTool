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

fis3.cli = fis3Cli;

program
  .version(packageConf.version + ' 基于fis3-' + fis3Cli.info.version)
  .usage('[command] [options]');

program
  .command('dev [modulePath]')
  .description('以开发模式启动本地测试环境并编译模块')
  .action(function (modulePath) {
    if (!modulePath) {
      fis.log.info('你未指定模块所在目录,工具将以项目根目录为检索对象');
    }
    devFunc(modulePath);
  });
//.on('dev', devFunc);
program.parse(process.argv);
