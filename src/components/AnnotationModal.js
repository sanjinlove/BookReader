import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import Storage from '../services/StorageService';

const COLORS = [
  { label: '黄', val: 'rgba(255,235,59,0.35)' },
  { label: '绿', val: 'rgba(76,175,80,0.35)' },
  { label: '蓝', val: 'rgba(33,150,243,0.35)' },
  { label: '红', val: 'rgba(244,67,54,0.35)' },
  { label: '紫', val: 'rgba(156,39,176,0.35)' },
];

export default function AnnotationModal({ visible, bookId, selectedText, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [color, setColor] = useState(COLORS[0].val);

  const close = () => { setNote(''); onClose(); };

  const doHighlight = async () => {
    if (!selectedText) return;
    await Storage.addHighlight(bookId, {
      text: selectedText.text,
      position: selectedText.position,
      color,
    });
    onDone?.();
    close();
  };

  const doAnnotate = async () => {
    if (!selectedText || !note.trim()) return;
    await Storage.addAnnotation(bookId, {
      selectedText: selectedText.text,
      note: note.trim(),
      position: selectedText.position,
    });
    onDone?.();
    close();
  };

  if (!selectedText) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
        <View style={styles.box} onStartShouldSetResponder={() => true}>
          <Text style={styles.heading}>选中文本</Text>
          <Text style={styles.preview} numberOfLines={3}>"{selectedText.text}"</Text>

          {/* 高亮颜色 */}
          <Text style={styles.sub}>选择高亮颜色</Text>
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c.val}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.val },
                  color === c.val && styles.colorDotOn,
                ]}
                onPress={() => setColor(c.val)}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={doHighlight}>
            <Text style={styles.btnT}>🖍 添加高亮</Text>
          </TouchableOpacity>

          {/* 注释 */}
          <Text style={[styles.sub, { marginTop: 16 }]}>添加注释</Text>
          <TextInput
            style={styles.input}
            placeholder="输入你的笔记..."
            placeholderTextColor="#666"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#0f3460' }]} onPress={doAnnotate}>
            <Text style={styles.btnT}>💬 保存注释</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={close}>
            <Text style={{ color: '#888' }}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20 },
  heading: { color: '#eee', fontSize: 17, fontWeight: 'bold', marginBottom: 10 },
  preview: {
    color: '#ccc', fontSize: 14, fontStyle: 'italic',
    backgroundColor: '#16213e', padding: 10, borderRadius: 8, lineHeight: 20,
  },
  sub: { color: '#aaa', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  colorDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  colorDotOn: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
  btn: {
    backgroundColor: '#e94560', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  btnT: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: '#16213e', color: '#eee', borderRadius: 10,
    padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top',
  },
  cancel: { alignItems: 'center', marginTop: 14 },
});