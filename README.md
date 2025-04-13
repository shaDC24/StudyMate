# 📚 StudyMate

**StudyMate** is a dynamic online learning platform where students can register, browse, and enroll in courses offered by instructors. Teachers can create and manage their own course offerings. The system is built using modern web technologies and follows a clean MVC architecture.

---

## 🌐 Tech Stack

- **EJS** – Templating engine for rendering dynamic pages (80.2% of codebase)
- **JavaScript** – Client-side interactivity (19.4%)
- **Node.js** – Runtime environment
- **Express.js** – Backend framework
- **PostgreSQL** – Relational database used for storing user, course, and enrollment data
- **Sequelize** – ORM for interacting with PostgreSQL

---

## 🚀 Features

### 👨‍🏫 For Teachers
- Sign up and log in securely
- Create, edit, and manage courses
- Monitor enrolled students

### 🎓 For Students
- Browse all offered courses
- Sign up, log in, and enroll in available classes
- Access enrolled course content

### 🔐 User Authentication
- Secure login and registration with session-based auth or JWT
- Role-based access for student and teacher portals

---

## 🗂️ Folder Structure


### 1. Clone the repository

```bash
git clone https://github.com/yourusername/studymate.git
cd studymate


**Install dependencies**
bash
Copy
Edit
npm install


**Configure your database**
Create a PostgreSQL database (e.g., studymate_db)
Update the database config in /config/config.js or .env file


**Configure your database**
Create a PostgreSQL database (e.g., studymate_db)
Update the database config in /config/config.js or .env file

📈 Future Improvements

Add real-time video or lecture integration
Messaging system between students and teachers
Dashboard analytics for course performance
Password reset via email


## 👥 Team Contribution

StudyMate was developed as a group project by a team of computer science students. Each member contributed to different aspects of the system:

- **Backend Development**: Routing, PostgreSQL integration, authentication
- **Frontend (EJS)**: Dynamic pages, navbar, rating UI, and student-teacher flows
- **Database**: Designed all SQL queries, schema, and procedures (see `*.txt` files)
- **Additional Modules**: Routine update logic, graph visualization (HTML), PDF handling

All SQL queries used in the project are documented in the `/query` and `All_sql_query_Studymate.txt` files.

