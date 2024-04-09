import express from 'express';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import cookieSession from 'cookie-session';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';
import fs from 'fs';

// Express middleware and constants set up
const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const adminApiKey =
  '46f808fd586c12d1d13e992dd9e6b75a2ebe7f0c447c0d9c5c9a2937324f1cc6';

/* Middleware to check for session ID, any route that should only be accessed by logged in users should 
include this to check for an existing session. See home route for example of implementation */
const sessionCheck = (req, res, next) => {
  if (!req.session.id) {
    res.redirect('/login');
  } else {
    next();
  }
};

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/public', express.static(path.join(process.cwd(), 'public')));

app.use(
  '/tinymce',
  express.static(path.join(__dirname, 'node_modules', 'tinymce')),
);

// Set up for cookie sessions
app.use(
  cookieSession({
    name: 'session',
    keys: ['id', 'username', 'currentProj', 'message'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }),
);

// Connect to database, send a SQl statement, close connection and return response
async function doSQL(statement, params) {
  const client = new pg.Client({
    host: process.env.DBIP || 'localhost',
    port: 5432,
    database: 'creativewriting',
    user: process.env.DBUSER || 'postgres',
    password: process.env.DBPASS || 'password',
  });
  await client.connect();
  const response = await client.query(statement, params);
  await client.end();
  return response;
}

// Show the root page
app.get('/', (req, res) => {
  res.render('index', { date: new Date() });
});

app.get('/api-docs', (req, res) => {
  res.render('api-docs');
});

// Show the login page, display a message if one exists, delete after display
app.get('/login', (req, res) => {
  if (req.session.message) {
    const { message } = req.session;
    req.session.message = undefined;
    res.render('login', { error: message });
  } else {
    res.render('login');
  }
});

// Handle the login form
app.post('/login', async (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  const result = await doSQL(
    'select * from users where username = $1 and password = $2',
    [username, password],
  );

  console.log(result.rows);

  // Check if the login information matches with stuff in the database, no = go back to login page, yes = send to home page and set session variables
  if (result.rows.length === 1 && !result.rows[0].blocked) {
    req.session.id = result.rows[0].id;
    req.session.username = result.rows[0].username;
    res.redirect('/home');
  } else if (result.rows.length === 1 && result.rows[0].blocked === true) {
    res.render('login', {
      error: 'Your account is blocked. Please contact the administrator!.',
    });
  } else {
    res.render('login', { error: 'Invalid login information.' });
  }
});

// Show sign up page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle sign up form
app.post('/signup', async (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  const { email } = req.body;
  const { password2 } = req.body;
  // Check to make suer passwords match, if yes create account and go back to login, if not reset page and give error
  if (password === password2) {
    try {
      await doSQL(
        'Insert into users (username, password, email) values ($1, $2, $3)',
        [username, password, email],
      );
    } catch (error) {
      if (error.code === '23505') {
        res.render('signup', { error: 'Account already exists' });
        return;
      }
      console.error(error);
    }
    req.session.message = 'Account Creation Successful';
    res.redirect('/login');
  } else {
    res.render('signup', { error: 'Error: Passwords do not match' });
  }
});

// Handle logout button, delete session ingo and redirect to login
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// Render home page with list of projects, only visible to logged in users
app.get('/home', sessionCheck, async (req, res) => {
  const userID = req.session.id;
  const projs = await doSQL(
    'select title, id from projects where user_id = $1',
    [userID],
  );
  res.render('home', { user: req.session.username, projs: projs.rows });
});

// Get a project ID from the form and redirect the user to the selected project
app.post('/home', sessionCheck, async (req, res) => {
  const id = req.body.project;
  req.session.currentProj = id;
  res.redirect(`/project/${id}`);
});

/* Render the project page with info from the project corresponding to the ID provided in the URI
If user does not own the project of corresponding ID then send them back to the home page */
app.get('/project/:projId', sessionCheck, async (req, res) => {
  const { projId } = req.params;
  const result = await doSQL(
    'select * from projects where user_id = $1 and id = $2',
    [req.session.id, projId],
  );
  if (result.rows.length === 0) {
    res.redirect('/home');
  } else {
    const docs = await doSQL('select * from docs where proj_id = $1', [projId]);
    const colls = await doSQL('select * from collections where proj_id = $1', [
      projId,
    ]);
    res.render('project', { docs: docs.rows, colls: colls.rows });
  }
});

// Open a selected document
app.post('/selectdocument', sessionCheck, async (req, res) => {
  const id = req.body.document;
  const doc = await doSQL('select * from docs where id=$1', [id]);
  res.render('document', { doc: doc.rows[0] });
});

// Open a selected collection
app.post('/selectcollection', sessionCheck, async (req, res) => {
  const id = req.body.collection;
  const coll = await doSQL(
    `select c.id as cid, c.title as ctitle, c.proj_id, n.id as nid, n.title as ntitle, n.alias, n.note, n.color
	    from collections c left join notes n on c.id = n.coll_id 
	    where c.id=$1;`,
    [id],
  );
  res.render('collection', { coll: coll.rows });
});

// Create a new project
app.post('/createprojs', sessionCheck, async (req, res) => {
  const { title } = req.body;
  await doSQL('Insert into projects (title, user_id) values ($1, $2)', [
    title,
    req.session.id,
  ]);
  res.redirect('/home');
});

// Delete a project
app.post('/deleteProject', sessionCheck, async (req, res) => {
  const { projectId } = req.body;
  try {
    await doSQL('DELETE FROM projects WHERE id = $1', [projectId]);
    res.redirect('/home');
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).send('Failed to delete project');
  }
});

// Create a new document
app.post('/createdocs', sessionCheck, async (req, res) => {
  const { title } = req.body;
  await doSQL('Insert into docs (title, proj_id) values ($1, $2)', [
    title,
    req.session.currentProj,
  ]);
  res.redirect(`/project/${req.session.currentProj}`);
});

// Delete a document
app.post('/deleteDocument', sessionCheck, async (req, res) => {
  const { documentId } = req.body;
  try {
    await doSQL('DELETE FROM docs WHERE id = $1', [documentId]);
    res.redirect(`/project/${req.session.currentProj}`);
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).send('Failed to delete document');
  }
});

// Create a new collection
app.post('/createcollection', sessionCheck, async (req, res) => {
  const { title } = req.body;
  await doSQL('Insert into collections (title, proj_id) values ($1, $2)', [
    title,
    req.session.currentProj,
  ]);
  res.redirect(`/project/${req.session.currentProj}`);
});

// Delete a collection
app.post('/deleteCollection', sessionCheck, async (req, res) => {
  const { collectionId } = req.body;
  try {
    await doSQL('DELETE FROM collections WHERE id = $1', [collectionId]);
    res.redirect(`/project/${req.session.currentProj}`);
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).send('Failed to delete collection');
  }
});

// Update the values of a document after editing
app.post('/document', sessionCheck, async (req, res) => {
  const { title } = req.body;
  const body = req.body.editor;
  const { id } = req.body;
  await doSQL('update docs set title=$1, body=$2 where id=$3', [
    title,
    body,
    id,
  ]);
  res.redirect(`/project/${req.session.currentProj}`);
});

// API route to get notes and collections for a given page
app.get('/notes/:projId', async (req, res) => {
  const { projId } = req.params;
  const colls = await doSQL('select * from collections where proj_id = $1', [
    projId,
  ]);
  const notes = await doSQL(
    'select n.id, n.title, n.color, alias, note, coll_id, proj_id  from notes n join collections c on n.coll_id = c.id where proj_id = $1',
    [projId],
  );
  // map notes to correct collection and return a JSON object
  const combined = colls.rows.map((coll) => ({
    ...coll,
    notes: notes.rows.filter((entry) => entry.coll_id === coll.id),
  }));

  res.json(combined);
});

/*
Sharing Documents

Create new table with links --- DONE
Each link links to a specific document, each link is for one document while each document can have multiple links
Links
link-note: Write down what this link is for Identification
UUID - PK: UUID that will act as the link in the uri
Document - FK: Document that this link points to
Notes - FK: Notes that this document links to
includeNotes: Boolean of whether or not to include notes with this document

Create API for getting, creating and deleting links for a document.

Create a shared notes route that does not do a cookie check,
it looks through link table for that UUID, finds if that UUID is linked to a note
makes sure that this link comes with a note and if it does then return the corresponding note

This ends up with a link like domain/shared/view/UUID
which even without an account when opened it will take the user to a page showing the document
*/

// Need to change noteID in table to projID

// Create Links API
app.post('/document/link/create', sessionCheck, async (req, res) => {
  const { includeNotes } = req.body;
  const { linkNote } = req.body;
  const { docId } = req.body;
  const { projId } = req.body;
});

// Delete Link
app.delete('/document/link/:UUID', sessionCheck, async (req, res) => {
  res.send('hello from simple server :)');
});

// get Links for document API
app.get('/document/link/:docID', sessionCheck, async (req, res) => {
  const { includeNotes } = req.body;
  const { linkNote } = req.body;
});

// View the shared page with or without notes
app.get('/shared/view/:UUID', async (req, res) => {
  res.send('hello from simple server :)');
});

// Update the values of a collection and its notes after editing
app.post('/collection', sessionCheck, async (req, res) => {
  const { title } = req.body;
  const id = req.body.collID;

  const entries = [];
  const bodyValues = Object.entries(req.body);
  bodyValues.splice(0, 2);
  for (let index = 0; index < bodyValues.length; index += 4) {
    const obj = {
      title: bodyValues[index][1],
      alias: bodyValues[index + 1][1],
      notes: bodyValues[index + 2][1],
      color: bodyValues[index + 3][1],
    };
    entries.push(obj);
  }

  await doSQL('update collections set title=$1 where id=$2', [title, id]);

  // Delete all existing notes from database in this collection and loop through the new entries adding them into the database
  await doSQL('delete from notes where coll_id = $1', [id]);
  entries.forEach(async (e) => {
    await doSQL(
      'insert into notes (title, alias, note, color, coll_id) Values ($1, $2, $3, $4, $5)',
      [e.title, e.alias, e.notes, e.color, id],
    );
  });

  res.redirect(`/project/${req.session.currentProj}`);
});

// Download document as a format
app.get('/downloadDoc/:id/:format', sessionCheck, async (req, res) => {
  const { id, format } = req.params;
  const entry = (
    await doSQL('select * from docs where id = $1', [parseInt(id)])
  ).rows[0];
  const html = `<html><body>${entry.body}</body></html>`;
  const uuid = uuidv4();
  // Set the necessary filter for word doc exports
  const query = function () {
    if (format === 'docx') {
      return '?filter=MS Word 2007 XML';
    }
    return '';
  };

  // Write the string to a temporary file
  fs.writeFile(`${uuid}.html`, html, (err) => {
    if (err) throw err;

    // Create a form
    const form = new FormData();

    // Append the file to the form
    form.append('file', fs.createReadStream(`${uuid}.html`));

    // Send the file using axios
    axios({
      method: 'post',
      url: `http://converter:4000/convert/${format + query()}`,
      data: form,
      headers: form.getHeaders(),
      responseType: 'stream',
    })
      .then((response) => {
        const filePath = `/${uuid}.${format}`;
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        writer.on('finish', () => {
          // send the resulting file to a new location and delete the temp file
          res.sendFile(filePath);
          fs.unlink(`${uuid}.html`, (err) => {
            if (err) throw err;
            console.log(`${uuid}.html was deleted`);
          });
        });
      })
      .catch((error) => {
        console.log(error);
        res.status(404);
        res.send();
      });
  });
});

// Admin API routes

app.get('/api/users', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const users = await doSQL(`
    SELECT
      u.username,
      u.email,
      json_agg(
        json_build_object(
          'title', p.title,
          'documents', (
            SELECT json_agg(
              json_build_object(
                'id', d.id,
                'title', d.title,
                'body', d.body
              )
            )
            FROM docs d
            WHERE d.proj_id = p.id
          ),
          'collections', (
            SELECT json_agg(
              json_build_object(
                'id', c.id,
                'title', c.title,
                'notes', (
                  SELECT json_agg(
                    json_build_object(
                      'id', n.id,
                      'title', n.title,
                      'alias', n.alias,
                      'note', n.note
                    )
                  )
                  FROM notes n
                  WHERE n.coll_id = c.id
                )
              )
            )
            FROM collections c
            WHERE c.proj_id = p.id
          )
        )
      ) AS projects
    FROM users u
    LEFT JOIN projects p ON u.id = p.user_id
    GROUP BY u.id, u.username, u.email
  `);

  res.json(users.rows);
});

app.put('/api/users/:username/edit', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.params;
  const { newUsername, email } = req.body;
  if (!newUsername && !email) {
    return res
      .status(400)
      .json({ error: 'Either newUsername or email is required' });
  }

  const user = await doSQL('SELECT id FROM users WHERE username = $1', [
    username,
  ]);
  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = user.rows[0].id;

  if (newUsername) {
    await doSQL('UPDATE users SET username = $1 WHERE id = $2', [
      newUsername,
      userId,
    ]);
  }

  if (email) {
    await doSQL('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
  }

  res.json({ message: 'User updated' });
});
app.get('/api/users/:username', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.params;
  const user = await doSQL(
    `
    SELECT
      u.username,
      u.email,
      json_agg(
        json_build_object(
          'title', p.title,
          'documents', (
            SELECT json_agg(
              json_build_object(
                'id', d.id,
                'title', d.title,
                'body', d.body
              )
            )
            FROM docs d
            WHERE d.proj_id = p.id
          ),
          'collections', (
            SELECT json_agg(
              json_build_object(
                'id', c.id,
                'title', c.title,
                'notes', (
                  SELECT json_agg(
                    json_build_object(
                      'id', n.id,
                      'title', n.title,
                      'alias', n.alias,
                      'note', n.note
                    )
                  )
                  FROM notes n
                  WHERE n.coll_id = c.id
                )
              )
            )
            FROM collections c
            WHERE c.proj_id = p.id
          )
        )
      ) AS projects
    FROM users u
    LEFT JOIN projects p ON u.id = p.user_id
    WHERE u.username = $1
    GROUP BY u.id, u.username, u.email
  `,
    [username],
  );

  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user.rows[0]);
});

app.put('/api/users/:username/unblock', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.params;
  const user = await doSQL('SELECT id FROM users WHERE username = $1', [
    username,
  ]);
  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = user.rows[0].id;
  await doSQL('UPDATE users SET blocked = false WHERE id = $1', [userId]);
  res.json({ message: 'User unblocked' });
});
app.put('/api/users/:username/block', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.params;
  const user = await doSQL('SELECT id FROM users WHERE username = $1', [
    username,
  ]);
  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = user.rows[0].id;
  await doSQL('UPDATE users SET blocked = true WHERE id = $1', [userId]);
  res.json({ message: 'User blocked' });
});

app.delete('/api/users/:username', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.params;
  const user = await doSQL('SELECT id FROM users WHERE username = $1', [
    username,
  ]);
  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = user.rows[0].id;

  try {
    // Delete associated records first
    await doSQL(
      'DELETE FROM notes WHERE coll_id IN (SELECT id FROM collections WHERE proj_id IN (SELECT id FROM projects WHERE user_id = $1))',
      [userId],
    );
    await doSQL(
      'DELETE FROM collections WHERE proj_id IN (SELECT id FROM projects WHERE user_id = $1)',
      [userId],
    );
    await doSQL('DELETE FROM projects WHERE user_id = $1', [userId]);

    // Now delete the user
    await doSQL('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`Admin API Key: ${adminApiKey}`);
});
