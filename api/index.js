const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 流转字符串
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let str = '';
    stream.on('data', chunk => str += chunk.toString());
    stream.on('end', () => resolve(str));
    stream.on('error', reject);
  });
}

// 读取 Blob（不存在则返回默认值）
async function readBlob(filename, defaultValue) {
  try {
    const blob = await get(filename);
    const str = await streamToString(blob.stream);
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

// 写入 Blob
async function writeBlob(filename, data) {
  await put(filename, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json'
  });
}

// =============================================
// ✅ 【系统初始化：第一次运行自动创建所有数据】
// =============================================
async function initSystem() {
  // 1. 初始化配置
  let config = await readBlob('config.json', null);
  if (!config) {
    config = {
      db_host: "localhost",
      db_user: "root",
      db_pwd: "",
      db_name: "ktv_system",
      lyric_color: "#ffffff",
      lyric_active_color: "#ff3c3c",
      lyric_size: 28,
      volume: 80
    };
    await writeBlob('config.json', config);
  }

  // 2. 初始化用户（自动创建测试账号）
  let users = await readBlob('users.json', null);
  if (!users) {
    users = [
      { id: 1, username: "user1", password: "123456", create_time: new Date().toISOString() },
      { id: 2, username: "user2", password: "123456", create_time: new Date().toISOString() }
    ];
    await writeBlob('users.json', users);
  }

  // 3. 初始化歌单（空）
  let song_list = await readBlob('song_list.json', null);
  if (!song_list) {
    song_list = [];
    await writeBlob('song_list.json', song_list);
  }
}
// 项目启动时自动初始化
initSystem().then();

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
// 2. 获取配置
// ------------------------------
app.get('/api/get_config', async (req, res) => {
  const data = await readBlob('config.json', {});
  res.json({ code: 0, data });
});

// ------------------------------
// 3. 保存配置
// ------------------------------
app.post('/api/save_config', async (req, res) => {
  await writeBlob('config.json', req.body);
  res.json({ code: 0, msg: '保存成功' });
});

// ------------------------------
// 4. 用户注册
// ------------------------------
app.post('/api/reg', async (req, res) => {
  const { user, pwd } = req.body;
  let users = await readBlob('users.json', []);
  if (users.some(u => u.username === user)) {
    return res.json({ code: 1, msg: '用户名已存在' });
  }
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
// 5. 用户登录
// ------------------------------
app.post('/api/login', async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob('users.json', []);
  const u = users.find(u => u.username === user && u.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: '账号或密码错误' });
});

// ------------------------------
// 6. 添加歌曲
// ------------------------------
app.post('/api/add_song', async (req, res) => {
  const { uid, tid, name, artist, source } = req.body;
  let list = await readBlob('song_list.json', []);
  const maxSort = list.filter(s => s.user_id == uid).reduce((m, s) => Math.max(m, s.sort || 0), 0);
  list.push({
    id: Date.now(),
    user_id: Number(uid),
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
// 7. 我的歌单
// ------------------------------
app.get('/api/my_list', async (req, res) => {
  const { uid } = req.query;
  const list = await readBlob('song_list.json', []);
  const my = list.filter(s => s.user_id == uid).sort((a, b) => a.sort - b.sort);
  res.json({ code: 0, data: my });
});

// ------------------------------
// 8. 删除歌曲
// ------------------------------
app.get('/api/del_song', async (req, res) => {
  const { id } = req.query;
  let list = await readBlob('song_list.json', []);
  list = list.filter(s => s.id != id);
  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

// ------------------------------
// 9. 排序
// ------------------------------
app.post('/api/sort', async (req, res) => {
  const { id, type } = req.body;
  let list = await readBlob('song_list.json', []);
  const song = list.find(s => s.id == id);
  if (!song) return res.json({ code: 1 });

  const userSongs = list.filter(s => s.user_id === song.user_id).sort((a, b) => a.sort - b.sort);
  const index = userSongs.findIndex(s => s.id == id);

  if (type === 'up' && index > 0) {
    [userSongs[index].sort, userSongs[index - 1].sort] = [userSongs[index - 1].sort, userSongs[index].sort];
  }
  if (type === 'down' && index < userSongs.length - 1) {
    [userSongs[index].sort, userSongs[index + 1].sort] = [userSongs[index + 1].sort, userSongs[index].sort];
  }

  await writeBlob('song_list.json', list);
  res.json({ code: 0 });
});

module.exports = app;
