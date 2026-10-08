import { insert, all, run } from '../db.js';

/** Payload shape: { title: {uz,ru,en}, body: {uz,ru,en} } */
export function notify(userIds, type, payload, link = null) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  for (const id of ids) {
    insert('notifications', { user_id: id, type, payload: JSON.stringify(payload), link });
  }
}

export function notificationList(userId, limit = 20) {
  const rows = all('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?', [userId, limit]);
  return rows.map((n) => {
    let payload = {};
    try {
      payload = JSON.parse(n.payload);
    } catch {
      payload = {};
    }
    return { id: n.id, type: n.type, link: n.link, is_read: !!n.is_read, created_at: n.created_at, ...payload };
  });
}

export function unreadCount(userId) {
  return all('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [userId])[0]?.c || 0;
}

export function markRead(userId, id) {
  if (id) return run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?', [userId, id]).changes;
  return run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]).changes;
}
