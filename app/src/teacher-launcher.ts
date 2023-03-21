import { Teacher } from './teacher'

export function createTeacher(settings, stationJson) {
  const teacher = new Teacher(settings, stationJson);
  teacher.run();
}
