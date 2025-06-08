const express = require('express');
const app = express();
const {pool } = require('./dbConfig');
const { errors } = require('undici');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');

const initializePassport = require('./passportConfig');
initializePassport(passport);

const PORT = process.env.PORT || 4000;
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

//
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


app.get('/', (req, res) => {
  //res.send('Hello, World!Rayhan');
  res.render('index');
});
app.get('/users/register', checkAuthenticated, (req, res) => {
  res.render('register');
});
app.get('/users/login', checkAuthenticated, (req, res) => {
  res.render('login');
});
app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
  res.render('dashboard',{usr : req.user.name});
});
app.get('/users/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
  });
});
app.post('/users/register', async (req, res) => {
   let {name,email,password,confirmPassword} = req.body;
    
   console.log(name,email,password,confirmPassword);
   let errors = [];
    if (!name || !email || !password || !confirmPassword) {
         errors.push({ message: 'Please fill in all fields' });
    }
    if (password !== confirmPassword) {
        errors.push({ message: 'Passwords do not match' });
    }
    if( password.length < 6) {
        errors.push({ message: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ message: 'Please enter a valid email address' });
    }
    if (errors.length > 0) {
        res.render('register', { errors });
    }
    else{
        //form a validation has passed
        let hashedpassword = await bcrypt.hash(password, 10);
        console.log(hashedpassword);
        pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Server error');
                }
                if (result.rows.length > 0) {
                    errors.push({ message: 'Email already registered' });
                    return res.render('register', { errors });
                }
                // Insert new user into the database
                pool.query(
                    `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
                    [name, email, hashedpassword],
                    (err, result) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Server error');
                        }
                        req.flash('success_msg', 'You are now registered and can log in');
                        res.redirect('/users/login');
                    }
                );
            }
       
            
        )
    }

});

app.post('/users/login', passport.authenticate('local', {   
    successRedirect: '/users/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/users/dashboard');
  }
  next();
  //res.redirect('/users/login');
}
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return  next();
    }
   res.redirect('/users/login');
    }

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
