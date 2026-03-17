import React, {
  useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import Storage from '../services/StorageService';

const TxtReader = forwardRef(({
  bookId, filePath, fontSize, darkMode,
  onTextSelected, onPositionChange, onTap,
}, ref) => {

  const scrollRef = useRef(null);
  const offsetY = useRef(0);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [annotations, setAnnotations] = useState([]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    goToPosition(pos) {
      if (pos.scrollY != null) {
        scrollRef.current?.scrollTo({ y: pos.scrollY, animated: true });
      }
    },
  }));

  // 加载文件
  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const text = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      // 按换行分段
      const arr = text.split(/\n/).map((t, i) => ({ idx: i, text: t }));
      setLines(arr);

      setHighlights(await Storage.getHighlights(bookId));
      setAnnotations(await Storage.getAnnotations(bookId));
      setLoading(false);

      // 恢复上次位置
      const pos = await Storage.getPosition(bookId);
      if (pos?.scrollY) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: pos.scrollY, animated: false });
        }, 400);
      }
    } catch (e) {
      console.log('TXT load error', e);
      setLoading(false);
    }
  };

  // 滚动时保存位置
  const onScroll = useCallback(async (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const total = e.nativeEvent.contentSize.height;
    const vh = e.nativeEvent.layoutMeasurement.height;
    offsetY.current = y;

    const pct = total > vh ? y / (total - vh) : 0;
    const pos = {
      scrollY: y,
      percentage: Math.min(1, pct),
      label: `${Math.round(Math.min(100, pct * 100))}%`,
    };
    onPositionChange?.(pos);
    await Storage.savePosition(bookId, pos);
    await Storage.updateBook(bookId, { progress: Math.min(100, pct * 100) });
  }, [bookId]);

  // 长按某行 → 弹出注释/高亮弹窗
  const onLongPressLine = (line) => {
    onTextSelected?.({
      text: line.text,
      position: { lineIndex: line.idx, scrollY: offsetY.current },
    });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#e94560" /></View>;
  }

  const fPx = fontSize * 0.16;
  const txtColor = darkMode ? '#d4d4d4' : '#333';
  const bg = darkMode ? '#1a1a2e' : '#faf8f5';

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.scroll, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={500}
    >
      <TouchableOpacity activeOpacity={1} onPress={onTap}>
        {lines.map((line) => {
          const hl = highlights.find(h => h.position?.lineIndex === line.idx);
          const ann = annotations.find(a => a.position?.lineIndex === line.idx);

          return (
            <View key={line.idx}>
              <TouchableOpacity
                activeOpacity={0.6}
                onLongPress={() => onLongPressLine(line)}
                delayLongPress={400}
              >
                <Text
                  style={{
                    color: txtColor,
                    fontSize: fPx,
                    lineHeight: fPx * 1.8,
                    backgroundColor: hl ? (hl.color || 'rgba(255,235,59,0.35)') : 'transparent',
                    paddingHorizontal: 4,
                    borderRadius: 3,
                  }}
                  selectable
                >
                  {line.text || '\n'}
                </Text>
              </TouchableOpacity>

              {ann && (
                <View style={styles.annBubble}>
                  <Text style={{ fontSize: 14 }}>💬 </Text>
                  <Text style={styles.annText}>{ann.note}</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 120 }} />
      </TouchableOpacity>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  annBubble: {
    flexDirection: 'row', backgroundColor: 'rgba(15,52,96,0.3)',
    borderRadius: 8, padding: 8, marginVertical: 4, marginLeft: 12,
    borderLeftWidth: 3, borderLeftColor: '#0f3460',
  },
  annText: { color: '#bbb', fontSize: 13, flex: 1 },
});

export default TxtReader;