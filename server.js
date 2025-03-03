const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

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

    // Signup route with password hashing
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

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
          fullName,
          email,
          password: hashedPassword,
          status: 'active',
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

    // Sign-in route with hashed password verification
    app.post('/signin', async (req, res) => {
      const { email, password } = req.body;

      try {
        const suspendedUser = await db.collection('suspendedUsers').findOne({ email });
        if (suspendedUser) {
          return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
        }

        const user = await db.collection('Signin').findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({ message: 'Sign-in successful' });
      } catch (error) {
        console.error('Error during sign-in:', error);
        res.status(500).json({ message: 'Error signing in', error });
      }
    });

    // Get users with updated status from the suspended database
    app.get('/users', async (req, res) => {
      try {
        const users = await db.collection('Signin').find().toArray();
        const suspendedUsers = await db.collection('suspendedUsers').find().toArray();
        const suspendedUserIds = suspendedUsers.map(user => user._id.toString());

        const updatedUsers = users.map(user => ({
          ...user,
          status: suspendedUserIds.includes(user._id.toString()) ? 'suspended' : 'active',
        }));

        res.status(200).json({ users: updatedUsers });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users.', error });
      }
    });

    // Suspend or activate a user
    app.put('/users/:id/suspend', async (req, res) => {
      const userId = req.params.id;
      const { status } = req.body;

      try {
        const user = await db.collection('Signin').findOne({ _id: new ObjectId(userId) });
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (status === 'suspended') {
          await db.collection('suspendedUsers').insertOne(user);
          await db.collection('Signin').updateOne({ _id: new ObjectId(userId) }, { $set: { status: 'suspended' } });
        } else {
          await db.collection('suspendedUsers').deleteOne({ _id: new ObjectId(userId) });
          await db.collection('Signin').updateOne({ _id: new ObjectId(userId) }, { $set: { status: 'active' } });
        }

        res.status(200).json({ message: `User ${status} successfully` });
      } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Error updating user status.', error });
      }
    });

    // Get all property listings with correct collection name
    app.get('/listings', async (req, res) => {
      try {
        const listings = await db.collection('listings').find().toArray();
        res.status(200).json({ listings });
      } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ message: 'Error fetching listings.', error });
      }
    });

    // Start the server only after MongoDB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  });
