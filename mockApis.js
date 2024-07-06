const express = require('express');
const app = express();

app.use(express.json());

// slow response (REST API)
app.get('/rest/slow', (req, res) => {
  setTimeout(() => {
    res.json({ message: 'Slow REST response' });
  }, 3000);
});

//  fast response (REST API)
app.get('/rest/fast', (req, res) => {
  res.json({ message: 'Fast REST response' });
});

//  moderate response (REST API)
app.get('/rest/moderate', (req, res) => {
  setTimeout(() => {
    res.json({ message: 'Moderate REST response' });
  }, 1500);
});

// additional endpoint (REST API)
app.get('/rest/extra', (req, res) => {
  setTimeout(() => {
    res.json({ message: 'Extra REST response' });
  }, 2000);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Mock APIs running on port ${port}`);
});
