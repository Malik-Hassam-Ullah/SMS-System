-- ==============================================================================
-- PHASE 1: EXAM & RESULT MANAGEMENT MODULE - SCHEMA ENHANCEMENTS
-- ==============================================================================

-- 1. Enhance 'exams' table
ALTER TABLE exams 
  ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'Term',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES user_profiles(id);

-- Update start_date/end_date from exam_date if null
UPDATE exams SET start_date = exam_date WHERE start_date IS NULL AND exam_date IS NOT NULL;
UPDATE exams SET end_date = exam_date WHERE end_date IS NULL AND exam_date IS NOT NULL;

-- 2. Enhance 'teacher_assignments' table
ALTER TABLE teacher_assignments 
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id);

-- Populate class_id from sections table if null
UPDATE teacher_assignments ta
SET class_id = s.class_id
FROM sections s
WHERE ta.section_id = s.id AND ta.class_id IS NULL;

-- Create unique index to prevent duplicate teacher assignments for the same exam + section + subject
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_exam_assignment_unique 
  ON teacher_assignments (teacher_id, section_id, subject_id, COALESCE(exam_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Enhance 'marks' table
ALTER TABLE marks 
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES user_profiles(id);

-- Ensure marks has unique constraint on student_id, subject_id, exam_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_marks_student_subject_exam_unique
  ON marks (student_id, subject_id, exam_id);

-- Ensure indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks (exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_section_id ON marks (section_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks (student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject_id ON marks (subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_exam ON teacher_assignments (exam_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments (teacher_id);
