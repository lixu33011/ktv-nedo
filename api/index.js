const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ======================
// ✅ 修复：读取配置（从数据库读）
// ======================
app.get('/api/get_config', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM config WHERE id=1");
    if (rows.length > 0) {
      return res.json({ code: 0, data: rows[0] });
    }
  } catch (e) {}
  
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

// ======================
// ✅ 修复：保存配置（真实写入数据库）
// ======================
app.post('/api/save_config', async (req, res) => {
  try {
    const { 
      db_host, db_user, db_pwd, db_name,
      lyric_color, lyric_active_color, lyric_size, volume
    } = req.body;

    await pool.query(`
      REPLACE INTO config 
      (id, db_host, db_user, db_pwd, db_name, lyric_color, lyric_active_color, lyric_size, volume) 
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [db_host, db_user, db_pwd, db_name, lyric_color, lyric_active_color, lyric_size, volume]);

    return res.json({ code: 0, msg: "保存成功" });
  } catch (e) {
    console.error(e);
    res.json({ code: 1, msg: "保存失败" });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { user, pwd } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE username=? AND password=?', [user, pwd]);
    if (rows.length) return res.json({ code: 0, uid: rows[0].id });
  } catch (e) {}
  res.json({ code: 1, msg: '账号密码错误' });
});

// 用户注册
app.post('/api/reg', async (req, res) => {
  try {
    const { user, pwd } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE username=?', [user]);
    if (rows.length) return res.json({ code: 1, msg: '用户名已存在' });
    await pool.query('INSERT INTO users(username,password) VALUES(?,?)', [user, pwd]);
    return res.json({ code: 0, msg: '注册成功' });
  } catch (e) {}
  res.json({ code: 1, msg: '注册失败' });
});

// 获取歌单
app.get('/api/my_list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,song_name,artist,source FROM song_list WHERE user_id=? ORDER BY sort ASC,id ASC',
      [req.query.uid]
    );
    return res.json({ code: 0, data: rows });
  } catch (e) {}
  res.json({ code: 1, data: [] });
});

// 删除歌曲
app.get('/api/del_song', async (req, res) => {
  try {
    await pool.query('DELETE FROM song_list WHERE id=?', [req.query.id]);
  } catch (e) {}
  res.json({ code: 0 });
});

// 添加歌曲
app.post('/api/add_song', async (req, res) => {
  try {
    const { uid, tid, name, artist, source } = req.body;
    const [r] = await pool.query('SELECT MAX(sort) as m FROM song_list WHERE user_id=?', [uid]);
    const sort = (r[0].m || 0) + 1;
    await pool.query(
      'INSERT INTO song_list(user_id,track_id,song_name,artist,source,sort) VALUES(?,?,?,?,?,?)',
      [uid, tid, name, artist, source, sort]
    );
  } catch (e) {}
  res.json({ code: 0 });
});

// 排序
app.post('/api/sort', async (req, res) => {
  res.json({ code: 0 });
});

module.exports = app;
