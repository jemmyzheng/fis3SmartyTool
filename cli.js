#!/usr/bin/env node

/**
 * Created by zhengwei on 16/7/19.
 * PanshiTool
 * 基于fis3-smarty解决方案的定制化开发命令集合
 */
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const program = require('commander');
const Liftoff = require('liftoff');
const _ = require('fis3/lib/util');
var fis3 = require('fis3');
const fis3Cli = require('./lib/fis3cli');
const utils = require('./lib/utils');
const packageConf = require('./package.json');
const localServer = require('fis3-command-server/lib/util');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/*
 * 实例化一个Liftoff对象,用来加载fis
 * */
var cli = new Liftoff({
  name: 'fis3',
  processTitle: 'fis',
  moduleName: 'fis3',
  configName: 'fis-conf',
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
var runFis = function (argv, command, cbCtrl, log) {
  return function (env) {
    /*
     * 不使用全局fis3,保持fis3的版本由该工具控制
     * */
    fis3.require.paths.unshift(path.join(__dirname, 'node_modules', 'fis3', 'node_modules'));
    fis3.require.paths.push(path.join(__dirname, 'node_modules'));
    fis3.cli.name = this.name;
    log && log();
    fis3.cli.run(argv, env);
    if (cbCtrl && !cbCtrl.left) {
      cbCtrl.cb && cbCtrl.cb();
    }
  }
};
/*
 * 启动(重启)测试服务器
 * */
const serverLog = {
  'start' : '启动',
  'stop' : '关闭',
  'open' : '打开'
};
var server = function (todo,port,type) {
  var fisArgv = {_:['server']};
  fisArgv._.push(todo);
  fisArgv.port = port || 8686;
  fisArgv.type = type || 'smarty';
  cli.launch({}, runFis(fisArgv,'server','',function () {
    fis.log.info('%s本地开发服务器: 端口%s', serverLog[todo] ,fisArgv.port);
  }));
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
var release = function (module,media,cbCtrl) {
  var fisArgv = {_:['release']};
  var runFuc;
  if (module) {
    fisArgv.r = program.base ? path.join(program.base, module) : module;
  }
  if (media) {
    fisArgv.d = path.join(process.cwd(),'dist');
    fisArgv._.push(media);
  }
  runFuc = runFis(fisArgv,'release',cbCtrl, function (){
    fis.log.info('当前编译的模块: %s', module || path.basename(process.cwd()));
  });
  cli.launch(lunchEnv(fisArgv), runFuc);
};
var releaseAll = function (configs, media, cb) {
  fis.log.info('开始编译指定目录下所有模块:');
  configs.every(function (fileFullName,n) {
    var moduleDir = path.basename(path.dirname(fileFullName));
    var cbCtrl = cb ? {left:configs.length - (n+1),cb: cb} : null;
    release(moduleDir,media,cbCtrl);
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
/*
* 启动开发模式
* */
var devFunc = function devFunc() {
  getFisConfigs(program.base).then(function (fileNames) {
    releaseAll(fileNames);
    server("start",program.port,program.type);
  });
};
/*
* 调用编译方法,生成编译后文件
* */
var outPutAll = function outPutAll(todo, cb) {
  getFisConfigs(program.base).then(function (fileNames) {
    releaseAll(fileNames,todo,cb);
  });
};
var outPut = function output(module,todo, cb) {
  utils.isFis3Module(process.cwd(),program.base,module).then(function () {
    release(module, todo, cb && {left:0,cb:cb});
  }, function () {
    fis.log.error('未找到指定模块[%s]的配置文件,请检查后重试',module);
  });
};

/*
* 发布编译后的文件配置文件指定的目录
* */
var getOutPath = function (conf,confName) {
  return _.isAbsolute(conf[confName]) ?
    conf[confName] : path.join(process.cwd(), conf[confName]);
};
var deploy = function deploy(conf,module) {
  return function () {
    fis.log.info('输出编译后文件到指定目录');
    var mapOutPath = getOutPath(conf, 'mapPath')
      ,staticPath = getOutPath(conf, 'staticPath')
      ,tempPath = getOutPath(conf, 'tempPath');
    /*
    * 输出静态资源
    * */
    if(staticPath) {
      staticPath = path.join(staticPath, module || '');
      _.del(staticPath);
      _.copy(path.join(process.cwd(),'dist','static',module || ''),staticPath);
    } else {
      fis.log.warn('你没有配置静态资源发布目录');
    }
    /*
    * 输出模版文件
    * */
    if (tempPath) {
      tempPath = path.join(tempPath, module || '');
      _.del(tempPath);
      _.copy(path.join(process.cwd(),'dist','views',module || ''),tempPath);
    } else {
      fis.log.warn('你没有配置模版文件发布目录');
    }
    /*
     * 输出资源映射文件
     * */
    if (mapOutPath) {
      mapOutPath = path.join(mapOutPath,module ? module+'-map.json' : '');
      _.del(mapOutPath);
      _.copy(path.join(
        process.cwd(),
        'dist',
        'config',
        module ? module+'-map.json' : ''),mapOutPath);
    } else {
      fis.log.warn('你没有配置资源映射文件发布目录');
    }
    fis.log.info('操作结束');
  };
};
/*
* 给deploy和qa用的动作
* */
var releaseAction = function (module,media) {
  _.del(path.join(process.cwd(),'dist'));
  var confPath = path.join(process.cwd(),'fst.config');
  try {
    if (module) {
      outPut(module, media, deploy(require(confPath),module));
    } else {
      outPutAll(media, deploy(require(confPath)));
    }
  } catch (e){
    fis.log.error('指定模块所在根目录[%s]下未找到fst.config',program.base || '项目根目录');
  }
};

fis3.cli = fis3Cli;// 覆盖原来的cli

/*
* 命令行设置
* */
program
  .version(packageConf.version + ' 基于fis3-' + fis3Cli.info.version)
  .usage('[command] [options]')
  .option('-b, --base <path>', 'set the root path of modules')
  .option('-P, --port <port>', 'set the port of local server,default 8686')
  .option('-T, --type <type>', 'set the type of local server,default smarty')
  .option('-L, --live', 'use for the watch command, reload browser after release')
  .option('-M, --major', 'deploy the major change')
  .option('-m, --minor', 'deploy the minor change')
  .option('-p, --patch', 'deploy the patch change')
  .option('--child-flag','(no need set!)run the watch as child process');
program
  .command('dev [options]')
  .description('release module as development and start local test server')
  .action(function () {
    if (!program.base) {
      fis.log.info('你未指定模块们所在目录,工具将以项目根目录为检索对象');
    }
    devFunc();
  });
program
  .command('server <toDo>')
  .description('start , stop or clean the local server')
  .action(function (toDo) {
    if (~['start', 'stop', 'open'].indexOf(toDo)){
      server(toDo);
    } else if (toDo === 'clean'){
      var serverInfo = localServer.serverInfo();
      fis.log.info('正在初始化本地测试服务器:');
      fis.log.info('清除静态资源目录:');
      _.del(path.join(serverInfo.root,'static'));
      fis.log.info('清除资源映射文件:');
      _.del(path.join(serverInfo.root,'config'));
      fis.log.info('清除路由配置信息:');
      _.del(path.join(serverInfo.root,'server-conf'));
      fis.log.info('清除测试数据:');
      _.del(path.join(serverInfo.root,'test'));
      fis.log.info('清除模版文件:');
      _.del(path.join(serverInfo.root,'template'));
      fis.log.info('ola');
    } else {
      fis.log.error('没有你要的[%s]操作,请查看帮助信息',toDo);
    }
    rl.close();
  });
program
  .command('watch [options]')
  .description('watch files change,after changed will release automatic')
  .action(function () {watch(program.live || false);});
program
  .command('deploy [module] [options...]')
  .description('deploy to the server side,this way will minify asset files ,uglify scripts and update version')
  .action(function (module) {
    rl.question('你正在进行发布,请确定相关特性已测试,确定?(Y/N)', function(answer) {
      if (answer.toUpperCase() === 'Y') {
        releaseAction(module,'prod');
      }
      rl.close();
    })
  });
program
  .command('qa [module] [options...]')
  .description('release the source without do any minify or uglify,but also deploy to the server side for test')
  .action(function (module) {
    fis.log.info('以测试模式编译代码,并输出到服务器端代码中');
    releaseAction(module,'qa');
    rl.close();
  });
program
  .command('release [module]')
  .description('release module alone.')
  .action(function (module) {
    release(module);
    rl.close();
  });
program.parse(process.argv);
