const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: true })); // Parse form data

// Set the view engine to EJS
// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Set the view engine to EJS
app.set('view engine', 'ejs');

const validUser = {
    username: 'demoUser',
    password: 'demoPassword',
};


app.get('/', (req, res) => {
    res.render('login', { error: '' });
});


app.post('/login', (req, res) => {
    const { userType, userId, password } = req.body;

    // Basic login logic (replace with secure authentication)
    if (userId === validUser.username && password === validUser.password) {
        // Redirect to the dashboard based on user type
        res.redirect(`/${userType}/dashboard`);
    } else {
        res.render('login', { error: 'Invalid credentials. Please try again.' });
    }
});


app.get('/student/dashboard', (req, res) => {
    res.render('student_dashboard', { userType: 'Student', options: ['Enroll Courses', 'Course Lists'] });
});

app.get('/teacher/dashboard', (req, res) => {
    res.render('teacher_dashboard', { userType: 'Teacher', options: ['Teaching Courses', 'Grade Students'] });
});

app.get('/guidelineGiver/dashboard', (req, res) => {
    res.render('guideline_giver_dashboard', { userType: 'Guideline Giver', options: ['Provide Guidance', 'View Requests'] });
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, './public')));

// Define routes
app.get('/', (req, res) => {
    console.log('User hit');
    res.render('login');
});

app.get('/about', (req, res) => {
    console.log('User hit');
    res.status(200).send('About Page');
});

app.all('*', (req, res) => {
    res.status(404).send('<h1>Resource not found</h1>');
});

// Listen on port 5000
app.listen(5000, () => {
    console.log('Listening on port 5000');
});
