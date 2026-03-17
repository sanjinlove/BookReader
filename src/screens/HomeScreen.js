import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, Dimensions, SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Storage from '../services/StorageService';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const COLORS = { epub: '#e94560', pdf: '#0f3460', txt: '#16213e' };
const ICONS = { epub: '📖', pdf: '📄', txt: '📝' };

export default function HomeScreen({ navigation }) {
  const [books, setBooks] = useState([]);

  // 每次回到这个页面就刷新书架
  useFocusEffect(useCallback(() => {
    Storage.getBooks().then(setBooks);
  }, []));

  // ======== 导入书籍 ========
  const importBook = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      const name = file.name;
      const ext = name.split('.').pop().toLowerCase();

      if (!['epub', 'pdf', 'txt'].includes(ext)) {
        Alert.alert('❌ 不支持', '只支持 epub / pdf / txt');
        return;
      }

      // 复制到 App 专属目录
      const dir = FileSystem.documentDirectory + 'books/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const id = Date.now().toString();
      const dest = dir + id + '.' + ext;
      await FileSystem.copyAsync({ from: file.uri, to: dest });

      const book = {
        id,
        title: name.replace(/\.[^/.]+$/, ''),
        format: ext,
        filePath: dest,
        progress: 0,
        addedAt: new Date().toISOString(),
      };

      const list = await Storage.addBook(book);
      setBooks(list);
      Alert.alert('✅ 成功', `《${book.title}》已加入书架`);
    } catch (err) {
      Alert.alert('导入失败', err.message);
    }
  };

  // ======== 长按删除 ========
  const confirmDelete = (book) => {
    Alert.alert('删除', `确定删除《${book.title}》？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(book.filePath, { idempotent: true });
          await Storage.deleteBook(book.id);
          const list = await Storage.getBooks();
          setBooks(list);
        }
      },
    ]);
  };

  // ======== 渲染单本书 ========
  const renderBook = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Reader', {
        bookId: item.id, title: item.title,
        format: item.format, filePath: item.filePath,
      })}
      onLongPress={() => confirmDelete(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.cover, { backgroundColor: COLORS[item.format] || '#333' }]}>
        <Text style={{ fontSize: 48 }}>{ICONS[item.format] || '📄'}</Text>
        <Text style={styles.badge}>{item.format.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {item.progress > 0 && (
          <View style={styles.progBox}>
            <View style={[styles.progBar, { width: `${Math.min(100, item.progress)}%` }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 64 }}>📚</Text>
            <Text style={styles.emptyTitle}>书架空空如也</Text>
            <Text style={styles.emptyHint}>点击下方按钮导入 epub / pdf / txt</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={importBook}>
        <Text style={styles.fabText}>＋ 导入书籍</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  list: { padding: 12, paddingBottom: 100 },
  card: {
    width: CARD_W, margin: 6, borderRadius: 12,
    backgroundColor: '#1a1a2e', overflow: 'hidden',
  },
  cover: {
    height: CARD_W * 1.2, justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    marginTop: 8, color: '#fff', fontSize: 13, fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12,
    paddingVertical: 3, borderRadius: 10, overflow: 'hidden',
  },
  info: { padding: 10 },
  title: { color: '#eee', fontSize: 13, fontWeight: '600' },
  progBox: { marginTop: 8, height: 3, backgroundColor: '#333', borderRadius: 2 },
  progBar: { height: 3, backgroundColor: '#e94560', borderRadius: 2 },
  empty: { alignItems: 'center', marginTop: 140 },
  emptyTitle: { color: '#eee', fontSize: 18, marginTop: 16, fontWeight: '600' },
  emptyHint: { color: '#888', fontSize: 14, marginTop: 8 },
  fab: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    backgroundColor: '#e94560', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 30,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});