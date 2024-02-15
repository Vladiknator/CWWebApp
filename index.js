import express from 'express';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(path.join(process.cwd(), 'public')));

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

const user = {};

app.get('/', (req, res) => {
  res.render('index', { date: new Date() });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  user.username = username;
  user.password = password;
  res.redirect('/home');
});

app.get('/signup', (req, res) => {
  res.send('Hello World!');
});

app.get('/home', async (req, res) => {
  const docs = await doSQL('select title, id from docs');
  console.log(docs.rows);
  res.render('home', { user, docs: docs.rows });
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
