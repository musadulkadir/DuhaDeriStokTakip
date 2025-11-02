// Sabit kategoriler - Veritabanında değil kodda tutulur
const DEFAULT_CATEGORIES = [
  { id: 'keçi', name: 'Keçi' },
  { id: 'koyun', name: 'Koyun' },
  { id: 'keçi-oğlak', name: 'Keçi-Oğlak' },
  { id: 'keçi-palto', name: 'Keçi-Palto' },
  { id: 'çoraplık', name: 'Çoraplık' },
  { id: 'baskılık', name: 'Baskılık' },
];

// Sabit renkler - Veritabanında değil kodda tutulur
const DEFAULT_COLORS = [
  { id: 'siyah', name: 'Siyah', hex_code: '#000000' },
  { id: 'kahverengi', name: 'Kahverengi', hex_code: '#8B4513' },
  { id: 'beyaz', name: 'Beyaz', hex_code: '#FFFFFF' },
  { id: 'taba', name: 'Taba', hex_code: '#D2B48C' },
  { id: 'krem', name: 'Krem', hex_code: '#F5F5DC' },
  { id: 'bordo', name: 'Bordo', hex_code: '#800020' },
  { id: 'lacivert', name: 'Lacivert', hex_code: '#000080' },
  { id: 'gri', name: 'Gri', hex_code: '#808080' },
  { id: 'kırmızı', name: 'Kırmızı', hex_code: '#FF0000' },
  { id: 'yeşil', name: 'Yeşil', hex_code: '#008000' },
  { id: 'mavi', name: 'Mavi', hex_code: '#0000FF' },
  { id: 'sarı', name: 'Sarı', hex_code: '#FFFF00' },
  { id: 'turuncu', name: 'Turuncu', hex_code: '#FFA500' },
  { id: 'pembe', name: 'Pembe', hex_code: '#FFC0CB' },
  { id: 'mor', name: 'Mor', hex_code: '#800080' },
  { id: 'bej', name: 'Bej', hex_code: '#F5F5DC' },
];

module.exports = {
  DEFAULT_CATEGORIES,
  DEFAULT_COLORS,
};
