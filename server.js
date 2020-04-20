const express = require('express');
const bodyParser = require('body-parser')
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const path = require('path');
const { JWK, JWE } = require('jose');
const dotenv = require('dotenv');
dotenv.config();

const {
  SHARED_ENCRYPTION_KEY,
  COOKIE_SECRET
} = process.env;

const key = JWK.asKey(SHARED_ENCRYPTION_KEY);
const encrypt = object => JWE.encrypt(JSON.stringify(object), key);
const decrypt = token => JSON.parse(JWE.decrypt(token, key).toString('utf8'));

const app = express();
app.use(helmet());
app.use(logger('dev'));
app.use(cookieParser());

// config express-session
var sess = {
  secret: COOKIE_SECRET,
  cookie: {},
  resave: false,
  saveUninitialized: true
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1); // trust first proxy
  // sess.cookie.sameSite = true;
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess));
// app.use(flash());

// // Handle auth failure error messages
// app.use(function (req, res, next) {
//   if (req && req.query && req.query.error) {
//     req.flash('error', req.query.error);
//   }
//   if (req && req.query && req.query.error_description) {
//     req.flash('error_description', req.query.error_description);
//   }
//   next();
// });

app.get('/ping', (req, res) => {
 return res.send('pong');
});

app.get('/', (req, res) => {
  if (req.query.token) {
    req.session.data = decrypt(req.query.token);
  }
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('/context', (req, res) => {
  return res.json(req.session.data || {});
})

app.post('/continue', (req, res) => {
  if (!req.session.data) {
    return res.status(403).send('Unauthorized');
  }
  console.log(req.session.data);
  res.json({ success: true });
 });
 

app.listen(process.env.PORT || 8080);