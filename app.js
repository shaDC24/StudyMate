const express = require('express');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const db = require('./db'); // Import your database connection


const app = express();

app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
let id = null;

// Set the view engine to EJS
// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Set the view engine to EJS
app.set('view engine', 'ejs');



app.get('/', (req, res) => {
    res.render('login', { error: '' });
});

app.get('/students', async (req, res) => {
    try {
        const students = await db.any('SELECT * FROM students');
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/login', async (req, res) => {
    const { userType, userId, password } = req.body;
    id = userId;

    try {
        // Query the database to retrieve the user's details
        const user = await db.oneOrNone(`SELECT * FROM ${userType} WHERE ${userType}_id = $1`, Number(userId));


        console.log('User from database:', user);
        console.log('Password comparison result:', bcrypt.compareSync(password, user.password_hash));

        if (user && password === user.password_hash) {
            // Password matches, redirect to the dashboard based on user type
            res.redirect(`/${userType}/dashboard`);
        } else {
            // Invalid credentials
            res.render('login', { error: 'Invalid credentials. Please try again.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/student/dashboard', (req, res) => {
    res.render('student_dashboard', { userType: 'Student', options: ['Enroll Courses', 'Course Lists'] });
});





// Update your '/student/enroll-courses' route to fetch course data from the database

app.get('/student/enroll-courses', async (req, res) => {
    try {
        // Fetch course information from the database
        const courses = await db.any('SELECT *FROM courses');
        // res.json(courses);


        res.render('enroll_courses', { userType: 'Student', courses });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/student/course-lists', (req, res) => {
    res.render('course_lists', { userType: 'Student' });
});

app.get('/teacher/dashboard', (req, res) => {
    res.render('teacher_dashboard', { userType: 'Teacher', options: ['Teaching Courses', 'Grade Students'] });
});

app.get('/teacher/courses', async (req, res) => {
    try {

        const tData = await db.any('SELECT *FROM teacher WHERE teacher_id=$1', Number(id));
        const courses = await db.any(`SELECT * FROM courses WHERE  ${tData[0].teacher_id}=${id}`);
        console.log(tData);
        console.log(courses);
        res.render('teacher_course', { userType: 'Teacher', Data: tData, courses: courses, res: res });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/course/initiation', async (req, res) => {
    try {
        res.render('course_initiate', { userType: 'Teacher' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/course/initiation', async (req, res) => {
    const { course_title, course_description } = req.body;
    try {

        const tname = await db.one('SELECT teacher_name, initiated_courses_name FROM teacher WHERE teacher_id=$1', id);

        const newcourse = await db.one(
            'INSERT INTO courses (course_title, course_description, course_creator, teacher_id) VALUES($1, $2, $3, $4) RETURNING *',
            [course_title, course_description, tname.teacher_name, id]
        );

        // Update the initiated_courses column with the new course title
        const updatedInitiatedCourses = tname.initiated_courses_name
            ? `${tname.initiated_courses_name}, ${newcourse.course_title}`
            : newcourse.course_title;

        await db.none('UPDATE teacher SET initiated_courses_name = $1 WHERE teacher_id = $2', [updatedInitiatedCourses, id]);

        console.log(newcourse);
        console.log('Successfully added');

        res.redirect('/teacher/courses');

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
// Set up Multer to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Uploads will be stored in the "uploads" directory
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));

// Set up your routes
app.get('/initiate/lecture', (req, res) => {
    // Render your ejs file here
    res.render('lecture_initiate');
});

app.post('/initiate/lecture', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdfNote', maxCount: 1 }]), async (req, res) => {
    // Handle form submission here
    const course_id = Number(req.query.course_id);

    const lectureName = req.body.lectureName;
    const description = req.body.description;
    const videoFile = req.files['video'][0].buffer; // Access the video file
    const pdfNoteFile = req.files['pdfNote'][0].buffer; // Access the PDF note file
    console.log("course id is " + course_id);
    if (course_id != null || course_id!=undefined) {
        const newlecture = await db.one(`INSERT INTO Lecture(lecture_name,description,pdf_note,video,teacher_id,course_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [lectureName, description, videoFile, pdfNoteFile, id, course_id]);
        console.log(newlecture);}
    res.send('Lecture initiated successfully!');
});
app.get('/teacher/lecture', async (req, res) => {
    try {
        const courses = await db.any('SELECT *FROM courses WHERE teacher_id = $1', Number(id));
        console.log(courses);
        res.render('add_lecture', { userType: 'Teacher', courses: courses });
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/guidelineGiver/dashboard', (req, res) => {
    res.render('guideline_giver_dashboard', { userType: 'Guideline_Giver', options: ['Provide Guidance', 'View Requests'] });
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
    res.status(500).send('About Page');
});



app.all('*', (req, res) => {
    res.status(404).send('<h1>Resource not found</h1>');
});

// Listen on port 5000
app.listen(5000, () => {
    console.log('Listening on port 5000');
});
