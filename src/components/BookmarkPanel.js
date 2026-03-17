import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import Storage from '../services/StorageService';

export default function BookmarkPanel({ visible, bookId, onClose, onNavigate }) {
  const [tab, setTab] = useState('bm');    // bm | an | hl
  const [bookmarks, setBm] = useState([]);
  const [annotations, setAn] = useState([]);
  const [highlights, setHl] = useState([]);

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const load = async () => {
    setBm(await Storage.getBookmarks(bookId));
    setAn(await Storage.getAnnotations(bookId));
    setHl(await Storage.getHighlights(bookId));
  };

  const deleteBm = async (id) => { await Storage.removeBookmark(bookId, id); load(); };
  const deleteAn = async (id) => { await Storage.removeAnnotation(bookId, id); load(); };
  const deleteHl = async (id) => { await Storage.removeHighlight(bookId, id); load(); };

  const DATA = {
    bm: {
      list: bookmarks,
      empty: '暂无书签\n点击工具栏 🔖 添加',
      render: ({ item }) => (
        <TouchableOpacity style={styles.item} onPress={() => onNavigate(item)}>
          <Text style={styles.itemIcon}>🔖</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteBm(item.id)}>
            <Text style={styles.del}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ),
    },
    an: {
      list: annotations,
      empty: '暂无注释\n长按文字可添加注释',
      render: ({ item }) => (
        <TouchableOpacity style={styles.item} onPress={() => onNavigate(item)}>
          <Text style={styles.itemIcon}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.quote} numberOfLines={1}>"{item.selectedText}"</Text>
            <Text style={styles.note}>{item.note}</Text>
            <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteAn(item.id)}>
            <Text style={styles.del}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ),
    },
    hl: {
      list: highlights,
      empty: '暂无高亮',
      render: ({ item }) => (
        <TouchableOpacity style={styles.item} onPress={() => onNavigate(item)}>
          <Text style={styles.itemIcon}>🖍</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quote, { backgroundColor: item.color || '#ffeb3b44' }]} numberOfLines={2}>
              "{item.text}"
            </Text>
            <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteHl(item.id)}>
            <Text style={styles.del}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ),
    },
  };

  const cur = DATA[tab];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.panel}>

          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.headerT}>📋 笔记本</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab 栏 */}
          <View style={styles.tabs}>
            {[
              { key: 'bm', label: '🔖 书签' },
              { key: 'an', label: '💬 注释' },
              { key: 'hl', label: '🖍 高亮' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, tab === t.key && styles.tabOn]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabT, tab === t.key && styles.tabTOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 列表 */}
          <FlatList
            data={cur.list}
            renderItem={cur.render}
            keyExtractor={i => i.id}
            style={{ paddingHorizontal: 12 }}
            ListEmptyComponent={
              <Text style={styles.empty}>{cur.empty}</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 30,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  headerT: { color: '#eee', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { color: '#e94560', fontSize: 22, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: '#e94560' },
  tabT: { color: '#888', fontSize: 13 },
  tabTOn: { color: '#e94560', fontWeight: '600' },
  item: {
    backgroundColor: '#16213e', borderRadius: 10, marginTop: 10,
    padding: 12, flexDirection: 'row', alignItems: 'flex-start',
  },
  itemIcon: { fontSize: 20, marginRight: 10 },
  itemLabel: { color: '#eee', fontSize: 14, fontWeight: '500' },
  itemDate: { color: '#555', fontSize: 11, marginTop: 3 },
  quote: { color: '#bbb', fontSize: 13, fontStyle: 'italic', borderRadius: 4, overflow: 'hidden' },
  note: { color: '#eee', fontSize: 14, marginTop: 3 },
  del: { color: '#e94560', fontSize: 18, fontWeight: 'bold', padding: 4 },
  empty: { color: '#555', textAlign: 'center', marginTop: 50, fontSize: 14, lineHeight: 22 },
});