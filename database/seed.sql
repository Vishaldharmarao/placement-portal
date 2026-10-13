USE placement_portal;
INSERT INTO users (name,email,password,role,phone) VALUES
('Placement Admin','admin@demo.edu','$2a$12$qJxB2uRVu5HtL4M5dBX.LOm16h5EEW4JshC0Ot6d1sqMPEEjRr3..','ADMIN','9000000000'),
('Aarav Mehta','aarav@demo.edu','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','STUDENT','9000000001'),
('Neha Sharma','neha@demo.edu','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','STUDENT','9000000002'),
('Kinetix Hiring','hiring@kinetix.demo','$2a$12$RX3IK2LBPYgFRrjE2pfcquXpgXwyZQr31vQKgaEQfdRun.HGGpmVe','COMPANY',NULL),
('Aster Labs','hiring@aster.demo','$2a$12$RX3IK2LBPYgFRrjE2pfcquXpgXwyZQr31vQKgaEQfdRun.HGGpmVe','COMPANY',NULL),
('Northstar','hiring@northstar.demo','$2a$12$RX3IK2LBPYgFRrjE2pfcquXpgXwyZQr31vQKgaEQfdRun.HGGpmVe','COMPANY',NULL);
INSERT INTO student_profiles(user_id,roll_number,branch,cgpa,graduation_year,location) VALUES (2,'CSE2026001','Computer Science',8.42,2026,'Bengaluru'),(3,'ECE2026002','Electronics',8.05,2026,'Pune');
INSERT INTO skills(name,category) VALUES ('Python','Programming'),('Java','Programming'),('JavaScript','Programming'),('React','Frontend'),('Node.js','Backend'),('SQL','Database'),('MySQL','Database'),('MongoDB','Database'),('Docker','DevOps'),('Jenkins','DevOps'),('AWS','Cloud'),('Git','Tools'),('Machine Learning','AI'),('Data Structures','CS Fundamentals'),('Algorithms','CS Fundamentals'),('HTML','Frontend'),('CSS','Frontend'),('REST APIs','Backend'),('Tableau','Analytics'),('Communication','Soft Skills'),('C++','Programming'),('DBMS','CS Fundamentals');
INSERT INTO companies(user_id,company_name,description,website,location) VALUES (4,'Kinetix','Product analytics company','https://kinetix.example','Bengaluru'),(5,'Aster Labs','Applied AI lab','https://aster.example','Pune'),(6,'Northstar Systems','Cloud software firm','https://northstar.example','Remote');
INSERT INTO jobs(company_id,title,description,required_skills,minimum_cgpa,eligible_branches,graduation_year,salary,location,job_type,deadline) VALUES
(1,'Product Analyst','Turn data into product decisions.',JSON_ARRAY('SQL','Python','Communication','Tableau'),7.0,JSON_ARRAY('Computer Science','Electronics'),2026,'₹8–11 LPA','Bengaluru','FULL_TIME','2026-12-15'),
(2,'Junior Data Scientist','Build practical ML solutions.',JSON_ARRAY('Python','Machine Learning','SQL','Git'),7.5,JSON_ARRAY('Computer Science'),2026,'₹10–14 LPA','Pune','FULL_TIME','2026-12-20'),
(3,'Software Engineer','Develop secure cloud-native services.',JSON_ARRAY('JavaScript','React','Node.js','SQL','Docker'),7.0,JSON_ARRAY('Computer Science','Electronics'),2026,'₹9–13 LPA','Remote','FULL_TIME','2026-12-30');
INSERT INTO assessments(title,category,difficulty,duration_minutes) VALUES ('SQL Essentials','SQL','MEDIUM',20),('Python Foundations','Python','EASY',20),('DSA Core','DSA','MEDIUM',30);
INSERT INTO interview_questions(role,category,difficulty,question,ideal_answer,key_concepts) VALUES ('Product Analyst','SQL','MEDIUM','Explain the difference between WHERE and HAVING.','WHERE filters rows before aggregation; HAVING filters groups after aggregation.',JSON_ARRAY('filtering','aggregation')),('Software Engineer','Behavioral','MEDIUM','Describe a time you solved a difficult technical problem.','Use a concise STAR response covering situation, task, action and result.',JSON_ARRAY('STAR','communication'));
