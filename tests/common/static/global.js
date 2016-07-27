/**
 * Created by zhengwei on 16/7/27.
 */
var tpl = __inline('common:temp/temp.hbs');
var data = {title: "My New Post", content: "This is my first post!"};
console.log(tpl(data));