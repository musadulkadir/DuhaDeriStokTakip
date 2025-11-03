// Tarih ve saat formatlama yardımcı fonksiyonları

/**
 * Tarihi Türkçe formatında gösterir
 * @param date - Date objesi veya ISO string
 * @returns "03.11.2024" formatında tarih
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

/**
 * Saati Türkçe formatında gösterir
 * @param date - Date objesi veya ISO string
 * @returns "14:30" formatında saat
 */
export const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

/**
 * Tarih ve saati birlikte gösterir
 * @param date - Date objesi veya ISO string
 * @returns "03.11.2024 14:30" formatında tarih ve saat
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

/**
 * Bugünün tarihini ISO formatında döndürür (saat 00:00:00)
 * @returns "2024-11-03T00:00:00.000Z" formatında tarih
 */
export const getTodayISO = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

/**
 * Şu anki tarih ve saati ISO formatında döndürür
 * @returns "2024-11-03T14:30:00.000Z" formatında tarih ve saat
 */
export const getNowISO = (): string => {
  return new Date().toISOString();
};

/**
 * Input için tarih formatı (YYYY-MM-DD)
 * @param date - Date objesi veya ISO string
 * @returns "2024-11-03" formatında tarih
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return new Date().toISOString().split('T')[0];
  
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Relative time (kaç saat/gün önce)
 * @param date - Date objesi veya ISO string
 * @returns "2 saat önce", "3 gün önce" gibi
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 30) return `${diffDays} gün önce`;
    
    return formatDate(date);
  } catch {
    return '-';
  }
};
