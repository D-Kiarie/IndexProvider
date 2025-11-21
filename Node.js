const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 10000;
const SECRET_KEY = process.env.SECRET_KEY;
const DATA_FILE = path.join(__dirname, 'skin_indices.json');

if (!SECRET_KEY) {
    console.error("FATAL ERROR: The SECRET_KEY environment variable is not set on Render.");
    process.exit(1);
}

app.use(express.json());
app.use(cors());

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SECRET_KEY) {
        return next();
    }
    res.status(401).send('Unauthorized: Missing or incorrect API key.');
};

app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy and running.');
});

app.use(authMiddleware);

// API controls the numbering logic here
app.post('/api/get-skin-index', (req, res) => {
    const { skinName } = req.body;

    if (!skinName) {
        return res.status(400).json({ error: 'Missing skinName' });
    }

    let data = {};
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(fileContent);
    } catch (err) {
        return res.status(500).json({ error: 'Database error' });
    }

    // Initialize if doesn't exist
    if (!data[skinName]) {
        data[skinName] = 0;
    }

    // API calculates the next number
    data[skinName] += 1;
    const newIndex = data[skinName];

    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        return res.status(500).json({ error: 'Failed to save index' });
    }

    // Send the calculated number back to the game
    res.json({ index: newIndex });
});

app.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}.`);
});
