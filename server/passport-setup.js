const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GoogleOneTapStrategy = require("passport-google-one-tap").GoogleOneTapStrategy;
passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});
passport.use(new GoogleStrategy({
    clientID: "xxxxxxxxxxx",
    clientSecret: "xxxxxxxxxxx",
    callbackURL: "http://localhost:3000/google/callback"
},
    function (accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.use(
    new GoogleOneTapStrategy(
        {
            //client_id:"xxxxxxx.apps.googleusercontent.com", //local
            client_id: "xxxxxx.apps.googleusercontent.com", //prod-oneTap
            //clientSecret: "xxxx", //local
            clientSecret: "xxxxxxxxxxx", // prod-oneTap
            verifyCsrfToken: false, // whether to validate the csrf token or not
        },
        function (profile, done) {
            return done(null, profile);
        }
    )
)