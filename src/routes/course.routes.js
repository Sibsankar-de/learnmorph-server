import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { createCourse } from "../controllers/course.controller.js";

const router = Router();

router.route("/create").post(verifyJwt, createCourse);

export default router;