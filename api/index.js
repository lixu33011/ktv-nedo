const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 工具：流转字符串
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let str = '';
    stream.on('data', chunk => str += chunk.toString());
    stream.on('end', () => resolve(str));
    stream.on('error', reject);
  });
}

// 读取 Blob 文件
async function readBlob(filename, defaultValue) {
  try {
    const blob = await get(filename);
    const str = await streamToString(blob.stream);
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// 写入 Blob 文件
async function writeBlob(filename, data) {
  await put(filename, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json'
  });
}

// ------------------------------
// 1. 管理员登录
// ------------------------------
app.post('/api/admin_login', (req, res) => {
  const { user, pwd } = req.body;
  if (user === 'admin' && pwd === 'admin888') {
    return res.json({ code: 0, msg: '登录成功' });
  }
  res.json({ code: 1, msg: '账号或密码错误' });
});

// ------------------------------
// 2. 获取系统配置（Blob）
// ------------------------------
app.get('/api/get_config', async (req, res) => {
  const defaultConfig = {
    db_host: "localhost",
    db_user: "root",
    db_pwd: "",
    db_name: "ktv_system",
    lyric_color: "#ffffff",
    lyric_active_color: "#ff3c3c",
    lyric_size: 28,
    volume: 80
  };
  const data = await readBlob('config.json', defaultConfig);
  res.json({ code: 0, data });
});

// ------------------------------
// 3. 保存系统配置（Blob）
// ------------------------------
app.post('/api/save_config', async (req, res) => {
  await writeBlob('config.json', req.body);
  res.json({ code: 0, msg: '保存成功' });
});

// ------------------------------
// 4. 用户注册（Blob）
// ------------------------------
app.post('/api/reg', async (req, res) => {
  const { user, pwd } = req.body;
  let users = await readBlob('users.json', []);
  const exists = users.some(u => u.username === user);
  if (exists) return res.json({ code: 1, msg: '用户名已存在' });

  users.push({
    id: Date.now(),
    username: user,
    password: pwd,
    create_time: new Date().toISOString()
  });

  await writeBlob('users.json', users);
  res.json({ code: 0, msg: '注册成功' });
});

// ------------------------------
// 5. 用户登录（Blob）
// ------------------------------
app.post('/api/login', async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob('users.json', []);
  const u = users.find(u => u.username === user && u.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: '账号或密码错误' });
});

// ------------------------------
// 6. 添加歌曲（Blob）
// ------------------------------
app.post('/api/add_song', async (req, res) => {
  const { uid, tid, name, artist, source } = req.body;
  let list = await readBlob('song_list.json', []);

  const maxSort = list
    .filter(s => s.user_id == uid)
    .reduce((max, s) => Math.max(max, s.sort || 0), 0);

  list.push({
    id: Date.now(),
    user_id: parseInt(uid),
    track_id: tid,
    song_name: name,
    artist: artist,
    source: source || 'netease',
    sort: maxSort + 1,
    create_time: new Date().toISOString()
  });

  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

// ------------------------------
// 7. 获取我的歌单（Blob）
// ------------------------------
app.get('/api/my_list', async (req, res) => {
  const { uid } = req.query;
  const list = await readBlob('song_list.json', []);
  const mySongs = list
    .filter(s => s.user_id == uid)
    .sort((a, b) => a.sort - b.sort || a.id - b.id);
  res.json({ code: 0, data: mySongs });
});

// ------------------------------
// 8. 删除歌曲（Blob）
// ------------------------------
app.get('/api/del_song', async (req, res) => {
  const { id } = req.query;
  let list = await readBlob('song_list.json', []);
  list = list.filter(s => s.id != id);
  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

// ------------------------------
// 9. 歌曲排序（Blob）
// ------------------------------
app.post('/api/sort', async (req, res) => {
  const { id, type } = req.body;
  let list = await readBlob('song_list.json', []);
  const song = list.find(s => s.id == id);
  if (!song) return res.json({ code: 1 });

  const userSongs = list
    .filter(s => s.user_id === song.user_id)
    .sort((a, b) => a.sort - b.sort);

  const index = userSongs.findIndex(s => s.id == id);
  if (type === 'up' && index > 0) {
    [userSongs[index].sort, userSongs[index - 1].sort] =
    [userSongs[index - 1].sort, userSongs[index].sort];
  }
  if (type === 'down' && index < userSongs.length - 1) {
    [userSongs[index].sort, userSongs[index + 1].sort] =
    [userSongs[index + 1].sort, userSongs[index].sort];
  }

  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

module.exports = app;
