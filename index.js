import express from 'express';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import cookieSession from 'cookie-session';

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(path.join(process.cwd(), 'public')));

app.use(
  cookieSession({
    name: 'session',
    keys: ['id', 'username', 'currentProj', 'message'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }),
);

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

app.use(
  '/tinymce',
  express.static(path.join(__dirname, 'node_modules', 'tinymce')),
);

app.get('/', (req, res) => {
  res.render('index', { date: new Date() });
});

app.get('/login', (req, res) => {
  if (req.session.message) {
    const { message } = req.session;
    req.session.message = undefined;
    res.render('login', { error: message });
  } else {
    res.render('login');
  }
});

app.post('/login', async (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  const result = await doSQL(
    'select * from users where username = $1 and password = $2',
    [username, password],
  );
  if (result.rows.length === 1) {
    req.session.id = result.rows[0].id;
    req.session.username = result.rows[0].username;
    res.redirect('/home');
  } else {
    res.render('login', { error: 'Incorrect login information' });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  const { email } = req.body;
  const { password2 } = req.body;
  if (password === password2) {
    await doSQL(
      'Insert into users (username, password, email) values ($1, $2, $3)',
      [username, password, email],
    );
    req.session.message = 'Account Creation Successful';
    res.redirect('/login');
  } else {
    res.render('signup', { error: 'Error: Passwords do not match' });
  }
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

app.get('/home', async (req, res) => {
  const userID = req.session.id;
  const projs = await doSQL(
    'select title, id from projects where user_id = $1',
    [userID],
  );
  if (req.session.id === undefined) {
    res.redirect('/login');
  } else {
    res.render('home', { user: req.session.username, projs: projs.rows });
  }
});

app.post('/home', async (req, res) => {
  const id = req.body.project;
  // const doc = await doSQL('select * from docs where id=$1', [id]);
  // res.render('document', { doc: doc.rows[0] });
  req.session.currentProj = id;
  res.redirect(`/project/${id}`);
});

app.get('/project/:projId', async (req, res) => {
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

app.post('/selectdocument', async (req, res) => {
  const id = req.body.document;
  const doc = await doSQL('select * from docs where id=$1', [id]);
  res.render('document', { doc: doc.rows[0] });
});

app.post('/selectcollection', async (req, res) => {
  const id = req.body.collection;
  // note on select return
  // format - cid, ctitle, proj_id, nid, ntitle, alias, note
  const coll = await doSQL(
    `select c.id as cid, c.title as ctitle, c.proj_id, n.id as nid, n.title as ntitle, n.alias, n.note 
	    from collections c left join notes n on c.id = n.coll_id 
	    where c.id=$1;`,
    [id],
  );
  res.render('collection', { coll: coll.rows });
});

app.post('/createprojs', async (req, res) => {
  const { title } = req.body;
  await doSQL('Insert into projects (title, user_id) values ($1, $2)', [
    title,
    req.session.id,
  ]);
  res.redirect('/home');
});

app.post('/deleteProject', async (req, res) => {
  const { projectId } = req.body;
  try {
    await doSQL('DELETE FROM projects WHERE id = $1', [projectId]);
    res.redirect('/home');
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).send('Failed to delete project');
  }
});

app.post('/createdocs', async (req, res) => {
  const { title } = req.body;
  await doSQL('Insert into docs (title, proj_id) values ($1, $2)', [
    title,
    req.session.currentProj,
  ]);
  res.redirect(`/project/${req.session.currentProj}`);
});

app.post('/createcollection', async (req, res) => {
  const { title } = req.body;
  await doSQL('Insert into collections (title, proj_id) values ($1, $2)', [
    title,
    req.session.currentProj,
  ]);
  res.redirect(`/project/${req.session.currentProj}`);
});

app.post('/document', async (req, res) => {
  const title = req.body.Title;
  const body = req.body.editor;
  const { id } = req.body;
  if (id) {
    await doSQL('update docs set title=$1, body=$2 where id=$3', [
      title,
      body,
      id,
    ]);
  } else {
    await doSQL('Insert into docs (title, body) values ($1, $2)', [
      title,
      body,
    ]);
  }
  res.redirect(`/project/${req.session.currentProj}`);
});

app.post('/collection', async (req, res) => {
  const { title } = req.body;
  const id = req.body.collID;

  // Loop through all entries returned in the body, seperate them into individual objects and put them into the entries array
  const entries = [];
  const bodyValues = Object.entries(req.body);
  bodyValues.splice(0, 2);
  console.log(req.body);
  for (let index = 0; index < bodyValues.length; index += 3) {
    const obj = {
      title: bodyValues[index][1],
      alias: bodyValues[index + 1][1],
      notes: bodyValues[index + 2][1],
    };
    entries.push(obj);
  }

  console.log(entries);

  await doSQL('update collections set title=$1 where id=$2', [title, id]);

  await doSQL('delete from notes where coll_id = $1', [id]);
  entries.forEach(async (e) => {
    await doSQL(
      'insert into notes (title, alias, note, coll_id) Values ($1, $2, $3, $4)',
      [e.title, e.alias, e.notes, id],
    );
  });

  res.redirect(`/project/${req.session.currentProj}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
