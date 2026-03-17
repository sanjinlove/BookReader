import React, { useState, useRef } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import ToolBar from '../components/ToolBar';
import BookmarkPanel from '../components/BookmarkPanel';
import AnnotationModal from '../components/AnnotationModal';
import EpubReader from '../readers/EpubReader';
import PdfReader from '../readers/PdfReader';
import TxtReader from '../readers/TxtReader';

export default function ReaderScreen({ route, navigation }) {
  const { bookId, title, format, filePath } = route.params;

  const [showBar, setShowBar] = useState(true);
  const [showBmPanel, setShowBmPanel] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [selection, setSelection] = useState(null);
  const [position, setPosition] = useState(null);
  const [fontSize, setFontSize] = useState(100);
  const [dark, setDark] = useState(false);

  const readerRef = useRef(null);

  const onTextSelected = (sel) => {
    setSelection(sel);
    setShowAnnModal(true);
  };

  const onBookmarkNav = (bm) => {
    setShowBmPanel(false);
    readerRef.current?.goToPosition?.(bm.position);
  };

  const Reader = { epub: EpubReader, pdf: PdfReader, txt: TxtReader }[format];
  if (!Reader) return null;

  return (
    <SafeAreaView style={[styles.c, dark && { backgroundColor: '#0f0f23' }]}>
      {showBar && (
        <ToolBar
          title={title}
          bookId={bookId}
          currentPosition={position}
          darkMode={dark}
          onBack={() => navigation.goBack()}
          onToggleBookmarks={() => setShowBmPanel(true)}
          onFontUp={() => setFontSize(s => Math.min(200, s + 10))}
          onFontDown={() => setFontSize(s => Math.max(60, s - 10))}
          onToggleDark={() => setDark(d => !d)}
        />
      )}

      <View style={{ flex: 1 }}>
        <Reader
          ref={readerRef}
          bookId={bookId}
          filePath={filePath}
          fontSize={fontSize}
          darkMode={dark}
          onTextSelected={onTextSelected}
          onPositionChange={setPosition}
          onTap={() => setShowBar(b => !b)}
        />
      </View>

      <BookmarkPanel
        visible={showBmPanel}
        bookId={bookId}
        onClose={() => setShowBmPanel(false)}
        onNavigate={onBookmarkNav}
      />

      <AnnotationModal
        visible={showAnnModal}
        bookId={bookId}
        selectedText={selection}
        onClose={() => { setShowAnnModal(false); setSelection(null); }}
        onDone={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#fff' },
});