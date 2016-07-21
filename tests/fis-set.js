/**
 * Created by jemmy on 16/6/7.
 * 整个项目共用的fis3配置
 */
module.exports = function(fis){
  fis.match('*.tmpl', {
    rExt: '.js',
    parser: fis.plugin('utc') // underscore 中的模板引擎
  });
  fis.match('*placeholder.jpg',{
    useHash: false
  });
  //dev开发模式
  fis.media('dev').match('*.js', {
    useHash: false,
    optimizer: null
  });
  fis.media('dev').match('*.{css,less}', {
    useHash: false,
    optimizer: null
  });
  //qa开发模式
  fis.media('qa').set('template', 'views');
  fis.media('qa').match('*.{css,less}', {
    useHash: false,
    optimizer: null
  });
  fis.media('qa').match('*.js', {
    useHash: false,
    optimizer: null
  });
  //prod开发模式
  fis.media('prod').set('template', 'views');
};