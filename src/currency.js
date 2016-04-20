module.exports = function(robot) {
  var cheerio = require('cheerio');
  var GOOGLE_CURRENCY_RESULT_DOM_ID = '#currency_converter_result';
  var GOOGLE_SERVICE_ERROR = 'Something is wrong with the Google currency converter… try again later';

  var getConvertedAmount = function(msg, value, from, to, done) {
    var q;
    q = {
      a: value,
      from: from,
      to: to
    };
    robot.http('https://www.google.com/finance/converter').query(q).get()(function(err, res, body) {
      var $, result;
      if (res.statusCode !== 200) {
        msg.send(GOOGLE_SERVICE_ERROR);
        return;
      }
      $ = cheerio.load(body);
      result = $(GOOGLE_CURRENCY_RESULT_DOM_ID).text().trim();
      if (result != null) {
        msg.send(result, done);
      } else {
        msg.send('No currency conversion result for ' + value + ' from ' + from + ' to ' + to, done);
      }
    });
  };

  robot.respond(/(supported )?currenc(y|ies)$/i, function(msg, done) {
    robot.http('https://www.google.com/finance/converter').get()(function(err, res, body) {
      var $, currency_code, currency_label, i, label, len, message, opt, opts;
      if (res.statusCode !== 200) {
        msg.send(GOOGLE_SERVICE_ERROR);
        return;
      }
      $ = cheerio.load(body);
      opts = $('select[name=from]').children();
      message = 'List of supported currencies (<code>: <currency>):\n';
      for (i = 0, len = opts.length; i < len; i++) {
        opt = opts[i];
        currency_code = $(opt).attr('value');
        label = $(opt).text();
        currency_label = label.substr(0, label.indexOf('(') - 1);
        message += currency_code + ': ' + currency_label + '\n';
      }
      msg.send(message, done);
    });
  });

  robot.respond(/(currency|exchange) rate (\S{3}) ?.*/i, function(msg, done) {
    var currency = msg.match[2].toUpperCase();
    var ref = ['USD', 'EUR', 'GBP'];
    var results = [];
    for (var i = 0; i < ref.length; i++) {
      base = ref[i];
      results.push(currency !== base ? getConvertedAmount(msg, 1, currency, base) : void 0);
    }
    msg.send(results, done);
  });

  robot.respond(/(currency|exchange) ([0-9]+\.?[0-9]*)\s?(\S{3})( (in)?(to)?)? (\S{3}) ?.*/i, function(msg, done) {
    var value = msg.match[2];
    var fromCurrency = msg.match[3].toUpperCase();
    var toCurrency = msg.match[7].toUpperCase();

    getConvertedAmount(msg, value, fromCurrency, toCurrency, done);
  });
};
