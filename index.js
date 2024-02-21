import express from 'express';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import cookieSession from 'cookie-session';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(path.join(process.cwd(), 'public')));

app.use(
  cookieSession({
    name: 'session',
    keys: ['id', 'username'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }),
);

async function doSQL(statement, params) {
  const client = new pg.Client({
    host: 'localhost',
    port: 5432,
    database: 'creativewriting',
    user: 'postgres',
    password: 'password',
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
  res.render('login');
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
    res.render('/login', { error: 'Incorrect login information' });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  await doSQL('Insert into users (username, password) values ($1, $2)', [
    username,
    password,
  ]);
  res.redirect('/login');
});

app.get('/home', async (req, res) => {
  const userID = req.session.id;
  const projs = await doSQL(
    'select title, id from projects where user_id = $1',
    [userID],
  );
  console.log(projs.rows);
  res.render('home', { user: req.session.username, projs: projs.rows });
});

app.post('/home', async (req, res) => {
  const id = req.body.document;
  const doc = await doSQL('select * from docs where id=$1', [id]);
  res.render('document', { doc: doc.rows[0] });
});

app.get('/document', (req, res) => {
  res.render('document');
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
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
