require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

/**set up mongo */
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

const Schema = mongoose.Schema;

const UrlSchema = new Schema({
  originalUrl: {
    type: String,
    required: true
  },
  shortUrl: {
    type: String,
    required: true
  }
})

const URLModel = mongoose.model('url', UrlSchema)

/** utils functions */
const shortenUrl = (originalUrl) => {
	const chars = originalUrl.replace(/[htt|ftp?s\W_w{3}]/g, '') + Date.now();
	const randomIndex = () => Math.floor(Math.random() * chars.length);
	let word = '';
	for (let i = 0; i < 5; i++) {
		word += chars.charAt(randomIndex());
	}
	return word;
};

/** handle API's */
app.get('/api/shorturl/:shortUrl', async (req, res) => {
  let shortUrl = req.params.shortUrl;
	try {
		const urls = await URLModel.findOne({ shortUrl });
		res.redirect(urls.originalUrl);
	} catch (error) {
		res.status(500).send(error);
	}
});

app.post('/api/shorturl', (req, res) => {
	try {
		const originalUrl = req.body.url;
		const { hostname }= new URL(originalUrl);

    /**  validate url */
    const validUrl = /^(http|https)(:\/\/)/;
    if (!validUrl.test(originalUrl)) {
      return res.json({ error: 'invalid url' })
    }

		dns.lookup(hostname, async err => {
			if (!err) {
				const urls = await URLModel.findOne({ originalUrl });
				if (urls) {
					res.send({
            original_url: urls.originalUrl,
            short_url: urls.shortUrl
          });
				} else {
					const shortUrl = shortenUrl(originalUrl);
					const newUrl = new URLModel({ originalUrl, shortUrl });
					const savedUrl = await newUrl.save();
					res.send({
            original_url: savedUrl.originalUrl,
            short_url: savedUrl.shortUrl
          });
				}
			} else {
				res.send({ error: 'invalid url' });
			}
		});
	} catch (error) {
		res.status(500).send(error);
	}
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
