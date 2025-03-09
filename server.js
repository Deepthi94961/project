const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'admin';

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: 'chdeepthi5678@gmail.com',
  password: '1234', // In production, store this as a hashed value
};

app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(bodyParser.json());

MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then((client) => {
    const db = client.db(DB_NAME);
    console.log('✅ MongoDB connected');

    // Middleware to enforce maintenance mode
    app.use(async (req, res, next) => {
      if (req.path === '/signin' || req.path === '/signup') {
        const maintenanceModeSetting = await db.collection('settings').findOne({ name: 'maintenanceMode' });

        // Allow admin to bypass maintenance mode
        if (maintenanceModeSetting && maintenanceModeSetting.value === 'true') {
          const { email, password } = req.body;

          // Check if the user is the admin
          if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            return next(); // Allow admin to proceed
          }

          return res.status(503).json({ message: 'Server is in maintenance mode. Please try again later.' });
        }
      }

      next();
    });

    // Fetch system settings
    app.get('/api/settings', async (req, res) => {
      try {
        const settings = await db.collection('settings').find().toArray();
        res.status(200).json(settings);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings', error });
      }
    });

    // Save system settings
    app.put('/api/settings', async (req, res) => {
      try {
        const updatedSettings = req.body;
        const bulkOps = updatedSettings.map((setting) => ({
          updateOne: {
            filter: { name: setting.name },
            update: { $set: { value: setting.value } },
            upsert: true,
          },
        }));

        await db.collection('settings').bulkWrite(bulkOps);
        res.status(200).json({ message: 'Settings saved successfully' });
      } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Failed to save settings', error });
      }
    });

    // Signup route with password hashing and user registration enforcement
    app.post('/signup', async (req, res) => {
      const { fullName, email, password, confirmPassword } = req.body;

      if (!fullName || !email || !password || password !== confirmPassword) {
        return res.status(400).json({ message: 'Invalid input or passwords do not match.' });
      }

      try {
        const userRegistrationSetting = await db.collection('settings').findOne({ name: 'userRegistration' });

        if (userRegistrationSetting && userRegistrationSetting.value === 'false') {
          return res.status(403).json({ message: 'User registration is currently disabled.' });
        }

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

        // Add a notification when a new user is created
        await db.collection('notifications').insertOne({
          message: `${newUser.fullName} has signed up.`,
          createdAt: new Date(),
        });

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
        // Check if the user is the admin
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
          return res.status(200).json({ message: 'Admin sign-in successful' });
        }

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

    // Create listing with auto-approval enforcement
    app.post('/listings', async (req, res) => {
      try {
        const listingAutoApprovalSetting = await db.collection('settings').findOne({ name: 'listingAutoApproval' });

        const newListing = req.body;
        newListing.status = listingAutoApprovalSetting && listingAutoApprovalSetting.value === 'true' ? 'approved' : 'pending';

        await db.collection('listings').insertOne(newListing);
        res.status(201).json({ message: 'Listing created successfully', listing: newListing });
      } catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({ message: 'Error creating listing.', error });
      }
    });

    // Reject a listing
    app.delete('/listings/:id/reject', async (req, res) => {
      try {
        const listingId = req.params.id;

        if (!ObjectId.isValid(listingId)) {
          return res.status(400).json({ message: 'Invalid listing ID.' });
        }

        const result = await db.collection('listings').deleteOne({ _id: new ObjectId(listingId) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Listing not found or already deleted.' });
        }

        res.status(200).json({ message: 'Listing successfully rejected and removed.' });
      } catch (error) {
        console.error('Error rejecting listing:', error);
        res.status(500).json({ message: 'Internal server error while rejecting listing.', error });
      }
    });

    // Get all property listings
    app.get('/listings', async (req, res) => {
      try {
        const listings = await db.collection('listings').find().toArray();
        res.status(200).json({ listings });
      } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ message: 'Error fetching listings.', error });
      }
    });

    // Get all notifications
    app.get('/notifications', async (req, res) => {
      try {
        const notifications = await db.collection('notifications').find().toArray();
        res.status(200).json({ notifications });
      } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications.', error });
      }
    });

    // Delete a specific notification by ID
    app.delete('/notifications/:id', async (req, res) => {
      try {
        const notificationId = req.params.id;

        if (!ObjectId.isValid(notificationId)) {
          return res.status(400).json({ message: 'Invalid notification ID.' });
        }

        const result = await db.collection('notifications').deleteOne({ _id: new ObjectId(notificationId) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Notification not found or already deleted.' });
        }

        res.status(200).json({ message: 'Notification deleted successfully.' });
      } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Error deleting notification.', error });
      }
    });

    // Delete all notifications
    app.delete('/notifications', async (req, res) => {
      try {
        const result = await db.collection('notifications').deleteMany({});
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'No notifications found to delete.' });
        }
        res.status(200).json({ message: 'All notifications deleted successfully.' });
      } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ message: 'Error deleting notifications.', error });
      }
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  });