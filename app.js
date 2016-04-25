require('dotenv').config();
var builder = require('botbuilder');
var jade = require('jade');
var restify = require('restify');
var request = require('request');

var server = restify.createServer();
var iframeUrl = process.env.APP_IFRAME_URL;

var smartBot = new builder.BotConnectorBot();

smartBot.add('/', new builder.CommandDialog()
  .matches('^set name', builder.DialogAction.beginDialog('/profile'))
  .matches('^quit', builder.DialogAction.endDialog())
  .matches('^how old are you', builder.DialogAction.beginDialog('/age'))
  .matches('^ip', builder.DialogAction.beginDialog('/ip'))
  .onDefault(function(session) {
    if (!session.userData.name) {
      session.beginDialog('/profile');
    } else {
      session.send('Hm, I did not understand you %s :(', session.userData.name);
    }
  }));

smartBot.add('/profile', [
  function(session) {
    if (session.userData.name) {
      builder.Prompts.text(session, 'Ah, so you tricked me! Now what\'s your real name?');
    } else {
      builder.Prompts.text(session, 'Hi! What is your name?');
    }
  },
  function(session, results) {
    session.userData.name = results.response;
    session.send('Hello %s, it\'s great to meet you. I\'m bot.', session.userData.name);
    session.endDialog();
  }
]);

smartBot.add('/age', [
  function(session) {
    builder.Prompts.text(session, 'Funny thing to ask. I was born one month ago. How about you?');
  },
  function(session, results) {
    session.userData.age = results.response;
    session.send('So you\'re %s, that\'s nice!', session.userData.age);
    session.endDialog();
  }
]);

smartBot.add('/ip', [
  function(session) {
    builder.Prompts.text(session, 'Which IP you\'d like to track?');
  },
  function(session, results) {
    var ip = results.response;

    request('http://ip-api.com/json/' + ip, function(error, response, body) {
      if (error) {
        session.send('Oops, there was an error with your request "%s"', error);
        session.endDialog();
        return;
      }

      if (response.statusCode != 200) {
        session.send('Oops, we got a wrong status code "%s"', response.statusCode);
        session.endDialog();
        return;
      }

      try {
        body = JSON.parse(body);
      } catch (err) {
        session.send('Hmm, the server returned a wrong response, interesting..');
        session.endDialog();
        return;
      }

      if (body.status !== 'success') {
        session.send('There\'s something wrong here, does this help? "%s"', body.message);
        session.endDialog();
        return;
      }

      session.send('The IP is located at %s, %s', body.city, body.country);
      session.endDialog();
    });
  }
]);

smartBot.add('/help', [
  function(session) {
    session.send('You can always ask me some questions, for example how old I am.');
    session.endDialog();
  }
]);

server.get('/', function indexHTML(req, res, next) {
  res.setHeader('Content-Type', 'text/html');
  res.writeHead(200);
  res.end(
    jade.renderFile('index.jade', {
      iframeUrl: iframeUrl
    }));
  next();
});

server.use(smartBot.verifyBotFramework({
  appId: process.env.APP_ID,
  appSecret: process.env.APP_SECRET
}));

server.post('/bot-v1/my-messages', smartBot.listen());

server.listen(process.env.PORT || 3000, function() {
  console.log('%s listening to %s', server.name, server.url);
});
