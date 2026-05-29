const express = require("express");
const router = express.Router();
const studentController = require("./students-controller");

router.get("", studentController.handleGetAllStudents);
router.post("", studentController.handleAddStudent);
router.get("/:id", studentController.handleGetStudentDetail);
router.post("/:id/status", studentController.handleStudentStatus);
router.put("/:id", studentController.handleUpdateStudent);
router.delete("/:id", studentController.handleDeleteStudent);

module.exports = { studentsRoutes: router };
