const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const router = express.Router();

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// MongoDB connection URL and Database Name
const url = 'mongodb://localhost:27017';
const dbName = 'LiveChatApplication';

// Initialize MongoDB client
let db;

// Function to connect to MongoDB
async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(url);
    db = client.db(dbName);
    console.log(' MongoDB connected successfully');

    // Start the server after successful DB connection
    app.listen(port, () => {
      console.log(` Server running on port ${port}`);
    });
  } catch (err) {
    console.error(' Failed to connect to MongoDB:', err);
    process.exit(1); // Exit the process if unable to connect
  }
}

connectToDatabase();

// Routes
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.collection('User').findOne({ username, password });
    if (user) {
      res.status(200).json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    //Check if the username already exists
    const existingUser = await db.collection('User').findOne({ username });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const result = await db.collection('User').insertOne({ username, password });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertedId,
    });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, message: 'User registration failed', error: err.message });
  }
});

// Fetch all users route (only usernames)
app.get('/api/users', async (req, res) => {
  try {
    // Fetch only the 'username' field from each document, excluding '_id' and all other fields
    const users = await db.collection('User').find({}, { projection: { _id: 0,username: 1 } }).toArray();


    res.status(200).json(users); // Send the list of usernames as the response
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Define Message Schema and Model
/*const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: Number, required: true }, // Adjust based on your requirements
  receiverId: { type: Number, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
const Message = require('../models/Message');

router.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    const newMessage = new Message({ senderId, receiverId, content });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});*/
/////////////////



const client = mongoose.connection;

// Define the Message schema and model
const messageSchema = new mongoose.Schema({
  to: { type: String, required: true },
  from: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { collection: 'messages' }); // Explicitly define the collection name

const Message = mongoose.model('Message', messageSchema);

// Middleware to parse JSON
app.use(express.json());

app.post('/api/messages', async (req, res) => {
  const { to, from, message } = req.body;

  if (!to || !from || !message) {
    return res.status(400).json({ error: 'Recipient, sender, and message are required' });
  }

  try {
    const newMessage = new Message({ to, from, message });
    const result = await newMessage.save();
    res.status(201).json({ message: 'Message sent', data: result });
  } catch (error) {
    console.error('Error inserting message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});