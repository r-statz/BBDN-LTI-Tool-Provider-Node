import lti_content_items from "./lti-content-item.js";

var HMAC_SHA1 = require('./hmac-sha1');
var url = require('url');
var uuid = require('uuid');
var utils = require('./utils');

//LTI Variables
var consumerKey = "12345";
var consumerSecret = "secret";
var returnUrl = "";

exports.got_launch = function (req, res, contentItemData) {

  returnUrl = req.body.content_item_return_url;
//  returnUrl = "about:blank";

  // Populate contentItemData
  contentItemData.data = req.body;
  contentItemData.consumer_key = consumerKey;
  contentItemData.consumer_secret = consumerSecret;
  contentItemData.content_items = lti_content_items.constructLTIContentItem();

  // Setup and create oauth components
  let options = {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
    return_url: returnUrl,
    signer: (new HMAC_SHA1()),
    params: req.body,
    content_items: contentItemData.content_items
  };

  // Use internal HMAC_SHA1 processing
  let parts = url.parse(options.return_url, true);
  let headers = _build_headers(options, parts);

  contentItemData.oauth_nonce = get_value('oauth_nonce', headers.Authorization);
  contentItemData.oauth_timestamp = get_value('oauth_timestamp', headers.Authorization);
  contentItemData.oauth_signature = get_value('oauth_signature', headers.Authorization);

  console.log('--- Content Item ---');
  console.log(contentItemData);

  return new Promise(function (resolve, reject) {
    resolve();
  });
};

var _build_headers = function (options, parts) {
  var headers, key, val;
  headers = {
    content_items: JSON.stringify(options.content_items),
    data: options.params.data,
    lti_message_type: 'ContentItemSelection',
    lti_version: options.params.lti_version,
    oauth_callback: 'about:blank',
    oauth_version: '1.0',
    oauth_nonce: uuid.v4(),
    oauth_timestamp: Math.round(Date.now() / 1000),
    oauth_consumer_key: options.consumer_key,
    oauth_signature_method: 'HMAC-SHA1'
  };
  headers.oauth_signature = options.signer.build_signature_raw(returnUrl, parts, 'POST', headers, options.consumer_secret);
  return {
    Authorization: 'OAuth realm="",' + ((function () {
      var results;
      results = [];
      for (key in headers) {
        val = headers[key];
        results.push(key + "=\"" + val + "\"");
      }
      return results;
    })()).join(','),
    'Content-Type': 'application/xml',
    'Content-Length': 0
  };
};

var get_value = function (key, source) {
  var offset1, offset2;

  key = key + '=';
  offset1 = source.indexOf(key) + key.length + 1;
  offset2 = source.indexOf('"', offset1);
  return source.substring(offset1, offset2);
}