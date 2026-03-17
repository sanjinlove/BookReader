import AsyncStorage from '@react-native-async-storage/async-storage';

/*
  数据结构说明：
  - 书籍列表:   @books → [{id, title, format, filePath, progress, ...}]
  - 书签:       @bm_书ID → [{id, label, position, createdAt}]
  - 注释:       @an_书ID → [{id, selectedText, note, position, createdAt}]
  - 高亮:       @hl_书ID → [{id, text, color, position, createdAt}]
  - 阅读位置:   @pos_书ID → {scrollY/cfi/page, percentage, updatedAt}
*/

const Storage = {

  // ========== 工具方法 ==========
  async _get(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async _set(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  // ========== 书籍 ==========
  async getBooks() {
    return (await this._get('@books')) || [];
  },

  async addBook(book) {
    const books = await this.getBooks();
    // 避免重复
    if (books.find(b => b.id === book.id)) return books;
    books.unshift(book);
    await this._set('@books', books);
    return books;
  },

  async updateBook(id, updates) {
    const books = await this.getBooks();
    const i = books.findIndex(b => b.id === id);
    if (i >= 0) {
      books[i] = { ...books[i], ...updates };
      await this._set('@books', books);
    }
  },

  async deleteBook(id) {
    const books = await this.getBooks();
    await this._set('@books', books.filter(b => b.id !== id));
    // 清理关联数据
    const keys = [`@bm_${id}`, `@an_${id}`, `@hl_${id}`, `@pos_${id}`];
    await AsyncStorage.multiRemove(keys);
  },

  // ========== 书签 ==========
  async getBookmarks(bookId) {
    return (await this._get(`@bm_${bookId}`)) || [];
  },

  async addBookmark(bookId, bm) {
    const list = await this.getBookmarks(bookId);
    list.push({ ...bm, id: Date.now().toString(), createdAt: new Date().toISOString() });
    await this._set(`@bm_${bookId}`, list);
    return list;
  },

  async removeBookmark(bookId, bmId) {
    const list = await this.getBookmarks(bookId);
    const filtered = list.filter(b => b.id !== bmId);
    await this._set(`@bm_${bookId}`, filtered);
    return filtered;
  },

  // ========== 注释 ==========
  async getAnnotations(bookId) {
    return (await this._get(`@an_${bookId}`)) || [];
  },

  async addAnnotation(bookId, ann) {
    const list = await this.getAnnotations(bookId);
    list.push({ ...ann, id: Date.now().toString(), createdAt: new Date().toISOString() });
    await this._set(`@an_${bookId}`, list);
    return list;
  },

  async removeAnnotation(bookId, annId) {
    const list = await this.getAnnotations(bookId);
    const filtered = list.filter(a => a.id !== annId);
    await this._set(`@an_${bookId}`, filtered);
    return filtered;
  },

  // ========== 高亮 ==========
  async getHighlights(bookId) {
    return (await this._get(`@hl_${bookId}`)) || [];
  },

  async addHighlight(bookId, hl) {
    const list = await this.getHighlights(bookId);
    list.push({ ...hl, id: Date.now().toString(), createdAt: new Date().toISOString() });
    await this._set(`@hl_${bookId}`, list);
    return list;
  },

  async removeHighlight(bookId, hlId) {
    const list = await this.getHighlights(bookId);
    const filtered = list.filter(h => h.id !== hlId);
    await this._set(`@hl_${bookId}`, filtered);
    return filtered;
  },

  // ========== 阅读位置 ==========
  async getPosition(bookId) {
    return await this._get(`@pos_${bookId}`);
  },

  async savePosition(bookId, pos) {
    await this._set(`@pos_${bookId}`, { ...pos, updatedAt: new Date().toISOString() });
  },
};

export default Storage;