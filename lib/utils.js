/**
 * Created by jemmy on 16/7/19.
 * 提供工具方法
 */

var Promise = require('es6-promise').Promise;
var path = require('path');
var glob = require('glob');
module.exports = {
  /*
  * 获取Defer对象
  * @return {Object} [包含promise的对象]
  * */
  getDefer: function getDefer() {
    var deferred = {};
    deferred.promise = new Promise(function (resolve, reject){
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  },
  /*
  * promise when 方法
  * @param
  * */
  when: function when(promises) {
    var deferred = this.getDefer();
    Promise.all(promises).then(function(data) {
      deferred.resolve(data);
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  },
  /*
   * 以根目录(或指定目录)为检索目录,检索fis3的模块配置文件
   * @param {String} modulePath [模块所在的目录]
   * @param {String} cwd [命令的执行目录]
   * */
  getFisConfigs : function getFisConfigs(cwd,modulePath) {
    var readModule = this.getDefer();
    glob(path.join(cwd||'', modulePath||'', '*', 'fis-conf.js'), function (err, fileNames) {
      if (err) {
        readModule.reject(err);
      } else {
        readModule.resolve(fileNames);
      }
    });
    return readModule.promise;
  }
};
