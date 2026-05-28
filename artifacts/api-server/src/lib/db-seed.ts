import { db } from "@workspace/db";
import { adminSubjects, adminClassLevels } from "@workspace/db/schema";
import { logger } from "./logger";

const SUBJECTS_TO_SEED = [
  // Traditional High School Subjects (8-4-4)
  "English",
  "Kiswahili",
  "Mathematics",
  "Biology",
  "Chemistry",
  "Physics",
  "History and Government",
  "Geography",
  "Christian Religious Education (CRE)",
  "Islamic Religious Education (IRE)",
  "Home Science",
  "Art and Design",
  "Agriculture",
  "Computer Studies",
  "Music",
  "Business Studies",
  "French",
  "German",
  "Arabic",
  "Aviation Technology",

  // New CBE Senior School / Grade 10 Learning Areas
  "Community Service Learning (CSL)",
  "Physical Education & Sports",
  "Health Education (Grade 10)",
  "Creative Arts and Sports (Grade 10)",
  "Integrated Science (Grade 10)",
  "Pre-Technical Studies (Grade 10)",
  "Computer Science (Grade 10)",
  "Social Studies (Grade 10)",
  "Agriculture and Nutrition (Grade 10)",
  "Performing Arts (Grade 10)",
  "Visual Arts (Grade 10)",
  "History and Citizenship (Grade 10)",
  "Business Studies (Grade 10)",
  "French (Grade 10)",
  "German (Grade 10)",
  "Arabic (Grade 10)",
  "Mandarin (Grade 10)",
];

const CLASS_LEVELS_TO_SEED = [
  { name: "Form 1", sortOrder: 1 },
  { name: "Form 2", sortOrder: 2 },
  { name: "Form 3", sortOrder: 3 },
  { name: "Form 4", sortOrder: 4 },
  { name: "Grade 10", sortOrder: 5 },
  { name: "Grade 11", sortOrder: 6 },
  { name: "Grade 12", sortOrder: 7 },
];

export async function seedDatabase() {
  try {
    logger.info("Checking database seed status...");

    // 1. Seed Subjects
    const existingSubjects = await db.select().from(adminSubjects).limit(1);
    if (existingSubjects.length === 0) {
      logger.info(`Seeding ${SUBJECTS_TO_SEED.length} school subjects...`);
      for (const subjectName of SUBJECTS_TO_SEED) {
        await db.insert(adminSubjects).values({
          name: subjectName,
          isActive: true,
        }).onConflictDoNothing();
      }
      logger.info("Subjects seeding complete.");
    } else {
      logger.info("Subjects already exist, skipping seeding.");
    }

    // 2. Seed Class Levels
    const existingLevels = await db.select().from(adminClassLevels).limit(1);
    if (existingLevels.length === 0) {
      logger.info(`Seeding ${CLASS_LEVELS_TO_SEED.length} class levels...`);
      for (const level of CLASS_LEVELS_TO_SEED) {
        await db.insert(adminClassLevels).values({
          name: level.name,
          sortOrder: level.sortOrder,
          isActive: true,
        }).onConflictDoNothing();
      }
      logger.info("Class levels seeding complete.");
    } else {
      logger.info("Class levels already exist, skipping seeding.");
    }

  } catch (err) {
    logger.error({ err }, "Error during database seeding");
  }
}
