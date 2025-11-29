import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { createCourse, getUserCourses } from "../controllers/course.controller.js";

const router = Router();

router.route("/create").post(verifyJwt, createCourse);
router.route("/").get(verifyJwt, getUserCourses);

export default router;