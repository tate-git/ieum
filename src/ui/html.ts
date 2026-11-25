// 사람이 쓴 글(이름)을 화면에 넣을 때 태그로 읽히지 않게
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
