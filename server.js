const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const STORIES_ROOT = path.join(__dirname, 'stories');

// ensure stories dir exists
if (!fs.existsSync(STORIES_ROOT)) {
  fs.mkdirSync(STORIES_ROOT, { recursive: true });
}

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// serve story images statically
app.use('/stories', express.static(STORIES_ROOT));

function safeName(name) {
  // very simple sanitization: remove path separators
  return name.replace(/[/\\?%*:|"<>]/g, '-');
}

function storyPath(name) {
  return path.join(STORIES_ROOT, safeName(name));
}

function ensureStoryStructure(name) {
  const base = storyPath(name);
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  const files = ['text.md', 'characters.md', 'locations.md'];
  for (const f of files) {
    const fp = path.join(base, f);
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, '', 'utf8');
    }
  }
  const imgs = path.join(base, 'images');
  const sub = ['characters', 'locations', 'text'];
  for (const s of sub) {
    const p = path.join(imgs, s);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
}

// List stories (names)
app.get('/api/stories', (req, res) => {
  try {
    const items = fs.readdirSync(STORIES_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    res.json({ ok: true, stories: items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Create story
app.post('/api/stories', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'name is required' });
  const nm = safeName(name);
  const base = storyPath(nm);
  if (fs.existsSync(base)) {
    return res.status(409).json({ ok: false, error: 'story already exists' });
  }
  try {
    ensureStoryStructure(nm);
    res.json({ ok: true, name: nm });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Rename story
app.post('/api/stories/:name/rename', (req, res) => {
  const oldName = req.params.name;
  const { newName } = req.body || {};
  if (!newName) return res.status(400).json({ ok: false, error: 'newName is required' });
  const from = storyPath(oldName);
  const to = storyPath(newName);
  if (!fs.existsSync(from)) return res.status(404).json({ ok: false, error: 'story not found' });
  if (fs.existsSync(to)) return res.status(409).json({ ok: false, error: 'target name already exists' });
  try {
    fs.renameSync(from, to);
    res.json({ ok: true, name: newName });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get story content (text, characters, locations) and image lists
app.get('/api/stories/:name', (req, res) => {
  const name = req.params.name;
  const base = storyPath(name);
  if (!fs.existsSync(base)) return res.status(404).json({ ok: false, error: 'story not found' });
  try {
    const text = fs.readFileSync(path.join(base, 'text.md'), 'utf8');
    const characters = fs.readFileSync(path.join(base, 'characters.md'), 'utf8');
    const locations = fs.readFileSync(path.join(base, 'locations.md'), 'utf8');
    const imagesDir = path.join(base, 'images');
    const imageList = {};
    if (fs.existsSync(imagesDir)) {
      for (const sub of ['characters', 'locations', 'text']) {
        const p = path.join(imagesDir, sub);
        if (!fs.existsSync(p)) {
          imageList[sub] = [];
        } else {
          imageList[sub] = fs.readdirSync(p).map(fn => `/stories/${safeName(name)}/images/${sub}/${encodeURIComponent(fn)}`);
        }
      }
    }
    res.json({ ok: true, name, text, characters, locations, images: imageList });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Save text/characters/locations
app.post('/api/stories/:name/save', (req, res) => {
  const name = req.params.name;
  const { file, content } = req.body || {};
  if (!file || !content) {
    return res.status(400).json({ ok: false, error: 'file and content required' });
  }
  if (!['text.md', 'characters.md', 'locations.md'].includes(file)) {
    return res.status(400).json({ ok: false, error: 'invalid file' });
  }
  const base = storyPath(name);
  if (!fs.existsSync(base)) return res.status(404).json({ ok: false, error: 'story not found' });
  try {
    fs.writeFileSync(path.join(base, file), content, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// multer storage: destination depends on story and type field
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const story = req.params.name;
    const type = req.body.type; // expected: characters|locations|text
    const allowed = ['characters', 'locations', 'text'];
    const t = allowed.includes(type) ? type : 'text';
    const dest = path.join(STORIES_ROOT, safeName(story), 'images', t);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // keep original filename but sanitize
    const clean = path.basename(file.originalname).replace(/[/\\?%*:|"<>]/g, '-');
    cb(null, Date.now() + '-' + clean);
  }
});
const upload = multer({ storage });

 // Upload image
 app.post('/api/stories/:name/images', upload.single('file'), (req, res) => {
   if (!req.file) return res.status(400).json({ ok: false, error: 'no file uploaded' });
   // return public path to file
   const story = safeName(req.params.name);
   const rel = path.relative(STORIES_ROOT, req.file.path);
   const url = '/' + path.join('stories', rel).split(path.sep).map(encodeURIComponent).join('/');
   res.json({ ok: true, url });
 });
 
 // Delete story (remove entire story folder and contents)
 app.delete('/api/stories/:name', (req, res) => {
   const name = req.params.name;
   const base = storyPath(name);
   if (!fs.existsSync(base)) return res.status(404).json({ ok: false, error: 'story not found' });
   try {
     // remove directory recursively - use rmSync when available for clarity, fall back to rSync for older Node
     if (fs.rmSync) {
       fs.rmSync(base, { recursive: true, force: true });
     } else {
       // Node <14 fallback
       const rimraf = (p) => {
         if (fs.existsSync(p)) {
           for (const entry of fs.readdirSync(p)) {
             const cur = path.join(p, entry);
             if (fs.lstatSync(cur).isDirectory()) rimraf(cur);
             else fs.unlinkSync(cur);
           }
           fs.rmdirSync(p);
         }
       };
       rimraf(base);
     }
     res.json({ ok: true });
   } catch (err) {
     res.status(500).json({ ok: false, error: err.message });
   }
 });
 
 // Start server
 const PORT = process.env.PORT || 3000;
 app.listen(PORT, () => {
   console.log(`Story writer server listening on http://localhost:${PORT}`);
 });
