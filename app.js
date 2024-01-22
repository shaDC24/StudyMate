const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const bcrypt = require('bcrypt');
const db = require('./db'); // Import your database connection




const app = express();

app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(express.json());
let id = null;
let C_id = null;

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


app.post('/student/enroll-courses', async (req, res) => {
    const courseId = req.body.courseId;
    // Do something with the courseId, such as storing it in a database or processing it 
    try {
        const enrollment = await db.one('INSERT INTO enrollments( student_id,course_id) VALUES($1,$2) returning *', [Number(id), Number(courseId)]);
        console.log(`Enrolling in course with ID: ${courseId}`);
        res.send('Course enrolled successfully');
        console.log(enrollment);
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// to check if course is already added or not
app.get('/student/is-course-added/:courseId', async (req, res) => {
    const studentId = id; // Assuming you have a user object in your request with the current student's ID
    const courseId = req.params.courseId;

    try {
        const result = await db.oneOrNone('SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
        res.json({ isAdded: result !== null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Assuming you have a route like "/show/lecture" in your Express app
app.get('/show/lecture', async (req, res) => {
    const courseId = req.query.course_id;

    try {
        // Fetch lectures associated with the specified course from the database
        const lectures = await db.any('SELECT * FROM lecture WHERE course_id = $1', courseId);

        // Fetch course details for display
        const course = await db.one('SELECT * FROM courses WHERE id = $1', courseId);

        // Render the 'show_lectures' view and pass the retrieved lectures and course data
        res.render('show_lectures', { lectures, course });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



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


app.get('/student/course-lists', async(req, res) => {
    const enrolledCourses=await db.any('select * from student s join enrollments e on s.student_id=e.student_id join courses c on c.id=e.course_id where s.student_id=$1;',Number(id));
    res.render('course_lists', { userType: 'Student',courses:enrolledCourses });
});

app.get('/teacher/dashboard', (req, res) => {
    res.render('teacher_dashboard', { userType: 'Teacher', options: ['Teaching Courses', 'Grade Students'] });
});

app.get('/teacher/courses', async (req, res) => {
    try {

        const tData = await db.any('SELECT *FROM teacher WHERE teacher_id=$1', Number(id));
        const courses = await db.any('SELECT *FROM courses WHERE  teacher_id=$1',Number(id));
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


app.get('/initiate/lecture', async (req, res) => {
    C_id = Number(req.query.course_id);
    console.log(C_id);
    console.log(req.query); // Check if course_id is present in req.query
    console.log(req.body);
    res.render('lecture_initiate', { userType: 'Teacher', course_id: C_id });
});



app.post('/initiate/lecture', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdfNote', maxCount: 1 }]), async (req, res) => {
    console.log('Request Body:', req.body);
    console.log('Request Files:', req.files);

    const lectureName = req.body.lectureName;
    const description = req.body.description;
    const videoFileBuffer = req.files['video'][0].buffer;
    const pdfNoteFileBuffer = req.files['pdfNote'][0].buffer;



    console.log("course id is " + C_id);

    if (!isNaN(C_id)) {
        try {
            // Insert into the database using the appropriate data type (BYTEA in PostgreSQL)
            const newlecture = await db.one(
                `INSERT INTO Lecture(lecture_name, description, pdf_note, video, teacher_id, course_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
                [lectureName, description, videoFileBuffer, pdfNoteFileBuffer, id, C_id]
            );

            console.log('New Lecture:', newlecture);
            res.send('Lecture initiated successfully!');
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Error initiating lecture');
        }
    } else {
        res.status(400).send('Invalid course ID');
    }
});


app.get('/teacher/lecture', async (req, res) => {
    try {
        const courses = await db.any('SELECT * FROM courses WHERE teacher_id = $1', Number(id));
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
