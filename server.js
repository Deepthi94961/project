const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'admin';

app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(bodyParser.json());

MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then((client) => {
    const db = client.db(DB_NAME);
    console.log('✅ MongoDB connected');

    // Signup route
    app.post('/signup', async (req, res) => {
      const { fullName, email, password, confirmPassword } = req.body;

      if (!fullName || !email || !password || password !== confirmPassword) {
        return res.status(400).json({ message: 'Invalid input or passwords do not match.' });
      }

      try {
        const existingUser = await db.collection('Signin').findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists.' });
        }

        const newUser = {
          fullName,
          email,
          password,
          role: 'owner',
          createdAt: new Date(),
        };

        const result = await db.collection('Signin').insertOne(newUser);
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
        const user = await db.collection('Signin').findOne({ email });
        if (!user || user.password !== password) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({ message: 'Sign-in successful' });
      } catch (error) {
        console.error('Error during sign-in:', error);
        res.status(500).json({ message: 'Error signing in', error });
      }
    });

    // Get users route
    app.get('/users', async (req, res) => {
      try {
        const users = await db.collection('Signin').find().toArray();
        res.status(200).json({ users });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users.', error });
      }
    });

    // Start the server only after MongoDB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  })
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1); // Stop the app if MongoDB fails
  });
