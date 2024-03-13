// Import required modules
const express = require('express');
const bodyParser = require('body-parser');

// Create an instance of Express
const app = express();

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Mock database for demonstration purposes
let users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  // Add more users as needed
];

// Endpoint to get all users
app.get('/users', (req, res) => {
  res.json(users);
});

// Endpoint to get a single user by ID
app.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(user => user.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Endpoint to create a new user
app.post('/users', (req, res) => {
  const newUser = req.body;
  // Generate a unique ID for the new user
  const userId = users.length + 1;
  newUser.id = userId;
  // Add the new user to the mock database
  users.push(newUser);
  res.status(201).json(newUser);
});

// Endpoint to update an existing user by ID
app.put('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const updateUser = req.body;
  const index = users.findIndex(user => user.id === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Update the user's data
  users[index] = { ...users[index], ...updateUser };
  res.json(users[index]);
});

// Endpoint to delete a user by ID
app.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const index = users.findIndex(user => user.id === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Remove the user from the mock database
  const deletedUser = users.splice(index, 1);
  res.json(deletedUser);
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
