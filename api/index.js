const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 工具函数
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let str = '';
    stream.on('data', chunk => str += chunk.toString());
    stream.on('end', () => resolve(str));
    stream.on('error', reject);
  });
}

// 读取 Blob（固定路径）
async function readBlob(path, defaultValue) {
  try {
    const blob = await get(path);
    const str = await streamToString(blob.stream);
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// 写入 Blob（固定路径，不再自动加随机串）
async function writeBlob(path, data) {
  await put(path, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false  // 👈 关键：关闭随机后缀
  });
}

// 初始化系统（自动创建默认数据）
async function initSystem() {
  // 初始化配置
  let cfg = await readBlob('config.json');
  if (!cfg) {
    cfg = {
      db_host: "localhost",
      db_user: "root",
      db_pwd: "",
      db_name: "ktv_system",
      lyric_color: "#ffffff",
      lyric_active_color: "#ff3c3c",
      lyric_size: 28,
      volume: 80
    };
    await writeBlob('config.json', cfg);
  }

  // 初始化用户
  let users = await readBlob('users.json');
  if (!users) {
    users = [
      { id: 1, username: "user1", password: "123456", create_time: new Date().toISOString() },
      { id: 2, username: "user2", password: "123456", create_time: new Date().toISOString() }
    ];
    await writeBlob('users.json', users);
  }

  // 初始化歌单
  let songs = await readBlob('song_list.json');
  if (!songs) {
    await writeBlob('song_list.json', []);
  }
}
initSystem().catch(console.error);

// ------------------------------
// 接口
// ------------------------------

app.post('/api/admin_login', (req, res) => {
  const { user, pwd } = req.body;
  if (user === 'admin' && pwd === 'admin888') {
    return res.json({ code: 0, msg: '登录成功' });
  }
  res.json({ code: 1, msg: '账号或密码错误' });
});

app.get('/api/get_config', async (req, res) => {
  const data = await readBlob('config.json');
  res.json({ code: 0, data });
});

app.post('/api/save_config', async (req, res) => {
  await writeBlob('config.json', req.body);
  res.json({ code: 0, msg: '保存成功' });
});

app.post('/api/login', async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob('users.json', []);
  const u = users.find(u => u.username === user && u.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: '账号或密码错误' });
});

app.post('/api/reg', async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob('users.json', []);
  if (users.some(x => x.username === user)) {
    return res.json({ code: 1, msg: '用户名已存在' });
  }
  users.push({ id: Date.now(), username: user, password: pwd, create_time: new Date().toISOString() });
  await writeBlob('users.json', users);
  res.json({ code: 0, msg: '注册成功' });
});

app.get('/api/my_list', async (req, res) => {
  const { uid } = req.query;
  const list = await readBlob('song_list.json', []);
  res.json({ code: 0, data: list.filter(s => s.user_id == uid).sort((a,b)=>a.sort-b.sort) });
});

app.post('/api/add_song', async (req, res) => {
  const { uid, tid, name, artist, source } = req.body;
  const list = await readBlob('song_list.json', []);
  const maxSort = list.filter(s => s.user_id == uid).reduce((m,s)=>Math.max(m,s.sort||0),0);
  list.push({
    id: Date.now(), user_id: +uid, track_id: tid, song_name: name, artist: artist,
    source: source||'netease', sort: maxSort+1, create_time: new Date().toISOString()
  });
  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

app.get('/api/del_song', async (req, res) => {
  const { id } = req.query;
  let list = await readBlob('song_list.json', []);
  list = list.filter(s => s.id != id);
  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

app.post('/api/sort', async (req, res) => {
  const { id, type } = req.body;
  let list = await readBlob('song_list.json', []);
  const song = list.find(s => s.id == id);
  if (!song) return res.json({ code:1 });
  const userSongs = list.filter(s=>s.user_id===song.user_id).sort((a,b)=>a.sort-b.sort);
  const idx = userSongs.findIndex(s=>s.id==id);
  if (type === 'up' && idx > 0) {
    [userSongs[idx].sort, userSongs[idx-1].sort] = [userSongs[idx-1].sort, userSongs[idx].sort];
  }
  if (type === 'down' && idx < userSongs.length-1) {
    [userSongs[idx].sort, userSongs[idx+1].sort] = [userSongs[idx+1].sort, userSongs[idx].sort];
  }
  await writeBlob('song_list.json', list);
  res.json({ code:0 });
});

module.exports = app;
