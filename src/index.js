require('dotenv').config();

const puppeteer = require('puppeteer');

const Checkout = require('./checkout');
const Inventory = require('./inventory');
const ReCaptcha = require('./recaptcha');
const Supreme = require('./supreme');

const info = require('../config/info')
const myOrder = require('../config/my-order');

const sleep = ms => new Promise((resolve, reject) => (
  setTimeout(() => resolve(), ms)
));

(async () => {
  const supreme = new Supreme();
  const htmlDocs = supreme.fetchNewClothingHtmlDocs();
  const inventory = new Inventory(htmlDocs);
  const pendingClothing = inventory.toPendingClothing(myOrder);

  if (pendingClothing.length === 0) {
    console.log('Unable to find clothing in order.');
    return;
  }

  await supreme.addPendingClothing(pendingClothing);
  await sleep(1000);

  const { cookies } = shop.jar._jar.toJSON();
  const supremeSession = cookies.find(({ key }) => key === '_supreme_sess' );

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setCookie({
    name: supremeSession.key,
    value: supremeSession.value,
    domain: '.supremenewyork.com',
    path: supremeSession.path,
    expires: new Date(supremeSession.expires).getTime() / 1000,
    httpOnly: supremeSession.httpOnly,
  });
  await page.setJavaScriptEnabled(true);
  await page.goto('http://www.supremenewyork.com/shop/cart');
  await page.click('a.button.checkout');

  await sleep(1000);

  const checkout = new Checkout(info, page);
  await checkout.complete();

  await page.waitFor(300);

  const recaptcha = new ReCaptcha(page);
  recaptcha.solve();
})();
