const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

const PORT = process.env.PORT || 10000;
const SECRET_KEY = process.env.SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI; // You must set this in Render Environment Variables

if (!SECRET_KEY) {
    console.error("FATAL ERROR: SECRET_KEY is missing.");
    process.exit(1);
}

if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is missing. Please add your MongoDB connection string to Render.");
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Define the data structure (Schema)
const SkinSchema = new mongoose.Schema({
    skinName: { type: String, required: true, unique: true },
    index: { type: Number, default: 0 }
});

const Skin = mongoose.model('Skin', SkinSchema);

app.use(express.json());
app.use(cors());

const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SECRET_KEY) {
        return next();
    }
    res.status(401).send('Unauthorized: Missing or incorrect API key.');
};

app.get('/health', (req, res) => {
    // Check database connection state (1 = connected)
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    res.status(200).send(`Server is running. Database: ${dbStatus}`);
});

app.use(authMiddleware);

// API controls the numbering logic here
app.post('/api/get-skin-index', async (req, res) => {
    const { skinName } = req.body;

    if (!skinName) {
        return res.status(400).json({ error: 'Missing skinName' });
    }

    try {
        // findOneAndUpdate is ATOMIC. It finds the document and adds 1 in a single step.
        // upsert: true means "create it if it doesn't exist"
        // new: true means "return the updated number, not the old one"
        const result = await Skin.findOneAndUpdate(
            { skinName: skinName },
            { $inc: { index: 1 } }, 
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ index: result.index });

    } catch (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: 'Failed to generate index' });
    }
});

app.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}.`);
});
