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
//app.use(bodyParser.json());
let id = null;
let C_id = null;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');





//const nodemailer = require('nodemailer');


// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Handle form submission


app.get('/', async (req, res) => {
    try {
        const studentcount = await db.one('select count(*) as sc from student');
        const coursecount = await db.one('select count(*) as cc from courses');
        const teachercount = await db.one('select count(*) as tc from teacher');
        const lecturecount = await db.one('select count(*) as lc from lecture');
        const questioncount = await db.one('select count(*) as qc from question');
        const sc = studentcount.sc;
        const cc = coursecount.cc;
        const tc = teachercount.tc;
        const lc = lecturecount.lc;
        const qc = questioncount.qc;
        res.render('homepage', { sc, tc, cc, lc, qc });
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/registration', (req, res) => {
    res.render('registration', { error: '' });
});




app.post('/registration', async (req, res) => {
    const { first_name, last_name, gmail, date_of_birth, userType, password_hash, proficiency, university, phone } = req.body;//, mail_password
    try {
        // Check if the Gmail already exists in the users table
        // const userExistsQuery = await db.one('SELECT COUNT(*) as c FROM users WHERE gmail = $1 and usertype = $2', [gmail, userType]);
        //const userCount = parseInt(userExistsQuery.c);
        const ucount = await db.one('SELECT IS_User_Exists($1,upper($2)) as c', [gmail, userType]);
        console.log(ucount.c);

        if (ucount.c > 0 || !gmail || !userType) {
            // Gmail account already exists or invalid Gmail provided
            const errorMessage = 'Invalid Information.';
            return res.status(400).json({ message: errorMessage });
        }
        else {
            // Insert the new user data into the users table
            const newuser = await db.one('INSERT INTO users(user_id, gmail, name, password, USERTYPE) VALUES ((SELECT (COUNT(*)+1) AS c FROM users),$1,$2,$3,$4) RETURNING *', [gmail, first_name + ' ' + last_name, password_hash, userType]);//, mail_password/mail_password,
            console.log(newuser);
            if (userType === 'guideline_giver') {
                const newgg = await db.one('Insert into guideline_giver(proficiency,phone_no,university,password_hash) values ($1,$2,$3,$4) returning *', [proficiency, phone, university, password_hash]);
                console.log(newgg);
                const sid = await db.one('SELECT student_id FROM student WHERE first_name=$1 AND last_name=$2 AND date_of_birth=$3 AND password_hash=$4', [first_name, last_name, date_of_birth, password_hash]);
                const gid = await db.one('SELECT guideline_giver_id FROM most_recent_guide_id  where id=(select count(*) from most_recent_guide_id)');
                const newstudentguider = await db.one('insert into isaGuidelineGiver(student_id,guideline_giver_id) values($1,$2) returning *', [sid.student_id, gid.guideline_giver_id]);

                console.log(newstudentguider);
                const successMessage = `Account created successfully. Remember your student userid ${sid.student_id} and guideline_giver user id ${gid.guideline_giver_id} Password ${password_hash} .
                                           `;
                return res.status(200).json({ message: successMessage });
            }

            else if (userType === 'student') {
                const scount = await db.one('SELECT IS_Student_Exists($1, $2, $3) AS c', [first_name, last_name, date_of_birth]);
                if (scount.c > 0) {
                    const errorMessage = 'Student already exists.';
                    return res.status(400).json({ message: errorMessage });
                }
                else {
                    const currentDate = new Date();
                    const dob = new Date(date_of_birth);
                    const age = currentDate.getFullYear() - dob.getFullYear();

                    if (age > 25) {
                        // Offer to become a guideline giver
                        const newstudent = await db.one('INSERT INTO student (first_name, last_name, date_of_birth, password_hash) VALUES ($1, $2, $3, $4) RETURNING *', [first_name, last_name, date_of_birth, password_hash]);
                        const newid = await db.one('SELECT student_id FROM student WHERE first_name=$1 AND last_name=$2 AND date_of_birth=$3 AND password_hash=$4', [first_name, last_name, date_of_birth, password_hash]);
                        console.log('going to insert guideline_giver');
                        const successMessage = `Account created successfully. Remember your userid ${newid.student_id} and Password ${password_hash} .Your age is ${age} .You can be a guideline giver.If you want to 
                                               be a guideline giver then click continue`;
                        return res.status(200).json({ message: successMessage, showGuidelineGiverOption: true });
                        //res.render('guideline_offer', { first_name, last_name, password_hash });
                    } else {
                        // Continue registration
                        const newstudent = await db.one('INSERT INTO student (first_name, last_name, date_of_birth, password_hash) VALUES ($1, $2, $3, $4) RETURNING *', [first_name, last_name, date_of_birth, password_hash]);
                        console.log(newstudent);
                        const newid = await db.one('SELECT student_id FROM student WHERE first_name=$1 AND last_name=$2 AND date_of_birth=$3 AND password_hash=$4', [first_name, last_name, date_of_birth, password_hash]);
                        const successMessage = `Account created successfully. Remember your userid ${newid.student_id} and Password ${password_hash} .go to mail.`;
                        const successMessage2 = `Congratulation ${first_name + ' ' + last_name}!!! 
                                                 welcome to studymate....
                                                 you are ${userType}.Account created successfully. Remember your userid ${newid.student_id} and Password ${password_hash} .`;

                        // Send success email
                        //sendEmail(gmail, 'Registration Successful', successMessage2);

                        return res.status(200).json({ message: successMessage });
                    }
                }
            } else if (userType === 'teacher') {

                const tcount = await db.one('select IS_Teacher_Exists($1,$2,$3,$4) as c', [first_name, last_name, date_of_birth, proficiency]);
                if (tcount.c > 0) {
                    const errorMessage = 'Teacher already exists.';
                    return res.status(400).json({ message: errorMessage });
                }
                else {
                    const newteacher = await db.one('INSERT INTO teacher (teacher_name, teacher_proficiency, date_of_birth, password_hash) VALUES ($1, $2, $3, $4) RETURNING *', [first_name + ' ' + last_name, proficiency, date_of_birth, password_hash]);
                    console.log(newteacher);
                    const newid2 = await db.one('SELECT teacher_id FROM teacher WHERE (teacher_name=$1) AND teacher_proficiency=$2 and  date_of_birth=$3 AND password_hash=$4', [first_name + ' ' + last_name, proficiency, date_of_birth, password_hash]);
                    const successMessage = `Account created successfully. Remember your userid ${newid2.teacher_id} and Password ${password_hash}`;
                    /* const successMessage2 = `Congratulation ${first_name + ' ' + last_name}!!! 
                     welcome to studymate....
                     you are ${userType}.Account created successfully. Remember your userid ${newid.student_id} and Password ${password_hash} .`;
                     // Send success email
                     sendEmail(gmail, 'Registration Successful', successMessage2);*/

                    return res.status(200).json({ message: successMessage });
                }
            }
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// Function to send email


// Function to log errors to a file
/*function logError(error) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${error}\n`;

    fs.appendFile('error.log', logMessage, (err) => {
        if (err) {
            console.error('Error writing to error log:', err);
        }
    });
}

Function to send email
function sendEmail(to, subject, message, res) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '', // Your Gmail email address
            pass: '' // Your Gmail password
        }
    });

    const mailOptions = {
        from: '',
        to,
        subject,
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            logError(error); // Log the error to a file
            if (res) {
                res.status(500).json({ error: 'An error occurred while sending the email.' });
            }
        } else {
            console.log('Email sent:', info.response);
            if (res) {
                res.status(200).json({ message: 'Email sent successfully.' });
            }
        }
    });
}*/



app.get('/login', (req, res) => {
    res.render('login', { error: '' });
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

app.get('/students', async (req, res) => {
    try {
        const students = await db.any('SELECT * FROM students');
        res.json(students);
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

app.get('/exam_section/results',async(req,res)=>{
    try{
        const result = await db.any('select * from result where student_id=$1',id);
        console.log(result);
        res.render('show_result',{result});
    }
    catch(error){
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/exam_section/result',async(req,res)=>{
    try{
        const result = await db.any('select * from result r join exam_section e on r.exam_id = e.id join courses c on e.course_id = c.id where student_id=$1',id);
        console.log(result);
        res.render('show_results',{result});
    }
    catch(error){
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/submit-answer/:exam_id', async (req, res) => {
    // Extract the submitted answers from the request body
    const answers = req.body.answers;
    console.log(answers);

    // Extract the exam ID from the request parameters
    const examId = req.params.exam_id;
    console.log('Exam ID:', examId);

    // Assuming you have the student ID stored in a variable named 'id'
    const studentId = id; // Replace 'id' with the actual variable holding the student ID

    try {
        // Iterate over the submitted answers and insert them into the database
        for (const questionId in answers) {
            if (answers.hasOwnProperty(questionId)) {
                const submittedAnsText = answers[questionId].option_text;
                await db.none('INSERT INTO student_ans(student_id, question_id, submitted_ans_text) VALUES($1, $2, $3)', [Number(id), questionId, submittedAnsText]);
            }
        }

        // Call the stored procedure to calculate the result
        let totalQuestions;
        let correctAnswers;
        let percentage;

        // Call the stored procedure and retrieve the result using a DO statement
        await db.task(async (t) => {
            const result = await t.oneOrNone('CALL calculate_result($1, $2,$3,$4)', [examId, Number(id), totalQuestions, correctAnswers]);
            totalQuestions = result.p_total_questions;
            correctAnswers = result.p_correct_answers;
            percentage = (correctAnswers / totalQuestions) * 100;

            console.log('Total Questions:', totalQuestions);
            console.log('Correct Answers:', correctAnswers);
            console.log('Percentage:', percentage);

            await db.none('INSERT INTO result(student_id, exam_id,  correct_answers,total_questions) VALUES($1, $2, $3, $4)', [Number(id), examId,  correctAnswers, totalQuestions]);
            
            // Redirect to the exam result page with query parameters
            console.log('Redirecting to exam result page');
            //res.redirect(`/exam-result/${examId}?correct=${correctAnswers}&total=${totalQuestions}`);
            res.status(200).json({ totalQuestions: totalQuestions, correctAnswers: correctAnswers, percentage: percentage, examId: examId });
            //res.redirect(`/teacher/dashboard`);
            console.log('Redirected');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/exam-result/:examId', (req, res) => {
    const correctAnswers = req.query.correct;
    const totalQuestions = req.query.total;
    const percentage = (correctAnswers / totalQuestions) * 100;

    res.render('result', { correctAnswers, totalQuestions, percentage });
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
        const question = await db.any('SELECT * FROM question WHERE exam_id = $1', Number(examId));
        const duration = await db.one('SELECT exam_duration FROM exam_section WHERE id = $1', Number(examId));
        console.log(question);
        console.log(duration);
        res.render('start_exam', { question, duration });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/choice/:questionId', async (req, res) => {
    const questionId = req.params.questionId;

    try {
        const choices = await db.any('SELECT * FROM choice WHERE question_id = $1', Number(questionId));
        console.log(choices);
        res.json(choices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



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

app.get('/exam-section/exams', async (req, res) => {
    try {
        const exams = await db.any('SELECT * FROM exam_section');
        console.log(exams);
        res.render('exams', { exams });
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

app.get('/add-exam/:courseId', async (req, res) => {
    const courseId = req.params.courseId;
    console.log(courseId);
    res.render('add_exam', { courseId });
});

app.post('/add-exam', async (req, res) => {
    const { exam_topic, exam_duration, courseId,questions,options ,correct_answers} = req.body;
    console.log(courseId);
    console.log(questions);
    console.log(options);
    console.log(correct_answers);
    let newexam;
    try {
         newexam = await db.one('INSERT INTO exam_section(exam_topic, exam_duration, course_id) VALUES($1, $2, $3) RETURNING *', [exam_topic, exam_duration, courseId]);
        console.log(newexam);
        res.redirect('/teacher/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
    try{
        for (let i = 0; i < questions.length; i++) {
            const newquestion = await db.one('INSERT INTO question(question_statement, exam_id, question_ans) VALUES($1, $2, $3) RETURNING *', [questions[i], newexam.id, correct_answers[i]]);
            console.log(newquestion);
            for (let j = 0; j < options[i].length; j++) {
                const newoption = await db.one('INSERT INTO choice(option_text, question_id) VALUES($1, $2) RETURNING *', [options[i][j], newquestion.id]);
                console.log(newoption);
            }
        }
    
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



//shatabdi start the guideline giver part

app.get('/guideline_giver/dashboard', async (req, res) => {
    try {

        const requestcount = await db.oneOrNone('select count(*) as c from sendrequest where guideline_giver_id=$1 and isadded=$2', [id, 'false']);
        console.log('gggggggg');
        console.log(requestcount);
        res.render('guideline_giver_dashboard', { userType: 'Guideline_Giver', requestcount: requestcount.c, messagecount: 0 });
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/student/show_guideline_givers', async (req, res) => {
    try {
        const cnt = await db.one('select count(*) as c from (select student_id from isaguidelinegiver where student_id=$1)', id);
        const rcnt = await db.one('select count(*) as rc from sendrequest where student_id = $1', id);
        if (cnt.c == 0) {
            if (rcnt.rc == 0) {
                const sendrequest = await db.manyOrNone('select *from sendrequest where student_id = $1', id);
                console.log(rcnt.rc);
                const guidelineGivers = await db.manyOrNone('select *from guideline_giver g join isaguidelinegiver ig on g.guideline_giver_id=ig.guideline_giver_id join student s on s.student_id=ig.student_id');
                console.log(guidelineGivers);
                res.render('show_guideline_giver', { userType: 'student', guidelineGivers: guidelineGivers, isgg: 0, sendrequest: sendrequest });
            }
            else {
                console.log(rcnt.rc);
                const guidelineGivers = await db.manyOrNone('select *from guideline_giver g join isaguidelinegiver ig on g.guideline_giver_id=ig.guideline_giver_id join student s on s.student_id=ig.student_id');
                const sendrequest = await await db.manyOrNone('select *from sendrequest where student_id = $1', id);
                console.log(guidelineGivers);
                console.log(sendrequest);
                res.render('show_guideline_giver', { userType: 'student', guidelineGivers: guidelineGivers, isgg: 0, sendrequest: sendrequest });
            }
        }
        else {
            if (rcnt.rc == 0) {
                console.log('elseeeeee');
                const sendrequest = await db.manyOrNone('select *from sendrequest where student_id = $1', id);
                const guidelineGivers = await db.manyOrNone('select *from guideline_giver g join isaguidelinegiver ig on g.guideline_giver_id=ig.guideline_giver_id join student s on s.student_id=ig.student_id');
                const gg = await db.oneOrNone('select guideline_giver_id from isaguidelinegiver where student_id=$1', id);
                console.log(gg.guideline_giver_id);
                res.render('show_guideline_giver', { userType: 'student', guidelineGivers: guidelineGivers, isgg: gg.guideline_giver_id, sendrequest: sendrequest });
            }
            else {
                const sendrequest = await db.manyOrNone('select *from sendrequest where student_id = $1', id);
                console.log('elseeeeee');
                const guidelineGivers = await db.manyOrNone('select *from guideline_giver g join isaguidelinegiver ig on g.guideline_giver_id=ig.guideline_giver_id join student s on s.student_id=ig.student_id');
                const gg = await db.oneOrNone('select guideline_giver_id from isaguidelinegiver where student_id=$1', id);
                console.log(gg.guideline_giver_id);
                res.render('show_guideline_giver', { userType: 'student', guidelineGivers: guidelineGivers, isgg: gg.guideline_giver_id, sendrequest: sendrequest });
            }
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/send-request', async (req, res) => {
    try {
        console.log('pppppp');
        const guidelineGiver = req.body;
        console.log(guidelineGiver);
        const guidelineId = guidelineGiver.guideline_giver_id;
        console.log(guidelineId);
        const newrequest = await db.one('insert into sendrequest(guideline_giver_id,student_id) values($1,$2) returning *', [guidelineId, id]);
        console.log(newrequest);
        res.status(200).send('Request sent to guideline giver successfully.');
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/view_request', async (req, res) => {
    try {
        const ggname = await db.manyOrNone('select first_name, last_name from sendrequest sr join isaguidelinegiver igg on sr.guideline_giver_id=igg.guideline_giver_id join student s on s.student_id=igg.student_id where sr.guideline_giver_id=$1 ', id);
        const viewrequest = await db.manyOrNone('select *from sendrequest sr join student s on sr.student_id=s.student_id where sr.guideline_giver_id =$1 and isadded=$2', [id, 'false']);
        console.log(viewrequest);
        console.log(ggname);
        res.render('view_request', { viewrequest, ggname });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/accept-request', async (req, res) => {
    const { requestId, action } = req.body;
    console.log(`Request ID: ${requestId}, Action: ${action}`);

    try {
        // Update the database
        await db.query('UPDATE sendrequest SET isadded=$1 WHERE id=$2', ['accepted', requestId]);
        console.log('Request updated successfully.');
        res.status(200).send('Request updated successfully.');
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).send('Error updating request.');
    }
});

app.post('/reject-request', async (req, res) => {
    const { requestId, action } = req.body;
    console.log(`Request ID: ${requestId}, Action: ${action}`);

    try {
        // Update the database
        await db.query('DELETE FROM sendrequest WHERE id=$1', [requestId]);
        console.log('Request deleted successfully.');
        res.status(200).send('Request deleted successfully.');
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).send('Error updating request.');
    }
});

app.post('/send-message', async (req, res) => {
    try {

        // const { messageText } = req.body;
        const { message, guidelineGiverId } = req.body;
        const studentId = id;
        // const guidelineGiverId = req.query.guidelineGiverId;

        const newmessage = await db.one('INSERT INTO messages (from_student_id, to_guideline_giver_id, message_text, sender_role) VALUES ($1, $2, $3, $4) returning *',
            [studentId, guidelineGiverId, message, 'sender']);
            console.log(newmessage);


        res.status(200).send('Message sent successfully.');
    } catch (error) {
        // If an error occurs, send a failure response
        console.error('Error sending message:', error);
        res.status(500).send('Error sending message.');
    }
});
// app.get('/student/message', async (req, res) => {
//     try {
//         // Retrieve the guideline giver ID from query parameters
//         const guidelineGiverId = req.query.guidelineGiverId;
//         console.log("/student/message" + guidelineGiverId);
//         const messages = await db.manyOrNone('select * from messages where from_student_id=$1 and to_guideline_giver_id=$2', [id, guidelineGiverId]);
//         //res.json(messages); // Send JSON response instead of rendering a template
//         res.render('student_message', { messages, guidelineGiverId});
//     } catch (error) {
//         console.error('Error sending messages:', error);
//         res.status(500).json({ error: 'Error retrieving messages' });
//     }
// });



app.get('/student/message', async (req, res) => {
    try {
        // Retrieve the guideline giver ID from query parameters
        const guidelineGiverId = req.query.guidelineGiverId;
        console.log("/student/message"+guidelineGiverId);
        const messages = await db.manyOrNone('select *from messages where from_student_id=$1 and  to_guideline_giver_id=$2', [id, guidelineGiverId]);
        res.render('messaging', { messages, guidelineGiverId});
    } catch (error) {
        console.error('Error rendering student message page:', error);
        res.status(500).send('Error rendering student message page.');
    }
});

app.get('/get-messages', async (req, res) => {
    try {
        // Retrieve the guideline giver ID from query parameters
        const guidelineGiverId = req.query.guidelineGiverId;
        console.log("/student/message" + guidelineGiverId);
        
        // Fetch messages from the database
        const messages = await db.manyOrNone('SELECT * FROM messages WHERE to_guideline_giver_id = $1', [guidelineGiverId]);
        
        // Send the messages as JSON
        res.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});



app.get('/connected_students', async (req, res) => {
    try {
        const connectedStudents = await db.any('SELECT * from sendrequest sr join student s on s.student_id=sr.student_id where sr.guideline_giver_id=$1', id);
        console.log(connectedStudents);
        res.render('connected_students', { connectedStudents });
    } catch (error) {
        console.error('Error rendering connected students page:', error);
        res.status(500).send('Error rendering connected students page.');
    }
});



app.post('/open-chat/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { message } = req.body;
        console.log('Sending message to student ID:', studentId);
        console.log('Message:', message);

        // Here you should insert the new message into your database
        const newmsg = await db.any('INSERT INTO messages (from_student_id, to_guideline_giver_id, message_text, sender_role) VALUES ($1, $2, $3, $4) returning *', [studentId, id, message, 'receiver']);
        // Placeholder response for now
        res.status(200).json({ message: `Message sent to student ID: ${studentId}` }); // Sending a JSON response
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message.' }); // Sending a JSON response with error message
    }
});

app.get('/open-chat/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('Opening chat for student ID:', studentId);
        // Fetch chat messages for the given student ID from the database
        const messages = await db.manyOrNone('SELECT * FROM messages WHERE from_student_id=$1 AND to_guideline_giver_id=$2', [studentId, id]);
        console.log('Retrieved messages:', messages);
        res.json({ messages }); // Sending messages as JSON
    } catch (error) {
        console.error('Error opening chat:', error);
        res.status(500).json({ error: 'Error opening chat.' }); // Sending a JSON response with error message
    }
});



//shatabdi end






app.use(express.static(path.join(__dirname, './public')));


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

app.listen(5000, () => {
    console.log('Listening on port 5000');
});

