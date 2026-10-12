LEARNIX — OOP STEP 1 COMPLETED

Files are all in this one folder (no nested folders).

OOP concepts implemented:
1. Encapsulation: User stores its password in a private #password field; StudentProgress encapsulates academic values.
2. Inheritance: Student and Teacher extend the common User class.
3. Polymorphism: student/teacher account types expose their own portal destinations and profile shape.
4. Abstraction / separation of responsibility: Store, UserRepository, Session, Validator, AssignmentRepository and analytics classes keep data and logic organised.
5. Objects and domain models: Assignment and AttendanceRecord represent education-related records.
6. StudentProgress calculates CGPA target gap and course progress summary.
7. ConsistencyScore calculates a simple daily habit score, and the student portal updates it as habits are checked.
8. Integration: login/signup uses the OOP user classes; student and teacher pages load core.js; teacher assignment creation uses Assignment and AssignmentRepository.

HOW TO RUN
- Keep every file in this folder together.
- Open index.html using VS Code Live Server for the best experience.
- Create a demo student or teacher account, then sign in with the same role.
- Demo data is saved in the current browser's localStorage.

IMPORTANT LIMITATION
This is still a frontend demo. localStorage is not a secure backend, passwords are only for demonstration, and this is not production-ready authentication. A real backend/database and secure password hashing are still required before real student data can be used.
