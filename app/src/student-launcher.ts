import { Student } from './student'

export function createStudent(settings, lastSeatIndex) {
  const student = new Student(settings, lastSeatIndex);
  student.run();
}
