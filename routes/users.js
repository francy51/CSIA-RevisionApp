module.exports = function(app, passport) {

  app.get('/login',
    function(req, res) {
      res.render('login');
    });

  //Local login
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
  }));

  //local register
  app.post('/register', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
  }));

  app.get('/login/facebook',
    passport.authenticate('facebook'));

  app.get('/login/facebook/callback',
    passport.authenticate('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/login'
    }));

  app.get('/login/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/login/google/callback',
    passport.authenticate('google', {
      successRedirect: '/profile',
      failureRedirect: '/login'
    }));


  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  })

  app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    function(req, res) {
      console.log(req.user);
      res.render('profile', { user: req.user });

    });



}
