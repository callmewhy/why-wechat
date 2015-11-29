'use strict';
var express = require('express');
var app = express();

// ----------------------------------------------------------------------------
// 设置 view 引擎
// ----------------------------------------------------------------------------
var path = require('path');
var session = require('express-session')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cloud = require('./cloud');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 加载云代码方法
app.use(cloud);
app.use(cookieParser());
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'keyboard cat',
  cookie: {
    maxAge: 60000
  }
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// ----------------------------------------------------------------------------
// 未处理异常捕获 middleware
// ----------------------------------------------------------------------------

var domain = require('domain');
app.use(function(req, res, next) {
  var d = domain.create();
  d.add(req);
  d.add(res);
  d.on('error', function(err) {
    console.error('uncaughtException url=%s, msg=%s', req.url, err.stack || err.message || err);
    if (!res.finished) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=UTF-8');
      res.end('uncaughtException');
    }
  });
  d.run(next);
});

// ----------------------------------------------------------------------------
// Pocket
// ----------------------------------------------------------------------------

var NODE_ENV = process.env.NODE_ENV || 'development';
var host;
if (NODE_ENV === 'development') {
  host = 'http://localhost:3000';
} else if (NODE_ENV === 'production') {
  host = 'http://why-wechat.avosapps.com';
} else {
  host = 'http://dev.why-wechat.avosapps.com';
}
var pocket = require('pocket-sdk');
pocket.init('48542-f35da0ac6285f46fcef9a93f', host + '/pocket/callback');
app.use(pocket.oauth({
  afterSuccess: function(ret, req, res, next) {
    if (ret.access_token) {
      res.cookie('access_token', ret.access_token);
    }
    return res.redirect('/pocket/items');
  }
}));

// ----------------------------------------------------------------------------
// 应用路由
// ----------------------------------------------------------------------------

var api = require('./routes/api');
var pocket = require('./routes/pocket');
var cors = require('cors')

app.use(cors());

app.get('/', function(req, res) {
  res.render('index');
});

app.use('/api', api);
app.use('/pocket', pocket);

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// ----------------------------------------------------------------------------
// error handlers
// ----------------------------------------------------------------------------

// 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) { // jshint ignore:line
    var statusCode = err.status || 500;
    if (statusCode === 500) {
      console.error(err.stack || err);
    }
    res.status(statusCode);
    res.render('error', {
      message: err.message || err,
      error: err
    });
  });
}

// 如果是非开发环境，则页面只输出简单的错误信息
app.use(function(err, req, res, next) { // jshint ignore:line
  res.status(err.status || 500);
  res.render('error', {
    message: err.message || err,
    error: {}
  });
});

module.exports = app;
