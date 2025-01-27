const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017'; // MongoDB connection URL
const DB_NAME = 'admin'; // Database name

// Middleware
app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(bodyParser.json());

let db;
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then((client) => {
    db = client.db(DB_NAME);
    console.log('MongoDB connected');
  })
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Sign-up route
app.post('/signup', async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  // Validate input
  if (!fullName || !email || !password || password !== confirmPassword) {
    return res.status(400).json({ message: 'Invalid input or passwords do not match.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // Create new user
    const newUser = {
      fullName,
      email,
      password, // Use password hashing for production
      status: 'active', // Default status is 'active'
      role: 'owner', // Default role
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);
    res.status(201).json({ message: 'User registered successfully.', userId: result.insertedId });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Error registering user.', error });
  }
});

// Sign-in route
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await db.collection('users').findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      return res.status(400).json({ message: 'You are suspended by admin.' });
    }

    res.status(200).json({ message: 'Sign-in successful' });
  } catch (error) {
    console.error('Error during sign-in:', error);
    res.status(500).json({ message: 'Error signing in', error });
  }
});

// Update user status (suspend or activate)
app.put('/update-user-status', async (req, res) => {
  const { userId, status } = req.body; // Expected data: userId and status ('active' or 'suspended')

  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const result = await db.collection('users').updateOne(
      { _id: new MongoClient.ObjectID(userId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: `User status updated to ${status}` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Fetch all users
app.get('/users', async (req, res) => {
  try {
    const users = await db.collection('users').find({}).toArray();
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
