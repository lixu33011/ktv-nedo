const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

// 全局配置
app.use(cors());
app.use(express.json());

// --------------------------
// 【你的云端数据库 直接可用】
// --------------------------
const db = mysql.createPool({
  host: 'sql109.infinityfree.com',   // 原数据库地址不变
  user: 'if0_41371583',              // 原用户名不变
  password: '********',             // 你的数据库密码
  database: 'if0_41371583_ktv',      // 原库名不变
  charset: 'utf8mb4'
});

// --------------------------
// API 接口（1:1兼容原前端）
// --------------------------

// 1. 管理员登录
app.post('/api/admin_login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin888') {
    return res.json({ code: 1, msg: '登录成功' });
  }
  res.json({ code: 0, msg: '账号或密码错误' });
});

// 2. 用户注册
app.post('/api/reg', async (req, res) => {
  const { username, password } = req.body;
  try {
    await db.query('INSERT INTO users(username,password) VALUES(?,?)', [username, password]);
    res.json({ code: 1, msg: '注册成功' });
  } catch (e) {
    res.json({ code: 0, msg: '用户名已存在' });
  }
});

// 3. 用户登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
  rows.length ? res.json({ code: 1, data: rows[0] }) : res.json({ code: 0 });
});

// 4. 获取个人歌单
app.post('/api/my_list', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM song_list WHERE user_id=? ORDER BY sort ASC', [req.body.uid]);
  res.json(rows);
});

// 5. 添加歌曲
app.post('/api/add_song', async (req, res) => {
  const { uid, name, singer, url } = req.body;
  await db.query('INSERT INTO song_list(user_id,name,singer,url,sort) VALUES (?,?,?,?,99)', [uid, name, singer, url]);
  res.json({ code: 1 });
});

// 6. 删除歌曲
app.post('/api/del_song', async (req, res) => {
  await db.query('DELETE FROM song_list WHERE id=?', [req.body.id]);
  res.json({ code: 1 });
});

// 7. 排序上移/下移
app.post('/api/sort', async (req, res) => {
  const { id, type } = req.body;
  const [curr] = await db.query('SELECT sort FROM song_list WHERE id=?', [id]);
  if (!curr.length) return res.json({ code: 0 });

  const sort = curr[0].sort;
  const swapSql = type === 'up'
    ? 'SELECT id FROM song_list WHERE sort < ? ORDER BY sort DESC LIMIT 1'
    : 'SELECT id FROM song_list WHERE sort > ? ORDER BY sort ASC LIMIT 1';

  const [swap] = await db.query(swapSql, [sort]);
  if (swap.length) {
    await db.query('UPDATE song_list SET sort=? WHERE id=?', [swap[0].sort, id]);
    await db.query('UPDATE song_list SET sort=? WHERE id=?', [sort, swap[0].id]);
  }
  res.json({ code: 1 });
});

// 8. 获取配置
app.post('/api/get_config', async (req, res) => {
  res.json({ color: '#ffffff', size: 24, volume: 80 });
});

// 9. 保存配置
app.post('/api/save_config', async (req, res) => {
  res.json({ code: 1 });
});

// 启动服务
app.listen(3000, () => console.log('Node 服务已启动'));
module.exports = app;