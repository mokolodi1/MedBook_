var title = document.title;
var url = document.location.href;

var $MedBookShare = $('#MedBookShare');
$('<div id="MedBookShare" style="z-index:1002; display:block;top: 0; left: 0; width: 100%; height: 2000px;"></div>').appendTo('body');
$('<div id="MedBookShareBackground" onclick="$(\'MedBookShare\').hide()" style="display:block; position: absolute; top: 0; left: 0; width: 100%; height: 2000px; background-color: lightblue; z-index:1001; -moz-opacity: 0.6; opacity:.60; filter: alpha(opacity=40);"; class="black_overlay"></div>').appendTo('#MedBookShare');
$('<div id="MedBookShareContent" style="display:block; position: absolute; top: 25%; left: 25%; width: 1000px; height: 1000px; padding: 16px; border: 1px solid orange; background-color: white; overflow: auto;"; class="white_content">').appendTo('#MedBookShare');
$('<iframe src="/post" id="MedBookIframe" style="width:100%;height:100%;"></iframe> </div>').appendTo('#MedBookShareContent');
