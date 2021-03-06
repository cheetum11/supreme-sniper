const cheerio = require('cheerio');
const rp = require('request-promise');

const Clothing = require('./Clothing');

const baseUrl = 'http://www.supremenewyork.com';
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';

class Shop {
  constructor() {
    this._jar = rp.jar();
    this._request = rp.defaults({
      followAllRedirects: true,
      headers: {
        'User-Agent': userAgent,
      },
      jar: this._jar,
      resolveWithFullResponse: true,
    });
  }

  get jar() {
    return this._jar;
  }

  async add(pendingClothing) {
    for (let { uri, st, s } of pendingClothing) {
      await this._request({
        method: 'POST',
        uri: `${baseUrl}${uri}`,
        formData: {
          utf8: '✓',
          st,
          s,
          commit: 'add to cart',
        },
      });
    }
  }

  async fetchClothingFromAccessories() {
    try {
      const res = await this._request({
        method: 'GET',
        uri: 'http://www.supremenewyork.com/shop/all/accessories',
      });
      const $ = cheerio.load(res.body);

      const requests = $('div.inner-article > a')
        .toArray()
        .map(elem => elem.attribs.href)
        .map(url => this._request({ method: 'GET', uri: `${baseUrl}${url}`}));
      await Promise.all(requests);

      return requests
        .map(r => r.response.body)
        .map((doc) => {
          const $ = cheerio.load(doc);
          const st = $('#st').attr('value') || '';
          const name = $('h1[itemprop="name"]').text().toLowerCase();
          const color = $('p[itemprop="model"]').text().toLowerCase();
          const available = Boolean(st);
          const price = parseInt($('span[itemprop="price"]').text().substring(1), 10);

          let addEndpoint = '';
          let s = null;
          if (available) {
            addEndpoint = $('#cart-addf').attr('action');
            s = $('#s')
              .children()
              .map(function(_, elem) {
                return { s: elem.attribs.value, size: $(this).text().toLowerCase() };
              })
              .toArray()
              .reduce((res, { s, size }) =>  res.set(size.toLowerCase(), s), new Map());
          }

          return new Clothing({ addEndpoint, available, color, name, price, s, st });
        })
        .reduce((res, clothing) => {
          if (!res.has(clothing.name)) {
            res.set(clothing.name, new Map());
          }
          res.get(clothing.name).set(clothing.color, clothing);
          return res;
        }, new Map());
    } catch (err) {
      throw err;
    }
  }

  async fetchNewClothing() {
    try {
      const res = await this._request({
        method: 'GET',
        uri: 'http://www.supremenewyork.com/shop/new',
      });
      const $ = cheerio.load(res.body);

      const requests = $('div.inner-article > a')
        .toArray()
        .map(elem => elem.attribs.href)
        .filter(url => url.match(Clothing.urlRegex))
        .map(url => this._request({ method: 'GET', uri: `${baseUrl}${url}`}));
      await Promise.all(requests);

      return requests
        .map(r => r.response.body)
        .map((doc) => {
          const $ = cheerio.load(doc);
          const st = $('#st').attr('value') || '';
          const name = $('h1[itemprop="name"]').text().toLowerCase();
          const color = $('p[itemprop="model"]').text().toLowerCase();
          const available = Boolean(st);
          const price = parseInt($('span[itemprop="price"]').text().substring(1), 10);

          let addEndpoint = '';
          let s = null;
          if (available) {
            addEndpoint = $('#cart-addf').attr('action');
            s = $('#s')
              .children()
              .map(function(_, elem) {
                return { s: elem.attribs.value, size: $(this).text().toLowerCase() };
              })
              .toArray()
              .reduce((res, { s, size }) =>  res.set(size.toLowerCase(), s), new Map());
          }

          return new Clothing({ addEndpoint, available, color, name, price, s, st });
        })
        .reduce((res, clothing) => {
          if (!res.has(clothing.name)) {
            res.set(clothing.name, new Map());
          }
          res.get(clothing.name).set(clothing.color, clothing);
          return res;
        }, new Map());
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Shop;
