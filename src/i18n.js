var langPackage = require('langpackage');
const setting = require('./setting')
let curLang = 'cn';
let langPack = {};

langPack.i18n = new langPackage();
langPack.i18n.pushPhrase('en', 'English');
langPack.i18n.pushPhrase('cn', '简体中文');


langPack.cn = new langPackage();
//if()
langPack.cn.pushPhrase('&New', '&新对局');
langPack.cn.pushPhrase('New &Window', '新窗口');
langPack.cn.pushPhrase('&Open…', '打开');
langPack.cn.pushPhrase('&Save', '保存');
langPack.cn.pushPhrase('Sa&ve As…', '另存为');
langPack.cn.pushPhrase('&Clipboard', '剪贴板');
langPack.cn.pushPhrase('&Load SGF', '加载SGF');
langPack.cn.pushPhrase('&Copy SGF', '复制SGF');
langPack.cn.pushPhrase('Copy &ASCII Diagram', '复制ASCII图表');
langPack.cn.pushPhrase('Game &Info', '对局信息');
langPack.cn.pushPhrase('&Manage Games…', '管理对局');
langPack.cn.pushPhrase('&Preferences…', '设置');
langPack.cn.pushPhrase('&Play', '对局');
langPack.cn.pushPhrase('&Toggle Player', '切换黑白');
langPack.cn.pushPhrase('&Select Point', '选择点');
langPack.cn.pushPhrase('&Pass', '过');
langPack.cn.pushPhrase('&Resign', '认输');
langPack.cn.pushPhrase('&Estimate', '形势判断');
langPack.cn.pushPhrase('Sc&ore', '点目');
langPack.cn.pushPhrase('&Edit', '编辑');
langPack.cn.pushPhrase('Toggle &Edit Mode', '切换编辑模式');
langPack.cn.pushPhrase('&Select Tool', '选择工具');
langPack.cn.pushPhrase('&Stone Tool', '棋子');
langPack.cn.pushPhrase('&Cross Tool', '十字');
langPack.cn.pushPhrase('&Triangle Tool', '三角形');
langPack.cn.pushPhrase('C&ircle Tool', '圆形');
langPack.cn.pushPhrase('&Line Tool', '线');
langPack.cn.pushPhrase('&Arrow Tool', '箭头');
langPack.cn.pushPhrase('La&bel Tool', '标签');
langPack.cn.pushPhrase('&Number Tool', '数字');
langPack.cn.pushPhrase('&Copy Variation', '复制变化');
langPack.cn.pushPhrase('Cu&t Variation', '剪切变化');
langPack.cn.pushPhrase('&Paste Variation', '粘贴变化');
langPack.cn.pushPhrase('Make Main &Variation', '生成主变化');
langPack.cn.pushPhrase('Shift &Left', '左移');
langPack.cn.pushPhrase('Shift Ri&ght', '右移');
langPack.cn.pushPhrase('&Flatten', '平坦？');
langPack.cn.pushPhrase('&Remove Node', '移除节点');
langPack.cn.pushPhrase('Remove &Other Variations', '移除其他变化');
langPack.cn.pushPhrase('Fin&d', '查找');
langPack.cn.pushPhrase('Toggle &Find Mode', '切换查找模式');
langPack.cn.pushPhrase('Find &Next', '下一个');
langPack.cn.pushPhrase('Find &Previous', '上一个');
langPack.cn.pushPhrase('Toggle &Hotspot', '切换热点');
langPack.cn.pushPhrase('Jump to Ne&xt Hotspot', '下一个热点');
langPack.cn.pushPhrase('Jump to Pre&vious Hotspot', '上一个热点');
langPack.cn.pushPhrase('&Navigation', '导航');
langPack.cn.pushPhrase('&Back', '后退');
langPack.cn.pushPhrase('&Forward', '前进');
langPack.cn.pushPhrase('Go to &Previous Fork', '上一个分支');
langPack.cn.pushPhrase('Go to &Next Fork', '下一个分支');
langPack.cn.pushPhrase('Go to Previous Commen&t', '上条评论');
langPack.cn.pushPhrase('Go to Next &Comment', '下一条评论');
langPack.cn.pushPhrase('Go to Be&ginning', '开始');
langPack.cn.pushPhrase('Go to &End', '结尾');
langPack.cn.pushPhrase('Go to &Main Variation', '主变化');
langPack.cn.pushPhrase('Go to Previous &Variation', '上一个变化');
langPack.cn.pushPhrase('Go to Next Va&riation', '下一个变化');
langPack.cn.pushPhrase('Go to Move N&umber', '移动到某一手');
langPack.cn.pushPhrase('Go to Ne&xt Game', '下一对局');
langPack.cn.pushPhrase('Go to Previou&s Game', '上一对局');
langPack.cn.pushPhrase('Eng&ines', 'AI引擎');
langPack.cn.pushPhrase('Manage &Engines…', '管理引擎');
langPack.cn.pushPhrase('&Attach…', '附着');
langPack.cn.pushPhrase('&Detach', '分离');
langPack.cn.pushPhrase('&Suspend', '中止');
langPack.cn.pushPhrase('S&ynchronize', '同步');
langPack.cn.pushPhrase('Toggle A&nalysis', '切换分析');
langPack.cn.pushPhrase('Start &Playing', '恢复下棋');
langPack.cn.pushPhrase('Generate &Move', 'AI走棋');
langPack.cn.pushPhrase('Toggle &GTP Console', '切换GTP终端');
langPack.cn.pushPhrase('&Clear Console', '清空终端');
langPack.cn.pushPhrase('&Tools', '工具');
langPack.cn.pushPhrase('Toggle Auto&play Mode', '切换自动下棋模式');
langPack.cn.pushPhrase('Toggle &Guess Mode', '切换竞猜模式');
langPack.cn.pushPhrase('Clean &Markup…', '清除标记');
langPack.cn.pushPhrase('&Edit SGF Properties…', '编辑SGF属性');
langPack.cn.pushPhrase('&Rotate Clockwise', '顺时针旋转');
langPack.cn.pushPhrase('Rotate &Anticlockwise', '逆时针旋转');
langPack.cn.pushPhrase('&View', '视图');
langPack.cn.pushPhrase('Toggle Menu &Bar', '切换菜单栏');
langPack.cn.pushPhrase('Toggle &Full Screen', '切换全屏');
langPack.cn.pushPhrase('Show &Coordinates', '显示坐标');
langPack.cn.pushPhrase('Show Move Colori&zation', '显示移动着色');
langPack.cn.pushPhrase('Show &Next Moves', '显示下一步');
langPack.cn.pushPhrase('Show &Sibling Variations', '显示同级变化');
langPack.cn.pushPhrase('Show Game &Tree', '显示对局树');
langPack.cn.pushPhrase('Show Co&mments', '显示评论');
langPack.cn.pushPhrase('Z&oom', '缩放');
langPack.cn.pushPhrase('Increase', '放大');
langPack.cn.pushPhrase('Decrease', '缩小');
langPack.cn.pushPhrase('Reset', '重置');
langPack.cn.pushPhrase('&Help', '帮助');
langPack.cn.pushPhrase('GitHub &Repository', 'Github仓库');
langPack.cn.pushPhrase('Report &Issue', '报告问题');


module.exports.get=function(str)
{   
    var i18nStr = '';
    if(curLang != 'en')        
        i18nStr = langPack[curLang].get(str);
    if(i18nStr.length == 0)
        i18nStr = str;
    
    return i18nStr;
}



