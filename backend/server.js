const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_KEY;

// --- Trending fetch ---
app.get('/api/trending', async (req, res) => {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=IN&maxResults=5&key=${YOUTUBE_KEY}`);
    res.json(response.data.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Script Generation ---
app.post('/api/script', async (req, res) => {
  const prompt = req.body.prompt || 'Generate short video script';
  try {
    const response = await axios.post('https://api.openai.com/v1/completions', {
      model: 'text-davinci-003',
      prompt,
      max_tokens: 200
    }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } });
    res.json({ script: response.data.choices[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TTS using ElevenLabs ---
app.post('/api/tts', async (req, res) => {
  const text = req.body.text;
  if (!text) return res.status(400).json({ error: 'Text required' });
  try {
    const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/default', { text }, {
      headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });
    const filePath = `./audio.mp3`;
    fs.writeFileSync(filePath, Buffer.from(response.data));
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Video Render (simple) ---
app.post('/api/render', (req, res) => {
  const scriptFile = './audio.mp3'; // already generated TTS audio
  const outputFile = './video.mp4';
  // Simple FFmpeg example
  exec(`ffmpeg -loop 1 -i image.jpg -i ${scriptFile} -c:v libx264 -c:a aac -shortest ${outputFile}`, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.download(outputFile);
  });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
