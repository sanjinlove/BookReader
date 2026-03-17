import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import Storage from '../services/StorageService';

const EpubReader = forwardRef(({
  bookId, filePath, fontSize, darkMode,
  onTextSelected, onPositionChange, onTap,
}, ref) => {
  const wv = useRef(null);
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');

  useImperativeHandle(ref, () => ({
    goToPosition(pos) { inject('goTo', { cfi: pos.cfi }); },
  }));

  const inject = (type, data = {}) => {
    wv.current?.injectJavaScript(
      `try{handleMsg(${JSON.stringify({ type, data })})}catch(e){} true;`
    );
  };

  useEffect(() => { inject('setFontSize', { size: fontSize }); }, [fontSize]);
  useEffect(() => { inject('setTheme', { dark: darkMode }); }, [darkMode]);

  useEffect(() => {
    (async () => {
      try {
        const b64 = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const saved = await Storage.getPosition(bookId);
        setHtml(buildHTML(b64, saved?.cfi || null));
      } catch (err) {
        console.error("读取 EPUB 失败:", err);
      }
    })();
  }, []);

  const onMessage = async (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') setLoading(false);
      if (msg.type === 'loc') {
        const pos = {
          cfi: msg.cfi, percentage: msg.pct,
          label: `${Math.round((msg.pct || 0) * 100)}%`,
        };
        onPositionChange?.(pos);
        await Storage.savePosition(bookId, pos);
        await Storage.updateBook(bookId, { progress: (msg.pct || 0) * 100 });
      }
      if (msg.type === 'sel') {
        onTextSelected?.({ text: msg.text, position: { cfi: msg.cfi } });
      }
      if (msg.type === 'tap') onTap?.();
    } catch {}
  };

  if (!html) return <View style={s.center}><ActivityIndicator size="large" color="#e94560" /></View>;

  return (
    <View style={{ flex: 1 }}>
      {loading && <View style={s.overlay}><ActivityIndicator size="large" color="#e94560" /></View>}
      <WebView
        ref={wv} 
        originWhitelist={['*']}
        source={{ html }} 
        onMessage={onMessage}
        javaScriptEnabled 
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        style={{ flex: 1, backgroundColor: darkMode ? '#1a1a2e' : '#fff' }}
      />
    </View>
  );
});

/* ---------- 生成 WebView 里运行的完整 HTML ---------- */
function buildHTML(b64, savedCfi) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"><\/script>
<style>
*{margin:0;padding:0}
html,body{height:100%;width:100%;overflow:hidden;background:#fff;}
#v{width:100%;height:100%;}
</style></head><body>
<div id="v"></div>
<script>
var book,rend;
function S(t,d){try{window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:t},d||{})))}catch(e){}}

function handleMsg(m){
  if(!rend)return;
  if(m.type==='goTo') rend.display(m.data.cfi);
  if(m.type==='setFontSize') rend.themes.fontSize(m.data.size+'%');
  if(m.type==='setTheme'){
    if(m.data.dark){
      rend.themes.override('color','#d4d4d4');
      rend.themes.override('background','#1a1a2e');
      document.body.style.background='#1a1a2e';
    }else{
      rend.themes.override('color','#333');
      rend.themes.override('background','#fff');
      document.body.style.background='#fff';
    }
  }
}

(async function(){
  try{
    var raw=atob('${b64}');
    var u8=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) u8[i]=raw.charCodeAt(i);

    book=ePub(u8.buffer);
    rend=book.renderTo('v',{
      width:'100%',
      height:'100%',
      spread:'none',
      flow:'paginated'
    });
    rend.themes.default({'body':{'font-family':'-apple-system,sans-serif'},'p':{'line-height':'1.8'}});

    // ======== 关键修复：加入移动端手势监听 ========
    rend.hooks.content.register(function(contents) {
        var doc = contents.document;
        var startX = 0;
        var startY = 0;

        doc.addEventListener('touchstart', function(e) {
            startX = e.changedTouches[0].clientX;
            startY = e.changedTouches[0].clientY;
        }, false);

        doc.addEventListener('touchend', function(e) {
            var endX = e.changedTouches[0].clientX;
            var endY = e.changedTouches[0].clientY;
            var diffX = endX - startX;
            var diffY = endY - startY;

            // 1. 判断是否为左右滑动 (滑动超过 40px)
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) rend.prev(); // 向右滑，上一页
                else rend.next();           // 向左滑，下一页
            } 
            // 2. 如果没滑动，那就是点击 (容差 10px)
            else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
                var w = window.innerWidth;
                if (endX < w * 0.3) rend.prev();        // 点左边 30% 区域：上一页
                else if (endX > w * 0.7) rend.next();   // 点右边 30% 区域：下一页
                else S('tap');                          // 点中间：呼出菜单栏
            }
        }, false);
    });
    // ==============================================

    ${savedCfi ? `rend.display('${savedCfi}');` : 'rend.display();'}

    rend.on('relocated',function(loc){
      var p=0;
      try{p=book.locations.percentageFromCfi(loc.start.cfi)}catch(e){}
      S('loc',{cfi:loc.start.cfi,pct:p});
    });

    rend.on('selected',function(cfi,contents){
      try{
        var r=rend.getRange(cfi);
        var t=r?r.toString():'';
        if(t.length>0) S('sel',{cfi:cfi,text:t});
      }catch(e){}
    });

    await book.ready;
    await book.locations.generate(1600);
    S('ready');
  }catch(err){
    S('error',{msg:err.message});
  }
})();
<\/script></body></html>`;
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center',
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10,
  },
});

export default EpubReader;