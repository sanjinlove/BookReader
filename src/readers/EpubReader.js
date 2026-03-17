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
      const b64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const saved = await Storage.getPosition(bookId);
      setHtml(buildHTML(b64, saved?.cfi || null));
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
        ref={wv} originWhitelist={['*']}
        source={{ html }} onMessage={onMessage}
        javaScriptEnabled domStorageEnabled
        style={{ flex: 1 }}
      />
    </View>
  );
});

/* ---------- 生成 WebView 里运行的完整 HTML ---------- */
function buildHTML(b64, savedCfi) {
  // 注意: 模板字符串里的 <\/script> 要转义
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"><\/script>
<style>
*{margin:0;padding:0}
html,body{height:100%;overflow:hidden;background:#fff}
#v{width:100%;height:100%}
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
    rend=book.renderTo('v',{width:'100%',height:'100%',spread:'none',flow:'paginated'});
    rend.themes.default({'body':{'font-family':'-apple-system,sans-serif'},'p':{'line-height':'1.8'}});

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

    rend.on('click',function(e){
      var w=window.innerWidth;
      var x=e.clientX||w/2;
      if(x<w*0.25) rend.prev();
      else if(x>w*0.75) rend.next();
      else S('tap');
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