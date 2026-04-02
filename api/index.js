const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 你的云端数据库（直接可用）
const pool = mysql.createPool({
  host: 'sql210.infinityfree.com',
  user: 'if0_41371583',
  password: 'Lx19840802',
  database: 'if0_41371583_ktv',
  charset: 'utf8mb4'
});

// 管理员登录
app.post('/api/admin_login', async (req, res) => {
  const { user, pwd } = req.body;
  res.json({
    code: (user === 'admin' && pwd === 'admin888') ? 0 : 1,
    msg: '账号密码错误'
  });
});

// 获取配置
app.get('/api/get_config', async (req, res) => {
  res.json({ code: 0, data: { lyric_color: '#fff', lyric_active_color: '#ff3c3c', lyric_size: 28, volume: 80 } });
});

// 用户注册
app.post('/api/reg', async (req, res) => {
  const { user, pwd } = req.body;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=?', [user]);
  if (rows.length) return res.json({ code: 1, msg: '用户名已存在' });
  await pool.query('INSERT INTO users (username,password) VALUES (?,?)', [user, pwd]);
  res.json({ code: 0, msg: '注册成功' });
});

// 用户登录
app.post('/api/login', async (req, res) => {
  const { user, pwd } = req.body;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=? AND password=?', [user, pwd]);
  if (rows.length) return res.json({ code: 0, uid: rows[0].id });
  res.json({ code: 1, msg: '账号密码错误' });
});

// 添加歌曲
app.post('/api/add_song', async (req, res) => {
  const { uid, tid, name, artist, source } = req.body;
  const [r] = await pool.query('SELECT MAX(sort) as m FROM song_list WHERE user_id=?', [uid]);
  const sort = (r[0].m || 0) + 1;
  await pool.query(
    'INSERT INTO song_list (user_id,track_id,song_name,artist,source,sort) VALUES (?,?,?,?,?,?)',
    [uid, tid, name, artist, source, sort]
  );
  res.json({ code: 0 });
});

// 获取歌单
app.get('/api/my_list', async (req, res) => {
  const { uid } = req.query;
  const [rows] = await pool.query(
    'SELECT id,song_name,artist,source FROM song_list WHERE user_id=? ORDER BY sort ASC,id ASC',
    [uid]
  );
  res.json({ code: 0, data: rows });
});

// 删除歌曲
app.get('/api/del_song', async (req, res) => {
  const { id } = req.query;
  await pool.query('DELETE FROM song_list WHERE id=?', [id]);
  res.json({ code: 0 });
});

// 排序
app.post('/api/sort', async (req, res) => {
  const { id, type } = req.body;
  const [row] = await pool.query('SELECT user_id,sort FROM song_list WHERE id=?', [id]);
  if (!row.length) return res.json({ code: 1 });
  const { user_id, sort } = row[0];
  if (type === 'up') {
    const [p] = await pool.query('SELECT id,sort FROM song_list WHERE user_id=? AND sort<? ORDER BY sort DESC LIMIT 1', [user_id, sort]);
    if (p.length) {
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [p[0].sort, id]);
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [sort, p[0].id]);
    }
  } else if (type === 'down') {
    const [n] = await pool.query('SELECT id,sort FROM song_list WHERE user_id=? AND sort>? ORDER BY sort ASC LIMIT 1', [user_id, sort]);
    if (n.length) {
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [n[0].sort, id]);
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [sort, n[0].id]);
    }
  }
  res.json({ code: 0 });
});

module.exports = app;
