var title = document.title;
var url = document.location.href;

function getSvg() {
    var $post_svg = $('svg');
    if ($post_svg.length == 1)
        $post_svg = $post_svg.html();
    else
        $post_svg = null;
    return $post_svg;
};

var $MedBookShare = $('#MedBookShare');
$('<div id="MedBookShare" style="z-index:1000; display:block;top: 0; left: 0; width: 100%; height: 2000px;"></div>').appendTo('body');
$('<div id="MedBookShareBackground" onclick="$(\'#MedBookShare\').remove()" style="display:block; position: absolute; top: 0; left: 0; width: 100%; height: 2000px; background-color: lightblue; z-index:1001; -moz-opacity: 0.6; opacity:.60; filter: alpha(opacity=40);"; class="black_overlay"></div>').appendTo('#MedBookShare');
$('<div id="MedBookShareContent" style="z-index:1002; -moz-opacity: 1.0; opacity:1.0; filter: alpha(opacity=100);display:block; position: absolute; top: 25%; left: 25%; width: 960px; height: 1000px; padding: 16px; border: 1px solid orange; background-color: white; overflow: auto;"; class="white_content">').appendTo('#MedBookShare');
$('<iframe src="/post" id="MedBookIframe" style="width:100%;height:100%;"></iframe> </div>').appendTo('#MedBookShareContent');
