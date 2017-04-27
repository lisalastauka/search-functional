const express = require('express');
const mustacheExpress = require('mustache-express');
const Iconv = require('iconv').Iconv;
const cheerio = require('cheerio');
const rp = require('request-promise-native');

const url = 'https://google.com/search?q=';
const fromEnc = 'cp1251';
const toEnc = 'utf-8';

const translator = new Iconv(fromEnc, toEnc);

const app = express();

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/html');
app.use(express.static(__dirname + '/public'));

const validateQuery = ({query = ''}) => {
    const encodedQuery = encodeURIComponent(query.trim());

    if (!encodedQuery) {
        return Promise.reject('');
    }

    if (encodedQuery.length >= 128) {
        return Promise.reject('Invalid request');
    }

    return Promise.resolve(encodedQuery);
};

const externalRequest = query =>
    rp.get({
        uri: url + query,
        encoding: null
    }).catch(() => {
        throw new Error('Terminated request');
    });

const searchByQuery = query =>
    externalRequest(query)
        .then((data) =>
            parseData(data))
        .then((data) =>
            getResult(data));

const getResult = ($) => {
    const targetSelector = 'cite';
    const target = $(targetSelector);

    if (!target.html()) {
        throw new Error('Nothing found');
    }

    return parseResult(target, $);
};

const parseResult = (target, $) => {
    const data = {};
    target.first().filter(function () {
        const container = $(this).parent().parent().parent().find('a').first();
        const href = container.attr('href');
        data.link = href.slice(href.indexOf('=') + 1, href.indexOf('&'));
        data.title = container.text();
    });
    return data;
};

const parseData = data =>
    cheerio.load(translator.convert(data).toString());

app.get('/', (req, res) =>
    validateQuery(req.query)
        .then(query =>
            searchByQuery(query))
        .then(result =>
            res.render('index', {result}))
        .catch(message => {
            const result = {message};
            res.render('index', {result});
        })
);

app.listen('8081');
console.log('Magic happens on port 8081');
exports = module.exports = app;
