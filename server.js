const express = require('express');
const bodyParser = require('body-parser')
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { JWK, JWE, JWT } = require('jose');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');

dotenv.config();

const {
  SHARED_ENCRYPTION_KEY,
  COOKIE_SECRET,
  CLAUSE_API_HOST
} = process.env;

const key = JWK.asKey(SHARED_ENCRYPTION_KEY);
const decrypt = token => JSON.parse(JWE.decrypt(token, key).toString('utf8'));
const sign = object => JWT.sign(object, key, {
  expiresIn: '20m',
  // algorithm: 'RS256',
  // subject: '',
  // audience: '',
  issuer: 'https://approval.clause.io'
});

const app = express();

app.use(helmet());
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'none'"],
    styleSrc: ["'self'", "https://fonts.googleapis.com/"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com/"],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`,],
    baseUri: ["'none'"],
    formAction: ["'none'"],
    connectSrc: ["'self'"],
    imgSrc: ["'self'"],
    manifestSrc: ["'self'"]
  }
}))
app.use(logger('dev'));
app.use(cookieParser());

if (app.get('env') === 'development') {
  app.use(cors());
 }

// config express-session
var sess = {
  name: '__Host-ClauseApprove',
  secret: COOKIE_SECRET,
  cookie: {},
  resave: false,
  saveUninitialized: true
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1); // trust first proxy
  sess.cookie.sameSite = true;
  sess.cookie.secure = true // serve secure cookies

  // Redirect HTTP to HTTPS
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    return next();
  });
}

app.use(session(sess));

app.get('/', (req, res) => {
  if (req.query.token) {
    req.session.data = decrypt(req.query.token);
    req.session.token = req.query.token;
  }
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('/context', (req, res) => {
  return res.json(req.session.data || {});
})

app.post('/continue', bodyParser.json(), (req, res) => {
  if (!req.session.data) {
    return res.status(403).send('Unauthorized');
  }
  axios({
    method: 'post',
    url: `${CLAUSE_API_HOST}/flows/apps/${req.session.data.appId}`,
    data: { 
      decodedToken: req.session.data,
      appData: {
        "$class": "org.accordproject.acceptanceofdelivery.InspectDeliverable",
        "deliverableReceivedAt": new Date().toISOString(),
        "inspectionPassed": req.body.approved,
      },
    },
    headers: {
      Authorization:'Bearer ' + sign({
        appId: req.session.data.appId
      })
    }
  }).then(response => {
    res.json({ success: true });
  }).catch(error => {
    console.error(error.toJSON());
    res.status(error.response.status).json({ success: false });
  });

 });
 

app.listen(process.env.PORT || 8080);