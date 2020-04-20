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
app.use(logger('dev'));
app.use(cookieParser());

if (app.get('env') === 'development') {
  app.use(cors());
 }

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