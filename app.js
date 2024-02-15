const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const db = require('./db'); // Import your database connection
const bcrypt = require('bcrypt');
const fs = require('fs');



const app = express();

app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(express.json());
let id = null;
let C_id = null;

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



app.get('/student/dashboard', async (req, res) => {
    try {


        res.render('student_dashboard', { userType: 'Student' });
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/search/teacher', async (req, res) => {
    try {
        console.log('api search teacher');
        const teachers = await db.any('SELECT *FROM teacher');
        const searchTerm = req.query.q;
        console.log(searchTerm);
        const matchingTeachers = teachers.filter(teacher => teacher.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()));
        console.log(matchingTeachers);
        res.json(matchingTeachers);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint for searching courses
app.get('/api/search/course', async (req, res) => {
    try {
        const searchTerm = req.query.q.toLowerCase();
        const courses = await db.any('SELECT *FROM courses');
        const enrolledcourses = ('select *from courses c where id in (select course_id from enrollments e where student_id=$1)', id);
        const unenrolledcourses = ('select * from courses c1 where c1.id in (select c.id from courses c except(select e.course_id from enrollments e where e.student_id=$1))', id);
        const matchingCourses = courses.filter(course => course.course_title.toLowerCase().includes(searchTerm));
        console.log(matchingCourses);
        console.log(unenrolledcourses);

        res.json(matchingCourses);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
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
app.get('/teacher-search-results', async (req, res) => {
    try {
        console.log('teacher-search-results');
        const searchTerm = req.query.q.toLowerCase();
        console.log(searchTerm);
        const teachers = await db.oneOrNone('SELECT *FROM teacher where lower(teacher_name)=$1', searchTerm);
        if (teachers) {
            const tid = teachers.teacher_id;
            console.log(tid);
            const inputs = await db.any('select t.teacher_name,t.teacher_proficiency,c.course_title,c.course_description from teacher t join courses c on t.teacher_id=c.teacher_id  where t.teacher_id = $1 group by  c.course_title,c.course_description,t.teacher_name, t.teacher_proficiency', tid);
            console.log(inputs);
            res.render('individual_dashboarsd', { userType: 'Student', inputs: inputs });
        }
        else {
            alert('Teacher not found');
            res.redirect('/student/dashboard');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/course-search-results', async (req, res) => {
    try {
        console.log('course-search-results');
        const searchTerm = req.query.q.toLowerCase();
        console.log(searchTerm);
        const course = await db.oneOrNone('SELECT *FROM courses where lower(course_title)=$1', searchTerm);
        const enrolledcourses = ('select *from courses c where id in (select course_id from enrollments e where student_id=$1)', id);
        const unenrolledcourses = ('select * from courses c1 where c1.id in (select c.id from courses c except(select e.course_id from enrollments e where e.student_id=$1))', id);
        const tid = course.id;
        console.log(tid);
        if (course) {

            const c = await db.one('select count(*) as count from lecture where course_id= $1', tid);
            console.log("count : " + c.count);
            if (c.count > 0) {
                const inputs = await db.any('select * from lecture l join courses c on l.course_id=c.id where c.id=$1;', tid);
                console.log(inputs);
                res.render('individual_course_lecture_dashboarsd', { userType: 'Student', inputs: inputs });
            }
            else {
                const inputs = await db.one('select * from courses where id= $1', tid);
                console.log(inputs);
                res.render('individual_course_dashboarsd', { userType: 'Student', inputs: inputs });

            }
        }
        else {
            alert('course not found');
            res.redirect('/student/dashboard');
        }

    } catch (error) {
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

app.get('/student/exam-section/:courseId', async (req, res) => {
    const courseId = req.params.courseId;

    try {
        const exams = await db.any('SELECT id,exam_topic FROM exam_section WHERE course_id = $1', Number(courseId));
        console.log(exams[0]);
        res.render('examList', { exams });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/start-exam/:examId', async (req, res) => {
    const examId = req.params.examId;

    try {
        const question = await db.one('SELECT * FROM question WHERE exam_id = $1', Number(examId));
        console.log(question);
        res.render('start_exam', { question });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Assuming you have a route like "/show/lecture" in your Express app
app.get('/show/lecture', async (req, res) => {
    const courseId = req.query.course_id;

    try {
        console.log(courseId);
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

// Define a function to fetch the exam data from the database
const getExams = async () => {
    try {
      // Connect to the database
      const client = await pool.connect();
  
      // Execute a query to fetch the exams from the exam_section table
      const result = await client.query('SELECT * FROM exam_section');
  
      // Release the client back to the pool
      client.release();
  
      // Return the rows fetched from the database
      return result.rows;
    } catch (err) {
      console.error('Error fetching exams:', err);
      throw err;
    }
  };

app.get('/student/exam-section', async (req, res) => {
    try {
        //const exams = await db.any('SELECT * FROM exams');
        //const exams = await getExams();
        const courses = await db.any('select * from student s join enrollments e on s.student_id=e.student_id join courses c on c.id=e.course_id where s.student_id=$1;', Number(id));
        //join teacher t on  t.teacher_id=c.teacher_id
        console.log(courses);
        res.render('exam-section', { courses });
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


app.get('/student/course-lists', async (req, res) => {
    const enrolledCourses = await db.any('select * from student s join enrollments e on s.student_id=e.student_id join courses c on c.id=e.course_id join teacher t on  t.teacher_id=c.teacher_id where s.student_id=$1;', Number(id));
    console.log(enrolledCourses);
    res.render('course_lists', { userType: 'Student', courses: enrolledCourses });
});

app.get('/teacher/dashboard', (req, res) => {
    res.render('teacher_dashboard', { userType: 'Teacher', options: ['Teaching Courses', 'Grade Students'] });
});

app.get('/teacher/courses', async (req, res) => {
    try {

        const tData = await db.any('SELECT *FROM teacher WHERE teacher_id=$1', Number(id));
        const courses = await db.any('SELECT *FROM courses WHERE  teacher_id=$1', Number(id));
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

app.get('/initiate/lecture', async (req, res) => {
    C_id = Number(req.query.course_id);
    console.log(C_id);
    console.log(req.query); // Check if course_id is present in req.query
    console.log(req.body);
    res.render('lecture_initiate', { userType: 'Teacher', course_id: C_id });
});

//Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (optional, depending on your needs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Handle POST request for initiating a new lecture
/*app.post('/initiate/lecture', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description } = req.body;
        const videoFile = req.files['video'][0];
        const pdfFile = req.files['pdf'][0];
        console.log("to post " + id + "  " + C_id);

        //Save lecture data to the database

        const newlecture = await db.one(
            'INSERT INTO lecture(lecture_name,description,teacher_id,course_id) VALUES($1,$2,$3,$4) RETURNING *',
            [title, description, id, C_id]
        );
        const lectureId = await db.one('select count(*) from lecture');
        console.log(newlecture);
        console.log(lectureId);
        // Save video and pdf files to the file system
        saveFile(videoFile, `video_${lectureId.count}.mp4`);
        saveFile(pdfFile, `pdf_${lectureId.count}.pdf`);
        console.log('Request Body:', req.body);
        console.log('Request Files:', req.files);
        console.log("course id is " + C_id);
        console.log(lectureId.count);

        res.status(200).send('Lecture created successfully');
        // res.redirect('show_lecture');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});*/
app.post('/initiate/lecture', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description } = req.body;
        const videoFile = req.files['video'][0];
        const pdfFile = req.files['pdf'][0];
        console.log("to post " + id + "  " + C_id);
        const lectureId = await db.one('select count(*)+1 as count from lecture');
        
        console.log(lectureId);

        // Save video and pdf files to the file system and get modified file names
        const modifiedVideoFileName = `video_${lectureId.count}_${C_id}_${id}.mp4`; saveFile(videoFile, `video_${lectureId.count}_${C_id}_${id}.mp4`);
        const modifiedPdfFileName = `pdf_${lectureId.count}_${C_id}_${id}.pdf`; saveFile(pdfFile, `pdf_${lectureId.count}_${C_id}_${id}.pdf`);

        // Save lecture data to the database, including modified file names
        const newlecture = await db.one(
            'INSERT INTO lecture(lecture_name, description, teacher_id, course_id, videolink, pdflink) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, description, id, C_id, modifiedVideoFileName, modifiedPdfFileName]
        );

        console.log(newlecture);
        console.log("course id is " + C_id);

        res.status(200).send('Lecture created successfully');
        // res.redirect('show_lecture');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


function saveFile(file, fileName) {
    const filePath = path.join(__dirname, 'uploads', fileName);
    fs.writeFileSync(filePath, file.buffer);
}




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
