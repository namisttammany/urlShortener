require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dns = require('dns');
const { MongoClient } = require('mongodb');
const nanoid = require('nanoid');
var cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/your-app-name');

const databaseUrl = process.env.DATABASE;

console.log(databaseUrl)

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')))
app.use(cors());

// app.all("/*", function(req, res, next){
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
//   next();
// });


MongoClient.connect(databaseUrl, { useNewUrlParser: true })
  .then(client => {
    app.locals.db = client.db('shortener');
  })
  .catch(() => console.error('Failed to connect to the database'));

const shortenURL = (db, url) => {
  const shortenedURLs = db.collection('shortenedURLs');
  return shortenedURLs.findOneAndUpdate({ original_url: url },
    {
      $setOnInsert: {
        original_url: url,
        short_id: nanoid(7),
      },
    },
    {
      returnOriginal: false,
      upsert: true,
    }
  );
};

const checkIfShortIdExists = (db, code) => db.collection('shortenedURLs')
  .findOne({ short_id: code });

// app.get('/', (req, res) => {
//   const htmlPath = path.join(__dirname, 'public', 'index.html');
//   res.sendFile(htmlPath);
// })

app.post('/new', (req, res) => {
  let originalUrl;
  try {
    originalUrl = new URL(req.body.url);
    console.log(originalUrl)
  } catch (err) {
    return res.status(400).send({error: 'invalid URL'});
  }

  dns.lookup(originalUrl.hostname, (err) => {
    if (err) {
      return res.status(404).send({error: 'Address not found'});
    };

    const { db } = req.app.locals;
    shortenURL(db, originalUrl.href)
      .then(result => {
        const doc = result.value;
        res.json({
          original_url: doc.original_url,
          short_id: doc.short_id,
        });
        
        // short url w/o domain prefix
        console.log(doc.short_id)

      })
      .catch(console.error);
  });
});

app.get('/:short_id', (req, res) => {
  const shortId = req.params.short_id;

  const { db } = req.app.locals;
  checkIfShortIdExists(db, shortId)
    .then(doc => {
      if (doc === null) return res.send('Uh oh. We could not find a link at that URL');

      res.redirect(doc.original_url)
    })
    .catch(console.error);

});

app.set('port', process.env.PORT || 4100);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});

app.post('/shortenUrl', function(req, res){
  let shortURL;
  
  console.log(req.body.url);
  let originalUrl;
  try {
    originalUrl = new URL(req.body.url);
    console.log(originalUrl)
  } catch (err) {
    return res.status(400).send({error: 'invalid URL'});
  }

  dns.lookup(originalUrl.hostname, (err) => {
    if (err) {
      return res.status(404).send({error: 'Address not found'});
    };

    const { db } = req.app.locals;
    shortenURL(db, originalUrl.href)
      .then(result => {
        const doc = result.value;
        console.log(doc.short_id)
        // res.format ({
        //   'application/json': function() {
            res.send( doc.short_id );
        //  }})
        
        // res.json({
        //   original_url: doc.original_url,
        //   short_id: doc.short_id,
        // });
        
        // // short url w/o domain prefix

        // res.send(doc.short_id);
      })
      .catch(console.error);
  });
  
})
