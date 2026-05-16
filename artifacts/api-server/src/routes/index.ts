import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import teacherRouter from "./teacher";
import studentRouter from "./student";
import opsRouter from "./ops";
import organizationsRouter from "./organizations";
import studentsAuthRouter from "./students-auth";
import teacherClassesRouter from "./teacher-classes";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(studentsAuthRouter);
router.use(teacherClassesRouter);
router.use(teacherRouter);
router.use(studentRouter);
router.use(opsRouter);
router.use(organizationsRouter);

export default router;
