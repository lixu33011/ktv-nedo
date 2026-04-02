const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 你的云端数据库
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
  if (user === 'admin' && pwd === 'admin888') {
    return res.json({ code: 0, msg: '登录成功' });
  }
  res.json({ code: 1, msg: '账号或密码错误' });
});

// 获取配置
app.get('/api/get_config', async (req, res) => {
  res.json({
    code: 0,
    data: {
      db_host: 'sql210.infinityfree.com',
      db_user: 'if0_41371583',
      db_pwd: 'Lx19840802',
      db_name: 'if0_41371583_ktv',
      lyric_color: '#ffffff',
      lyric_active_color: '#ff3c3c',
      lyric_size: 28,
      volume: 80
    }
  });
});

// 保存配置
app.post('/api/save_config', async (req, res) => {
  res.json({ code: 0, msg: '保存成功' });
});

// 用户登录
app.post('/api/login', async (req, res) => {
  const { user, pwd } = req.body;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=? AND password=?', [user, pwd]);
  if (rows.length) return res.json({ code: 0, uid: rows[0].id });
  res.json({ code: 1, msg: '账号密码错误' });
});

// 用户注册
app.post('/api/reg', async (req, res) => {
  const { user, pwd } = req.body;
  const [rows] = await pool.query('SELECT id FROM users WHERE username=?', [user]);
  if (rows.length) return res.json({ code: 1, msg: '用户名已存在' });
  await pool.query('INSERT INTO users (username,password) VALUES (?,?)', [user, pwd]);
  res.json({ code: 0, msg: '注册成功' });
});

// 添加歌曲
app.post('/api/add_song', async (req, res) => {
  const { uid, name, artist, url } = req.body;
  await pool.query('INSERT INTO song_list (user_id,name,artist,url,sort) VALUES (?,?,?,?,99)', [uid, name, artist, url]);
  res.json({ code: 0 });
});

// 获取歌单
app.get('/api/my_list', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM song_list WHERE user_id=? ORDER BY sort ASC', [req.query.uid]);
  res.json({ code: 0, data: rows });
});

// 删除歌曲
app.get('/api/del_song', async (req, res) => {
  await pool.query('DELETE FROM song_list WHERE id=?', [req.query.id]);
  res.json({ code: 0 });
});

// 歌曲排序
app.post('/api/sort', async (req, res) => {
  const { id, type } = req.body;
  const [row] = await pool.query('SELECT sort FROM song_list WHERE id=?', [id]);
  if (!row.length) return res.json({ code: 1 });
  const sort = row[0].sort;
  if (type === 'up') {
    const [p] = await pool.query('SELECT id,sort FROM song_list WHERE sort<? ORDER BY sort DESC LIMIT 1', [sort]);
    if (p.length) {
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [p[0].sort, id]);
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [sort, p[0].id]);
    }
  } else {
    const [n] = await pool.query('SELECT id,sort FROM song_list WHERE sort>? ORDER BY sort ASC LIMIT 1', [sort]);
    if (n.length) {
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [n[0].sort, id]);
      await pool.query('UPDATE song_list SET sort=? WHERE id=?', [sort, n[0].id]);
    }
  }
  res.json({ code: 0 });
});

module.exports = app;
