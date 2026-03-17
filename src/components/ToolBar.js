import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Storage from '../services/StorageService';

export default function ToolBar({
  title, bookId, currentPosition, darkMode,
  onBack, onToggleBookmarks, onFontUp, onFontDown, onToggleDark,
}) {

  const addBookmark = async () => {
    if (!currentPosition) return;
    await Storage.addBookmark(bookId, {
      position: currentPosition,
      label: currentPosition.label || '未知位置',
    });
    alert('✅ 已添加书签');
  };

  const pct = currentPosition?.percentage
    ? Math.round(currentPosition.percentage * 100) + '%'
    : '';

  return (
    <View style={styles.bar}>
      {/* 第一行 */}
      <View style={styles.row}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← 返回</Text>
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        <TouchableOpacity onPress={addBookmark} style={styles.iconBtn}>
          <Text style={{ fontSize: 20 }}>🔖</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggleBookmarks} style={styles.iconBtn}>
          <Text style={{ fontSize: 20 }}>📑</Text>
        </TouchableOpacity>
      </View>

      {/* 第二行：字号 / 暗黑 / 进度 */}
      <View style={styles.row2}>
        <TouchableOpacity onPress={onFontDown} style={styles.sm}>
          <Text style={styles.smT}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onFontUp} style={styles.sm}>
          <Text style={styles.smT}>A+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleDark} style={styles.sm}>
          <Text style={styles.smT}>{darkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        {pct ? <Text style={styles.pct}>{pct}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#1a1a2e', paddingHorizontal: 12,
    paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { color: '#e94560', fontSize: 15, fontWeight: '600' },
  title: { flex: 1, color: '#eee', fontSize: 14, fontWeight: '600', marginHorizontal: 10 },
  iconBtn: { padding: 4, marginLeft: 4 },
  row2: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
    paddingTop: 6, borderTopWidth: 1, borderTopColor: '#333',
  },
  sm: {
    backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, marginRight: 6,
  },
  smT: { color: '#eee', fontSize: 14, fontWeight: '600' },
  pct: { color: '#888', fontSize: 12, marginLeft: 'auto' },
});