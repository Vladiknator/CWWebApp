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

app.get('/home', (req, res) => {
  res.render('home', { user });
});

app.get('/document', (req, res) => {
  res.render('document');
});

app.post('/document', async (req, res) => {
  const title = req.body.Title;
  const body = req.body.editor;
  await doSQL('Insert into docs (title, body) values ($1, $2)', [title, body]);
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
