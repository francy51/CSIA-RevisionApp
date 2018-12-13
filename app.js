var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var passport = require('passport');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var mongoose = require("mongoose");
const MongoStore = require('connect-mongo')(session);

var hbs = require('hbs');


var configDB = require('./config/database.js');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

mongoose.connect(configDB.url);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


hbs.registerHelper('compare', function(lvalue, rvalue, options) {

  if (arguments.length < 3)
    throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

  let operator = options.hash.operator || "==";

  var operators = {
    '==': function(l, r) { return l == r; },
    '===': function(l, r) { return l === r; },
    '!=': function(l, r) { return l != r; },
    '<': function(l, r) { return l < r; },
    '>': function(l, r) { return l > r; },
    '<=': function(l, r) { return l <= r; },
    '>=': function(l, r) { return l >= r; },
    'typeof': function(l, r) { return typeof l == r; }
  }

  if (!operators[operator])
    throw new Error("Handlerbars Helper 'compare' doesn't know the operator " + operator);

  var result = operators[operator](lvalue, rvalue);

  if (result) {
    return options.fn(this);
  }
  else {
    return options.inverse(this);
  }
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'anystringoftext',
  saveUninitialized: true,
  resave: true,
  store: new MongoStore({
    url: configDB.url
  }),
  maxAge: null
}));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

require('./config/passport')(passport);

require("./routes/users.js")(app, passport);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
