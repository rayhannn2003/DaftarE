const LocalStrategy = require('passport-local').Strategy;
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');

function initialize(passport) {
     const authenticateUser = async (email, password, done) => {
         pool.query('SELECT * FROM users WHERE email = $1', [email], async (err, result) => {
             if (err) {
                 return done(err);
             }
                const user = result.rows[0];
                if (!user) {
                    return done(null, false, { message: 'No user with that email' });
                }
                try {
                    const isMatch = await bcrypt.compare(password, user.password);
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: 'Password incorrect' });
                    }
                } catch (err) {
                    return done(err);
                }
            });
        }

    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user) {
                return done(null, false, { message: 'No user with that email' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Password incorrect' });
            }
        } catch (err) {
            return done(err);
        }
    }));
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            const user = result.rows[0];
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
}

module.exports = initialize;
//         }
